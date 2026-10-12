import { motion } from "framer-motion";
import { Camera, Bone, FunctionSquare, Gamepad2, ArrowRight } from "lucide-react";

const STEPS = [
  {
    icon: Camera,
    num: "01",
    title: "Камера захватывает кадры",
    text: "Браузер получает видеопоток через getUserMedia — 30–60 кадров в секунду. Каждый кадр — просто картинка, пока никакой магии.",
    chip: 'navigator.mediaDevices.getUserMedia({ video: true })',
    color: "text-cyan-neon border-cyan-neon/40 bg-cyan-neon/5",
  },
  {
    icon: Bone,
    num: "02",
    title: "Нейросеть ищет скелет",
    text: "ML-модель (MediaPipe Pose, MoveNet) прогоняет каждый кадр и возвращает 33 точки: нос, плечи, локти, запястья, бёдра, колени — с координатами x, y и глубиной z.",
    chip: "pose = [ {x:0.51, y:0.22, z:-0.03}, … ×33 ]",
    color: "text-neon border-neon/40 bg-neon/5",
  },
  {
    icon: FunctionSquare,
    num: "03",
    title: "Координаты → жесты",
    text: "Сравниваем точки между собой: запястья выше носа — «руки вверх», торс сжался — «присел», центр плеч сместился — «шаг в сторону». Обязательно сглаживание и пороги с гистерезисом.",
    chip: "if (wrist.y < nose.y) emit('jump')",
    color: "text-violet-neon border-violet-neon/40 bg-violet-neon/5",
  },
  {
    icon: Gamepad2,
    num: "04",
    title: "Игра получает команды",
    text: "События уходят в игровой цикл (requestAnimationFrame): герой прыгает, персонаж бежит, ракетка движется. Всё вместе — до 16 мс задержки, незаметно для игрока.",
    chip: "player.vy = -980 // прыжок!",
    color: "text-danger border-danger/40 bg-danger/5",
  },
];

