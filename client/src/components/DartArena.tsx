import { useEffect, useRef, useState, useCallback } from "react";
import { PaperDart, DartSponsor } from "./PaperDart";

export interface FlyingDart {
  id: string;
  sponsor: DartSponsor | null;
  startX: number;
  startY: number;
  angle: number; // degrees
  speed: number;
  spin: number;
  firedAt: number;
  dbId?: number;
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
  phase: "flying" | "landing" | "resting";
  elapsed: number;
}

const FLIGHT_DURATION = 1800; // ms
const REST_DURATION = 8000; // ms darts stay on screen

export function DartArena({ darts, onDartClick, onDartLanded }: DartArenaProps) {
  const [animatedDarts, setAnimatedDarts] = useState<AnimatedDart[]>([]);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const processedIds = useRef<Set<string>>(new Set());

  // Add new darts from props
  useEffect(() => {
    const newDarts = darts.filter(d => !processedIds.current.has(d.id));
    if (newDarts.length === 0) return;

    newDarts.forEach(d => processedIds.current.add(d.id));

    setAnimatedDarts(prev => [
      ...prev,
      ...newDarts.map(d => ({
        ...d,
        x: d.startX,
        y: d.startY,
        rotation: d.angle,
        opacity: 1,
        landed: false,
        phase: "flying" as const,
        elapsed: 0,
      })),
    ]);
  }, [darts]);

  // Animation loop
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
            const eased = easeOutCubic(progress);

            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const rad = (dart.angle * Math.PI) / 180;
            const distance = dart.speed * vw * 0.8;

            const x = dart.startX + Math.cos(rad) * distance * eased;
            // Arc: parabolic y with slight gravity
            const arcY = Math.sin(rad) * distance * eased;
            const gravity = progress * progress * vh * 0.15;
            const y = dart.startY + arcY + gravity;

            const rotation = dart.angle + dart.spin * progress * 720;
            const opacity = progress > 0.85 ? 1 - (progress - 0.85) / 0.15 : 1;

            if (progress >= 1) {
              changed = true;
              next.push({ ...dart, x, y, rotation, opacity: 0, phase: "resting", elapsed, landed: true });
              onDartLanded?.(dart.id);
            } else {
              if (elapsed !== dart.elapsed) changed = true;
              next.push({ ...dart, x, y, rotation, opacity, elapsed });
            }
          } else if (dart.phase === "resting") {
            const elapsed = dart.elapsed + delta;
            const restProgress = Math.min((elapsed - FLIGHT_DURATION) / REST_DURATION, 1);
            const opacity = restProgress > 0.8 ? 1 - (restProgress - 0.8) / 0.2 : 1;

            if (restProgress >= 1) {
              changed = true;
              // Remove dart
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
            transition: dart.phase === "resting" ? "opacity 0.3s ease" : undefined,
          }}
          onClick={() => onDartClick?.(dart)}
          title={dart.sponsor?.name ?? "Pijltje"}
        >
          <PaperDart
            sponsor={dart.sponsor}
            width={100}
            height={34}
            spinning={dart.phase === "flying"}
          />
        </div>
      ))}
    </div>
  );
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default DartArena;
