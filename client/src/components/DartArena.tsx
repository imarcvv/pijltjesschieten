import { useEffect, useRef, useState, useCallback } from "react";
import { PaperDart, DartSponsor } from "./PaperDart";

export interface FlyingDart {
  id: string;
  sponsor: DartSponsor | null;
  isGolden?: boolean;
  startX: number;
  startY: number;
  angle: number;   // degrees — visual rotation of the dart image
  speed: number;   // fraction of screen width per FLIGHT_DURATION
  spin: number;    // unused for straight flight but kept for API compat
  firedAt: number;
  dbId?: number;
  // Direction vector (set when dart is created)
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
  // Resolved direction
  resolvedDx: number;
  resolvedDy: number;
  resolvedAngle: number; // visual rotation matching flight direction
  travelDistance: number;
}

const FLIGHT_DURATION = 3000; // ms — slow straight glide (~3 seconds)
const REST_DURATION   = 8000; // ms darts stay visible after landing

// 4 flight directions: L→R, R→L, top-left→bottom-right, top-right→bottom-left
// Each entry: [startXFrac, startYFrac, dx, dy, visualAngleDeg]
// dx/dy are unit-ish vectors; we scale by travelDistance
const DIRECTIONS = [
  // Left → Right (horizontal)
  { sx: -0.05, sy: () => 0.15 + Math.random() * 0.7, dx: 1, dy: 0, angle: 0 },
  // Right → Left (horizontal, dart flipped)
  { sx: 1.05,  sy: () => 0.15 + Math.random() * 0.7, dx: -1, dy: 0, angle: 180 },
  // Top-left → Bottom-right (diagonal ~25°)
  { sx: -0.05, sy: () => Math.random() * 0.3,         dx: 1,  dy: 0.45, angle: 24 },
  // Top-right → Bottom-left (diagonal ~-25°, flipped)
  { sx: 1.05,  sy: () => Math.random() * 0.3,         dx: -1, dy: 0.45, angle: 180 - 24 },
] as const;

export function DartArena({ darts, onDartClick, onDartLanded }: DartArenaProps) {
  const [animatedDarts, setAnimatedDarts] = useState<AnimatedDart[]>([]);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const processedIds = useRef<Set<string>>(new Set());

  // Add new darts from props — assign a random straight-line direction
  useEffect(() => {
    const newDarts = darts.filter(d => !processedIds.current.has(d.id));
    if (newDarts.length === 0) return;

    newDarts.forEach(d => processedIds.current.add(d.id));

    setAnimatedDarts(prev => [
      ...prev,
      ...newDarts.map(d => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Pick a random direction
        const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
        const startX = dir.sx * vw;
        const startY = dir.sy() * vh;

        // Travel distance: enough to cross the full screen diagonally
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

  // Animation loop — pure straight-line movement, no gravity, no arc
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

            // Perfectly straight line — linear progress, no easing, no gravity
            const dist = dart.travelDistance * progress;
            const x = dart.startX + dart.resolvedDx * dist;
            const y = dart.startY + dart.resolvedDy * dist;

            // Fade out in the last 10% of flight
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
            const opacity = restProgress > 0.8 ? 1 - (restProgress - 0.8) / 0.2 : 0;

            if (restProgress >= 1) {
              changed = true;
              // Remove dart — don't push
            } else {
              if (elapsed !== dart.elapsed) changed = true;
              next.push({ ...dart, opacity, elapsed });
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
    <div id="dart-arena" aria-hidden="true">
      {animatedDarts.map(dart => (
        <div
          key={dart.id}
          className="flying-dart"
          style={{
            left: dart.x,
            top: dart.y,
            transform: `translate(-50%, -50%) rotate(${dart.rotation}deg)`,
            opacity: dart.opacity,
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
  );
}

export default DartArena;
