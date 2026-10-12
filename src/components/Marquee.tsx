const ITEMS = [
  "POSE ESTIMATION", "33 KEYPOINTS", "SKELETON TRACKING", "COMPUTER VISION",
  "MEDIAPIPE", "TENSORFLOW.JS", "Movenet", "GPU INFERENCE", "WEB ASSEMBLY",
  "ZERO INSTALL", "REALTIME", "GESTURE CONTROL",
];

export default function Marquee({ reverse = false }: { reverse?: boolean }) {
  const row = (
    <>
      {ITEMS.map((t, i) => (
        <span key={i} className="mx-6 flex items-center gap-6 font-display text-sm font-medium tracking-[0.2em]">
          {t}
          <span className="inline-block h-1.5 w-1.5 rotate-45 bg-current opacity-60" />
        </span>
      ))}
    </>
  );

  return (
    <div className="mask-fade-x relative overflow-hidden border-y border-line bg-deep py-4 text-white/45">
      <div
        className="flex w-max animate-marquee whitespace-nowrap"
        style={reverse ? { animationDirection: "reverse" } : undefined}
      >
        <div className="flex">{row}</div>
        <div className="flex" aria-hidden>{row}</div>
      </div>
    </div>
  );
}
