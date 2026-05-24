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
 * Renders an authentic Dutch blowpipe dart as seen in the reference photos:
 *
 * ANATOMY (from the photos):
 * - A nearly CYLINDRICAL tube — uniform width along ~90% of its length
 * - Only the very tip (leftmost ~8%) tapers to a sharp point
 * - Made from a strip of glossy magazine paper (Veronica Gids, Wehkamp, etc.)
 * - The magazine content (text, logos, colours) wraps HORIZONTALLY around the tube
 * - Base colour is white/off-white with black printed text visible
 * - Sponsor colour appears as a bold horizontal band/label on the body
 * - 3D cylindrical shading: bright highlight along the top, shadow at the bottom
 *
 * The dart flies horizontally (tip pointing LEFT in the direction of travel).
 */
export function PaperDart({
  sponsor,
  isGolden = false,
  width = 180,
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

  function drawDart(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
    ctx.clearRect(0, 0, W, H);

    // ── Geometry ──────────────────────────────────────────────────────────────
    // The dart is a cylinder with a short tapered tip on the LEFT.
    // Tip point: leftmost pixel
    // Cylinder body: from tipEndX to bodyEndX (the open tail end)
    const tipX = W * 0.01;           // very tip of the point
    const tipEndX = W * 0.10;        // where the taper ends and cylinder begins
    const bodyEndX = W * 0.98;       // open tail end of the cylinder
    const cy = H * 0.5;              // vertical centre
    const r = H * 0.40;              // cylinder radius (half-height of body)
    const tipR = H * 0.04;           // radius at the very tip (nearly zero)

    // ── Helper: radius at x position ──────────────────────────────────────────
    function radiusAt(x: number): number {
      if (x <= tipX) return tipR;
      if (x >= tipEndX) return r;
      // Linear taper from tipR to r over the tip section
      const t = (x - tipX) / (tipEndX - tipX);
      return tipR + (r - tipR) * t;
    }

    // ── Clip to dart silhouette ────────────────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    // Tip point
    ctx.moveTo(tipX, cy);
    // Top edge: taper then straight cylinder top
    ctx.lineTo(tipEndX, cy - r);
    ctx.lineTo(bodyEndX, cy - r);
    // Tail end: flat open circle (rectangle in 2D)
    ctx.lineTo(bodyEndX, cy + r);
    // Bottom edge back to tip
    ctx.lineTo(tipEndX, cy + r);
    ctx.closePath();
    ctx.clip();

    // ── Base: white/off-white magazine paper ──────────────────────────────────
    ctx.fillStyle = isGolden ? "#FFF8E7" : "#F8F5EF";
    ctx.fillRect(0, 0, W, H);

    // ── Magazine content bands — horizontal text-like stripes ─────────────────
    // These simulate the printed content of the magazine page wrapped around the tube.
    // They run horizontally (parallel to the dart axis) at different vertical positions.
    const bands = generateMagazineBands(W, H, sponsor?.color ?? "#e8d5a3", isGolden);
    for (const band of bands) {
      ctx.fillStyle = band.color;
      ctx.fillRect(band.x, cy - r + band.yOffset, band.width, band.height);
    }

    // ── Simulated printed text lines on the body ──────────────────────────────
    // Small horizontal text-like marks, like the Veronica Gids programme listings
    if (!isGolden) {
      ctx.save();
      ctx.globalAlpha = 0.25;
      const lineY = [0.25, 0.42, 0.58, 0.75];
      for (const ly of lineY) {
        const y = cy - r + (r * 2) * ly;
        // Draw small text-like dashes
        for (let x = tipEndX + 8; x < bodyEndX - 10; x += 14 + Math.sin(x * 0.3) * 4) {
          const lineW = 6 + Math.sin(x * 0.7) * 4;
          ctx.fillStyle = "#222";
          ctx.fillRect(x, y - 0.5, lineW, 1);
        }
      }
      ctx.restore();
    }

    // ── Sponsor colour band ───────────────────────────────────────────────────
    // A bold horizontal coloured band — like the red FOX logo band in the photo
    const sponsorColor = isGolden ? "#FFD700" : (sponsor?.color ?? "#e8520a");
    const bandY = cy - r * 0.35;
    const bandH = r * 0.7;
    const bandX = tipEndX + (bodyEndX - tipEndX) * 0.25;
    const bandW = (bodyEndX - tipEndX) * 0.45;

    const sponsorBandGrad = ctx.createLinearGradient(bandX, bandY, bandX, bandY + bandH);
    sponsorBandGrad.addColorStop(0, lighten(sponsorColor, 0.2));
    sponsorBandGrad.addColorStop(0.4, sponsorColor);
    sponsorBandGrad.addColorStop(1, darken(sponsorColor, 0.25));
    ctx.fillStyle = sponsorBandGrad;
    ctx.fillRect(bandX, bandY, bandW, bandH);

    // ── Sponsor name or logo on the band ─────────────────────────────────────
    const logoImg = logoImgRef.current;
    if (logoImg && logoLoadedRef.current) {
      const lH = bandH * 0.85;
      const lW = lH * (logoImg.naturalWidth / logoImg.naturalHeight);
      const lX = bandX + bandW * 0.5 - lW * 0.5;
      const lY = bandY + bandH * 0.5 - lH * 0.5;
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.drawImage(logoImg, lX, lY, lW, lH);
      ctx.restore();
    } else if (sponsor?.name) {
      const fontSize = Math.max(5, bandH * 0.65);
      ctx.save();
      ctx.font = `bold ${fontSize}px 'Fredoka One', 'Arial Narrow', Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillText(
        sponsor.name.toUpperCase().slice(0, 10),
        bandX + bandW * 0.5 + 0.5,
        bandY + bandH * 0.5 + 0.5
      );
      // Text
      ctx.fillStyle = isTextDark(sponsorColor) ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.85)";
      ctx.fillText(
        sponsor.name.toUpperCase().slice(0, 10),
        bandX + bandW * 0.5,
        bandY + bandH * 0.5
      );
      ctx.restore();
    }

    // ── 3D cylindrical shading ────────────────────────────────────────────────
    // Top highlight: bright white streak along the top edge (light source above)
    const highlightGrad = ctx.createLinearGradient(0, cy - r, 0, cy - r * 0.3);
    highlightGrad.addColorStop(0, "rgba(255,255,255,0.75)");
    highlightGrad.addColorStop(0.5, "rgba(255,255,255,0.25)");
    highlightGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = highlightGrad;
    ctx.fillRect(tipEndX, cy - r, bodyEndX - tipEndX, r * 0.7);

    // Bottom shadow: dark gradient along the bottom edge
    const shadowGrad = ctx.createLinearGradient(0, cy + r * 0.3, 0, cy + r);
    shadowGrad.addColorStop(0, "rgba(0,0,0,0)");
    shadowGrad.addColorStop(0.5, "rgba(0,0,0,0.12)");
    shadowGrad.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(tipEndX, cy + r * 0.3, bodyEndX - tipEndX, r * 0.7);

    // ── Golden shimmer overlay ────────────────────────────────────────────────
    if (isGolden) {
      const pulse = 0.12 + 0.08 * Math.sin(t * 2.5);
      const shimmer = ctx.createLinearGradient(tipEndX, 0, bodyEndX, 0);
      shimmer.addColorStop(0, `rgba(255,215,0,0)`);
      shimmer.addColorStop(0.3, `rgba(255,235,100,${pulse})`);
      shimmer.addColorStop(0.7, `rgba(255,215,0,${pulse * 0.7})`);
      shimmer.addColorStop(1, `rgba(255,215,0,0)`);
      ctx.fillStyle = shimmer;
      ctx.fillRect(tipEndX, cy - r, bodyEndX - tipEndX, r * 2);
    }

    ctx.restore(); // end clip

    // ── Tip: dark hardened point ──────────────────────────────────────────────
    // The tip is sealed with saliva on the glossy paper — it looks dark/shiny
    ctx.save();
    const tipClip = new Path2D();
    tipClip.moveTo(tipX, cy);
    tipClip.lineTo(tipEndX, cy - radiusAt(tipEndX));
    tipClip.lineTo(tipEndX, cy + radiusAt(tipEndX));
    tipClip.closePath();
    ctx.clip(tipClip);

    const tipGrad = ctx.createLinearGradient(tipX, 0, tipEndX, 0);
    tipGrad.addColorStop(0, "#1a0f00");
    tipGrad.addColorStop(0.4, "#3d2800");
    tipGrad.addColorStop(0.8, "#6b4c1e");
    tipGrad.addColorStop(1, "rgba(107,76,30,0)");
    ctx.fillStyle = tipGrad;
    ctx.fillRect(tipX, 0, tipEndX - tipX, H);

    // Tip highlight (glossy sealed paper)
    const tipHighlight = ctx.createLinearGradient(tipX, cy - r, tipX, cy);
    tipHighlight.addColorStop(0, "rgba(255,255,255,0.3)");
    tipHighlight.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = tipHighlight;
    ctx.fillRect(tipX, 0, tipEndX - tipX, H);
    ctx.restore();

    // ── Outline ───────────────────────────────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tipX, cy);
    ctx.lineTo(tipEndX, cy - r);
    ctx.lineTo(bodyEndX, cy - r);
    ctx.moveTo(tipX, cy);
    ctx.lineTo(tipEndX, cy + r);
    ctx.lineTo(bodyEndX, cy + r);
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    // Tail end cap
    ctx.beginPath();
    ctx.moveTo(bodyEndX, cy - r);
    ctx.lineTo(bodyEndX, cy + r);
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.stroke();
    ctx.restore();

    // ── Golden glow ───────────────────────────────────────────────────────────
    if (isGolden) {
      ctx.save();
      ctx.shadowColor = `rgba(255,215,0,${0.5 + 0.25 * Math.sin(t * 2.5)})`;
      ctx.shadowBlur = 8 + 4 * Math.sin(t * 2.5);
      ctx.strokeStyle = "rgba(255,215,0,0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tipX, cy);
      ctx.lineTo(tipEndX, cy - r);
      ctx.lineTo(bodyEndX, cy - r);
      ctx.lineTo(bodyEndX, cy + r);
      ctx.lineTo(tipEndX, cy + r);
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

// ── Magazine band generator ────────────────────────────────────────────────────
// Generates horizontal coloured bands that simulate the magazine page content
// visible when the paper is wrapped around the cylinder.
interface Band {
  x: number;
  yOffset: number;
  width: number;
  height: number;
  color: string;
}

function generateMagazineBands(W: number, H: number, sponsorColor: string, isGolden: boolean): Band[] {
  const r = H * 0.40;
  const bands: Band[] = [];

  if (isGolden) {
    // Golden: warm gold stripes
    const goldenColors = ["#FFD700", "#FFA500", "#C8A96E", "#FFE066", "#8B6914"];
    for (let i = 0; i < 5; i++) {
      bands.push({
        x: 0, yOffset: (r * 2 / 5) * i,
        width: W, height: r * 2 / 5,
        color: goldenColors[i % goldenColors.length],
      });
    }
  } else {
    // Normal: white base with thin coloured accent bands (like Veronica Gids)
    // Thin red/orange accent stripe near top
    bands.push({ x: 0, yOffset: 0, width: W, height: r * 0.18, color: lighten(sponsorColor, 0.3) });
    // Thin accent stripe near bottom
    bands.push({ x: 0, yOffset: r * 1.82, width: W, height: r * 0.18, color: lighten(sponsorColor, 0.15) });
    // Very thin black text-area lines at 1/3 and 2/3 height
    bands.push({ x: 0, yOffset: r * 0.55, width: W, height: r * 0.08, color: "rgba(0,0,0,0.06)" });
    bands.push({ x: 0, yOffset: r * 1.1, width: W, height: r * 0.08, color: "rgba(0,0,0,0.06)" });
  }

  return bands;
}

// ── Colour helpers ─────────────────────────────────────────────────────────────
function lighten(color: string, amount: number): string {
  const rgb = parseColor(color);
  if (!rgb) return color;
  return `rgb(${Math.min(255,rgb[0]+Math.round(255*amount))},${Math.min(255,rgb[1]+Math.round(255*amount))},${Math.min(255,rgb[2]+Math.round(255*amount))})`;
}

function darken(color: string, amount: number): string {
  const rgb = parseColor(color);
  if (!rgb) return color;
  return `rgb(${Math.max(0,rgb[0]-Math.round(255*amount))},${Math.max(0,rgb[1]-Math.round(255*amount))},${Math.max(0,rgb[2]-Math.round(255*amount))})`;
}

function parseColor(color: string): [number,number,number] | null {
  if (color.startsWith("#")) {
    const clean = color.replace("#", "");
    const full = clean.length === 3 ? clean.split("").map(c => c+c).join("") : clean;
    const num = parseInt(full, 16);
    return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
  }
  if (color.startsWith("rgb")) {
    const m = color.match(/\d+/g);
    if (m && m.length >= 3) return [Number(m[0]), Number(m[1]), Number(m[2])];
  }
  return null;
}

function isTextDark(color: string): boolean {
  const rgb = parseColor(color);
  if (!rgb) return false;
  // Perceived luminance
  const lum = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
  return lum < 140;
}

export default PaperDart;
