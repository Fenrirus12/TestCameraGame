import { motion } from "framer-motion";
import {
  FlaskConical, Target, SlidersHorizontal, Cable, Sun, Rocket,
  Lightbulb, Camera, Scan, TimerReset,
} from "lucide-react";

const STEPS = [
  {
    icon: FlaskConical,
    title: "Прототип за вечер",
    text: "Возьмите код из раздела выше, выведите точки скелета на canvas поверх видео. Двигаетесь — двигается скелет. Это уже 80% магии.",
    time: "вечер",
  },
  {
    icon: Target,
    title: "Только 3 жеста",
    text: "Не пытайтесь распознать всё сразу. Прыжок, влево-вправо, присед — этого хватит для полноценной аркады. Каждый жест — одно сравнение координат.",
    time: "+1 день",
  },
  {
    icon: SlidersHorizontal,
    title: "Сглаживание и калибровка",
    text: "Точки нейросети дрожат — примените EMA (как в коде) или фильтр One Euro. На старте игры 2 секунды калибруйтесь: «встаньте прямо».",
    time: "+1 день",
  },
  {
    icon: Cable,
    title: "Свяжите с игрой",
    text: "CV-модуль ничего не знает про игру — только шлёт события (jump / move / duck). Игровой цикл их слушает. Такой контракт легко тестировать и дебажить.",
    time: "+2 дня",
  },
  {
    icon: Sun,
    title: "Тест при разном свете",
    text: "Слабый свет и контровое окно — главные враги трекинга. Добавьте режим «без камеры» как запасной ввод: мышь и клавиатура всегда спасут.",
    time: "+1 день",
  },
  {
    icon: Rocket,
    title: "Покажите людям",
    text: "Залейте на хостинг, дайте ссылку друзьям. Люди махают руками перед ноутбуком — и это лучший UX-тест, который существует.",
    time: "сегодня",
  },
];

const TIPS = [
  {
    icon: Lightbulb,
    title: "Свет — половина точности",
    text: "Мягкий фронтальный свет резко повышает confidence трекинга. Окно за спиной — худший сценарий.",
  },
  {
    icon: Camera,
    title: "Камера на уровне груди",
    text: "Поставьте ноутбук так, чтобы влезал торс и руки. Не нужно видеть ноги — хватит верхних 17 точек.",
  },
  {
    icon: Scan,
    title: "Гистерезис вместо порога",
    text: "Жест «срабатывает» при 0.70 и «отпускает» при 0.78 — так вы избежите мерцания состояния на границе.",
  },
  {
    icon: TimerReset,
    title: "Edge, а не уровень",
    text: "Прыгайте по фронту жеста (руки только поднялись), а не пока руки наверху — иначе герой будет скакать без остановки.",
  },
];

export default function Roadmap() {
  return (
    <section id="roadmap" className="relative scroll-mt-24 border-t border-line bg-deep/60 py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
        <p className="font-mono2 mb-3 flex items-center gap-2 text-xs tracking-[0.3em] text-neon uppercase">
          <span className="inline-block h-2 w-2 animate-pulse-dot rounded-full bg-neon" />
          05 — План запуска
        </p>
        <h2 className="font-display mb-12 text-3xl font-bold leading-[1.05] sm:text-5xl">
          ОТ НУЛЯ ДО СВОЕЙ ИГРЫ <br />
          <span className="text-outline">ЗА НЕДЕЛЮ</span>
        </h2>

        <div className="grid gap-12 lg:grid-cols-[1.25fr_1fr]">
          {/* таймлайн */}
          <div className="relative">
            <span className="absolute bottom-4 left-[23px] top-4 w-px bg-gradient-to-b from-neon via-violet-neon/60 to-transparent" />
            <div className="space-y-8">
              {STEPS.map((s) => (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: 0.05 }}
                  className="relative flex gap-5 pl-0"
                >
                  <span className="relative z-10 grid h-12 w-12 shrink-0 place-items-center border border-neon/50 bg-void">
                    <s.icon className="h-5 w-5 text-neon" strokeWidth={1.6} />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-display text-sm font-bold sm:text-base">{s.title}</h3>
                      <span className="font-mono2 border border-white/15 px-2 py-0.5 text-[9px] tracking-widest text-white/40">
                        {s.time}
                      </span>
                    </div>
                    <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-white/55">{s.text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* советы */}
          <div className="space-y-4">
            <h3 className="font-mono2 text-[10px] tracking-[0.3em] text-white/50">ПРОФЕССИОНАЛЬНЫЕ МЕЛОЧИ</h3>
            {TIPS.map((t, i) => (
              <motion.div
                key={t.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
                className="clip-corner border border-line bg-void p-5 transition-colors hover:border-neon/30"
              >
                <div className="flex items-center gap-3">
                  <t.icon className="h-5 w-5 text-cyan-neon" strokeWidth={1.6} />
                  <h4 className="font-display text-[13px] font-bold">{t.title}</h4>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-white/55">{t.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
