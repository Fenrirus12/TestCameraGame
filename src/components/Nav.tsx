import { useEffect, useState } from "react";
import { ScanEye } from "lucide-react";
import { cn } from "../utils/cn";

const LINKS = [
  { href: "#demo", label: "Демо" },
  { href: "#how", label: "Как устроено" },
  { href: "#stack", label: "Технологии" },
  { href: "#code", label: "Код" },
  { href: "#roadmap", label: "План" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <nav
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "border-b border-line bg-void/80 backdrop-blur-xl" : "bg-transparent"
      )}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-4 sm:px-8">
        <a href="#top" className="font-display flex items-center gap-2 text-sm font-bold tracking-wide">
          <span className="grid h-8 w-8 place-items-center border border-neon bg-neon/10">
            <ScanEye className="h-4 w-4 text-neon" />
          </span>
          MOTION<span className="text-neon">//</span>PLAY
        </a>

        <div className="hidden items-center gap-7 lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-mono2 text-[11px] tracking-[0.2em] text-white/55 uppercase transition-colors hover:text-neon"
            >
              {l.label}
            </a>
          ))}
        </div>

        <a
          href="#demo"
          className="font-mono2 hidden items-center gap-2 border border-neon/60 px-4 py-2 text-[11px] tracking-widest text-neon transition-all hover:bg-neon hover:text-void sm:flex"
        >
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-current" />
          ИГРАТЬ
        </a>
      </div>
    </nav>
  );
}
