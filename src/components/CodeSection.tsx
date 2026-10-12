import { useMemo, useState, type ReactNode } from "react";
import { Check, Copy, FileCode2, TerminalSquare } from "lucide-react";
import { cn } from "../utils/cn";

/* ------------------- подсветка ------------------- */

const KEYWORDS =
  "const|let|var|function|return|if|else|await|async|new|for|while|import|from|export|true|false|null|typeof|class";

function highlight(code: string, keyPrefix: string) {
  const re = new RegExp(
    `(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)|('(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*"|\`(?:[^\`\\\\]|\\\\.)*\`)|\\b(${KEYWORDS})\\b|\\b(\\d+(?:\\.\\d+)?)\\b|([A-Za-z_$][\\w$]*)(?=\\s*\\()`,
    "g"
  );
  const out: ReactNode[] = [];
  let last = 0, m: RegExpExecArray | null, i = 0;
  const clsFor = [ "text-white/35 italic", "text-neon", "text-violet-neon", "text-cyan-neon", "text-[#ffd479]" ];
  while ((m = re.exec(code))) {
    if (m.index > last) out.push(<span key={`${keyPrefix}-p${i}`} className="text-white/80">{code.slice(last, m.index)}</span>);
    const cls = m[1] ? clsFor[0] : m[2] ? clsFor[1] : m[3] ? clsFor[2] : m[4] ? clsFor[3] : clsFor[4];
    out.push(<span key={`${keyPrefix}-t${i}`} className={cls}>{m[0]}</span>);
    last = m.index + m[0].length;
    i++;
  }
  if (last < code.length) out.push(<span key={`${keyPrefix}-end`} className="text-white/80">{code.slice(last)}</span>);
  return out;
}

/* ------------------- сниппеты ------------------- */

const TABS: { id: string; file: string; lang: string; code: string }[] = [
  {
    id: "install",
    file: "terminal",
    lang: "bash",
    code: `# 1. Создаём проект (vite / react / что угодно)
npm create vite@latest motion-game -- --template react-ts
cd motion-game

# 2. Единственная зависимость — рантайм поз от MediaPipe
npm install @mediapipe/tasks-vision

# 3. Запускаем. Модель позы (~5 МБ) скачается
#    автоматически при первом старте
npm run dev`,
  },
  {
    id: "model",
    file: "model.js",
    lang: "js",
    code: `import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

// Загружаем WASM-рантайм и саму нейросеть
const vision = await FilesetResolver.forVisionTasks(
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
);

export const landmarker = await PoseLandmarker.createFromOptions(vision, {
  baseOptions: {
    // лёгкая модель: 33 точки тела, realtime даже на слабом ПК
    modelAssetPath:
      "https://storage.googleapis.com/mediapipe-models/" +
      "pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
    delegate: "GPU", // инференс на видеокарте через WebGL
  },
  runningMode: "VIDEO",
  numPoses: 1,
});

// Камера — обычный видеопоток браузера
export const video = document.querySelector("video");
video.srcObject = await navigator.mediaDevices.getUserMedia({
  video: { width: 640, height: 480, facingMode: "user" },
});
await video.play();`,
  },
  {
    id: "loop",
    file: "loop.js",
    lang: "js",
    code: `import { landmarker, video } from "./model.js";

// Главный цикл: каждый кадр камеры в нейросеть
function detectLoop() {
  const now = performance.now();

  // landmarks[0] — массив из 33 точек: { x, y, z, visibility }
  // x, y нормированы: 0..1 относительно кадра
  const { landmarks } = landmarker.detectForVideo(video, now);

  if (landmarks.length > 0) {
    const pose = landmarks[0];

    // индексы ключевых точек BlazePose:
    // 0 — нос, 11/12 — плечи, 15/16 — запястья, 23/24 — бёдра
    handlePose(pose); // -> наш маппинг жестов
    drawSkeleton(pose); // -> отладочный рендер скелета
  }

  requestAnimationFrame(detectLoop);
}
detectLoop();`,
  },
  {
    id: "gestures",
    file: "gestures.js",
    lang: "js",
    code: `import { emit } from "./game.js";

// Сглаживание, иначе точки «дрожат» между кадрами
let smoothX = null;

export function handlePose(pose) {
  const nose = pose[0];
  const wristL = pose[15], wristR = pose[16];
  const shoulderL = pose[11], shoulderR = pose[12];
  const hipL = pose[23], hipR = pose[24];

  // --- ЖЕСТ 1: обе руки выше головы -> прыжок ---
  const handsUp = wristL.y < nose.y && wristR.y < nose.y;
  if (handsUp && !window._latched) {
    window._latched = true;          // срабатываем один раз
    emit("jump");
  }
  if (!handsUp) window._latched = false;

  // --- ЖЕСТ 2: смещение корпуса -> движение героя ---
  const cx = (shoulderL.x + shoulderR.x) / 2;
  smoothX = smoothX === null ? cx : smoothX + (cx - smoothX) * 0.35;
  emit("move", 1 - smoothX); // зеркалим: камера инвертирует кадр

  // --- ЖЕСТ 3: торс «сжался» -> приседание ---
  const torso = Math.abs((hipL.y + hipR.y) / 2 - (shoulderL.y + shoulderR.y) / 2);
  emit("duck", torso < window._baseTorso * 0.7);
}

// Калибровка: при старте 2 секунды просто стоим прямо,
// запоминаем длину торса как _baseTorso`,
  },
  {
    id: "game",
    file: "game.js",
    lang: "js",
    code: `// Мини-шина событий между CV и игрой
const listeners = {};
export const on = (e, fn) => (listeners[e] = fn);
export const emit = (e, data) => listeners[e]?.(data);

// Подключаем действия к игровому персонажу
on("jump", () => {
  if (player.onGround) player.vy = -980;  // импульс вверх
});

on("move", (x) => {
  player.targetX = x * LEVEL_WIDTH;       // куда бежать
});

on("duck", (active) => {
  player.ducking = active;                // подкат под барьером
});

// А дальше — обычный игровой цикл 60 fps:
// requestAnimationFrame -> physics -> collisions -> render`,
  },
];

