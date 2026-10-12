import { useCallback, useEffect, useRef, useState } from "react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

/* ------------------------------------------------------------------ */
/*  Типы                                                               */
/* ------------------------------------------------------------------ */

export type PoseStatus =
  | "idle"
  | "loading-wasm"
  | "loading-model"
  | "starting-camera"
  | "calibrating"
  | "tracking"
  | "error";

export interface Joint {
  x: number; // 0..1 (уже отзеркалено)
  y: number; // 0..1
  z: number;
  v: number; // visibility
}

export interface PoseSignals {
  tracked: boolean;          // человек в кадре
  x: number | null;          // позиция тела 0..1 (плечи)
  handsUp: boolean;          // обе руки подняты над головой
  handsUpEdge: boolean;      // сработал фронт поднятия
  duck: boolean;             // приседание
  joints: Joint[] | null;    // 33 точки
  fps: number;
  confidence: number;        // средняя видимость ключевых точек
  torso: number;             // текущая длина торса (для отладки)
  frames: number;
}

export const POSE_BONES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10], [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
  [17, 19], [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
  [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32],
];

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export const STATUS_LABEL: Record<PoseStatus, string> = {
  idle: "Ожидание",
  "loading-wasm": "Загрузка WASM-рантайма…",
  "loading-model": "Загрузка нейросети Pose…",
  "starting-camera": "Запрос доступа к камере…",
  calibrating: "Калибровка — встаньте прямо…",
  tracking: "Трекинг активен",
  error: "Ошибка",
};

/* ------------------------------------------------------------------ */
/*  Хук                                                                */
/* ------------------------------------------------------------------ */

export function usePoseEngine() {
  const [status, setStatus] = useState<PoseStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const statusRef = useRef<PoseStatus>("idle");
  statusRef.current = status;

  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const stoppedRef = useRef(false);

  const signalsRef = useRef<PoseSignals>({
    tracked: false,
    x: null,
    handsUp: false,
    handsUpEdge: false,
    duck: false,
    joints: null,
    fps: 0,
    confidence: 0,
    torso: 0,
    frames: 0,
  });

  // внутренние фильтры
  const fx = useRef<number | null>(null);          // сглаженный X
  const ftorso = useRef<number | null>(null);      // сглаженный торс
  const torsoBase = useRef<number | null>(null);   // образец "стою прямо"
  const prevHandsUp = useRef(false);
  const duckLatch = useRef(false);                 // гистерезис приседания
  const calibFrames = useRef(0);
  const calibSum = useRef(0);
  const lastT = useRef(0);

  /* -------------------- запуск -------------------- */
  const start = useCallback(async (video: HTMLVideoElement) => {
    stoppedRef.current = false;
    videoRef.current = video;
    setError(null);

    try {
      // 1. wasm
      setStatus("loading-wasm");
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      if (stoppedRef.current) return;

      // 2. модель
      setStatus("loading-model");
      if (!landmarkerRef.current) {
        landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      }
      if (stoppedRef.current) return;

      // 3. камера
      setStatus("starting-camera");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 960 }, height: { ideal: 540 }, facingMode: "user" },
        audio: false,
      });
      if (stoppedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();

      // 4. цикл детекции
      calibFrames.current = 0;
      calibSum.current = 0;
      torsoBase.current = null;
      setStatus("calibrating");
      lastT.current = performance.now();

      const loop = () => {
        if (stoppedRef.current) return;
        const lm = landmarkerRef.current;
        const v = videoRef.current;
        if (lm && v && v.readyState >= 2 && v.videoWidth > 0) {
          const now = performance.now();
          const dt = now - lastT.current;
          lastT.current = now;
          const res = lm.detectForVideo(v, now);
          process(res.landmarks?.[0] ?? null, dt);
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      const msg =
        e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "NotFoundError")
          ? "Нет доступа к камере. Разрешите доступ в браузере или играйте в режиме без камеры."
          : "Не удалось загрузить нейросеть. Проверьте соединение или играйте мышью.";
      setError(msg);
      setStatus("error");
    }
  }, []);

  /* -------------------- обработка кадра -------------------- */
  const process = useCallback(
    (lms: Array<{ x: number; y: number; z: number; visibility?: number }> | null, dt: number) => {
      const s = signalsRef.current;
      s.frames++;
      s.fps = s.fps * 0.9 + (1000 / Math.max(dt, 1)) * 0.1;

      if (!lms || lms.length < 33) {
        s.tracked = false;
        s.joints = null;
        s.handsUp = false;
        s.duck = false;
        prevHandsUp.current = false;
        return;
      }

      // зеркалим X и забираем точки
      const joints: Joint[] = lms.map((p) => ({
        x: 1 - p.x,
        y: p.y,
        z: p.z,
        v: p.visibility ?? 0,
      }));
      s.joints = joints;

      const vis = lms.reduce((a, p) => a + (p.visibility ?? 0), 0) / lms.length;
      s.confidence = vis;
      const shL = joints[11], shR = joints[12];
      const nose = joints[0];
      const wrL = joints[15], wrR = joints[16];
      const hipL = joints[23], hipR = joints[24];

      const trackedOk = vis > 0.45 && shL.v > 0.4 && shR.v > 0.4;
      s.tracked = trackedOk;
      if (!trackedOk) {
        s.handsUp = false;
        s.duck = false;
        prevHandsUp.current = false;
        return;
      }

      // --- позиция тела (центр плеч) ---
      const rawX = (shL.x + shR.x) / 2;
      fx.current = fx.current === null ? rawX : fx.current + (rawX - fx.current) * 0.35;
      s.x = Math.min(1, Math.max(0, fx.current));

      // --- торс (для приседания) ---
      const hipY = (hipL.y + hipR.y) / 2;
      const shY = (shL.y + shR.y) / 2;
      const torso = Math.abs(hipY - shY);
      ftorso.current = ftorso.current === null ? torso : ftorso.current + (torso - ftorso.current) * 0.3;
      s.torso = ftorso.current;

      // калибровка: первые ~50 кадров собираем длину торса "стоя"
      if (statusRef.current !== "tracking") {
        calibFrames.current++;
        calibSum.current += torso;
        if (calibFrames.current > 50) {
          torsoBase.current = calibSum.current / calibFrames.current;
          setStatus("tracking");
        }
      } else if (torsoBase.current !== null) {
        // медленно подстраиваем базу, если человек подошёл ближе
        if (torso > torsoBase.current) torsoBase.current = torsoBase.current * 0.98 + torso * 0.02;
      }

      // --- приседание (с гистерезисом) ---
      const base = torsoBase.current;
      if (base) {
        const ratio = torso / base;
        if (!duckLatch.current && ratio < 0.7) duckLatch.current = true;
        else if (duckLatch.current && ratio > 0.78) duckLatch.current = false;
      }
      s.duck = duckLatch.current;

      // --- руки вверх ---
      const handsUp =
        wrL.v > 0.45 && wrR.v > 0.45 && wrL.y < nose.y + 0.02 && wrR.y < nose.y + 0.02;
      s.handsUpEdge = handsUp && !prevHandsUp.current;
      s.handsUp = handsUp;
      prevHandsUp.current = handsUp;
    },
    []
  );

  /* -------------------- стоп -------------------- */
  const stop = useCallback(() => {
    stoppedRef.current = true;
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
    signalsRef.current = {
      tracked: false, x: null, handsUp: false, handsUpEdge: false, duck: false,
      joints: null, fps: 0, confidence: 0, torso: 0, frames: 0,
    };
  }, []);

  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { status, error, signalsRef, start, stop };
}