/* Мини-схема: точки скелета поднимают руки = прыжок */
function SkeletonScheme() {
  return (
    <div className="clip-corner relative overflow-hidden border border-line bg-deep p-6">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
        {/* скелет с поднятой рукой */}
        <svg viewBox="0 0 160 170" className="h-44 w-40">
          <g stroke="#c9ff3f" strokeWidth="2.5" strokeLinecap="round" fill="none">
            <line x1="80" y1="42" x2="80" y2="95" />
            <line x1="80" y1="55" x2="45" y2="80" />
            <line x1="45" y1="80" x2="40" y2="105" />
            <motion.line
              x1="80" y1="55" x2="112" y2="40"
              animate={{ x2: [112, 118, 112], y2: [40, 8, 40] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.line
              x1="112" y1="40" x2="128" y2="30"
              animate={{
                x1: [112, 118, 112], y1: [40, 8, 40],
                x2: [128, 130, 128], y2: [30, 2, 30],
              }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <line x1="80" y1="95" x2="62" y2="130" />
            <line x1="62" y1="130" x2="58" y2="162" />
            <line x1="80" y1="95" x2="98" y2="130" />
            <line x1="98" y1="130" x2="102" y2="162" />
          </g>
          <g fill="#c9ff3f">
            <circle cx="80" cy="28" r="12" />
            <circle cx="80" cy="55" r="3.5" /><circle cx="80" cy="95" r="3.5" />
            <circle cx="45" cy="80" r="3.5" /><circle cx="40" cy="105" r="3.5" fill="#5ef2ff" />
            <circle cx="62" cy="130" r="3.5" /><circle cx="58" cy="162" r="3.5" />
            <circle cx="98" cy="130" r="3.5" /><circle cx="102" cy="162" r="3.5" />
            <motion.circle
              cx="128" cy="30" r="4.5" fill="#5ef2ff"
              animate={{ cx: [128, 130, 128], cy: [30, 2, 30] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </g>
        </svg>

        <div className="flex items-center gap-3 text-white/40">
          <div className="hidden flex-col items-center gap-1 sm:flex">
            <span className="font-mono2 text-[10px] tracking-widest">wrist.y &lt; nose.y</span>
            <ArrowRight className="h-5 w-5 text-neon" />
            <span className="font-mono2 text-[10px] tracking-widest">≈ 12 мс</span>
          </div>
          <ArrowRight className="h-5 w-5 rotate-90 text-neon sm:hidden" />
        </div>

        {/* герой прыгает */}
        <div className="relative h-44 w-40">
          <div className="absolute inset-x-0 bottom-0 h-px bg-neon/50" />
          <motion.svg
            viewBox="0 0 160 170"
            className="absolute bottom-1 h-40 w-36"
            animate={{ y: [0, -46, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <g stroke="#5ef2ff" strokeWidth="3" strokeLinecap="round" fill="none">
              <line x1="80" y1="45" x2="80" y2="98" />
              <line x1="80" y1="58" x2="55" y2="80" /><line x1="80" y1="58" x2="105" y2="80" />
              <line x1="80" y1="98" x2="64" y2="132" /><line x1="80" y1="98" x2="96" y2="132" />
            </g>
            <circle cx="80" cy="31" r="13" fill="#5ef2ff" />
            <rect x="84" y="28" width="8" height="5" fill="#06070c" />
          </motion.svg>
          <motion.span
            className="font-mono2 absolute left-1/2 top-2 -translate-x-1/2 text-[10px] tracking-[0.3em] text-cyan-neon"
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, times: [0, 0.15, 0.7, 1] }}
          >
            JUMP!
          </motion.span>
        </div>
      </div>
    </div>
  );
}

export default function Pipeline() {
  return (
    <section id="how" className="relative mx-auto max-w-[1400px] scroll-mt-24 px-4 py-24 sm:px-8">
      <p className="font-mono2 mb-3 flex items-center gap-2 text-xs tracking-[0.3em] text-neon uppercase">
        <span className="inline-block h-2 w-2 animate-pulse-dot rounded-full bg-neon" />
        02 — Анатомия трюка
      </p>
      <h2 className="font-display mb-4 text-3xl font-bold leading-[1.05] sm:text-5xl">
        КАК КАМЕРА <span className="text-outline">ПРЕВРАЩАЕТ</span>
        <br />
        ДВИЖЕНИЯ В <span className="text-cyan-neon">КОМАНДЫ</span>
      </h2>
      <p className="mb-12 max-w-2xl text-sm leading-relaxed text-white/55 sm:text-base">
        Весь фокус умещается в четыре этапа и никакого сервера: модель с весами около 5&nbsp;МБ
        скачивается один раз и работает на GPU вашего устройства через WebGL/WebGPU.
      </p>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        {/* карточки этапов */}
        <div className="flex flex-col gap-4">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, x: -32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.55, delay: i * 0.08 }}
              className="clip-corner group relative border border-line bg-deep p-5 transition-colors hover:border-white/20"
            >
              <div className="flex items-start gap-4">
                <span className={`grid h-12 w-12 shrink-0 place-items-center border ${s.color}`}>
                  <s.icon className="h-5 w-5" strokeWidth={1.6} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono2 text-[10px] text-white/30">{s.num}</span>
                    <h3 className="font-display text-sm font-bold sm:text-base">{s.title}</h3>
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/55">{s.text}</p>
                  <code className="font-mono2 mt-3 block truncate border border-line bg-void px-3 py-2 text-[11px] text-neon/90">
                    {s.chip}
                  </code>
                </div>
              </div>
              <span className="font-display absolute -right-1 -top-3 text-6xl font-black text-white/[0.04] transition-colors group-hover:text-neon/10">
                {s.num}
              </span>
            </motion.div>
          ))}
        </div>

        {/* схема */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="flex flex-col gap-4"
        >
          <SkeletonScheme />
          <div className="clip-corner border border-line bg-deep p-5">
            <h4 className="font-mono2 mb-3 text-[10px] tracking-[0.25em] text-white/50">ПОЧЕМУ ЭТО БЫСТРО</h4>
            <ul className="space-y-2 text-[13px] text-white/60">
              <li className="flex gap-3"><span className="text-neon">▸</span> Модель Pose Landmarker Lite — всего ~5 МБ, работает 30+ fps даже на ноутбуке</li>
              <li className="flex gap-3"><span className="text-neon">▸</span> Инференс идёт на GPU через WebGL — CPU свободен для самой игры</li>
              <li className="flex gap-3"><span className="text-neon">▸</span> WebAssembly-рантайм — почти нативная скорость без плагинов</li>
              <li className="flex gap-3"><span className="text-neon">▸</span> Экспоненциальное сглаживание убирает дрожание точек до интерпретации</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