/* ------------------- компонент ------------------- */

export default function CodeSection() {
  const [tab, setTab] = useState("model");
  const [copied, setCopied] = useState(false);
  const current = TABS.find((t) => t.id === tab)!;

  const highlighted = useMemo(() => highlight(current.code, current.id), [current]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* ignore */ }
  };

  const lines = current.code.split("\n").length;

  return (
    <section id="code" className="relative mx-auto max-w-[1400px] scroll-mt-24 px-4 py-24 sm:px-8">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono2 mb-3 flex items-center gap-2 text-xs tracking-[0.3em] text-neon uppercase">
            <span className="inline-block h-2 w-2 animate-pulse-dot rounded-full bg-neon" />
            04 — Собери сам
          </p>
          <h2 className="font-display text-3xl font-bold leading-[1.05] sm:text-5xl">
            ВЕСЬ СЕКРЕТ — <br />
            <span className="text-outline">60 СТРОК</span>{" "}
            <span className="text-neon">КОДА</span>
          </h2>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-white/55">
          Минимальный рабочий прототип: камера, модель и три жеста.
          Скопируйте по вкладкам — и у вас будет то же самое, что в демо выше.
        </p>
      </div>

      <div className="clip-corner overflow-hidden border border-line bg-[#080a10]">
        {/* шапка редактора */}
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-danger/70" />
            <span className="h-3 w-3 rounded-full bg-[#ffd479]/70" />
            <span className="h-3 w-3 rounded-full bg-neon/70" />
            <span className="font-mono2 ml-3 hidden text-[11px] text-white/35 sm:block">
              motion-control — {current.file}
            </span>
          </div>
          <button
            onClick={copy}
            className={cn(
              "font-mono2 flex items-center gap-2 border px-3 py-1.5 text-[11px] transition-all",
              copied ? "border-neon text-neon" : "border-white/15 text-white/55 hover:border-neon/60 hover:text-neon"
            )}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "СКОПИРОВАНО" : "КОПИРОВАТЬ"}
          </button>
        </div>

        {/* вкладки */}
        <div className="flex overflow-x-auto border-b border-line">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "font-mono2 flex shrink-0 items-center gap-2 border-r border-line px-5 py-3 text-[12px] transition-colors",
                tab === t.id ? "bg-neon/10 text-neon" : "text-white/45 hover:bg-white/5 hover:text-white/80"
              )}
            >
              {t.lang === "bash" ? <TerminalSquare className="h-3.5 w-3.5" /> : <FileCode2 className="h-3.5 w-3.5" />}
              {t.file}
            </button>
          ))}
        </div>

        {/* код */}
        <div className="code-scroll overflow-x-auto">
          <div className="flex min-w-max">
            <div className="font-mono2 select-none border-r border-line px-4 py-5 text-right text-[12px] leading-6 text-white/20">
              {Array.from({ length: lines }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <pre className="font-mono2 px-5 py-5 text-[12px] leading-6">{highlighted}</pre>
          </div>
        </div>
      </div>

      <p className="font-mono2 mt-4 text-center text-[11px] text-white/35">
        // это упрощённая версия того самого кода, который управляет игрой в разделе «ДЕМО»
      </p>
    </section>
  );
}
