import { useEffect, useRef, useState } from "react";
import { PaperDart, DartSponsor } from "./PaperDart";

export interface FlyingDart {
  id: string;
  sponsor: DartSponsor | null;
  isGolden?: boolean;
  startX: number;
  startY: number;
  angle: number;
  speed: number;
  spin: number;
  firedAt: number;
  dbId?: number;
  dx?: number;
  dy?: number;
}

interface DartArenaProps {
  darts: FlyingDart[];
  onDartClick?: (dart: FlyingDart) => void;
  onDartLanded?: (dartId: string) => void;
}

interface AnimatedDart extends FlyingDart {
  x: number;
  y: number;
  rotation: number;
  opacity: number;
  landed: boolean;
  phase: "flying" | "resting";
  elapsed: number;
  resolvedDx: number;
  resolvedDy: number;
  resolvedAngle: number;
  travelDistance: number;
}

const FLIGHT_DURATION = 3000; // ms
const REST_DURATION   = 8000; // ms

// 4 straight-line directions
// sx/sy are fractions of viewport width/height for start position
const DIRECTIONS = [
  // Left → Right
  { sx: -0.05, sy: () => 0.15 + Math.random() * 0.7, dx: 1,  dy: 0,    angle: 0 },
  // Right → Left
  { sx: 1.05,  sy: () => 0.15 + Math.random() * 0.7, dx: -1, dy: 0,    angle: 180 },
  // Top-left → Bottom-right (~24°)
  { sx: -0.05, sy: () => Math.random() * 0.3,         dx: 1,  dy: 0.45, angle: 24 },
  // Top-right → Bottom-left
  { sx: 1.05,  sy: () => Math.random() * 0.3,         dx: -1, dy: 0.45, angle: 180 - 24 },
] as const;

export function DartArena({ darts, onDartClick, onDartLanded }: DartArenaProps) {
  const [animatedDarts, setAnimatedDarts] = useState<AnimatedDart[]>([]);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const processedIds = useRef<Set<string>>(new Set());

  // Spawn new darts with a random direction, using viewport dimensions
  useEffect(() => {
    const newDarts = darts.filter(d => !processedIds.current.has(d.id));
    if (newDarts.length === 0) return;
    newDarts.forEach(d => processedIds.current.add(d.id));

    setAnimatedDarts(prev => [
      ...prev,
      ...newDarts.map(d => {
        // Always use the visible viewport size — darts fly over what the user sees
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
        const startX = dir.sx * vw;
        const startY = dir.sy() * vh;
        const travelDistance = Math.sqrt(vw * vw + vh * vh) * 1.1;

        return {
          ...d,
          x: startX,
          y: startY,
          rotation: dir.angle,
          opacity: 1,
          landed: false,
          phase: "flying" as const,
          elapsed: 0,
          resolvedDx: dir.dx,
          resolvedDy: dir.dy,
          resolvedAngle: dir.angle,
          travelDistance,
          startX,
          startY,
        };
      }),
    ]);
  }, [darts]);

  // Animation loop — straight-line movement, no gravity
  useEffect(() => {
    const animate = (time: number) => {
      const delta = lastTimeRef.current ? time - lastTimeRef.current : 16;
      lastTimeRef.current = time;

      setAnimatedDarts(prev => {
        const next: AnimatedDart[] = [];
        let changed = false;

        for (const dart of prev) {
          if (dart.phase === "flying") {
            const elapsed = dart.elapsed + delta;
            const progress = Math.min(elapsed / FLIGHT_DURATION, 1);
            const dist = dart.travelDistance * progress;
            const x = dart.startX + dart.resolvedDx * dist;
            const y = dart.startY + dart.resolvedDy * dist;
            const opacity = progress > 0.9 ? 1 - (progress - 0.9) / 0.1 : 1;

            if (progress >= 1) {
              changed = true;
              next.push({ ...dart, x, y, opacity: 0, phase: "resting", elapsed, landed: true });
              onDartLanded?.(dart.id);
            } else {
              if (elapsed !== dart.elapsed) changed = true;
              next.push({ ...dart, x, y, rotation: dart.resolvedAngle, opacity, elapsed });
            }
          } else if (dart.phase === "resting") {
            const elapsed = dart.elapsed + delta;
            const restProgress = Math.min((elapsed - FLIGHT_DURATION) / REST_DURATION, 1);
            if (restProgress >= 1) {
              changed = true;
              // dart expires — don't push
            } else {
              if (elapsed !== dart.elapsed) changed = true;
              next.push({ ...dart, elapsed });
            }
          } else {
            next.push(dart);
          }
        }

        return changed ? next : prev;
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [onDartLanded]);

  return (
    <>
      {/* Fixed overlay covering the full visible viewport */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          pointerEvents: "none",
          zIndex: 9000,
          overflow: "hidden",
        }}
        aria-hidden="true"
      >
        {animatedDarts.map(dart => (
          <div
            key={dart.id}
            className="flying-dart"
            style={{
              position: "absolute",
              left: dart.x,
              top: dart.y,
              transform: `translate(-50%, -50%) rotate(${dart.rotation}deg)`,
              opacity: dart.opacity,
              pointerEvents: dart.phase === "flying" ? "auto" : "none",
              cursor: "pointer",
            }}
            onClick={() => onDartClick?.(dart)}
            title={dart.sponsor?.name ?? "Pijltje"}
          >
            <PaperDart
              sponsor={dart.sponsor}
              isGolden={dart.isGolden}
              width={220}
              height={38}
              spinning={false}
            />
          </div>
        ))}
      </div>
    </>
  );
}

export default DartArena;
