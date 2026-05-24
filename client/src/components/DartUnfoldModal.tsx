import { useEffect, useState, useRef } from "react";
import { DartSponsor } from "./PaperDart";

interface DartUnfoldModalProps {
  sponsor: DartSponsor | null;
  isGolden?: boolean;
  onClose: () => void;
}

// Confetti particle for golden reveal
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  size: number;
  rotation: number;
  rotSpeed: number;
  life: number;
}

const CONFETTI_COLORS = ["#FFD700", "#FFA500", "#FF6B35", "#FFE066", "#FFF4B8", "#C8A96E", "#FFFFFF"];

function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Spawn 120 particles from center
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    particlesRef.current = Array.from({ length: 120 }, () => ({
      x: cx + (Math.random() - 0.5) * 60,
      y: cy + (Math.random() - 0.5) * 60,
      vx: (Math.random() - 0.5) * 14,
      vy: -8 - Math.random() * 10,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      life: 1.0,
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = particlesRef.current.filter(p => p.life > 0.01);
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.vx *= 0.99;
        p.rotation += p.rotSpeed;
        p.life -= 0.012;

        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      if (particlesRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 10001 }}
    />
  );
}

export function DartUnfoldModal({ sponsor, isGolden = false, onClose }: DartUnfoldModalProps) {
  const [phase, setPhase] = useState<"closed" | "unfolding" | "open">("closed");
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("unfolding"), 50);
    const t2 = setTimeout(() => {
      setPhase("open");
      if (isGolden) setShowConfetti(true);
    }, 550);
    const t3 = isGolden ? setTimeout(() => setShowConfetti(false), 4000) : null;
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (t3) clearTimeout(t3);
    };
  }, [isGolden]);

  const handleClose = () => {
    setPhase("closed");
    setTimeout(onClose, 300);
  };

  // Golden dart uses a rich gold background; normal dart uses sponsor color
  const bgColor = isGolden
    ? "linear-gradient(135deg, #8B6914 0%, #C8A96E 30%, #FFD700 55%, #FFA500 75%, #C8A96E 100%)"
    : (sponsor?.color ?? "#e8d5a3");

  return (
    <>
      {showConfetti && <ConfettiCanvas />}

      <div
        className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
        onClick={handleClose}
        style={{
          background: isGolden
            ? "rgba(0,0,0,0.75)"
            : "rgba(0,0,0,0.55)",
          backdropFilter: "blur(3px)",
        }}
      >
        <div
          className="relative max-w-sm w-full rounded-2xl p-6 cursor-default"
          style={{
            background: isGolden ? bgColor : bgColor,
            border: isGolden ? "3px solid #FFD700" : "2px solid rgba(0,0,0,0.15)",
            boxShadow: isGolden
              ? "0 0 40px rgba(255,215,0,0.6), 0 0 80px rgba(255,165,0,0.3), 6px 6px 0 rgba(0,0,0,0.4)"
              : "3px 3px 0 rgba(0,0,0,0.2), 6px 6px 0 rgba(0,0,0,0.1)",
            transformOrigin: "center bottom",
            transform: phase === "closed" ? "scaleY(0.05) scaleX(0.3)" : "scaleY(1) scaleX(1)",
            opacity: phase === "closed" ? 0 : 1,
            transition: "transform 0.5s cubic-bezier(0.23,1,0.32,1), opacity 0.3s ease",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Golden shimmer overlay */}
          {isGolden && (
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden"
              style={{ zIndex: 0 }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)",
                  animation: "shimmer 2s ease-in-out infinite",
                }}
              />
            </div>
          )}

          {/* Crumpled paper lines decoration (normal only) */}
          {!isGolden && (
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
          )}

          {/* Close button */}
          <button
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center
              bg-black/20 hover:bg-black/30 transition-colors font-bold text-sm"
            style={{ color: isGolden ? "#3d2800" : "white", zIndex: 1 }}
            onClick={handleClose}
            aria-label="Sluiten"
          >
            ✕
          </button>

          {/* Golden badge */}
          {isGolden && phase === "open" && (
            <div
              className="relative z-10 text-center mb-4 animate-fade-in-up"
            >
              <div
                className="inline-block text-5xl mb-1"
                style={{ filter: "drop-shadow(0 0 12px rgba(255,215,0,0.8))", animation: "wiggle 1s ease-in-out infinite" }}
              >
                🏆
              </div>
              <div
                className="font-display text-2xl"
                style={{ color: "#3d2800", textShadow: "0 1px 0 rgba(255,255,255,0.5)" }}
              >
                GOUDEN PIJLTJE!
              </div>
              <div className="font-retro text-sm mt-1" style={{ color: "#5c3d1e" }}>
                Jij hebt het gouden pijltje gevonden!
              </div>
            </div>
          )}

          {/* Header */}
          <div className="relative z-10 flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-display font-bold"
              style={{
                background: isGolden ? "rgba(255,215,0,0.3)" : "rgba(0,0,0,0.15)",
                border: isGolden ? "2px solid #FFD700" : "2px solid rgba(0,0,0,0.2)",
                color: isGolden ? "#3d2800" : "rgba(0,0,0,0.7)",
              }}
            >
              {sponsor?.logoUrl ? (
                <img src={sponsor.logoUrl} alt={sponsor.name} className="w-10 h-10 object-contain rounded-full" />
              ) : (
                sponsor?.name?.[0]?.toUpperCase() ?? "?"
              )}
            </div>
            <div>
              <p className="text-xs font-retro opacity-60 uppercase tracking-wider"
                style={{ color: isGolden ? "#3d2800" : undefined }}>
                Gesponsord door
              </p>
              <h3 className="font-display text-xl" style={{ color: isGolden ? "#3d2800" : "rgba(0,0,0,0.8)" }}>
                {sponsor?.name ?? "Onbekend"}
              </h3>
            </div>
          </div>

          {/* Prize text (golden only) */}
          {isGolden && sponsor?.prizeText && phase === "open" && (
            <div
              className="relative z-10 rounded-xl p-4 mb-4 animate-fade-in-up"
              style={{
                background: "rgba(255,215,0,0.25)",
                border: "2px solid rgba(255,215,0,0.5)",
                color: "#3d2800",
              }}
            >
              <p className="font-display text-lg mb-1">🎁 Jouw prijs:</p>
              <p className="font-retro text-base leading-relaxed">{sponsor.prizeText}</p>
            </div>
          )}

          {/* Regular message */}
          <div
            className="relative z-10 rounded-xl p-4 mb-4 font-retro text-base leading-relaxed"
            style={{
              background: isGolden ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.4)",
              color: isGolden ? "#3d2800" : "rgba(0,0,0,0.75)",
            }}
          >
            {phase === "open" ? (
              <p className="animate-fade-in-up">{sponsor?.message ?? "Geen boodschap"}</p>
            ) : (
              <div className="h-12 rounded bg-black/10 animate-pulse" />
            )}
          </div>

          {/* CTA Buttons */}
          {phase === "open" && (
            <div className="relative z-10 flex flex-col gap-2">
              {/* Prize claim button (golden only) */}
              {isGolden && sponsor?.prizeClaimUrl && (
                <a
                  href={sponsor.prizeClaimUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-retro block w-full text-center py-3 px-6 rounded-xl font-display text-lg animate-fade-in-up"
                  style={{
                    background: "linear-gradient(135deg, #8B6914, #FFD700)",
                    color: "#3d2800",
                    textDecoration: "none",
                    border: "3px solid #3d2800",
                    boxShadow: "4px 4px 0 #3d2800",
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  🏆 Claim je prijs →
                </a>
              )}

              {/* Regular CTA */}
              {sponsor?.clickUrl && (
                <a
                  href={sponsor.clickUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-retro block w-full text-center py-3 px-6 rounded-xl font-display text-lg animate-fade-in-up"
                  style={{
                    background: isGolden ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0.75)",
                    color: "#fff",
                    textDecoration: "none",
                    animationDelay: "0.1s",
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  Bekijk meer →
                </a>
              )}
            </div>
          )}

          {/* Paper fold crease decoration */}
          <div
            className="absolute bottom-0 left-0 right-0 h-2 rounded-b-2xl opacity-30 z-10"
            style={{ background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.2))" }}
          />
        </div>
      </div>

      {/* Shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </>
  );
}

export default DartUnfoldModal;
