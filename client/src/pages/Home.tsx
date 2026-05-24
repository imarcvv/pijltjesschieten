import { useState, useCallback, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useBlowDetection } from "@/hooks/useBlowDetection";
import { BlowMeter } from "@/components/BlowMeter";
import { DartArena, FlyingDart } from "@/components/DartArena";
import { DartGallery } from "@/components/DartGallery";
import { DartUnfoldModal } from "@/components/DartUnfoldModal";
import { PaperDart, DartSponsor } from "@/components/PaperDart";
import { nanoid } from "nanoid";
import { Link } from "wouter";

// Stable session ID for this browser session
const SESSION_ID = `sess_${Math.random().toString(36).slice(2, 10)}`;

export default function Home() {
  const [flyingDarts, setFlyingDarts] = useState<FlyingDart[]>([]);
  const [selectedDart, setSelectedDart] = useState<FlyingDart | null>(null);
  const [shooterName, setShooterName] = useState("");
  const [totalShots, setTotalShots] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [activeTab, setActiveTab] = useState<"shoot" | "gallery">("shoot");
  const utils = trpc.useUtils();

  const { data: sponsors } = trpc.sponsors.listActive.useQuery();
  const fireDartMutation = trpc.darts.fire.useMutation({
    onSuccess: () => {
      utils.darts.recent.invalidate();
    },
  });

  // Pick a random active sponsor for each shot
  const getRandomSponsor = useCallback((): DartSponsor | null => {
    if (!sponsors || sponsors.length === 0) return null;
    const active = sponsors.filter(s => s.active);
    if (active.length === 0) return null;
    return active[Math.floor(Math.random() * active.length)] as DartSponsor;
  }, [sponsors]);

  const shootDart = useCallback((power: number) => {
    const sponsor = getRandomSponsor();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Start from left side, random vertical position
    const startX = vw * 0.05;
    const startY = vh * 0.2 + Math.random() * vh * 0.6;

    // Angle: mostly horizontal with slight variation
    const angle = -15 + Math.random() * 30; // -15° to +15°
    const speed = 0.6 + power * 0.4; // 0.6–1.0 of screen width
    const spin = (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 1.5);

    const trajectoryData = { startX, startY, angle, speed, spin };

    const dartId = nanoid();
    const newDart: FlyingDart = {
      id: dartId,
      sponsor: sponsor ? {
        id: sponsor.id,
        name: sponsor.name,
        logoUrl: sponsor.logoUrl,
        color: sponsor.color,
        message: sponsor.message,
        clickUrl: sponsor.clickUrl,
        prizeText: (sponsor as any).prizeText ?? null,
        prizeClaimUrl: (sponsor as any).prizeClaimUrl ?? null,
      } : null,
      startX,
      startY,
      angle,
      speed,
      spin,
      firedAt: Date.now(),
    };

    // Animate the rolling effect
    setIsRolling(true);
    setTimeout(() => setIsRolling(false), 400);

    // Add dart to arena immediately (optimistic), then update isGolden from server
    setFlyingDarts(prev => [...prev, newDart]);
    setTotalShots(n => n + 1);

    // Persist to database — server determines golden status
    fireDartMutation.mutate(
      {
        sponsorId: sponsor?.id,
        sessionId: SESSION_ID,
        shooterName: shooterName || undefined,
        trajectoryData,
      },
      {
        onSuccess: (savedDart) => {
          if (savedDart?.isGolden) {
            // Update the dart in the arena to show golden visuals
            setFlyingDarts(prev =>
              prev.map(d => d.id === dartId ? { ...d, isGolden: true } : d)
            );
          }
        },
      }
    );
  }, [getRandomSponsor, shooterName, fireDartMutation]);

  const { state: blowState, level, error: blowError, start: startBlow } = useBlowDetection({
    threshold: 0.28,
    sustainMs: 120,
    cooldownMs: 1500,
    onFire: shootDart,
  });

  const handleDartClick = useCallback((dart: FlyingDart) => {
    setSelectedDart(dart);
  }, []);

  const handleDartLanded = useCallback((dartId: string) => {
    // Darts auto-remove after REST_DURATION in DartArena
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.96 0.03 78)" }}>
      {/* Flying darts overlay */}
      <DartArena
        darts={flyingDarts}
        onDartClick={handleDartClick}
        onDartLanded={handleDartLanded}
      />

      {/* Dart click modal */}
      {selectedDart && (
        <DartUnfoldModal
          sponsor={selectedDart.sponsor
            ? {
                ...selectedDart.sponsor,
                // Pass prize fields through if present on the sponsor object
                ...(selectedDart.sponsor as any),
              }
            : null
          }
          isGolden={selectedDart.isGolden}
          onClose={() => setSelectedDart(null)}
        />
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden" style={{ background: "oklch(0.52 0.18 40)", borderBottom: "4px solid oklch(0.35 0.12 40)" }}>
        {/* Decorative paper stripes */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          {[10, 25, 40, 55, 70, 85].map(pct => (
            <div key={pct} className="absolute h-full w-px" style={{ left: `${pct}%`, background: "rgba(255,255,255,0.5)" }} />
          ))}
        </div>

        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo dart */}
            <div className={isRolling ? "animate-paper-roll" : "animate-dart-bounce"}>
              <PaperDart width={80} height={26} />
            </div>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl text-white drop-shadow-md" style={{ letterSpacing: "0.03em" }}>
                Pijltjesschieten.nl
              </h1>
              <p className="font-retro text-xs text-amber-200 opacity-80 hidden sm:block">
                Digitale nostalgie uit de jaren 80
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {totalShots > 0 && (
              <div className="paper-card rounded-lg px-3 py-1 text-center hidden sm:block">
                <p className="font-display text-lg" style={{ color: "#5c3d1e" }}>{totalShots}</p>
                <p className="font-retro text-xs opacity-60" style={{ color: "#8b6914" }}>geschoten</p>
              </div>
            )}
            <Link href="/demo">
              <button className="btn-retro rounded-lg px-3 py-1.5 text-sm font-display"
                style={{ background: "oklch(0.65 0.18 200)", color: "#fff" }}>
                🗞️ Demo NU.nl
              </button>
            </Link>
            <Link href="/admin">
              <button className="btn-retro rounded-lg px-3 py-1.5 text-sm font-display"
                style={{ background: "oklch(0.82 0.16 85)", color: "#3d2800" }}>
                Admin
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ────────────────────────────────────────────────── */}
      <section className="container py-8">
        <div className="grid lg:grid-cols-2 gap-8 items-start">

          {/* Left: Shoot panel */}
          <div className="paper-card rounded-2xl p-6 space-y-6">
            {/* Title */}
            <div>
              <h2 className="font-display text-2xl sm:text-3xl" style={{ color: "#3d2800" }}>
                🎯 Schiet een pijltje!
              </h2>
              <p className="font-retro text-sm mt-1" style={{ color: "#8b6914" }}>
                Blaas hard in je microfoon om een pijltje te schieten
              </p>
            </div>

            {/* Current dart preview */}
            <div className="flex flex-col items-center gap-3">
              <p className="font-retro text-xs uppercase tracking-wider opacity-60" style={{ color: "#5c3d1e" }}>
                Jouw pijltje
              </p>
              <div className={isRolling ? "animate-dart-roll" : ""}>
                <PaperDart
                  sponsor={sponsors?.[0] ? {
                    id: sponsors[0].id,
                    name: sponsors[0].name,
                    logoUrl: sponsors[0].logoUrl,
                    color: sponsors[0].color,
                    message: sponsors[0].message,
                    clickUrl: sponsors[0].clickUrl,
                  } : null}
                  width={200}
                  height={36}
                  spinning={blowState === "blowing"}
                />
              </div>
              {isRolling && (
                <p className="font-retro text-xs animate-pulse" style={{ color: "#c8520a" }}>
                  Pijltje rollen...
                </p>
              )}
            </div>

            {/* Shooter name */}
            <div>
              <label className="font-retro text-xs uppercase tracking-wider block mb-1" style={{ color: "#5c3d1e" }}>
                Jouw naam (optioneel)
              </label>
              <input
                type="text"
                value={shooterName}
                onChange={e => setShooterName(e.target.value)}
                placeholder="Bijv. Marc"
                maxLength={32}
                className="w-full rounded-lg px-3 py-2 font-retro text-sm border-2 border-amber-300 bg-amber-50 focus:outline-none focus:border-amber-500"
                style={{ color: "#3d2800" }}
              />
            </div>

            {/* Blow meter */}
            <BlowMeter
              state={blowState}
              level={level}
              onStart={startBlow}
              error={blowError}
            />

            {/* Sponsor info */}
            {sponsors && sponsors.length > 0 && (
              <div className="rounded-xl p-3 text-center" style={{ background: "rgba(0,0,0,0.05)" }}>
                <p className="font-retro text-xs opacity-60" style={{ color: "#5c3d1e" }}>
                  Pijltjes gesponsord door
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-1">
                  {sponsors.map(s => (
                    <span key={s.id} className="font-display text-sm px-2 py-0.5 rounded-full"
                      style={{ background: s.color, color: "rgba(0,0,0,0.7)", border: "1px solid rgba(0,0,0,0.15)" }}>
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="rounded-xl p-4 font-retro text-sm space-y-1" style={{ background: "rgba(200,169,110,0.2)", color: "#5c3d1e" }}>
              <p className="font-bold">Hoe werkt het?</p>
              <p>1. Klik op de blaasmeeter om de microfoon te activeren</p>
              <p>2. Blaas <strong>hard</strong> in je microfoon</p>
              <p>3. Kijk hoe je pijltje over het scherm vliegt!</p>
              <p>4. Klik op een pijltje om de boodschap te lezen</p>
            </div>
          </div>

          {/* Right: Gallery */}
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-2">
              {(["shoot", "gallery"] as const).map(tab => (
                <button
                  key={tab}
                  className={`btn-retro rounded-lg px-4 py-2 font-display text-sm transition-all
                    ${activeTab === tab ? "scale-95" : ""}`}
                  style={{
                    background: activeTab === tab ? "oklch(0.52 0.18 40)" : "oklch(0.91 0.05 80)",
                    color: activeTab === tab ? "#fff" : "#3d2800",
                  }}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === "shoot" ? "🎯 Recente schoten" : "📰 Galerij"}
                </button>
              ))}
            </div>

            <div className="paper-card rounded-2xl p-4">
              <DartGallery />
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="mt-8 py-6 text-center font-retro text-xs opacity-50" style={{ color: "#5c3d1e" }}>
        <p>Pijltjesschieten.nl — Digitale nostalgie uit de jaren 80 🎯</p>
        <p className="mt-1">Geïnspireerd op de PVC blaaspijp uit de jaren 80 · www.pijltjesschieten.nl</p>
      </footer>
    </div>
  );
}
