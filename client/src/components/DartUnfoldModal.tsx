import { useEffect, useState, useRef } from "react";
import { DartSponsor } from "./PaperDart";

interface DartUnfoldModalProps {
  sponsor: DartSponsor | null;
  isGolden?: boolean;
  onClose: () => void;
}

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

    const cx = canvas.width / 2;
    const cy = canvas.height * 0.45;
    particlesRef.current = Array.from({ length: 140 }, () => ({
      x: cx + (Math.random() - 0.5) * 80,
      y: cy + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 16,
      vy: -9 - Math.random() * 11,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 5 + Math.random() * 9,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 14,
      life: 1.0,
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = particlesRef.current.filter(p => p.life > 0.01);
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.38;
        p.vx *= 0.99;
        p.rotation += p.rotSpeed;
        p.life -= 0.011;
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      if (particlesRef.current.length > 0) rafRef.current = requestAnimationFrame(animate);
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

/**
 * The unroll animation works in 3 phases:
 *
 * 1. "dart"      — shows the dart as a narrow cone (scaleX small, scaleY small)
 * 2. "unrolling" — animates the cone stretching/flattening into a rectangular strip
 * 3. "strip"     — shows the full flat magazine strip with sponsor content
 *
 * The flat strip looks like a glossy magazine page — the original material
 * the dart was rolled from. The sponsor ad is "printed" on it.
 */
export function DartUnfoldModal({ sponsor, isGolden = false, onClose }: DartUnfoldModalProps) {
  const [phase, setPhase] = useState<"dart" | "unrolling" | "strip" | "closing">("dart");
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Phase 1: show dart briefly
    const t1 = setTimeout(() => setPhase("unrolling"), 120);
    // Phase 2: unrolling animation (600ms)
    const t2 = setTimeout(() => {
      setPhase("strip");
      if (isGolden) setShowConfetti(true);
    }, 720);
    const t3 = isGolden ? setTimeout(() => setShowConfetti(false), 4500) : null;
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (t3) clearTimeout(t3);
    };
  }, [isGolden]);

  const handleClose = () => {
    setPhase("closing");
    setTimeout(onClose, 350);
  };

  const baseColor = sponsor?.color ?? "#e8d5a3";

  // ── Dart phase: show a small cone shape ──────────────────────────────────────
  const dartStyle: React.CSSProperties = {
    transformOrigin: "center center",
    transform:
      phase === "dart"
        ? "scaleX(0.18) scaleY(0.12) rotate(-5deg)"
        : phase === "unrolling"
        ? "scaleX(0.7) scaleY(0.55) rotate(-2deg)"
        : phase === "closing"
        ? "scaleX(0.1) scaleY(0.08) rotate(5deg)"
        : "scaleX(1) scaleY(1) rotate(0deg)",
    opacity: phase === "dart" ? 0.7 : phase === "closing" ? 0 : 1,
    transition:
      phase === "unrolling"
        ? "transform 0.6s cubic-bezier(0.23,1,0.32,1), opacity 0.3s ease"
        : phase === "strip"
        ? "transform 0.5s cubic-bezier(0.23,1,0.32,1), opacity 0.3s ease"
        : "transform 0.35s ease-in, opacity 0.25s ease",
  };

  return (
    <>
      {showConfetti && <ConfettiCanvas />}

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
        onClick={handleClose}
        style={{
          background: isGolden ? "rgba(0,0,0,0.78)" : "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
        }}
      >
        {/* ── The magazine strip ─────────────────────────────────────────────── */}
        <div
          className="relative w-full cursor-default"
          style={{
            maxWidth: 420,
            ...dartStyle,
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── Outer strip: glossy magazine paper ─────────────────────────── */}
          <div
            className="relative rounded-lg overflow-hidden"
            style={{
              background: isGolden
                ? "linear-gradient(160deg, #8B6914 0%, #C8A96E 25%, #FFD700 50%, #FFA500 75%, #C8A96E 100%)"
                : `linear-gradient(160deg, ${lightenHex(baseColor, 0.25)} 0%, ${baseColor} 40%, ${darkenHex(baseColor, 0.15)} 100%)`,
              border: isGolden
                ? "3px solid #FFD700"
                : "2px solid rgba(0,0,0,0.18)",
              boxShadow: isGolden
                ? "0 0 40px rgba(255,215,0,0.55), 0 0 80px rgba(255,165,0,0.25), 4px 4px 0 rgba(0,0,0,0.5)"
                : "4px 4px 0 rgba(0,0,0,0.25), 8px 8px 0 rgba(0,0,0,0.1)",
            }}
          >
            {/* Glossy sheen — simulates the glossy magazine surface */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0) 60%)",
                zIndex: 1,
              }}
            />

            {/* Moving shimmer for golden */}
            {isGolden && (
              <div
                className="absolute inset-0 pointer-events-none overflow-hidden"
                style={{ zIndex: 2 }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)",
                    animation: "shimmer 2.2s ease-in-out infinite",
                  }}
                />
              </div>
            )}

            {/* ── Diagonal strip lines — the rolled paper seams ──────────────── */}
            <div
              className="absolute inset-0 pointer-events-none overflow-hidden"
              style={{ zIndex: 1, opacity: 0.18 }}
            >
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    top: 0, bottom: 0,
                    left: `${i * 17}%`,
                    width: 2,
                    background: "rgba(0,0,0,0.6)",
                    transform: "skewX(-20deg)",
                    transformOrigin: "top",
                  }}
                />
              ))}
            </div>

            {/* ── Content ──────────────────────────────────────────────────────── */}
            <div className="relative z-10 p-5">
              {/* Close button */}
              <button
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center
                  bg-black/25 hover:bg-black/40 transition-colors font-bold text-sm"
                style={{ color: isGolden ? "#3d2800" : "white" }}
                onClick={handleClose}
                aria-label="Sluiten"
              >
                ✕
              </button>

              {/* ── Golden badge ──────────────────────────────────────────────── */}
              {isGolden && phase === "strip" && (
                <div className="text-center mb-4">
                  <div
                    className="inline-block text-5xl mb-1"
                    style={{
                      filter: "drop-shadow(0 0 14px rgba(255,215,0,0.9))",
                      animation: "wiggle 1s ease-in-out infinite",
                    }}
                  >
                    🏆
                  </div>
                  <div
                    className="font-display text-2xl"
                    style={{ color: "#3d2800", textShadow: "0 1px 0 rgba(255,255,255,0.5)" }}
                  >
                    GOUDEN PIJLTJE!
                  </div>
                  <div className="font-retro text-sm mt-0.5" style={{ color: "#5c3d1e" }}>
                    Jij hebt het gouden pijltje gevonden!
                  </div>
                </div>
              )}

              {/* ── "Unrolled from" label ─────────────────────────────────────── */}
              {phase === "strip" && (
                <div
                  className="font-retro text-xs uppercase tracking-widest mb-3 opacity-70 text-center"
                  style={{ color: isGolden ? "#3d2800" : "rgba(0,0,0,0.6)" }}
                >
                  📰 Uitgerold pijltje — gesponsord door
                </div>
              )}

              {/* ── Sponsor header ────────────────────────────────────────────── */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
                  style={{
                    background: isGolden ? "rgba(255,215,0,0.3)" : "rgba(0,0,0,0.15)",
                    border: isGolden ? "2px solid #FFD700" : "2px solid rgba(0,0,0,0.2)",
                    color: isGolden ? "#3d2800" : "rgba(0,0,0,0.7)",
                  }}
                >
                  {sponsor?.logoUrl ? (
                    <img
                      src={sponsor.logoUrl}
                      alt={sponsor.name}
                      className="w-10 h-10 object-contain rounded-full"
                    />
                  ) : (
                    sponsor?.name?.[0]?.toUpperCase() ?? "?"
                  )}
                </div>
                <div>
                  <h3
                    className="font-display text-xl leading-tight"
                    style={{ color: isGolden ? "#3d2800" : "rgba(0,0,0,0.85)" }}
                  >
                    {sponsor?.name ?? "Onbekend"}
                  </h3>
                </div>
              </div>

              {/* ── Prize box (golden only) ───────────────────────────────────── */}
              {isGolden && sponsor?.prizeText && phase === "strip" && (
                <div
                  className="rounded-xl p-4 mb-4"
                  style={{
                    background: "rgba(255,215,0,0.28)",
                    border: "2px solid rgba(255,215,0,0.55)",
                    color: "#3d2800",
                    animation: "fadeInUp 0.4s ease both",
                  }}
                >
                  <p className="font-display text-lg mb-1">🎁 Jouw prijs:</p>
                  <p className="font-retro text-base leading-relaxed">{sponsor.prizeText}</p>
                </div>
              )}

              {/* ── Magazine ad content area ──────────────────────────────────── */}
              <div
                className="rounded-xl p-4 mb-4 font-retro text-base leading-relaxed"
                style={{
                  background: isGolden ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.45)",
                  color: isGolden ? "#3d2800" : "rgba(0,0,0,0.78)",
                  // Simulate a printed magazine ad with slight texture
                  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                {phase === "strip" ? (
                  <p style={{ animation: "fadeInUp 0.35s ease both 0.1s", animationFillMode: "both" }}>
                    {sponsor?.message ?? "Geen boodschap"}
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="h-3 rounded bg-black/10 animate-pulse w-3/4" />
                    <div className="h-3 rounded bg-black/10 animate-pulse w-full" />
                    <div className="h-3 rounded bg-black/10 animate-pulse w-2/3" />
                  </div>
                )}
              </div>

              {/* ── CTA buttons ───────────────────────────────────────────────── */}
              {phase === "strip" && (
                <div
                  className="flex flex-col gap-2"
                  style={{ animation: "fadeInUp 0.4s ease both 0.2s", animationFillMode: "both" }}
                >
                  {isGolden && sponsor?.prizeClaimUrl && (
                    <a
                      href={sponsor.prizeClaimUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-retro block w-full text-center py-3 px-6 rounded-xl font-display text-lg"
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
                  {sponsor?.clickUrl && (
                    <a
                      href={sponsor.clickUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-retro block w-full text-center py-3 px-6 rounded-xl font-display text-lg"
                      style={{
                        background: isGolden ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0.78)",
                        color: "#fff",
                        textDecoration: "none",
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      Bekijk meer →
                    </a>
                  )}
                </div>
              )}

              {/* ── Bottom crease — paper fold mark ──────────────────────────── */}
              <div
                className="absolute bottom-0 left-0 right-0 h-3 pointer-events-none"
                style={{
                  background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.12))",
                  borderRadius: "0 0 8px 8px",
                }}
              />
            </div>
          </div>

          {/* ── Dart tip indicator (visible during unrolling phase) ─────────── */}
          {(phase === "dart" || phase === "unrolling") && (
            <div
              className="absolute -left-3 top-1/2 -translate-y-1/2 font-retro text-xs"
              style={{ color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap" }}
            >
              ◀ punt
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(220%); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-8deg) scale(1); }
          50%       { transform: rotate(8deg) scale(1.1); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

// ── Colour helpers ─────────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3
    ? clean.split("").map(c => c + c).join("")
    : clean;
  const num = parseInt(full, 16);
  return [
    Math.min(255, Math.max(0, (num >> 16) & 0xff)),
    Math.min(255, Math.max(0, (num >> 8) & 0xff)),
    Math.min(255, Math.max(0, num & 0xff)),
  ];
}

function lightenHex(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.min(255,r+Math.round(255*amount))},${Math.min(255,g+Math.round(255*amount))},${Math.min(255,b+Math.round(255*amount))})`;
}

function darkenHex(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.max(0,r-Math.round(255*amount))},${Math.max(0,g-Math.round(255*amount))},${Math.max(0,b-Math.round(255*amount))})`;
}

export default DartUnfoldModal;
