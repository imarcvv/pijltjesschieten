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
}

/**
 * Photo-realistic paper dart using the actual pijltje.png reference image.
 *
 * Colour tinting is achieved with CSS filters:
 *   sepia(1) converts to warm sepia, then hue-rotate shifts to the sponsor hue,
 *   saturate boosts vibrancy, brightness adjusts lightness.
 *
 * Golden darts get a warm gold/amber filter.
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
}: PaperDartProps) {
  const DART_IMG = "/manus-storage/pijltje_5eb6cf2f.png";

  const cssFilter = useMemo(() => {
    if (isGolden) {
      return "sepia(1) hue-rotate(5deg) saturate(5) brightness(1.2)";
    }
    if (!sponsor?.color) {
      return "sepia(0.2) saturate(1.1) brightness(1.0)";
    }
    // Parse hex to get hue
    const hex = sponsor.color.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    if (max !== min) {
      const d = max - min;
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    const hueDeg = Math.round(h * 360);
    // sepia(1) gives ~30° warm base; rotate from there to target hue
    const rotateAmount = hueDeg - 30;
    return `sepia(1) hue-rotate(${rotateAmount}deg) saturate(3.5) brightness(1.05)`;
  }, [sponsor?.color, isGolden]);

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
          src={DART_IMG}
          alt={sponsor ? `Pijltje van ${sponsor.name}` : "Papieren pijltje"}
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "fill",
            display: "block",
            userSelect: "none",
            filter: cssFilter,
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
        {sponsor?.logoUrl && (
          <div
            style={{
              position: "absolute",
              right: Math.round(w * 0.04),
              top: "50%",
              transform: "translateY(-50%)",
              width: Math.max(14, Math.round(h * 0.65)),
              height: Math.max(14, Math.round(h * 0.65)),
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
              right: Math.round(w * 0.05),
              top: "50%",
              transform: "translateY(-50%)",
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
              transform: "translateY(-50%)",
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
