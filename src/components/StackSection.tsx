import { motion } from "framer-motion";
import { Boxes, BrainCircuit, Shapes, Terminal, Gamepad, Webcam, Star } from "lucide-react";
import { cn } from "../utils/cn";

const STACK = [
  {
    icon: Boxes,
    name: "MediaPipe Tasks Vision",
    by: "Google · браузер / мобайл",
    level: 1,
    hot: true,
    text: "Готовый Pose Landmarker на 33 точки. WASM + GPU, zero-config, модель подсасывается один раз. Именно он крутится в демо выше.",
    tags: ["WASM", "GPU", "33 точки"],
  },
  {
    icon: BrainCircuit,
    name: "TensorFlow.js + MoveNet",
    by: "Google · браузер",
    level: 1,
    hot: false,
    text: "Модель MoveNet Lightning/Thunder на 17 точек. Чуть гибче в тонкой настройке, легко дообучать собственные позы под свои жесты.",
    tags: ["WebGL", "17 точек", "дообучение"],
  },
  {
    icon: Shapes,
    name: "ml5.js + p5.js",
    by: "самый простой старт",
    level: 0,
    hot: false,
    text: "Обёртка «для художников»: три строчки — и скелет на канвасе. Идеально для первого прототипа за вечер и интерактивных инсталляций.",
    tags: ["прототипы", "арт", "обучение"],
  },
  {
    icon: Terminal,
    name: "Python + OpenCV + MediaPipe",
    by: "десктоп / сервер",
    level: 2,
    hot: false,
    text: "Классический путь: скрипт на Python читает камеру, считает позы и шлёт команды в игру по WebSocket или эмулирует клавиатуру через pyautogui.",
    tags: ["desktop", "websocket", "pyautogui"],
  },
  {
    icon: Gamepad,
    name: "Unity / Godot + плагин поз",
    by: "настоящие игры",
    level: 3,
    hot: false,
    text: "MediaPipe Unity Plugin или Godot-аддоны переносят трекинг прямо в движок. Так делают фитнес-игры и игровые инсталляции наподобие Kinect.",
    tags: ["C#", "движок", "продакшн"],
  },
  {
    icon: Webcam,
    name: "Kinect / камеры глубины",
    by: "хардверный путь (как в 2010-х)",
    level: 2,
    hot: false,
    text: "То самое видео, скорее всего, было снято именно так: ИК-датчик глубины даёт скелет без нейросетей. Azure Kinect, RealSense и даже б/у Xbox Kinect живы.",
    tags: ["depth", "ик-камера", "ретро"],
  },
];

const LEVELS = ["Новичок", "Легко", "Средне", "Про"];

export default function StackSection() {
  return (
    <section id="stack" className="relative scroll-mt-24 border-y border-line bg-deep/60 py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono2 mb-3 flex items-center gap-2 text-xs tracking-[0.3em] text-neon uppercase">
              <span className="inline-block h-2 w-2 animate-pulse-dot rounded-full bg-neon" />
              03 — Инструменты
            </p>
            <h2 className="font-display text-3xl font-bold leading-[1.05] sm:text-5xl">
              ИЗ ЧЕГО <span className="text-outline">ЭТО</span>{" "}
              <span className="text-violet-neon">СОБИРАЮТ</span>
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-white/55">
            От «три строчки кода» до полноценного движка. Для старта хватит первого пункта —
            остальное по мере роста амбиций.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {STACK.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
              className={cn(
                "clip-corner group relative flex flex-col border border-line bg-void p-6 transition-all hover:-translate-y-1 hover:border-neon/40",
              )}
            >
              {s.hot && (
                <span className="font-mono2 absolute right-4 top-4 flex items-center gap-1 border border-neon bg-neon/10 px-2 py-1 text-[9px] tracking-widest text-neon">
                  <Star className="h-3 w-3 fill-neon" /> В ДЕМО
                </span>
              )}
              <span className="mb-5 grid h-12 w-12 place-items-center border border-line bg-deep text-neon transition-colors group-hover:border-neon/50">
                <s.icon className="h-5 w-5" strokeWidth={1.6} />
              </span>
              <h3 className="font-display text-base font-bold leading-tight">{s.name}</h3>
              <p className="font-mono2 mt-1 text-[10px] uppercase tracking-[0.2em] text-white/35">{s.by}</p>
              <p className="mt-4 flex-1 text-[13px] leading-relaxed text-white/55">{s.text}</p>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {s.tags.map((t) => (
                    <span key={t} className="font-mono2 border border-white/12 px-2 py-1 text-[9px] tracking-wider text-white/45">
                      {t}
                    </span>
                  ))}
                </div>
                <span className="font-mono2 text-[9px] tracking-widest text-white/35">
                  Сложность: <span className="text-neon">{LEVELS[s.level]}</span>
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
