import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Webcam, Keyboard, RotateCcw, Volume2, VolumeX, Heart,
  Activity, Gauge, ArrowUp, MoveHorizontal, ChevronsDown,
  ShieldCheck, AlertTriangle, Crosshair, Loader2, SwitchCamera,
} from "lucide-react";
import { usePoseEngine, POSE_BONES, STATUS_LABEL } from "../hooks/usePoseEngine";
import { cn } from "../utils/cn";

/* ================= мир ================= */

const W = 960;
const H = 540;
const FLOOR = 466;
const STAND_H = 98;
const DUCK_H = 54;

type Obstacle = { x: number; type: "low" | "high"; passed: boolean };
type Coin = { x: number; y: number; r: number; t: number; taken: boolean };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };

interface World {
  x: number; y: number; vy: number; duckLerp: number; phase: number;
  obstacles: Obstacle[]; coins: Coin[]; particles: Particle[];
  trail: { x: number; y: number; duck: number }[];
  speed: number; dist: number; coinCount: number;
  obTimer: number; coinTimer: number;
  lives: number; invuln: number; shake: number; flash: number;
}

function createWorld(): World {
  return {
    x: W / 2, y: FLOOR, vy: 0, duckLerp: 0, phase: 0,
    obstacles: [], coins: [], particles: [],
    trail: [], speed: 340, dist: 0, coinCount: 0,
    obTimer: 1.4, coinTimer: 0.8,
    lives: 3, invuln: 0, shake: 0, flash: 0,
  };
}

const NEON = "#c9ff3f";
const CYAN = "#5ef2ff";
const VIOLET = "#9d8cff";
const RED = "#ff4d6d";

/* ================ звук ================ */

function makeAudio() {
  let ctx: AudioContext | null = null;
  const ac = () => (ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)());
  const blip = (f0: number, f1: number, dur: number, type: OscillatorType, gain = 0.08) => {
    try {
      const a = ac();
      if (a.state === "suspended") void a.resume();
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, a.currentTime);
      o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), a.currentTime + dur);
      g.gain.setValueAtTime(gain, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
      o.connect(g).connect(a.destination);
      o.start(); o.stop(a.currentTime + dur);
    } catch { /* ignore */ }
  };
  return {
    jump: () => blip(240, 640, 0.16, "square", 0.05),
    coin: () => { blip(880, 1320, 0.09, "sine", 0.06); setTimeout(() => blip(1320, 1760, 0.12, "sine", 0.05), 60); },
    hit: () => blip(220, 40, 0.35, "sawtooth", 0.1),
    over: () => { blip(320, 60, 0.7, "triangle", 0.09); },
    start: () => blip(440, 880, 0.18, "sine", 0.06),
  };
}

/* ================ рисование героя ================ */

function drawHero(c: CanvasRenderingContext2D, w: World, tint = NEON, alpha = 1) {
  const duck = w.duckLerp;
  const hh = STAND_H + (DUCK_H - STAND_H) * duck;
  const hipY = -hh * 0.46;
  const headY = -hh + 13;
  const air = w.y < FLOOR - 2;

  c.save();
  c.globalAlpha = alpha;
  c.translate(w.x, w.y);
  c.lineCap = "round";
  c.lineJoin = "round";
  c.strokeStyle = tint;
  c.fillStyle = tint;
  c.lineWidth = 5.5;
  c.shadowColor = tint;
  c.shadowBlur = 16;

  const ph = w.phase;
  // ноги
  for (let i = 0; i < 2; i++) {
    const a = ph + i * Math.PI;
    let fx: number, fy: number;
    if (air) { fx = 10 + i * 9; fy = -14 - i * 7; }
    else if (duck > 0.5) { fx = (i === 0 ? -1 : 1) * 15; fy = 0; }
    else { fx = Math.sin(a) * 17; fy = -Math.max(0, Math.cos(a)) * 13; }
    const kneeX = fx * 0.45 + (i === 0 ? -3 : 3);
    const kneeY = (hipY + fy) / 2 - 4;
    c.beginPath();
    c.moveTo(0, hipY);
    c.quadraticCurveTo(kneeX, kneeY, fx, fy);
    c.stroke();
  }
  // торс
  c.beginPath();
  c.moveTo(0, hipY);
  c.lineTo(0, headY + 16);
  c.stroke();
  // руки
  for (let i = 0; i < 2; i++) {
    const a = ph + (i === 0 ? Math.PI : 0);
    const swing = air ? 8 : Math.sin(a) * 13;
    const ex = -swing, ey = hipY - 14;
    const hx = -swing * 1.7 + (i === 0 ? -4 : 4), hy = ey + 13;
    c.beginPath();
    c.moveTo(0, headY + 18);
    c.quadraticCurveTo(ex, ey, hx, hy);
    c.stroke();
  }
  // голова
  c.beginPath();
  c.arc(0, headY, 11, 0, Math.PI * 2);
  c.fill();
  // «глаз» — сенсор
  c.shadowBlur = 0;
  c.fillStyle = "#06070c";
  c.fillRect(2, headY - 2.5, 7, 5);
  c.restore();
}

