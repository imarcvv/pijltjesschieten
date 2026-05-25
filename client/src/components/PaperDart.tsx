import React, { useMemo } from "react";

export interface DartSponsor {
  id: number;
  name: string;
  logoUrl?: string | null;
  color: string;
  message: string;
  clickUrl: string;
  prizeText?: string | null;
  prizeClaimUrl?: string | null;
}

interface PaperDartProps {
  sponsor?: DartSponsor | null;
  isGolden?: boolean;
  width?: number;
  height?: number;
  spinning?: boolean;
  className?: string;
  scale?: number;
  style?: React.CSSProperties;
  onClick?: () => void;
  /** 0=geel, 1=blauw, 2=wit. If omitted, a stable random variant is chosen. */
  variant?: 0 | 1 | 2;
  /** Flip the dart 180° (right→left flight) while keeping sponsor label upright. */
  flippedForRTL?: boolean;
}

// The 3 real photo dart images — all point RIGHT by default
const DART_IMAGES = [
  "/manus-storage/pijltjegeel_961740f5.png",   // 0 = geel
  "/manus-storage/pijltjeblauw_c47034bc.png",  // 1 = blauw
  "/manus-storage/pijltjewit_868c31a1.png",    // 2 = wit
] as const;

/**
 * Photo-realistic paper dart using 3 real pijltje photos (geel/blauw/wit).
 * Images point RIGHT by default.
 * Use flippedForRTL=true for right→left flight; sponsor badge is counter-rotated
 * so it always stays horizontally readable.
 */
export function PaperDart({
  sponsor,
  isGolden = false,
  width = 200,
  height = 40,
  spinning = false,
  className = "",
  scale = 1,
  style,
  onClick,
  variant,
  flippedForRTL = false,
}: PaperDartProps) {
  // Stable random variant per mount
  const resolvedVariant = useMemo<0 | 1 | 2>(() => {
    if (variant !== undefined) return variant;
    return (Math.floor(Math.random() * 3)) as 0 | 1 | 2;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dartImg = DART_IMAGES[resolvedVariant];
  const w = width * scale;
  const h = height * scale;

  return (
    <>
      <style>{`
        @keyframes dart-spin-flight {
          0%,100% { transform: scaleY(1); }
          50%      { transform: scaleY(0.45); }
        }
        @keyframes golden-shimmer-dart {
          0%   { left: -60%; }
          100% { left: 120%; }
        }
        @keyframes golden-pulse-trophy {
          0%,100% { opacity:1; transform:translateY(-50%) scale(1); }
          50%      { opacity:0.7; transform:translateY(-50%) scale(1.25); }
        }
      `}</style>
      <div
        className={className}
        onClick={onClick}
        style={{
          position: "relative",
          width: w,
          height: h,
          display: "inline-flex",
          alignItems: "center",
          cursor: onClick ? "pointer" : "default",
          flexShrink: 0,
          ...style,
        }}
      >
        {/* ── Real photo dart image ─────────────────────────────────── */}
        <img
          src={dartImg}
          alt={sponsor ? `Pijltje van ${sponsor.name}` : "Papieren pijltje"}
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "fill",
            display: "block",
            userSelect: "none",
            filter: isGolden ? "sepia(1) hue-rotate(5deg) saturate(5) brightness(1.2)" : undefined,
            animation: spinning ? "dart-spin-flight 0.18s linear infinite" : undefined,
          }}
        />

        {/* ── Golden shimmer sweep ──────────────────────────────────── */}
        {isGolden && (
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: "50%",
              background: "linear-gradient(90deg, transparent, rgba(255,255,180,0.55), transparent)",
              animation: "golden-shimmer-dart 1.6s linear infinite",
              pointerEvents: "none",
            }}
          />
        )}

        {/* ── Sponsor logo badge at the wide/back end ───────────────── */}
        {/* Back/wide end is LEFT in the image (tip is on the right).          */}
        {/* Counter-rotate the badge when dart is flipped so logo stays upright */}
        {sponsor?.logoUrl && (
          <div
            style={{
              position: "absolute",
              left: Math.round(w * 0.02),
              top: "50%",
              transform: flippedForRTL ? "translateY(-50%) rotate(-180deg)" : "translateY(-50%)",
              width: Math.max(14, Math.round(h * 0.75)),
              height: Math.max(14, Math.round(h * 0.75)),
              borderRadius: 2,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.7)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.45)",
              background: "rgba(255,255,255,0.88)",
            }}
          >
            <img
              src={sponsor.logoUrl}
              alt={sponsor.name}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
              draggable={false}
            />
          </div>
        )}

        {/* ── Sponsor name label (when no logo) ────────────────────── */}
        {!sponsor?.logoUrl && sponsor?.name && w >= 80 && (
          <div
            style={{
              position: "absolute",
              left: Math.round(w * 0.03),
              top: "50%",
              transform: flippedForRTL ? "translateY(-50%) rotate(-180deg)" : "translateY(-50%)",
              background: sponsor.color,
              color: "#fff",
              fontSize: Math.max(7, Math.round(h * 0.28)),
              fontFamily: "Verdana, Arial, sans-serif",
              fontWeight: "bold",
              padding: "1px 4px",
              whiteSpace: "nowrap",
              border: "1px solid rgba(0,0,0,0.3)",
              textShadow: "0 1px 1px rgba(0,0,0,0.4)",
              maxWidth: Math.round(w * 0.35),
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {sponsor.name}
          </div>
        )}

        {/* ── Golden trophy icon ────────────────────────────────────── */}
        {isGolden && (
          <div
            style={{
              position: "absolute",
              left: Math.round(w * 0.38),
              top: "50%",
              transform: flippedForRTL ? "translateY(-50%) rotate(-180deg)" : "translateY(-50%)",
              fontSize: Math.max(10, Math.round(h * 0.55)),
              filter: "drop-shadow(0 0 4px rgba(255,200,0,0.9))",
              animation: "golden-pulse-trophy 1.2s ease-in-out infinite",
              pointerEvents: "none",
            }}
          >
            🏆
          </div>
        )}
      </div>
    </>
  );
}

export default PaperDart;
