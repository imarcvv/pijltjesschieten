import { BlowState } from "@/hooks/useBlowDetection";

interface BlowMeterProps {
  state: BlowState;
  level: number;
  onStart: () => void;
  error?: string | null;
}

const STATE_LABELS: Record<BlowState, string> = {
  idle: "Klik om te starten",
  requesting: "Microfoon toegang...",
  ready: "Blaas hard in de microfoon!",
  blowing: "Harder blazen...",
  fired: "🎯 Pijltje geschoten!",
  error: "Fout",
};

const STATE_COLORS: Record<BlowState, string> = {
  idle: "bg-amber-100 border-amber-400",
  requesting: "bg-blue-50 border-blue-400",
  ready: "bg-green-50 border-green-400",
  blowing: "bg-orange-50 border-orange-500",
  fired: "bg-red-50 border-red-500",
  error: "bg-red-100 border-red-600",
};

export function BlowMeter({ state, level, onStart, error }: BlowMeterProps) {
  const isActive = state === "ready" || state === "blowing" || state === "fired";
  const pct = Math.round(level * 100);

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-sm">
      {/* Main blow tube */}
      <div
        className={`relative w-full rounded-full border-4 overflow-hidden cursor-pointer select-none
          ${STATE_COLORS[state]} transition-all duration-200`}
        style={{ height: 52 }}
        onClick={!isActive ? onStart : undefined}
        role="button"
        aria-label="Blaas meter"
      >
        {/* Fill bar */}
        <div
          className="blow-meter-fill absolute left-0 top-0 h-full rounded-full transition-all"
          style={{ width: `${pct}%`, opacity: isActive ? 1 : 0.3 }}
        />

        {/* Threshold marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-600 opacity-60 z-10"
          style={{ left: "28%" }}
          title="Drempel"
        />

        {/* Label */}
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <span
            className="font-display text-sm font-bold drop-shadow-sm"
            style={{ color: pct > 30 ? "#fff" : "#5c3d1e", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
          >
            {error ? error : STATE_LABELS[state]}
          </span>
        </div>
      </div>

      {/* Blow icon + level indicator */}
      {isActive && (
        <div className="flex items-center gap-2 text-sm font-retro text-amber-800">
          <span className="text-2xl" style={{ transform: `scale(${1 + level * 0.5})`, display: "inline-block", transition: "transform 80ms" }}>
            💨
          </span>
          <span>{pct}%</span>
          {state === "blowing" && <span className="animate-pulse text-orange-600 font-bold">BLAAS!</span>}
          {state === "fired" && <span className="animate-bounce text-red-600 font-bold">RAAK!</span>}
        </div>
      )}

      {/* Instruction */}
      {state === "idle" && (
        <p className="text-xs text-center font-retro text-amber-700 opacity-80">
          Klik op de buis en blaas hard in je microfoon om een pijltje te schieten
        </p>
      )}
    </div>
  );
}

export default BlowMeter;
