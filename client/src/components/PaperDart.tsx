import { useEffect, useRef } from "react";

export interface DartSponsor {
  id: number;
  name: string;
  logoUrl?: string | null;
  color: string;
  message: string;
  clickUrl: string;
}

interface PaperDartProps {
  sponsor?: DartSponsor | null;
  width?: number;
  height?: number;
  spinning?: boolean;
  className?: string;
  scale?: number;
}

/**
 * Renders a paper dart using Canvas — a cone/cylinder shape with
 * twisted paper stripes and sponsor branding wrapped around the body.
 * If a logoUrl is provided, the logo is drawn on the dart body with
 * a slight wave/skew to simulate being printed on rolled paper.
 */
export function PaperDart({ sponsor, width = 120, height = 40, spinning = false, className = "", scale = 1 }: PaperDartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const angleRef = useRef(0);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const logoLoadedRef = useRef(false);

  const dartColor = sponsor?.color ?? "#e8d5a3";

  // Pre-load logo image when sponsor changes
  useEffect(() => {
    logoLoadedRef.current = false;
    logoImgRef.current = null;

    if (sponsor?.logoUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        logoImgRef.current = img;
        logoLoadedRef.current = true;
        // Trigger a redraw if not spinning
        if (!spinning && canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          if (ctx) drawDartFn(ctx, canvasRef.current.width, canvasRef.current.height, 0);
        }
      };
      img.onerror = () => {
        logoImgRef.current = null;
        logoLoadedRef.current = false;
      };
      img.src = sponsor.logoUrl;
    }
  }, [sponsor?.logoUrl]);

  function drawDartFn(ctx: CanvasRenderingContext2D, W: number, H: number, spinAngle: number) {
    ctx.clearRect(0, 0, W, H);

    const tipX = W * 0.05;
    const tipY = H / 2;
    const bodyStart = W * 0.12;
    const bodyEnd = W * 0.88;
    const bodyRadius = H * 0.38;
    const tailRadius = H * 0.28;

    // ── Shadow ────────────────────────────────────────────────────────────
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;

    // ── Dart body (tapered cone shape) ────────────────────────────────────
    const gradient = ctx.createLinearGradient(bodyStart, tipY - bodyRadius, bodyStart, tipY + bodyRadius);
    const baseColor = hexToRgb(dartColor);
    gradient.addColorStop(0, `rgba(${Math.min(255, baseColor.r + 40)},${Math.min(255, baseColor.g + 30)},${Math.min(255, baseColor.b + 20)},1)`);
    gradient.addColorStop(0.3, `rgba(${baseColor.r},${baseColor.g},${baseColor.b},1)`);
    gradient.addColorStop(0.7, `rgba(${Math.max(0, baseColor.r - 20)},${Math.max(0, baseColor.g - 15)},${Math.max(0, baseColor.b - 10)},1)`);
    gradient.addColorStop(1, `rgba(${Math.max(0, baseColor.r - 40)},${Math.max(0, baseColor.g - 30)},${Math.max(0, baseColor.b - 20)},1)`);

    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.quadraticCurveTo(bodyStart, tipY - bodyRadius * 0.5, bodyStart + W * 0.1, tipY - bodyRadius);
    ctx.lineTo(bodyEnd, tipY - tailRadius);
    ctx.lineTo(bodyEnd, tipY + tailRadius);
    ctx.lineTo(bodyStart + W * 0.1, tipY + bodyRadius);
    ctx.quadraticCurveTo(bodyStart, tipY + bodyRadius * 0.5, tipX, tipY);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();

    // ── Twisted paper stripes ─────────────────────────────────────────────
    const stripeCount = 7;
    const stripeSpacing = (bodyEnd - bodyStart) / stripeCount;
    ctx.save();
    ctx.globalAlpha = 0.35;

    for (let i = 0; i < stripeCount; i++) {
      const x = bodyStart + i * stripeSpacing;
      const progress = i / stripeCount;
      const rTop = bodyRadius * (1 - progress * 0.35);
      const offset = Math.sin((spinAngle + i * 0.9) * 2) * rTop * 0.6;

      ctx.beginPath();
      ctx.moveTo(x, tipY - rTop + offset);
      ctx.lineTo(x + stripeSpacing * 0.7, tipY - rTop * 0.5 + offset * 0.5);
      ctx.lineWidth = Math.max(1, stripeSpacing * 0.25);
      ctx.strokeStyle = i % 2 === 0
        ? `rgba(${Math.max(0, baseColor.r - 50)},${Math.max(0, baseColor.g - 40)},${Math.max(0, baseColor.b - 30)},1)`
        : `rgba(${Math.min(255, baseColor.r + 60)},${Math.min(255, baseColor.g + 50)},${Math.min(255, baseColor.b + 40)},1)`;
      ctx.stroke();
    }
    ctx.restore();

    // ── Sponsor branding on body ──────────────────────────────────────────
    if (sponsor?.name) {
      ctx.save();
      const centerX = (bodyStart + bodyEnd) / 2;
      const waveOffset = Math.sin(spinAngle * 1.5) * 2;

      // Clip to dart body shape so branding stays inside
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.quadraticCurveTo(bodyStart, tipY - bodyRadius * 0.5, bodyStart + W * 0.1, tipY - bodyRadius);
      ctx.lineTo(bodyEnd, tipY - tailRadius);
      ctx.lineTo(bodyEnd, tipY + tailRadius);
      ctx.lineTo(bodyStart + W * 0.1, tipY + bodyRadius);
      ctx.quadraticCurveTo(bodyStart, tipY + bodyRadius * 0.5, tipX, tipY);
      ctx.clip();

      const logoImg = logoImgRef.current;
      if (logoImg && logoLoadedRef.current) {
        // Draw logo image with slight skew to simulate paper wrap
        const logoH = bodyRadius * 1.4;
        const logoW = Math.min(logoH * (logoImg.naturalWidth / logoImg.naturalHeight), (bodyEnd - bodyStart) * 0.45);
        ctx.save();
        ctx.translate(centerX, tipY);
        // Apply subtle wave skew to simulate printed-on-paper look
        ctx.transform(1, waveOffset * 0.008, waveOffset * 0.015, 1, 0, 0);
        ctx.globalAlpha = 0.88;
        ctx.drawImage(logoImg, -logoW / 2, -logoH / 2, logoW, logoH);
        ctx.restore();
      } else {
        // Fallback: sponsor name text with wave effect
        ctx.translate(centerX, tipY);
        ctx.rotate(waveOffset * 0.04);
        ctx.font = `bold ${Math.max(8, H * 0.22 * scale)}px 'Fredoka One', cursive`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillText(sponsor.name.toUpperCase(), 1, 1);
        // Main text
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fillText(sponsor.name.toUpperCase(), 0, 0);
      }
      ctx.restore();
    }

    // ── Tip (sharp point) ─────────────────────────────────────────────────
    ctx.save();
    const tipGrad = ctx.createLinearGradient(0, tipY - 4, 0, tipY + 4);
    tipGrad.addColorStop(0, "#c8a96e");
    tipGrad.addColorStop(1, "#8b6914");
    ctx.beginPath();
    ctx.moveTo(0, tipY);
    ctx.lineTo(bodyStart, tipY - H * 0.08);
    ctx.lineTo(bodyStart, tipY + H * 0.08);
    ctx.fillStyle = tipGrad;
    ctx.fill();
    ctx.restore();

    // ── Tail fins ─────────────────────────────────────────────────────────
    ctx.save();
    ctx.fillStyle = `rgba(${Math.max(0, baseColor.r - 30)},${Math.max(0, baseColor.g - 25)},${Math.max(0, baseColor.b - 15)},0.9)`;
    // Top fin
    ctx.beginPath();
    ctx.moveTo(bodyEnd - W * 0.05, tipY - tailRadius);
    ctx.lineTo(W, tipY - tailRadius * 1.8);
    ctx.lineTo(W, tipY - tailRadius * 0.3);
    ctx.lineTo(bodyEnd, tipY - tailRadius * 0.5);
    ctx.fill();
    // Bottom fin
    ctx.beginPath();
    ctx.moveTo(bodyEnd - W * 0.05, tipY + tailRadius);
    ctx.lineTo(W, tipY + tailRadius * 1.8);
    ctx.lineTo(W, tipY + tailRadius * 0.3);
    ctx.lineTo(bodyEnd, tipY + tailRadius * 0.5);
    ctx.fill();
    ctx.restore();

    // ── Outline ───────────────────────────────────────────────────────────
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.quadraticCurveTo(bodyStart, tipY - bodyRadius * 0.5, bodyStart + W * 0.1, tipY - bodyRadius);
    ctx.lineTo(bodyEnd, tipY - tailRadius);
    ctx.lineTo(W, tipY - tailRadius * 1.8);
    ctx.stroke();
    ctx.restore();
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

    if (spinning) {
      const animate = () => {
        angleRef.current += 0.08;
        drawDartFn(ctx, W, H, angleRef.current);
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      drawDartFn(ctx, W, H, 0);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [sponsor, width, height, spinning, scale, dartColor]);

  return (
    <canvas
      ref={canvasRef}
      width={width * scale}
      height={height * scale}
      style={{ width: width, height: height }}
      className={className}
    />
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const num = parseInt(clean.length === 3
    ? clean.split("").map(c => c + c).join("")
    : clean, 16);
  return {
    r: Math.min(255, Math.max(0, (num >> 16) & 0xff)),
    g: Math.min(255, Math.max(0, (num >> 8) & 0xff)),
    b: Math.min(255, Math.max(0, num & 0xff)),
  };
}

export default PaperDart;
