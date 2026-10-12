import { ScanEye, ShieldCheck, ArrowUp } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-void">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-6 px-4 py-12 sm:flex-row sm:justify-between sm:px-8">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center border border-neon bg-neon/10">
            <ScanEye className="h-4 w-4 text-neon" />
          </span>
          <div>
            <p className="font-display text-sm font-bold">MOTION<span className="text-neon">//</span>PLAY</p>
            <p className="font-mono2 text-[10px] tracking-widest text-white/35">ТЕЛО — ЭТО ДЖОЙСТИК</p>
          </div>
        </div>

        <p className="flex max-w-sm items-start gap-2 text-center text-[11px] leading-relaxed text-white/40 sm:text-left">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-neon" />
          Вся обработка видео — локально в браузере через MediaPipe.
          Кадры с камеры никуда не отправляются и нигде не сохраняются.
        </p>

        <a
          href="#top"
          className="font-mono2 flex items-center gap-2 border border-white/15 px-4 py-2.5 text-[11px] tracking-widest text-white/60 transition-all hover:border-neon hover:text-neon"
        >
          НАВЕРХ <ArrowUp className="h-3.5 w-3.5" />
        </a>
      </div>
    </footer>
  );
}