/* ================ компонент ================ */

type Mode = "camera" | "manual";

export default function MotionGame() {
  const { status, error, signalsRef, start, stop } = usePoseEngine();

  const [mode, setMode] = useState<Mode>("camera");
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [lives, setLives] = useState(3);
  const [best, setBest] = useState<number>(() => Number(localStorage.getItem("mp-best") ?? 0));
  const [muted, setMuted] = useState(false);
  const [hudSig, setHudSig] = useState({ tracked: false, handsUp: false, duck: false, fps: 0, conf: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const worldRef = useRef<World>(createWorld());
  const overRef = useRef(false);
  const mutedRef = useRef(false);
  const modeRef = useRef<Mode>("camera");
  const pointerX = useRef<number | null>(null);
  const manualJump = useRef(false);
  const manualDuck = useRef(false);
  const visibleRef = useRef(true);
  const audioRef = useRef<ReturnType<typeof makeAudio> | null>(null);
  const hudTimer = useRef(0);

  modeRef.current = mode;
  mutedRef.current = muted;
  overRef.current = over;

  const sound = () => {
    if (mutedRef.current) return null;
    return (audioRef.current ??= makeAudio());
  };

  /* ---------- запуск ---------- */
  const cameraAlive = () => {
    const s = videoRef.current?.srcObject as MediaStream | null;
    return !!(s && s.active && s.getVideoTracks().some((t) => t.readyState === "live"));
  };

  const begin = async (m: Mode) => {
    setMode(m);
    setOver(false);
    setScore(0); setCoins(0); setLives(3);
    worldRef.current = createWorld();
    sound()?.start();
    if (m === "camera" && videoRef.current) {
      if (!cameraAlive()) void start(videoRef.current); // поток жив — не перезапрашиваем
    } else if (m === "manual") {
      stop();
    }
    setRunning(true);
  };

  const quit = () => {
    stop();
    setRunning(false);
    setOver(false);
  };

  useEffect(() => () => stop(), [stop]);

  /* ---------- пауза вне экрана ---------- */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => (visibleRef.current = e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* ---------- клавиатура ---------- */
  useEffect(() => {
    if (!running) return;
    const down = (e: KeyboardEvent) => {
      if (["Space", "ArrowUp", "KeyW"].includes(e.code)) { manualJump.current = true; e.preventDefault(); }
      if (["ArrowDown", "KeyS"].includes(e.code)) manualDuck.current = true;
    };
    const up = (e: KeyboardEvent) => {
      if (["ArrowDown", "KeyS"].includes(e.code)) manualDuck.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [running]);

  /* ---------- главный цикл ---------- */
  useEffect(() => {
    if (!running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = rect.width * dpr;
      canvas.height = (rect.width * H / W) * dpr;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    let raf = 0;
    let last = performance.now();

    const tryJump = (w: World) => {
      if (w.y >= FLOOR - 0.5) {
        w.vy = -980;
        w.y = FLOOR - 1;
        sound()?.jump();
      }
    };

    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (!visibleRef.current || document.hidden) return;

      const w = worldRef.current;
      const sig = signalsRef.current;

      /* ---- ввод ---- */
      let duck = false;
      if (modeRef.current === "camera") {
        if (sig.handsUpEdge) { sig.handsUpEdge = false; if (overRef.current) { void begin("camera"); } else tryJump(w); }
        if (sig.tracked && sig.x !== null) {
          const tx = 40 + sig.x * (W - 80);
          w.x += (tx - w.x) * Math.min(1, dt * 10);
        }
        duck = sig.duck && w.y >= FLOOR - 40;
      } else {
        if (pointerX.current !== null) w.x += (pointerX.current - w.x) * Math.min(1, dt * 14);
        if (manualJump.current) { manualJump.current = false; if (overRef.current) { void begin("manual"); } else tryJump(w); }
        duck = manualDuck.current && w.y >= FLOOR - 40;
      }
      // клавиши тоже работают в режиме камеры
      if (manualJump.current) {
        manualJump.current = false;
        if (overRef.current) void begin(modeRef.current);
        else tryJump(w);
      }

      /* ---- логика ---- */
      if (!overRef.current) {
        w.dist += w.speed * dt;
        w.speed = Math.min(760, w.speed + dt * 7);
        w.phase += dt * (7 + w.speed * 0.012);

        // физика
        if (w.y < FLOOR || w.vy < 0) {
          w.vy += 2500 * dt * (duck ? 2.2 : 1);
          w.y += w.vy * dt;
          if (w.y >= FLOOR) { w.y = FLOOR; w.vy = 0; }
        }
        w.duckLerp += ((duck ? 1 : 0) - w.duckLerp) * Math.min(1, dt * 12);
        w.invuln = Math.max(0, w.invuln - dt);
        w.shake = Math.max(0, w.shake - dt * 3);
        w.flash = Math.max(0, w.flash - dt * 2.5);

        w.trail.unshift({ x: w.x, y: w.y, duck: w.duckLerp });
        if (w.trail.length > 7) w.trail.pop();

        // спавн препятствий
        w.obTimer -= dt;
        if (w.obTimer <= 0) {
          const type: "low" | "high" = Math.random() < 0.58 ? "low" : "high";
          const lastOb = w.obstacles[w.obstacles.length - 1];
          if (!lastOb || lastOb.x < W - 240) {
            w.obstacles.push({ x: W + 80, type, passed: false });
            w.obTimer = 0.85 + Math.random() * 0.75 + Math.max(0, (560 - w.speed) / 900);
          } else w.obTimer = 0.2;
        }
        // монеты
        w.coinTimer -= dt;
        if (w.coinTimer <= 0) {
          const cx = W + 60;
          const cy = FLOOR - 60 - Math.random() * 130;
          const clear = !w.obstacles.some((o) => o.x > W - 60);
          if (clear) w.coins.push({ x: cx, y: cy, r: 11, t: Math.random() * 6, taken: false });
          w.coinTimer = 0.55 + Math.random() * 1.1;
        }

        // движение объектов
        for (const o of w.obstacles) o.x -= w.speed * dt;
        for (const c of w.coins) c.x -= w.speed * dt;
        w.obstacles = w.obstacles.filter((o) => o.x > -120);
        w.coins = w.coins.filter((c) => c.x > -60 && !c.taken);

        // герой AABB
        const hh = STAND_H + (DUCK_H - STAND_H) * w.duckLerp;
        const hx0 = w.x - 15, hx1 = w.x + 15, hy0 = w.y - hh, hy1 = w.y;

        // столкновения
        if (w.invuln <= 0) {
          for (const o of w.obstacles) {
            let ox0: number, ox1: number, oy0: number, oy1: number;
            if (o.type === "low") { ox0 = o.x - 24; ox1 = o.x + 24; oy0 = FLOOR - 48; oy1 = FLOOR; }
            else { ox0 = o.x - 30; ox1 = o.x + 30; oy0 = FLOOR - 132; oy1 = FLOOR - 74; }
            if (hx1 > ox0 && hx0 < ox1 && hy1 > oy0 && hy0 < oy1) {
              w.lives -= 1;
              setLives(w.lives);
              w.invuln = 1.4;
              w.shake = 1;
              w.flash = 1;
              burst(w, w.x, w.y - hh / 2, RED, 18);
              sound()?.hit();
              if (w.lives <= 0) {
                overRef.current = true;
                setOver(true);
                sound()?.over();
                const sc = Math.floor(w.dist / 60) + w.coinCount * 10;
                setBest((b) => { const nb = Math.max(b, sc); localStorage.setItem("mp-best", String(nb)); return nb; });
              }
              break;
            }
          }
        }

        // монеты
        for (const c of w.coins) {
          if (!c.taken && hx1 > c.x - c.r && hx0 < c.x + c.r && hy1 > c.y - c.r && hy0 < c.y + c.r) {
            c.taken = true;
            w.coinCount += 1;
            burst(w, c.x, c.y, CYAN, 10);
            sound()?.coin();
          }
        }
      }

      // частицы
      for (const p of w.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; p.life -= dt; }
      w.particles = w.particles.filter((p) => p.life > 0);

      /* ---- HUD throttle ---- */
      hudTimer.current -= dt;
      if (hudTimer.current <= 0) {
        hudTimer.current = 0.12;
        setScore(Math.floor(w.dist / 60) + w.coinCount * 10);
        setCoins(w.coinCount);
        setHudSig({ tracked: sig.tracked, handsUp: sig.handsUp, duck: sig.duck, fps: sig.fps, conf: sig.confidence });
      }

      /* ---- рендер ---- */
      render(ctx, canvas, w, now / 1000);
    };

    const burst = (w: World, x: number, y: number, color: string, n: number) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 140 + Math.random() * 320;
        w.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, life: 0.5 + Math.random() * 0.4, max: 0.9, color, size: 2 + Math.random() * 3.5 });
      }
    };

    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  /* ---------- рендер сцены ---------- */
  const render = (c: CanvasRenderingContext2D, canvas: HTMLCanvasElement, w: World, t: number) => {
    const k = canvas.width / W;
    c.setTransform(k, 0, 0, k, 0, 0);

    // тряска
    if (w.shake > 0) {
      const s = w.shake * 9;
      c.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }

    // фон
    c.fillStyle = "#07080d";
    c.fillRect(-20, -20, W + 40, H + 40);
    c.strokeStyle = "rgba(255,255,255,0.035)";
    c.lineWidth = 1;
    for (let gx = (-(w.dist * 0.25) % 48); gx < W; gx += 48) { c.beginPath(); c.moveTo(gx, FLOOR); c.lineTo(gx - 90, H); c.stroke(); }
    // горизонт
    const grad = c.createLinearGradient(0, FLOOR - 170, 0, H);
    grad.addColorStop(0, "rgba(201,255,63,0)");
    grad.addColorStop(1, "rgba(201,255,63,0.07)");
    c.fillStyle = grad;
    c.fillRect(0, FLOOR - 170, W, H - FLOOR + 170);
    // пол
    c.strokeStyle = "rgba(201,255,63,0.5)";
    c.lineWidth = 2;
    c.shadowColor = NEON; c.shadowBlur = 10;
    c.beginPath(); c.moveTo(0, FLOOR + 1); c.lineTo(W, FLOOR + 1); c.stroke();
    c.shadowBlur = 0;
    // бегущие засечки
    c.strokeStyle = "rgba(255,255,255,0.12)";
    for (let gx = (-(w.dist) % 96); gx < W; gx += 96) { c.beginPath(); c.moveTo(gx, FLOOR + 12); c.lineTo(gx - 26, FLOOR + 12); c.stroke(); }

    // монеты
    for (const cn of w.coins) {
      const bob = Math.sin(t * 4 + cn.t) * 6;
      c.save();
      c.translate(cn.x, cn.y + bob);
      c.rotate(Math.sin(t * 2.4 + cn.t) * 0.5);
      c.strokeStyle = CYAN; c.lineWidth = 3;
      c.shadowColor = CYAN; c.shadowBlur = 14;
      c.beginPath(); c.arc(0, 0, cn.r, 0, Math.PI * 2); c.stroke();
      c.fillStyle = CYAN;
      c.rotate(Math.PI / 4);
      c.fillRect(-4, -4, 8, 8);
      c.restore();
    }

    // препятствия
    for (const o of w.obstacles) {
      c.save();
      if (o.type === "low") {
        c.translate(o.x, FLOOR);
        c.fillStyle = "rgba(255,77,109,0.16)";
        c.fillRect(-24, -48, 48, 48);
        c.strokeStyle = RED; c.lineWidth = 2.5;
        c.shadowColor = RED; c.shadowBlur = 12;
        c.strokeRect(-24, -48, 48, 48);
        c.shadowBlur = 0;
        c.fillStyle = RED;
        for (let i = 0; i < 3; i++) c.fillRect(-20 + i * 16, -14, 8, 10);
      } else {
        c.translate(o.x, FLOOR - 103);
        c.fillStyle = "rgba(157,140,255,0.15)";
        c.fillRect(-30, -29, 60, 58);
        c.strokeStyle = VIOLET; c.lineWidth = 2.5;
        c.shadowColor = VIOLET; c.shadowBlur = 12;
        c.strokeRect(-30, -29, 60, 58);
        c.shadowBlur = 0;
        c.fillStyle = VIOLET;
        c.beginPath();
        c.moveTo(-10, -12); c.lineTo(10, -12); c.lineTo(0, 10); c.closePath();
        c.fill();
        // индикатор «пригнись»
        c.fillStyle = "rgba(157,140,255,0.9)";
        c.beginPath(); c.moveTo(-8, -46); c.lineTo(8, -46); c.lineTo(0, -36); c.fill();
      }
      c.restore();
    }

    // след
    for (let i = w.trail.length - 1; i >= 1; i--) {
      const tr = w.trail[i];
      const ghost: World = { ...w, x: tr.x, y: tr.y, duckLerp: tr.duck };
      drawHero(c, ghost, CYAN, (1 - i / w.trail.length) * 0.16);
    }

    // герой (мерцание при неуязвимости)
    if (!(w.invuln > 0 && Math.floor(t * 18) % 2 === 0)) drawHero(c, w);

    // частицы
    for (const p of w.particles) {
      c.globalAlpha = Math.max(0, p.life / p.max);
      c.fillStyle = p.color;
      c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    c.globalAlpha = 1;

    // красная вспышка
    if (w.flash > 0) {
      c.fillStyle = `rgba(255,77,109,${w.flash * 0.15})`;
      c.fillRect(0, 0, W, H);
    }

    /* ---- камера-превью + скелет ---- */
    const vc = camCanvasRef.current;
    const video = videoRef.current;
    if (vc && video) {
      const vctx = vc.getContext("2d");
      if (vctx) {
        const vw = vc.width, vh = vc.height;
        vctx.fillStyle = "#05060a";
        vctx.fillRect(0, 0, vw, vh);
        if (video.readyState >= 2 && video.videoWidth > 0) {
          vctx.save();
          vctx.translate(vw, 0); vctx.scale(-1, 1);
          vctx.globalAlpha = 0.9;
          vctx.drawImage(video, 0, 0, vw, vh);
          vctx.restore();
        }
        const sig = signalsRef.current;
        if (sig.joints && sig.tracked) {
          vctx.save();
          vctx.lineWidth = 2;
          vctx.strokeStyle = "rgba(201,255,63,0.85)";
          vctx.shadowColor = NEON; vctx.shadowBlur = 5;
          for (const [a, b] of POSE_BONES) {
            const ja = sig.joints[a], jb = sig.joints[b];
            if (ja.v < 0.3 || jb.v < 0.3) continue;
            vctx.beginPath();
            vctx.moveTo(ja.x * vw, ja.y * vh);
            vctx.lineTo(jb.x * vw, jb.y * vh);
            vctx.stroke();
          }
          for (let i = 0; i < sig.joints.length; i++) {
            const j = sig.joints[i];
            if (j.v < 0.3) continue;
            const big = i === 0 || i === 15 || i === 16;
            vctx.beginPath();
            vctx.fillStyle = big ? CYAN : NEON;
            vctx.arc(j.x * vw, j.y * vh, big ? 4.5 : 2.6, 0, Math.PI * 2);
            vctx.fill();
          }
          vctx.restore();
        }
      }
    }
  };

  const loading = status === "loading-wasm" || status === "loading-model" || status === "starting-camera" || status === "calibrating";

  return (
    <section id="demo" className="relative mx-auto max-w-[1400px] scroll-mt-20 px-4 py-24 sm:px-8">
      <video ref={videoRef} playsInline muted className="pointer-events-none fixed h-px w-px opacity-0" />

      {/* заголовок секции */}
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono2 mb-3 flex items-center gap-2 text-xs tracking-[0.3em] text-neon uppercase">
            <span className="inline-block h-2 w-2 animate-pulse-dot rounded-full bg-neon" />
            01 — Живое демо
          </p>
          <h2 className="font-display text-3xl font-bold leading-[1.05] sm:text-5xl">
            ПОПРОБУЙ <span className="text-outline">ПРЯМО</span>
            <br />
            <span className="text-neon">СЕЙЧАС</span>
          </h2>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-white/55">
          Это не видео и не картинка — тот самый пайплайн «камера → скелет → действия»
          работает у вас в браузере. Управляй героем движениями тела:{" "}
          <span className="text-white/90">руки вверх — прыжок</span>,{" "}
          <span className="text-white/90">присед — кувырок</span>,{" "}
          <span className="text-white/90">шаги в стороны — бег</span>.
        </p>
      </div>

      <div ref={wrapRef} className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* ============ ИГРА ============ */}
        <div className="clip-corner relative overflow-hidden border border-line bg-deep">
          {!running ? (
            <div className="grid-bg-fine relative flex aspect-[16/9] flex-col items-center justify-center gap-8 p-6">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,255,63,0.06),transparent_60%)]" />
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative text-center"
              >
                <Crosshair className="mx-auto mb-4 h-10 w-10 text-neon" strokeWidth={1.2} />
                <h3 className="font-display text-xl font-bold sm:text-2xl">КАК БУДЕМ ИГРАТЬ?</h3>
                <p className="mt-2 text-sm text-white/50">Камера работает локально — кадры никуда не отправляются</p>
              </motion.div>

              <div className="relative flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => void begin("camera")}
                  className="group flex items-center gap-3 border border-neon bg-neon px-7 py-4 font-mono2 text-sm font-bold tracking-wider text-void transition-all hover:bg-transparent hover:text-neon"
                >
                  <Webcam className="h-5 w-5" />
                  ИГРАТЬ С КАМЕРОЙ
                </button>
                <button
                  onClick={() => void begin("manual")}
                  className="flex items-center gap-3 border border-white/25 px-7 py-4 font-mono2 text-sm tracking-wider text-white/80 transition-all hover:border-cyan-neon hover:text-cyan-neon"
                >
                  <Keyboard className="h-5 w-5" />
                  БЕЗ КАМЕРЫ
                </button>
              </div>

              <div className="relative grid max-w-lg grid-cols-1 gap-2 text-[11px] font-mono2 text-white/40 sm:grid-cols-3">
                <span className="flex items-center gap-2"><ArrowUp className="h-3.5 w-3.5 text-neon" /> руки вверх — прыжок</span>
                <span className="flex items-center gap-2"><ChevronsDown className="h-3.5 w-3.5 text-violet-neon" /> присед — подкат</span>
                <span className="flex items-center gap-2"><MoveHorizontal className="h-3.5 w-3.5 text-cyan-neon" /> шаги — бег</span>
              </div>
            </div>
          ) : (
            <div className="relative">
              <canvas
                ref={canvasRef}
                onPointerMove={(e) => {
                  if (mode !== "manual") return;
                  const r = e.currentTarget.getBoundingClientRect();
                  pointerX.current = ((e.clientX - r.left) / r.width) * W;
                }}
                onPointerDown={() => { if (mode === "manual") manualJump.current = true; }}
                className={cn("block aspect-[16/9] w-full touch-none select-none", mode === "manual" && "cursor-crosshair")}
              />

              {/* HUD */}
              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <Heart
                      key={i}
                      className={cn("h-5 w-5 transition-all", i < lives ? "fill-danger text-danger" : "text-white/15")}
                    />
                  ))}
                </div>
                <div className="text-center">
                  <div className="font-mono2 text-3xl font-bold tabular-nums text-white drop-shadow-[0_0_12px_rgba(201,255,63,0.4)]">
                    {String(score).padStart(6, "0")}
                  </div>
                  <div className="font-mono2 text-[10px] tracking-widest text-white/40">
                    SCORE · BEST {String(best).padStart(6, "0")} · ×{coins}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMuted((m) => !m)}
                    className="pointer-events-auto border border-white/15 bg-void/60 p-2 text-white/60 backdrop-blur transition-colors hover:text-neon"
                    aria-label="Звук"
                  >
                    {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={quit}
                    className="pointer-events-auto border border-white/15 bg-void/60 p-2 font-mono2 text-[10px] text-white/60 backdrop-blur transition-colors hover:text-danger"
                  >
                    <SwitchCamera className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* загрузка / ошибка / гейм-овер */}
              {mode === "camera" && loading && !over && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-void/80 backdrop-blur-sm">
                  <Loader2 className="h-8 w-8 animate-spin text-neon" />
                  <p className="font-mono2 text-sm text-white/80">{STATUS_LABEL[status]}</p>
                  <div className="flex gap-1.5">
                    {["loading-wasm", "loading-model", "starting-camera", "calibrating"].map((s, i) => {
                      const order = ["loading-wasm", "loading-model", "starting-camera", "calibrating"];
                      const cur = order.indexOf(status);
                      return <span key={s} className={cn("h-1 w-10", i <= cur ? "bg-neon" : "bg-white/15")} />;
                    })}
                  </div>
                </div>
              )}
              {mode === "camera" && status === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-void/90 p-6 text-center backdrop-blur">
                  <AlertTriangle className="h-8 w-8 text-danger" />
                  <p className="max-w-md font-mono2 text-sm text-white/75">{error}</p>
                  <button
                    onClick={() => void begin("manual")}
                    className="flex items-center gap-2 border border-neon px-6 py-3 font-mono2 text-sm text-neon transition-colors hover:bg-neon hover:text-void"
                  >
                    <Keyboard className="h-4 w-4" /> Играть без камеры
                  </button>
                </div>
              )}
              {over && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-void/85 backdrop-blur-sm"
                >
                  <p className="font-mono2 text-xs tracking-[0.4em] text-danger">GAME OVER</p>
                  <p className="font-display text-5xl font-black text-white">{score}</p>
                  <p className="font-mono2 text-xs text-white/45">монет собрано: {coins} · рекорд: {best}</p>
                  <button
                    onClick={() => void begin(mode)}
                    className="mt-2 flex items-center gap-2 border border-neon bg-neon px-7 py-3.5 font-mono2 text-sm font-bold text-void transition-all hover:bg-transparent hover:text-neon"
                  >
                    <RotateCcw className="h-4 w-4" /> ЕЩЁ РАЗ
                  </button>
                  {mode === "camera" && (
                    <p className="font-mono2 text-[11px] text-white/40">…или просто поднимите обе руки вверх</p>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* ============ ПАНЕЛЬ КАМЕРЫ ============ */}
        <div className="flex flex-col gap-4">
          {/* вид с камеры */}
          <div className="clip-corner relative overflow-hidden border border-line bg-deep">
            <div className="flex items-center justify-between border-b border-line px-3 py-2">
              <span className="font-mono2 flex items-center gap-2 text-[10px] tracking-[0.25em] text-white/50">
                <Webcam className="h-3.5 w-3.5" /> CV-ВХОД
              </span>
              <span
                className={cn(
                  "font-mono2 flex items-center gap-1.5 text-[10px]",
                  status === "tracking" && hudSig.tracked ? "text-neon" : "text-white/35"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", status === "tracking" && hudSig.tracked ? "animate-pulse-dot bg-neon" : "bg-white/25")} />
                {status === "tracking" ? (hudSig.tracked ? "ТРЕКИНГ" : "НЕТ ЦЕЛИ") : status === "idle" ? "ВЫКЛ" : "…"}
              </span>
            </div>
            <div className="relative">
              <canvas ref={camCanvasRef} width={320} height={180} className="block w-full" />
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="h-16 w-full animate-scanline bg-gradient-to-b from-transparent via-neon/10 to-transparent" />
              </div>
              {/* уголки прицела */}
              {["left-2 top-2 border-l border-t", "right-2 top-2 border-r border-t", "left-2 bottom-2 border-l border-b", "right-2 bottom-2 border-r border-b"].map((pos) => (
                <span key={pos} className={cn("absolute h-3 w-3 border-neon/60", pos)} />
              ))}
            </div>
          </div>

          {/* лампы действий */}
          <div className="clip-corner border border-line bg-deep p-3">
            <p className="font-mono2 mb-3 flex items-center gap-2 text-[10px] tracking-[0.25em] text-white/50">
              <Activity className="h-3.5 w-3.5" /> РАСПОЗНАННЫЕ ДЕЙСТВИЯ
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "ПРЫЖОК", on: hudSig.handsUp, color: "text-neon border-neon/60 bg-neon/10" },
                { label: "ПОДКАТ", on: hudSig.duck, color: "text-violet-neon border-violet-neon/60 bg-violet-neon/10" },
                { label: "В КАДРЕ", on: hudSig.tracked, color: "text-cyan-neon border-cyan-neon/60 bg-cyan-neon/10" },
              ].map((l) => (
                <div
                  key={l.label}
                  className={cn(
                    "border px-2 py-2.5 text-center font-mono2 text-[10px] tracking-wider transition-all duration-150",
                    l.on ? l.color : "border-white/10 text-white/30"
                  )}
                >
                  {l.label}
                </div>
              ))}
            </div>
          </div>

          {/* метрики */}
          <div className="clip-corner border border-line bg-deep p-3 font-mono2 text-[11px]">
            <p className="mb-3 flex items-center gap-2 text-[10px] tracking-[0.25em] text-white/50">
              <Gauge className="h-3.5 w-3.5" /> ТЕЛЕМЕТРИЯ
            </p>
            <div className="space-y-2 text-white/60">
              <div className="flex justify-between"><span>fps детекции</span><span className="text-white">{hudSig.fps.toFixed(0)}</span></div>
              <div className="flex justify-between"><span>уверенность</span>
                <span className="text-white">{Math.round(hudSig.conf * 100)}%</span>
              </div>
              <div className="h-1 w-full bg-white/10">
                <div className="h-full bg-neon transition-all duration-200" style={{ width: `${hudSig.conf * 100}%` }} />
              </div>
              <div className="flex justify-between pt-1"><span>ключевых точек</span><span className="text-white">33 / 33</span></div>
              <div className="flex justify-between"><span>инференс</span><span className="text-neon">GPU · локально</span></div>
            </div>
          </div>

          <div className="clip-corner flex items-start gap-2 border border-line bg-deep p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-neon" />
            <p className="text-[11px] leading-relaxed text-white/50">
              Видеопоток обрабатывается нейросетью прямо на вашем устройстве
              и никогда не покидает браузер.
            </p>
          </div>
        </div>
      </div>

      {/* подсказки управления */}
      {running && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 border border-line bg-deep px-4 py-3 font-mono2 text-[11px] text-white/45">
          {mode === "camera" ? (
            <>
              <span className="flex items-center gap-2"><MoveHorizontal className="h-3.5 w-3.5 text-cyan-neon" /> двигайтесь влево-вправо</span>
              <span className="flex items-center gap-2"><ArrowUp className="h-3.5 w-3.5 text-neon" /> резко поднимите руки — прыжок</span>
              <span className="flex items-center gap-2"><ChevronsDown className="h-3.5 w-3.5 text-violet-neon" /> присядьте — подкат</span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-2"><MoveHorizontal className="h-3.5 w-3.5 text-cyan-neon" /> ведите мышь / палец</span>
              <span className="flex items-center gap-2"><ArrowUp className="h-3.5 w-3.5 text-neon" /> клик / пробел — прыжок</span>
              <span className="flex items-center gap-2"><ChevronsDown className="h-3.5 w-3.5 text-violet-neon" /> S / ↓ — подкат</span>
            </>
          )}
        </div>
      )}
    </section>
  );
}
