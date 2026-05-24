import { useEffect, useState } from "react";
import { DartSponsor } from "./PaperDart";

interface DartUnfoldModalProps {
  sponsor: DartSponsor | null;
  onClose: () => void;
}

export function DartUnfoldModal({ sponsor, onClose }: DartUnfoldModalProps) {
  const [phase, setPhase] = useState<"closed" | "unfolding" | "open">("closed");

  useEffect(() => {
    // Trigger unfold animation
    const t1 = setTimeout(() => setPhase("unfolding"), 50);
    const t2 = setTimeout(() => setPhase("open"), 550);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const handleClose = () => {
    setPhase("closed");
    setTimeout(onClose, 300);
  };

  const bgColor = sponsor?.color ?? "#e8d5a3";

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      onClick={handleClose}
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
    >
      <div
        className="relative max-w-sm w-full paper-card rounded-2xl p-6 cursor-default"
        style={{
          background: bgColor,
          transformOrigin: "center bottom",
          transform: phase === "closed" ? "scaleY(0.05) scaleX(0.3)" : "scaleY(1) scaleX(1)",
          opacity: phase === "closed" ? 0 : 1,
          transition: "transform 0.5s cubic-bezier(0.23,1,0.32,1), opacity 0.3s ease",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Crumpled paper lines decoration */}
        <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden opacity-20">
          {[15, 30, 45, 60, 75].map(pct => (
            <div
              key={pct}
              className="absolute w-full"
              style={{
                top: `${pct}%`,
                height: 1,
                background: "rgba(0,0,0,0.3)",
                transform: `rotate(${(pct % 3 - 1) * 0.5}deg)`,
              }}
            />
          ))}
        </div>

        {/* Close button */}
        <button
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center
            bg-black/20 hover:bg-black/30 transition-colors text-white font-bold text-sm"
          onClick={handleClose}
          aria-label="Sluiten"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-display font-bold border-2 border-black/20"
            style={{ background: "rgba(0,0,0,0.15)", color: "rgba(0,0,0,0.7)" }}
          >
            {sponsor?.logoUrl ? (
              <img src={sponsor.logoUrl} alt={sponsor.name} className="w-10 h-10 object-contain rounded-full" />
            ) : (
              sponsor?.name?.[0]?.toUpperCase() ?? "?"
            )}
          </div>
          <div>
            <p className="text-xs font-retro opacity-60 uppercase tracking-wider">Gesponsord door</p>
            <h3 className="font-display text-xl" style={{ color: "rgba(0,0,0,0.8)" }}>
              {sponsor?.name ?? "Onbekend"}
            </h3>
          </div>
        </div>

        {/* Message */}
        <div
          className="rounded-xl p-4 mb-4 font-retro text-base leading-relaxed"
          style={{ background: "rgba(255,255,255,0.4)", color: "rgba(0,0,0,0.75)" }}
        >
          {phase === "open" ? (
            <p className="animate-fade-in-up">{sponsor?.message ?? "Geen boodschap"}</p>
          ) : (
            <div className="h-12 rounded bg-black/10 animate-pulse" />
          )}
        </div>

        {/* CTA Button */}
        {phase === "open" && sponsor?.clickUrl && (
          <a
            href={sponsor.clickUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-retro block w-full text-center py-3 px-6 rounded-xl font-display text-lg
              animate-fade-in-up"
            style={{
              background: "rgba(0,0,0,0.75)",
              color: "#fff",
              textDecoration: "none",
              animationDelay: "0.1s",
            }}
            onClick={e => e.stopPropagation()}
          >
            Bekijk meer →
          </a>
        )}

        {/* Paper fold crease decoration */}
        <div
          className="absolute bottom-0 left-0 right-0 h-2 rounded-b-2xl opacity-30"
          style={{ background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.2))" }}
        />
      </div>
    </div>
  );
}

export default DartUnfoldModal;
