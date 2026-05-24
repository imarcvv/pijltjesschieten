import { useEffect, useRef } from "react";

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
}

/**
 * Renders an authentic Dutch blowpipe dart:
 * - A long, very thin cone (sharp tip on left, wide open end on right)
 * - Made from a strip of glossy magazine paper rolled diagonally
 * - Diagonal colour/photo bands wrap around the cone like a barber pole
 * - Sponsor branding appears as one of the diagonal glossy bands
 * - Tip is dark/hardened (sealed with saliva on glossy paper)
 * - Golden variant: warm gold foil shimmer with pulsing glow
 *
 * Real proportions: ~20–25 cm long, ~1 cm wide at base → aspect ratio ~20:1
 * We render at whatever width×height is given but keep the cone very elongated.
 */
export function PaperDart({
  sponsor,
  isGolden = false,
  width = 160,
  height = 28,
  spinning = false,
  className = "",
  scale = 1,
}: PaperDartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const angleRef = useRef(0);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const logoLoadedRef = useRef(false);

  // Pre-load sponsor logo
  useEffect(() => {
    logoLoadedRef.current = false;
    logoImgRef.current = null;
    if (sponsor?.logoUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        logoImgRef.current = img;
        logoLoadedRef.current = true;
        if (!spinning && canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          if (ctx) drawDart(ctx, canvasRef.current.width, canvasRef.current.height, 0);
        }
      };
      img.onerror = () => { logoImgRef.current = null; logoLoadedRef.current = false; };
      img.src = sponsor.logoUrl;
    }
  }, [sponsor?.logoUrl]);

  // ── Colour palette derived from sponsor colour ──────────────────────────────
  function getStripeColors(baseHex: string): string[] {
    const c = hexToRgb(baseHex);
    // Generate 4–5 glossy magazine-like colours: the sponsor colour + complementary tones
    return [
      `rgb(${c.r},${c.g},${c.b})`,
      `rgb(${Math.min(255,c.r+60)},${Math.min(255,c.g+50)},${Math.min(255,c.b+40)})`,
      `rgb(${Math.max(0,c.r-50)},${Math.max(0,c.g-40)},${Math.max(0,c.b-30)})`,
      `rgb(${Math.min(255,c.r+30)},${Math.min(255,c.g+20)},${Math.max(0,c.b-20)})`,
      `rgb(${Math.max(0,c.r-20)},${Math.min(255,c.g+40)},${Math.min(255,c.b+60)})`,
    ];
  }

  const GOLDEN_STRIPES = [
    "#8B6914", "#FFD700", "#C8A96E", "#FFA500", "#FFFACD",
  ];

  function drawDart(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
    ctx.clearRect(0, 0, W, H);

    // ── Geometry ──────────────────────────────────────────────────────────────
    // The dart is a very elongated cone.
    // Tip (sharp point) is at the LEFT. Wide open end is at the RIGHT.
    const tipX = W * 0.02;           // sharp tip x
    const tipY = H * 0.5;            // tip y (center)
    const baseX = W * 0.97;          // wide end x
    const halfBaseH = H * 0.46;      // half-height at the wide (tail) end
    // The cone tapers linearly from halfBaseH at baseX to 0 at tipX
    const coneLength = baseX - tipX;

    // Helper: half-height of cone at a given x position
    function halfH(x: number): number {
      const t = (x - tipX) / coneLength;
      return halfBaseH * t;
    }

    // ── Clip path (cone outline) ───────────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(baseX, tipY - halfBaseH);
    ctx.lineTo(baseX, tipY + halfBaseH);
    ctx.closePath();
    ctx.clip();

    // ── Background: base paper colour ────────────────────────────────────────
    const baseColor = sponsor?.color ?? "#e8d5a3";
    const stripeColors = isGolden ? GOLDEN_STRIPES : getStripeColors(baseColor);

    // Fill whole cone with first stripe colour as base
    ctx.fillStyle = stripeColors[0];
    ctx.fillRect(tipX, tipY - halfBaseH, coneLength, halfBaseH * 2);

    // ── Diagonal glossy magazine strips ──────────────────────────────────────
    // Each strip is a diagonal band running at ~30° across the cone,
    // simulating the magazine page wrapped diagonally around the paper tube.
    // Strip width in x-axis: ~15% of cone length
    const stripeW = coneLength * 0.18;
    const numStripes = Math.ceil(coneLength / stripeW) + 2;
    const diagonalSlant = halfBaseH * 1.4; // how much each stripe shifts vertically

    for (let i = -1; i < numStripes; i++) {
      const xLeft = tipX + i * stripeW;
      const xRight = xLeft + stripeW;
      const colorIdx = ((i % stripeColors.length) + stripeColors.length) % stripeColors.length;

      // Each stripe is a parallelogram: slanted diagonally
      ctx.beginPath();
      ctx.moveTo(xLeft,  tipY - halfH(xLeft)  - diagonalSlant * 0.5);
      ctx.lineTo(xRight, tipY - halfH(xRight) - diagonalSlant * 0.5);
      ctx.lineTo(xRight, tipY + halfH(xRight) + diagonalSlant * 0.5);
      ctx.lineTo(xLeft,  tipY + halfH(xLeft)  + diagonalSlant * 0.5);
      ctx.closePath();

      // Glossy gradient per stripe
      const grad = ctx.createLinearGradient(xLeft, tipY - halfBaseH, xLeft, tipY + halfBaseH);
      const sc = stripeColors[colorIdx];
      grad.addColorStop(0,   lighten(sc, 0.35));
      grad.addColorStop(0.3, sc);
      grad.addColorStop(0.7, darken(sc, 0.2));
      grad.addColorStop(1,   darken(sc, 0.4));
      ctx.fillStyle = grad;
      ctx.fill();

      // Glossy sheen highlight on each stripe
      const sheen = ctx.createLinearGradient(xLeft, tipY - halfBaseH, xLeft + stripeW * 0.4, tipY);
      sheen.addColorStop(0, "rgba(255,255,255,0.35)");
      sheen.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sheen;
      ctx.fill();
    }

    // ── Sponsor branding strip ────────────────────────────────────────────────
    // One of the diagonal bands is the sponsor's brand strip
    if (sponsor) {
      const brandX = tipX + coneLength * 0.42; // position brand in middle-ish
      const brandW = stripeW * 1.4;

      ctx.save();
      // Clip to the brand strip parallelogram
      ctx.beginPath();
      ctx.moveTo(brandX,         tipY - halfH(brandX)         - diagonalSlant * 0.5);
      ctx.lineTo(brandX + brandW, tipY - halfH(brandX + brandW) - diagonalSlant * 0.5);
      ctx.lineTo(brandX + brandW, tipY + halfH(brandX + brandW) + diagonalSlant * 0.5);
      ctx.lineTo(brandX,         tipY + halfH(brandX)         + diagonalSlant * 0.5);
      ctx.closePath();
      ctx.clip();

      const logoImg = logoImgRef.current;
      if (logoImg && logoLoadedRef.current) {
        // Draw logo image filling the brand strip
        const lH = halfH(brandX + brandW * 0.5) * 2.2;
        const lW = lH * (logoImg.naturalWidth / logoImg.naturalHeight);
        ctx.globalAlpha = 0.92;
        ctx.drawImage(
          logoImg,
          brandX + brandW * 0.5 - lW * 0.5,
          tipY - lH * 0.5,
          lW,
          lH
        );
      } else {
        // Fallback: sponsor name text
        const midX = brandX + brandW * 0.5;
        const midH = halfH(midX);
        const fontSize = Math.max(6, midH * 0.8);
        ctx.font = `bold ${fontSize}px 'Fredoka One', cursive`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillText(sponsor.name.toUpperCase(), midX + 0.5, tipY + 0.5);
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.fillText(sponsor.name.toUpperCase(), midX, tipY);
      }
      ctx.restore();
    }

    // ── Golden foil shimmer overlay ───────────────────────────────────────────
    if (isGolden) {
      const shimmer = ctx.createLinearGradient(tipX, tipY - halfBaseH, baseX, tipY + halfBaseH);
      const pulse = 0.15 + 0.1 * Math.sin(t * 2.5);
      shimmer.addColorStop(0,   `rgba(255,215,0,0)`);
      shimmer.addColorStop(0.3, `rgba(255,235,100,${pulse})`);
      shimmer.addColorStop(0.6, `rgba(255,215,0,${pulse * 0.8})`);
      shimmer.addColorStop(1,   `rgba(255,215,0,0)`);
      ctx.fillStyle = shimmer;
      ctx.fillRect(tipX, tipY - halfBaseH, coneLength, halfBaseH * 2);
    }

    ctx.restore(); // end clip

    // ── Tip: dark hardened point (sealed with saliva) ─────────────────────────
    ctx.save();
    const tipLen = coneLength * 0.08;
    const tipGrad = ctx.createLinearGradient(tipX, 0, tipX + tipLen, 0);
    tipGrad.addColorStop(0, "#1a0f00");
    tipGrad.addColorStop(0.5, "#3d2800");
    tipGrad.addColorStop(1, "rgba(61,40,0,0)");
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX + tipLen, tipY - halfH(tipX + tipLen));
    ctx.lineTo(tipX + tipLen, tipY + halfH(tipX + tipLen));
    ctx.closePath();
    ctx.fillStyle = tipGrad;
    ctx.fill();
    ctx.restore();

    // ── Outline (subtle shadow edge) ──────────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(baseX, tipY - halfBaseH);
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(baseX, tipY + halfBaseH);
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();

    // ── Golden glow (outside clip) ────────────────────────────────────────────
    if (isGolden) {
      ctx.save();
      ctx.shadowColor = `rgba(255,215,0,${0.6 + 0.3 * Math.sin(t * 2.5)})`;
      ctx.shadowBlur = 10 + 5 * Math.sin(t * 2.5);
      ctx.strokeStyle = "rgba(255,215,0,0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(baseX, tipY - halfBaseH);
      ctx.lineTo(baseX, tipY + halfBaseH);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = width * scale;
    const H = height * scale;
    canvas.width = W;
    canvas.height = H;

    if (spinning || isGolden) {
      const animate = () => {
        angleRef.current += 0.06;
        drawDart(ctx, W, H, angleRef.current);
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      drawDart(ctx, W, H, 0);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [sponsor, width, height, spinning, scale, isGolden]);

  return (
    <canvas
      ref={canvasRef}
      width={width * scale}
      height={height * scale}
      style={{ width, height }}
      className={className}
    />
  );
}

// ── Colour helpers ─────────────────────────────────────────────────────────────
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const full = clean.length === 3
    ? clean.split("").map(c => c + c).join("")
    : clean;
  const num = parseInt(full, 16);
  return {
    r: Math.min(255, Math.max(0, (num >> 16) & 0xff)),
    g: Math.min(255, Math.max(0, (num >> 8) & 0xff)),
    b: Math.min(255, Math.max(0, num & 0xff)),
  };
}

function lighten(color: string, amount: number): string {
  if (color.startsWith("rgb")) {
    const m = color.match(/\d+/g);
    if (!m) return color;
    const [r, g, b] = m.map(Number);
    return `rgb(${Math.min(255,r+Math.round(255*amount))},${Math.min(255,g+Math.round(255*amount))},${Math.min(255,b+Math.round(255*amount))})`;
  }
  return color;
}

function darken(color: string, amount: number): string {
  if (color.startsWith("rgb")) {
    const m = color.match(/\d+/g);
    if (!m) return color;
    const [r, g, b] = m.map(Number);
    return `rgb(${Math.max(0,r-Math.round(255*amount))},${Math.max(0,g-Math.round(255*amount))},${Math.max(0,b-Math.round(255*amount))})`;
  }
  return color;
}

export default PaperDart;
