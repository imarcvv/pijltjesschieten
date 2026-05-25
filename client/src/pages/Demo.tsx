import { useState, useCallback } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useBlowDetection } from "@/hooks/useBlowDetection";
import { DartArena, FlyingDart } from "@/components/DartArena";
import { DartUnfoldModal } from "@/components/DartUnfoldModal";
import { PaperDart, DartSponsor } from "@/components/PaperDart";
import { nanoid } from "nanoid";

const SESSION_ID = `demo_${Math.random().toString(36).slice(2, 10)}`;

// Static assets
const NUNL_DESKTOP = "/manus-storage/nunl-desktop_f721dc8f.webp";
const NUNL_MOBILE  = "/manus-storage/nunlmobile_8e6a78f6.jpg";

type ViewMode = "desktop" | "mobile";

export default function Demo() {
  const [flyingDarts, setFlyingDarts] = useState<FlyingDart[]>([]);
  const [selectedDart, setSelectedDart] = useState<FlyingDart | null>(null);
  const [shotCount, setShotCount] = useState(0);
  const [showTip, setShowTip] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const utils = trpc.useUtils();

  const { data: sponsors } = trpc.sponsors.listActive.useQuery();
  const fireDartMutation = trpc.darts.fire.useMutation({
    onSuccess: () => utils.darts.recent.invalidate(),
  });

  const getRandomSponsor = useCallback((): DartSponsor | null => {
    if (!sponsors || sponsors.length === 0) return null;
    const active = sponsors.filter(s => s.active);
    return active.length > 0 ? active[Math.floor(Math.random() * active.length)] as DartSponsor : null;
  }, [sponsors]);

  const shootDart = useCallback((power: number) => {
    const sponsor = getRandomSponsor();
    const startX = window.innerWidth * 0.01;
    const startY = window.innerHeight * 0.1 + Math.random() * window.innerHeight * 0.75;
    const angle = -6 + Math.random() * 12;
    const speed = 0.45 + power * 0.2;
    const spin = (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.8);
    const dartId = nanoid();

    const newDart: FlyingDart = {
      id: dartId,
      sponsor: sponsor ? {
        id: sponsor.id, name: sponsor.name, logoUrl: sponsor.logoUrl,
        color: sponsor.color, message: sponsor.message, clickUrl: sponsor.clickUrl,
        prizeText: (sponsor as any).prizeText ?? null,
        prizeClaimUrl: (sponsor as any).prizeClaimUrl ?? null,
      } : null,
      startX, startY, angle, speed, spin, firedAt: Date.now(),
    };

    setFlyingDarts(prev => [...prev, newDart]);
    setShotCount(n => n + 1);
    setShowTip(false);

    fireDartMutation.mutate(
      { sponsorId: sponsor?.id, sessionId: SESSION_ID, shooterName: "Demo bezoeker", trajectoryData: { startX, startY, angle, speed, spin } },
      {
        onSuccess: (savedDart) => {
          if (savedDart?.isGolden) {
            setFlyingDarts(prev => prev.map(d => d.id === dartId ? { ...d, isGolden: true } : d));
          }
        },
      }
    );
  }, [getRandomSponsor, fireDartMutation]);

  const { state: blowState, level, error: blowError, start: startBlow, stop: stopBlow } = useBlowDetection({
    threshold: 0.12, sustainMs: 100, cooldownMs: 1500, onFire: shootDart,
  });

  const isActive = blowState === "ready" || blowState === "blowing" || blowState === "fired";
  const pct = Math.round(level * 100);

  // Button style helper
  const modeBtn = (mode: ViewMode) => ({
    background: viewMode === mode
      ? "linear-gradient(135deg, #e63946, #c1121f)"
      : "rgba(255,255,255,0.08)",
    color: viewMode === mode ? "#fff" : "#aaa",
    border: viewMode === mode ? "1px solid #e63946" : "1px solid #444",
    borderRadius: 6,
    padding: "7px 14px",
    cursor: "pointer" as const,
    fontWeight: "bold" as const,
    fontSize: 12,
    letterSpacing: 0.4,
    transition: "all 0.15s",
    flexShrink: 0 as const,
  });

  return (
    <div style={{ minHeight: "100vh", background: "#1a1a2e", fontFamily: "Verdana, Tahoma, Arial, sans-serif" }}>

      {/* ── Dart arena — fixed overlay ───────────────────────────────────── */}
      <DartArena
        darts={flyingDarts}
        onDartClick={d => setSelectedDart(d)}
        onDartLanded={() => {}}
      />

      {/* ── Top control bar ─────────────────────────────────────────────── */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 10000,
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        borderBottom: "3px solid #e63946",
        padding: "10px 16px",
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <PaperDart width={60} height={14} />
          <span style={{ color: "#ffd700", fontWeight: "bold", fontSize: 14, letterSpacing: 1 }}>
            PIJLTJESSCHIETEN.NL
          </span>
        </Link>

        {/* View mode toggle */}
        <div style={{ display: "flex", gap: 4, background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 3 }}>
          <button style={modeBtn("desktop")} onClick={() => setViewMode("desktop")}>
            🖥 Desktop
          </button>
          <button style={modeBtn("mobile")} onClick={() => setViewMode("mobile")}>
            📱 Mobiel
          </button>
        </div>

        <div style={{ flex: 1 }} />

        {/* Shot counter */}
        <div style={{
          background: "rgba(255,215,0,0.15)", border: "1px solid #ffd700",
          borderRadius: 4, padding: "4px 10px", color: "#ffd700", fontSize: 12,
        }}>
          🎯 {shotCount} geschoten
        </div>

        {/* Blow meter */}
        {isActive && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#aaa", fontSize: 11 }}>💨</span>
            <div style={{
              width: 80, height: 8, background: "#333", borderRadius: 4, overflow: "hidden",
              border: "1px solid #555",
            }}>
              <div style={{
                height: "100%", width: `${pct}%`,
                background: pct > 60 ? "#e63946" : pct > 30 ? "#ffd700" : "#4caf50",
                transition: "width 0.05s, background 0.1s",
              }} />
            </div>
          </div>
        )}

        {/* Schiet! button */}
        <button
          onClick={() => shootDart(0.7)}
          style={{
            background: "linear-gradient(135deg, #ffd700, #f4a200)",
            color: "#1a1a2e", border: "none", borderRadius: 6,
            padding: "8px 18px", cursor: "pointer", fontWeight: "bold",
            fontSize: 14, letterSpacing: 0.5,
            boxShadow: "0 2px 10px rgba(255,215,0,0.5)",
            transition: "transform 0.1s, box-shadow 0.1s",
            flexShrink: 0,
          }}
          onMouseDown={e => (e.currentTarget.style.transform = "scale(0.95)")}
          onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        >
          🎯 Schiet!
        </button>

        {/* Blow button */}
        {!isActive ? (
          <button
            onClick={startBlow}
            style={{
              background: "linear-gradient(135deg, #4a7ab5, #2c5f9e)",
              color: "white", border: "none", borderRadius: 6,
              padding: "8px 14px", cursor: "pointer", fontWeight: "bold",
              fontSize: 12, letterSpacing: 0.5,
              boxShadow: "0 2px 8px rgba(74,122,181,0.4)",
              flexShrink: 0,
            }}
          >
            💨 Blaas
          </button>
        ) : (
          <button
            onClick={stopBlow}
            style={{
              background: "rgba(255,255,255,0.1)", color: "#aaa",
              border: "1px solid #555", borderRadius: 6,
              padding: "8px 12px", cursor: "pointer", fontSize: 12,
              flexShrink: 0,
            }}
          >
            💨 Stop mic
          </button>
        )}

        <Link href="/" style={{
          color: "#888", fontSize: 12, textDecoration: "none",
          padding: "6px 10px", border: "1px solid #444", borderRadius: 4,
        }}>
          ← Terug
        </Link>
      </div>

      {/* ── Content area (below fixed bar) ──────────────────────────────── */}
      <div style={{ paddingTop: 56 }}>

        {/* DESKTOP view */}
        {viewMode === "desktop" && (
          <img
            src={NUNL_DESKTOP}
            alt="NU.nl nieuwssite desktop demo"
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
        )}

        {/* MOBILE view — phone frame centered on dark background */}
        {viewMode === "mobile" && (
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            minHeight: "calc(100vh - 56px)",
            background: "#0d0d1a",
            padding: "32px 16px 48px",
          }}>
            {/* Phone frame */}
            <div style={{
              position: "relative",
              width: 375,
              maxWidth: "90vw",
              background: "#111",
              borderRadius: 44,
              boxShadow: "0 0 0 3px #333, 0 0 0 6px #1a1a1a, 0 24px 80px rgba(0,0,0,0.8)",
              padding: "16px 6px",
              overflow: "hidden",
            }}>
              {/* Notch / dynamic island */}
              <div style={{
                width: 120,
                height: 30,
                background: "#000",
                borderRadius: 20,
                margin: "0 auto 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#1a1a1a", border: "1px solid #333" }} />
                <div style={{ width: 36, height: 10, borderRadius: 6, background: "#1a1a1a", border: "1px solid #333" }} />
              </div>

              {/* Screen */}
              <div style={{
                borderRadius: 28,
                overflow: "hidden",
                background: "#fff",
                lineHeight: 0,
              }}>
                <img
                  src={NUNL_MOBILE}
                  alt="NU.nl mobiele weergave demo"
                  style={{
                    display: "block",
                    width: "100%",
                    height: "auto",
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                />
              </div>

              {/* Home bar */}
              <div style={{
                width: 120,
                height: 4,
                background: "#444",
                borderRadius: 4,
                margin: "10px auto 0",
              }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Instruction tip ─────────────────────────────────────────────── */}
      {showTip && isActive && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          zIndex: 10001,
          background: "rgba(0,0,0,0.85)", color: "white",
          padding: "12px 20px", borderRadius: 8,
          border: "1px solid rgba(255,215,0,0.4)",
          fontSize: 14, textAlign: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          maxWidth: "90vw",
        }}>
          💨 <strong>Blaas hard</strong> in je microfoon om een pijltje te schieten!
          <br />
          <span style={{ fontSize: 11, color: "#aaa" }}>Klik op een vliegend pijltje om de boodschap te lezen</span>
        </div>
      )}

      {blowError && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          zIndex: 10001,
          background: "rgba(230,57,70,0.9)", color: "white",
          padding: "10px 18px", borderRadius: 6, fontSize: 13,
        }}>
          ⚠️ {blowError}
        </div>
      )}

      {/* ── Dart unfold modal ───────────────────────────────────────────── */}
      {selectedDart && (
        <DartUnfoldModal
          sponsor={selectedDart.sponsor}
          isGolden={selectedDart.isGolden}
          onClose={() => setSelectedDart(null)}
        />
      )}
    </div>
  );
}
