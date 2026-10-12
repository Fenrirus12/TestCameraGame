import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ScanEye, Waves, Video } from "lucide-react";

/* Фон: «парящие» ключевые точки, соединённые линиями — как решётка мокапа */
function Constellation() {
  const ref = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0, h = 0, raf = 0;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const N = 70;
    const pts = Array.from({ length: N }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0004, vy: (Math.random() - 0.5) * 0.0004,
      r: 1 + Math.random() * 1.8,
      hue: Math.random() < 0.75 ? "#c9ff3f" : "#5ef2ff",
    }));

    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = w * DPR; canvas.height = h * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    const step = () => {
      raf = requestAnimationFrame(step);
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
      }
      // связи
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const a = pts[i], b = pts[j];
          const dx = (a.x - b.x) * w, dy = (a.y - b.y) * h;
          const d = Math.hypot(dx, dy);
          if (d < 110) {
            ctx.globalAlpha = (1 - d / 110) * 0.28;
            ctx.strokeStyle = "#c9ff3f";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x * w, a.y * h);
            ctx.lineTo(b.x * w, b.y * h);
            ctx.stroke();
          }
        }
      }
      // мышь притягивает линии
      const mx = mouse.current.x, my = mouse.current.y;
      ctx.globalAlpha = 1;
      for (const p of pts) {
        const px = p.x * w, py = p.y * h;
        const dm = Math.hypot(px - mx, py - my);
        if (dm < 170) {
          ctx.globalAlpha = (1 - dm / 170) * 0.5;
          ctx.strokeStyle = "#5ef2ff";
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(mx, my); ctx.stroke();
        }
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = p.hue;
        ctx.beginPath(); ctx.arc(px, py, p.r, 0, Math.PI * 2); ctx.fill();
      }
    };
    raf = requestAnimationFrame(step);
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    window.addEventListener("pointermove", onMove);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("pointermove", onMove); };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}

export default function Hero() {
  return (
    <header className="grid-bg relative flex min-h-screen flex-col overflow-hidden">
      {/* свечения */}
      <div className="pointer-events-none absolute -top-40 left-1/4 h-[520px] w-[520px] rounded-full bg-neon/10 blur-[140px]" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-[420px] w-[420px] rounded-full bg-violet-neon/10 blur-[140px]" />
      <Constellation />

      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center px-4 pb-28 pt-32 sm:px-8">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="font-mono2 mb-6 flex flex-wrap items-center gap-3 text-[11px] tracking-[0.35em] text-neon sm:text-xs"
        >
          <span className="inline-block h-2 w-2 animate-pulse-dot rounded-full bg-neon" />
          КОМПЬЮТЕРНОЕ ЗРЕНИЕ / ВЕБ-КАМЕРА / НЕЙРОСЕТЬ В БРАУЗЕРЕ
        </motion.p>

        <h1 className="font-display font-black leading-[0.95] tracking-tight">
          <motion.span
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="block text-[11vw] sm:text-[8vw] lg:text-[6.5vw]"
          >
            ТЕЛО — ЭТО
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.22 }}
            className="block text-[11vw] text-neon drop-shadow-[0_0_30px_rgba(201,255,63,0.35)] sm:text-[8vw] lg:text-[6.5vw]"
          >
            ДЖОЙСТИК
          </motion.span>
        </h1>

        <div className="mt-10 flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="max-w-xl text-base leading-relaxed text-white/60 sm:text-lg"
          >
            Как в том видео: камера смотрит на вас, нейросеть находит{" "}
            <span className="text-white">33 ключевые точки скелета</span>, а игра превращает
            прыжки, наклоны и приседания в команды персонажу. Ниже —{" "}
            <span className="text-neon">работающее демо</span>, разбор технологий и весь код.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="flex flex-wrap gap-3"
          >
            <a
              href="#demo"
              className="group flex items-center gap-3 border border-neon bg-neon px-7 py-4 font-mono2 text-sm font-bold tracking-wider text-void transition-all hover:bg-transparent hover:text-neon"
            >
              <ScanEye className="h-5 w-5 transition-transform group-hover:scale-110" />
              ЗАПУСТИТЬ ДЕМО
            </a>
            <a
              href="#how"
              className="flex items-center gap-3 border border-white/25 px-7 py-4 font-mono2 text-sm tracking-wider text-white/80 transition-all hover:border-cyan-neon hover:text-cyan-neon"
            >
              <Waves className="h-5 w-5" />
              КАК ЭТО УСТРОЕНО
            </a>
          </motion.div>
        </div>

        {/* статы */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-16 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4"
        >
          {[
            ["33", "ключевые точки тела"],
            ["~30 fps", "детекция на GPU"],
            ["0", "установок — всё в браузере"],
            ["100%", "локально, без сервера"],
          ].map(([v, l]) => (
            <div key={l} className="bg-void/80 px-5 py-4 backdrop-blur">
              <div className="font-display text-2xl font-bold text-white sm:text-3xl">{v}</div>
              <div className="font-mono2 mt-1 text-[10px] uppercase tracking-widest text-white/40">{l}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* скролл-хинт */}
      <motion.a
        href="#demo"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-white/40 transition-colors hover:text-neon"
        aria-label="К демо"
      >
        <span className="flex flex-col items-center gap-1 font-mono2 text-[10px] tracking-[0.3em]">
          <Video className="h-4 w-4" />
          СКРОЛЛ
          <ArrowDown className="h-4 w-4 animate-bounce" />
        </span>
      </motion.a>
    </header>
  );
}
