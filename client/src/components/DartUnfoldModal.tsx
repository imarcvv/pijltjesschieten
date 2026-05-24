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
    const cy = canvas.height * 0.42;
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
        p.x += p.vx; p.y += p.vy; p.vy += 0.38; p.vx *= 0.99;
        p.rotation += p.rotSpeed; p.life -= 0.011;
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

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 10001 }} />;
}

/**
 * The unroll animation:
 *
 * Phase "cylinder" → shows a narrow pill shape (the dart cross-section)
 * Phase "unrolling" → stretches vertically and expands to a wide flat strip
 * Phase "strip"    → full flat magazine strip with sponsor ad printed on it
 *
 * The flat strip looks like the original magazine page the dart was made from:
 * white background, horizontal text lines, sponsor colour band at top,
 * sponsor message as the "ad" printed on the page.
 */
export function DartUnfoldModal({ sponsor, isGolden = false, onClose }: DartUnfoldModalProps) {
  const [phase, setPhase] = useState<"cylinder" | "unrolling" | "strip" | "closing">("cylinder");
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("unrolling"), 80);
    const t2 = setTimeout(() => {
      setPhase("strip");
      if (isGolden) setShowConfetti(true);
    }, 680);
    const t3 = isGolden ? setTimeout(() => setShowConfetti(false), 4500) : null;
    return () => { clearTimeout(t1); clearTimeout(t2); if (t3) clearTimeout(t3); };
  }, [isGolden]);

  const handleClose = () => {
    setPhase("closing");
    setTimeout(onClose, 320);
  };

  const sponsorColor = isGolden ? "#FFD700" : (sponsor?.color ?? "#e8520a");
  const isBgDark = isGolden;

  // ── Transform: cylinder → unrolling → flat strip ──────────────────────────
  const containerStyle: React.CSSProperties = {
    transformOrigin: "center center",
    transition:
      phase === "unrolling"
        ? "transform 0.6s cubic-bezier(0.23,1,0.32,1), opacity 0.25s ease, border-radius 0.6s ease"
        : phase === "strip"
        ? "transform 0.45s cubic-bezier(0.23,1,0.32,1), opacity 0.25s ease, border-radius 0.4s ease"
        : "transform 0.3s ease-in, opacity 0.25s ease",
    transform:
      phase === "cylinder"
        ? "scaleX(0.22) scaleY(0.18)"
        : phase === "unrolling"
        ? "scaleX(0.75) scaleY(0.65)"
        : phase === "closing"
        ? "scaleX(0.12) scaleY(0.1)"
        : "scaleX(1) scaleY(1)",
    opacity: phase === "cylinder" ? 0.5 : phase === "closing" ? 0 : 1,
    borderRadius:
      phase === "cylinder" ? "50px"
      : phase === "unrolling" ? "24px"
      : "12px",
  };

  return (
    <>
      {showConfetti && <ConfettiCanvas />}

      <div
        className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
        onClick={handleClose}
        style={{
          background: isGolden ? "rgba(0,0,0,0.78)" : "rgba(0,0,0,0.62)",
          backdropFilter: "blur(4px)",
        }}
      >
        <div
          className="relative w-full max-w-sm cursor-default overflow-hidden"
          style={containerStyle}
          onClick={e => e.stopPropagation()}
        >
          {/* ── Magazine page background ──────────────────────────────────── */}
          <div
            style={{
              background: isGolden
                ? "linear-gradient(160deg, #8B6914 0%, #C8A96E 25%, #FFD700 50%, #FFA500 75%, #C8A96E 100%)"
                : "#F8F5EF",
              border: isGolden
                ? "3px solid #FFD700"
                : `3px solid ${sponsorColor}`,
              boxShadow: isGolden
                ? "0 0 40px rgba(255,215,0,0.55), 4px 4px 0 rgba(0,0,0,0.5)"
                : "4px 4px 0 rgba(0,0,0,0.25), 8px 8px 0 rgba(0,0,0,0.08)",
              borderRadius: "inherit",
              overflow: "hidden",
            }}
          >
            {/* Sponsor colour header band — like the top of a magazine ad */}
            <div
              style={{
                background: isGolden
                  ? "linear-gradient(90deg, #8B6914, #FFD700, #8B6914)"
                  : sponsorColor,
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              {/* Sponsor logo or initial */}
              <div
                style={{
                  width: 36, height: 36,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.25)",
                  border: "2px solid rgba(255,255,255,0.5)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: "bold",
                  color: isGolden ? "#3d2800" : "white",
                  flexShrink: 0,
                  overflow: "hidden",
                }}
              >
                {sponsor?.logoUrl ? (
                  <img src={sponsor.logoUrl} alt={sponsor.name} style={{ width: 32, height: 32, objectFit: "contain" }} />
                ) : (
                  sponsor?.name?.[0]?.toUpperCase() ?? "?"
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: "'Fredoka One', cursive",
                    fontSize: 18,
                    color: isGolden ? "#3d2800" : "white",
                    lineHeight: 1.1,
                  }}
                >
                  {sponsor?.name ?? "Pijltjesschieten.nl"}
                </div>
                <div
                  style={{
                    fontFamily: "'VT323', monospace",
                    fontSize: 11,
                    color: isGolden ? "rgba(61,40,0,0.7)" : "rgba(255,255,255,0.75)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  📰 Uitgerold pijltje
                </div>
              </div>
              {/* Close button */}
              <button
                onClick={handleClose}
                style={{
                  width: 28, height: 28,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.2)",
                  border: "none",
                  cursor: "pointer",
                  color: isGolden ? "#3d2800" : "white",
                  fontSize: 13,
                  fontWeight: "bold",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
                aria-label="Sluiten"
              >
                ✕
              </button>
            </div>

            {/* ── Magazine page body — the printed ad ─────────────────────── */}
            <div style={{ padding: "14px 16px", background: isGolden ? "transparent" : "#F8F5EF" }}>

              {/* Simulated magazine text lines (decorative, like programme listings) */}
              {!isGolden && (
                <div style={{ marginBottom: 10, opacity: 0.3 }}>
                  {[80, 65, 90, 55, 75].map((w, i) => (
                    <div
                      key={i}
                      style={{
                        height: 5,
                        width: `${w}%`,
                        background: "#222",
                        borderRadius: 2,
                        marginBottom: 4,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Golden badge */}
              {isGolden && phase === "strip" && (
                <div style={{ textAlign: "center", marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 44,
                      filter: "drop-shadow(0 0 14px rgba(255,215,0,0.9))",
                      animation: "wiggle 1s ease-in-out infinite",
                      display: "inline-block",
                    }}
                  >🏆</div>
                  <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22, color: "#3d2800" }}>
                    GOUDEN PIJLTJE!
                  </div>
                  <div style={{ fontFamily: "'VT323', monospace", fontSize: 14, color: "#5c3d1e", marginTop: 2 }}>
                    Jij hebt het gouden pijltje gevonden!
                  </div>
                </div>
              )}

              {/* Prize box */}
              {isGolden && sponsor?.prizeText && phase === "strip" && (
                <div
                  style={{
                    background: "rgba(255,215,0,0.28)",
                    border: "2px solid rgba(255,215,0,0.55)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    marginBottom: 10,
                    color: "#3d2800",
                    animation: "fadeInUp 0.4s ease both",
                  }}
                >
                  <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 16, marginBottom: 4 }}>🎁 Jouw prijs:</div>
                  <div style={{ fontFamily: "'VT323', monospace", fontSize: 16, lineHeight: 1.4 }}>{sponsor.prizeText}</div>
                </div>
              )}

              {/* Main ad message — the "printed advertisement" on the magazine page */}
              <div
                style={{
                  background: isGolden ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)",
                  border: isGolden ? "1px solid rgba(255,215,0,0.3)" : `1px solid ${sponsorColor}40`,
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginBottom: 10,
                  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                {phase === "strip" ? (
                  <p
                    style={{
                      fontFamily: "'VT323', monospace",
                      fontSize: 17,
                      lineHeight: 1.5,
                      color: isGolden ? "#3d2800" : "#2d1a00",
                      margin: 0,
                      animation: "fadeInUp 0.35s ease both 0.1s",
                      animationFillMode: "both",
                    }}
                  >
                    {sponsor?.message ?? "Geen boodschap"}
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[75, 100, 60].map((w, i) => (
                      <div key={i} style={{ height: 8, width: `${w}%`, background: "#ccc", borderRadius: 3 }} />
                    ))}
                  </div>
                )}
              </div>

              {/* CTA buttons */}
              {phase === "strip" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    animation: "fadeInUp 0.4s ease both 0.2s",
                    animationFillMode: "both",
                  }}
                >
                  {isGolden && sponsor?.prizeClaimUrl && (
                    <a
                      href={sponsor.prizeClaimUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{
                        display: "block",
                        textAlign: "center",
                        padding: "10px 16px",
                        borderRadius: 10,
                        fontFamily: "'Fredoka One', cursive",
                        fontSize: 17,
                        background: "linear-gradient(135deg, #8B6914, #FFD700)",
                        color: "#3d2800",
                        textDecoration: "none",
                        border: "3px solid #3d2800",
                        boxShadow: "4px 4px 0 #3d2800",
                      }}
                    >
                      🏆 Claim je prijs →
                    </a>
                  )}
                  {sponsor?.clickUrl && (
                    <a
                      href={sponsor.clickUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{
                        display: "block",
                        textAlign: "center",
                        padding: "10px 16px",
                        borderRadius: 10,
                        fontFamily: "'Fredoka One', cursive",
                        fontSize: 17,
                        background: isGolden ? "rgba(0,0,0,0.65)" : sponsorColor,
                        color: "white",
                        textDecoration: "none",
                        border: `2px solid ${isGolden ? "rgba(0,0,0,0.4)" : darkenColor(sponsorColor, 0.2)}`,
                        boxShadow: `3px 3px 0 ${isGolden ? "rgba(0,0,0,0.4)" : darkenColor(sponsorColor, 0.3)}`,
                      }}
                    >
                      Bekijk meer →
                    </a>
                  )}
                </div>
              )}

              {/* Bottom decorative text lines (magazine footer) */}
              {!isGolden && phase === "strip" && (
                <div style={{ marginTop: 10, opacity: 0.15 }}>
                  {[45, 60, 35].map((w, i) => (
                    <div key={i} style={{ height: 4, width: `${w}%`, background: "#222", borderRadius: 2, marginBottom: 3 }} />
                  ))}
                </div>
              )}
            </div>

            {/* Glossy sheen overlay — the glossy magazine paper surface */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0) 60%)",
                pointerEvents: "none",
                borderRadius: "inherit",
              }}
            />

            {/* Golden shimmer sweep */}
            {isGolden && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  overflow: "hidden",
                  borderRadius: "inherit",
                  pointerEvents: "none",
                }}
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
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-120%); } 100% { transform: translateX(220%); } }
        @keyframes wiggle { 0%, 100% { transform: rotate(-8deg) scale(1); } 50% { transform: rotate(8deg) scale(1.1); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}

function darkenColor(color: string, amount: number): string {
  const clean = color.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map(c => c+c).join("") : clean;
  const num = parseInt(full, 16);
  if (isNaN(num)) return color;
  const r = Math.max(0, ((num >> 16) & 0xff) - Math.round(255 * amount));
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * amount));
  const b = Math.max(0, (num & 0xff) - Math.round(255 * amount));
  return `rgb(${r},${g},${b})`;
}

export default DartUnfoldModal;
