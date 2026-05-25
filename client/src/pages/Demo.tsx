import { useState, useRef, useCallback } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useBlowDetection } from "@/hooks/useBlowDetection";
import { DartArena, FlyingDart } from "@/components/DartArena";
import { DartUnfoldModal } from "@/components/DartUnfoldModal";
import { PaperDart, DartSponsor } from "@/components/PaperDart";
import { nanoid } from "nanoid";

const SESSION_ID = `demo_${Math.random().toString(36).slice(2, 10)}`;

// ── Fake news articles ────────────────────────────────────────────────────────
const NEWS_ITEMS = [
  { id: 1, cat: "Nieuws", catColor: "#c0392b", title: "Kabinet presenteert nieuw klimaatakkoord voor 2035", time: "14 min", img: "🌿" },
  { id: 2, cat: "Sport", catColor: "#2980b9", title: "Ajax wint met 3-1 van PSV in de Johan Cruijff Arena", time: "32 min", img: "⚽" },
  { id: 3, cat: "Tech", catColor: "#8e44ad", title: "Nederlandse startup haalt €50 miljoen op voor AI-platform", time: "1 uur", img: "🤖" },
  { id: 4, cat: "Economie", catColor: "#27ae60", title: "AEX sluit hoger na positief Amerikaans banenrapport", time: "2 uur", img: "📈" },
  { id: 5, cat: "Entertainment", catColor: "#e67e22", title: "Marco Borsato kondigt grote comeback-tour aan", time: "3 uur", img: "🎤" },
  { id: 6, cat: "Nieuws", catColor: "#c0392b", title: "RIVM waarschuwt voor hittegolf komend weekend", time: "4 uur", img: "☀️" },
];

const TRENDING = [
  "Koningshuis nieuws", "Formule 1 Grand Prix", "Woningmarkt 2025",
  "Vakantietips zomer", "Energieprijzen dalen",
];

const RETRO_FONT = "Verdana, Tahoma, Arial, sans-serif";

export default function Demo() {
  const [flyingDarts, setFlyingDarts] = useState<FlyingDart[]>([]);
  const [selectedDart, setSelectedDart] = useState<FlyingDart | null>(null);
  const [shotCount, setShotCount] = useState(0);
  const [showTip, setShowTip] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
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
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const startX = vw * 0.02;
    const startY = vh * 0.15 + Math.random() * vh * 0.65;
    const angle = -8 + Math.random() * 16;
    const speed = 0.45 + power * 0.2; // slower speed for floating drift effect
    const spin = (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 1.2);
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
    threshold: 0.28, sustainMs: 120, cooldownMs: 1500, onFire: shootDart,
  });

  const isActive = blowState === "ready" || blowState === "blowing" || blowState === "fired";
  const pct = Math.round(level * 100);

  return (
    <div ref={containerRef} style={{ minHeight: "100vh", background: "#e8e8e8", fontFamily: RETRO_FONT }}>
      {/* Flying darts overlay */}
      <DartArena darts={flyingDarts} onDartClick={d => setSelectedDart(d)} onDartLanded={() => {}} />
      {selectedDart && (
        <DartUnfoldModal sponsor={selectedDart.sponsor} isGolden={selectedDart.isGolden} onClose={() => setSelectedDart(null)} />
      )}

      {/* ── Pijltjesschieten.nl sticky control bar ─────────────────────────── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 9998,
        background: "#003399", borderBottom: "3px solid #ffcc00",
        display: "flex", alignItems: "center", gap: 8, padding: "4px 12px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
      }}>
        <Link href="/">
          <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", textDecoration: "none" }}>
            <PaperDart width={55} height={11} />
            <span style={{ color: "#ffcc00", fontWeight: "bold", fontSize: 13, fontFamily: RETRO_FONT }}>
              Pijltjesschieten.nl
            </span>
          </div>
        </Link>

        <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.3)", margin: "0 4px" }} />

        {/* Blow meter */}
        <div
          onClick={!isActive ? startBlow : undefined}
          title={isActive ? "Blaas nu!" : "Klik om te starten"}
          style={{
            flex: 1, maxWidth: 320, height: 26, borderRadius: 13,
            border: "2px solid #ffcc00", overflow: "hidden", cursor: !isActive ? "pointer" : "default",
            background: "#001a66", position: "relative",
          }}
        >
          <div style={{
            position: "absolute", left: 0, top: 0, height: "100%",
            width: `${pct}%`,
            background: blowState === "fired" ? "#00cc44" : blowState === "blowing" ? "#ff6600" : "#ffcc00",
            transition: "width 0.05s linear",
            opacity: isActive ? 1 : 0.5,
          }} />
          {/* Threshold marker */}
          <div style={{
            position: "absolute", top: 0, bottom: 0, left: "28%", width: 2,
            background: "rgba(255,255,255,0.6)", zIndex: 1,
          }} />
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: "bold", color: "#fff",
            textShadow: "0 1px 2px rgba(0,0,0,0.8)", fontFamily: RETRO_FONT,
          }}>
            {blowError ? "❌ Geen microfoon"
              : blowState === "idle" ? "🎯 Klik hier & blaas hard!"
              : blowState === "requesting" ? "🎤 Microfoon toegang..."
              : blowState === "ready" ? "💨 Blaas hard in je microfoon!"
              : blowState === "blowing" ? "💨 HARDER BLAZEN..."
              : blowState === "fired" ? "🎯 RAAK! Pijltje geschoten!"
              : ""}
          </div>
        </div>

        {shotCount > 0 && (
          <span style={{ color: "#ffcc00", fontSize: 11, fontWeight: "bold", fontFamily: RETRO_FONT }}>
            {shotCount}x geschoten
          </span>
        )}
        {isActive && (
          <button onClick={stopBlow} style={{
            background: "none", border: "none", color: "rgba(255,255,255,0.7)",
            cursor: "pointer", fontSize: 11, fontFamily: RETRO_FONT,
          }}>✕ Stop</button>
        )}
        <Link href="/">
          <button style={{
            marginLeft: "auto", background: "#ffcc00", border: "1px solid #cc9900",
            color: "#003399", fontWeight: "bold", fontSize: 11, padding: "2px 8px",
            cursor: "pointer", fontFamily: RETRO_FONT,
          }}>← Terug</button>
        </Link>
      </div>

      {/* Tip overlay */}
      {showTip && (
        <div style={{
          position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
          zIndex: 9997, background: "#003399", border: "2px solid #ffcc00",
          color: "#fff", padding: "8px 16px", fontSize: 12, fontFamily: RETRO_FONT,
          boxShadow: "2px 2px 4px rgba(0,0,0,0.5)", maxWidth: 320, textAlign: "center",
        }}>
          🎯 Klik op de blauwe balk hierboven en blaas hard in je microfoon!
          <button onClick={() => setShowTip(false)} style={{
            marginLeft: 8, background: "none", border: "none", color: "#ffcc00",
            cursor: "pointer", fontWeight: "bold",
          }}>✕</button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          NU.NL MOCK PAGE — Hyves/Startpagina era styling
      ════════════════════════════════════════════════════════════════════ */}

      {/* NU.nl header — retro 2004 style */}
      <div style={{ background: "#fff", borderBottom: "1px solid #ccc" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "4px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: "bold", color: "#cc0000" }}>NU</span>
            <span style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: "bold", color: "#333" }}>.nl</span>
            <span style={{ fontSize: 10, color: "#666", marginLeft: 4, fontStyle: "italic" }}>het laatste nieuws het eerst</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="text" placeholder="Zoeken..." style={{
              border: "1px solid #999", padding: "2px 6px", fontSize: 11, fontFamily: RETRO_FONT, width: 120,
            }} />
            <button style={{
              background: "#003399", color: "#fff", border: "1px solid #001a66",
              padding: "2px 8px", fontSize: 11, fontFamily: RETRO_FONT, cursor: "pointer",
            }}>Zoek</button>
          </div>
        </div>

        {/* Nav bar */}
        <div style={{ background: "#003399", borderTop: "1px solid #001a66" }}>
          <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 8px", display: "flex" }}>
            {["HOME", "NIEUWS", "SPORT", "TECH", "ECONOMIE", "ENTERTAINMENT", "GEZONDHEID", "WEER"].map((item, i) => (
              <div key={item} style={{
                padding: "4px 10px", fontSize: 11, fontWeight: "bold", color: i === 0 ? "#ffcc00" : "#fff",
                cursor: "pointer", borderRight: "1px solid rgba(255,255,255,0.2)",
                fontFamily: RETRO_FONT,
              }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.15)"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RTB BILLBOARD BANNER (Thuisbezorgd-style) ────────────────────── */}
      <div style={{ background: "#f0f0f0", borderBottom: "1px solid #ccc", padding: "6px 0" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 8px" }}>
          <div style={{
            position: "relative",
            background: "linear-gradient(90deg, #ffd700 0%, #ff8c00 50%, #ff4500 100%)",
            border: "2px solid #cc6600",
            padding: "12px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            minHeight: 90,
          }}>
            <div style={{
              position: "absolute", top: 2, left: 4,
              fontSize: 9, color: "rgba(0,0,0,0.5)", fontFamily: RETRO_FONT,
            }}>Advertentie</div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ fontSize: 52 }}>🍔</div>
              <div>
                <div style={{ fontSize: 42, fontWeight: "bold", color: "#fff", lineHeight: 1, textShadow: "2px 2px 0 rgba(0,0,0,0.3)" }}>50%</div>
                <div style={{ fontSize: 16, fontWeight: "bold", color: "#fff", textShadow: "1px 1px 0 rgba(0,0,0,0.3)" }}>KORTING</div>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: "bold", color: "#fff", textShadow: "1px 1px 0 rgba(0,0,0,0.3)" }}>Op je eerste bestelling</div>
                <div style={{ fontSize: 12, color: "#fff3cc" }}>Gebruik code: <strong>WELKOM50</strong></div>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 20, fontWeight: "bold", color: "#1a1a2e", fontFamily: "Georgia, serif" }}>thuisbezorgd.nl</div>
              <button style={{
                background: "#cc0000", color: "#fff", border: "2px solid #990000",
                padding: "4px 16px", fontWeight: "bold", fontSize: 13, cursor: "pointer",
                fontFamily: RETRO_FONT, marginTop: 4,
              }}>Bestel nu »</button>
            </div>

            {/* Dart zone indicator */}
            <div style={{
              position: "absolute", inset: 0, border: "2px dashed rgba(255,255,255,0.4)",
              pointerEvents: "none",
            }} />
          </div>
          <div style={{ textAlign: "center", fontSize: 9, color: "#999", marginTop: 2, fontFamily: RETRO_FONT }}>
            ↑ RTB Billboard slot (970×250) — pijltjes vliegen hier OVERHEEN ↑
          </div>
        </div>
      </div>

      {/* ── Main content — 3-column Startpagina/NU.nl hybrid layout ─────── */}
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "8px", display: "grid", gridTemplateColumns: "1fr 1fr 220px", gap: 8 }}>

        {/* Column 1: Top news */}
        <div>
          {/* Breaking ticker */}
          <div style={{
            background: "#cc0000", color: "#fff", padding: "3px 8px",
            fontSize: 11, fontWeight: "bold", fontFamily: RETRO_FONT, marginBottom: 6,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ background: "rgba(0,0,0,0.3)", padding: "1px 4px", fontSize: 10 }}>BREAKING</span>
            <span>Pijltjesschieten.nl lanceert digitale blaaspijp!</span>
          </div>

          {/* Retro panel box */}
          <div style={{ border: "1px solid #ccc", background: "#fff", marginBottom: 6 }}>
            <div style={{
              background: "#003399", color: "#fff", padding: "3px 8px",
              fontSize: 11, fontWeight: "bold", fontFamily: RETRO_FONT,
            }}>
              📰 Meest gelezen
            </div>
            <div style={{ padding: 0 }}>
              {NEWS_ITEMS.slice(0, 4).map((item, i) => (
                <div key={item.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 6,
                  padding: "5px 8px", borderBottom: i < 3 ? "1px solid #eee" : "none",
                  cursor: "pointer",
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#f0f4ff"}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                >
                  <span style={{ fontSize: 16 }}>{item.img}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{
                      fontSize: 9, fontWeight: "bold", color: "#fff",
                      background: item.catColor, padding: "1px 4px", marginRight: 4,
                      fontFamily: RETRO_FONT,
                    }}>{item.cat}</span>
                    <span style={{ fontSize: 11, color: "#003399", fontFamily: RETRO_FONT }}>{item.title}</span>
                  </div>
                  <span style={{ fontSize: 9, color: "#999", whiteSpace: "nowrap", fontFamily: RETRO_FONT }}>{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* In-article MPU 300x250 */}
          <div style={{ border: "1px solid #ccc", background: "#fff", marginBottom: 6 }}>
            <div style={{
              background: "#666", color: "#fff", padding: "2px 8px",
              fontSize: 10, fontFamily: RETRO_FONT,
            }}>Advertentie</div>
            <div style={{
              background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              padding: "20px 12px", textAlign: "center", minHeight: 120,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <div style={{ fontSize: 36 }}>📻</div>
              <div style={{ color: "#fff", fontWeight: "bold", fontSize: 16, fontFamily: "Georgia, serif" }}>Radio Veronica</div>
              <div style={{ color: "#ffe0f0", fontSize: 11, fontFamily: RETRO_FONT }}>De beste hits van de 80s en 90s!</div>
              <button style={{
                background: "#fff", color: "#cc0066", fontWeight: "bold",
                border: "none", padding: "4px 12px", cursor: "pointer", fontSize: 11, fontFamily: RETRO_FONT,
              }}>Luister live »</button>
            </div>
            <div style={{ textAlign: "center", fontSize: 9, color: "#999", padding: "2px 0", fontFamily: RETRO_FONT }}>
              MPU (300×250)
            </div>
          </div>
        </div>

        {/* Column 2: More news */}
        <div>
          <div style={{ border: "1px solid #ccc", background: "#fff", marginBottom: 6 }}>
            <div style={{
              background: "#003399", color: "#fff", padding: "3px 8px",
              fontSize: 11, fontWeight: "bold", fontFamily: RETRO_FONT,
            }}>
              🔥 Laatste nieuws
            </div>
            {NEWS_ITEMS.map((item, i) => (
              <div key={item.id} style={{
                display: "flex", alignItems: "flex-start", gap: 6,
                padding: "5px 8px", borderBottom: i < NEWS_ITEMS.length - 1 ? "1px solid #eee" : "none",
                cursor: "pointer",
              }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#f0f4ff"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
              >
                <span style={{ fontSize: 14 }}>{item.img}</span>
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontSize: 9, fontWeight: "bold", color: "#fff",
                    background: item.catColor, padding: "1px 4px", marginRight: 4, fontFamily: RETRO_FONT,
                  }}>{item.cat}</span>
                  <span style={{ fontSize: 11, color: "#003399", fontFamily: RETRO_FONT }}>{item.title}</span>
                </div>
                <span style={{ fontSize: 9, color: "#999", whiteSpace: "nowrap", fontFamily: RETRO_FONT }}>{item.time}</span>
              </div>
            ))}
          </div>

          {/* Hyvertentie / sponsor box */}
          <div style={{ border: "2px solid #ffcc00", background: "#fffbe6", padding: 8 }}>
            <div style={{
              fontSize: 10, color: "#cc6600", fontWeight: "bold",
              fontFamily: RETRO_FONT, marginBottom: 4,
            }}>⭐ Hyvertentie</div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{
                width: 50, height: 50, background: "#003399",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, flexShrink: 0,
              }}>🛒</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: "bold", color: "#cc0000", fontFamily: RETRO_FONT }}>
                  Gratis bezorging bij Wehkamp!
                </div>
                <div style={{ fontSize: 11, color: "#333", fontFamily: RETRO_FONT, marginTop: 2 }}>
                  Mode, wonen & meer. Vandaag besteld, morgen in huis. Gratis retourneren.
                </div>
                <a href="#" style={{ fontSize: 11, color: "#003399", fontFamily: RETRO_FONT }}>
                  Ja, ik wil! »
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Right rail — Startpagina-style panels */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>

          {/* Right rail MPU */}
          <div style={{ border: "1px solid #ccc", background: "#fff" }}>
            <div style={{ background: "#666", color: "#fff", padding: "2px 8px", fontSize: 10, fontFamily: RETRO_FONT }}>
              Advertentie
            </div>
            <div style={{
              background: "linear-gradient(180deg, #0f3460 0%, #16213e 100%)",
              padding: "16px 8px", textAlign: "center", minHeight: 180,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <div style={{ fontSize: 32 }}>🛒</div>
              <div style={{ color: "#fff", fontWeight: "bold", fontSize: 14, fontFamily: "Georgia, serif" }}>Wehkamp</div>
              <div style={{ color: "#aac4ff", fontSize: 10, fontFamily: RETRO_FONT }}>Mode, wonen & meer</div>
              <div style={{ color: "#ffcc00", fontWeight: "bold", fontSize: 22, fontFamily: RETRO_FONT }}>-30%</div>
              <div style={{ color: "#aac4ff", fontSize: 10, fontFamily: RETRO_FONT }}>op zomercollectie</div>
              <button style={{
                background: "#ffcc00", color: "#003399", fontWeight: "bold",
                border: "none", padding: "4px 12px", cursor: "pointer", fontSize: 11, fontFamily: RETRO_FONT,
              }}>Shop nu »</button>
            </div>
            <div style={{ textAlign: "center", fontSize: 9, color: "#999", padding: "2px 0", fontFamily: RETRO_FONT }}>
              Right rail MPU (300×250)
            </div>
          </div>

          {/* Trending — Startpagina style */}
          <div style={{ border: "1px solid #ccc", background: "#fff" }}>
            <div style={{
              background: "#e67e22", color: "#fff", padding: "3px 8px",
              fontSize: 11, fontWeight: "bold", fontFamily: RETRO_FONT,
            }}>
              🔥 Trending
            </div>
            <div style={{ padding: "4px 0" }}>
              {TRENDING.map((item, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "3px 8px", borderBottom: i < TRENDING.length - 1 ? "1px solid #eee" : "none",
                  cursor: "pointer", fontSize: 11, color: "#003399", fontFamily: RETRO_FONT,
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.color = "#cc0000"}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.color = "#003399"}
                >
                  <span style={{ color: "#999", fontSize: 10, width: 14 }}>{i + 1}.</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Skyscraper */}
          <div style={{ border: "1px solid #ccc", background: "#fff" }}>
            <div style={{ background: "#666", color: "#fff", padding: "2px 8px", fontSize: 10, fontFamily: RETRO_FONT }}>
              Advertentie
            </div>
            <div style={{
              background: "linear-gradient(180deg, #003399 0%, #001a66 100%)",
              padding: "20px 8px", textAlign: "center", minHeight: 200,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <div style={{ fontSize: 28 }}>🗺️</div>
              <div style={{ color: "#fff", fontWeight: "bold", fontSize: 13, fontFamily: "Georgia, serif" }}>ANWB</div>
              <div style={{ color: "#aac4ff", fontSize: 10, fontFamily: RETRO_FONT }}>Uw reispartner</div>
              <div style={{ color: "#ffcc00", fontWeight: "bold", fontSize: 16, fontFamily: RETRO_FONT }}>Gratis ANWB-pas</div>
              <div style={{ color: "#aac4ff", fontSize: 10, fontFamily: RETRO_FONT }}>bij lidmaatschap</div>
              <button style={{
                background: "#ffcc00", color: "#003399", fontWeight: "bold",
                border: "none", padding: "4px 12px", cursor: "pointer", fontSize: 11, fontFamily: RETRO_FONT,
              }}>Word lid »</button>
            </div>
            <div style={{ textAlign: "center", fontSize: 9, color: "#999", padding: "2px 0", fontFamily: RETRO_FONT }}>
              Skyscraper (300×600)
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer explanation ─────────────────────────────────────────────── */}
      <div style={{
        background: "#003399", borderTop: "3px solid #ffcc00",
        padding: "16px 8px", marginTop: 8,
      }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16, textAlign: "center",
          }}>
            {[
              { icon: "🎯", title: "RTB Integratie", desc: "Pijltjes vliegen over bestaande RTB-banners via een lichtgewicht JavaScript snippet" },
              { icon: "💨", title: "Microphone Trigger", desc: "Gebruikers blazen in hun microfoon om pijltjes te schieten — net als vroeger" },
              { icon: "🏷️", title: "Sponsor Branding", desc: "Elk pijltje draagt het logo van een sponsor — klikbaar met boodschap en URL" },
            ].map(item => (
              <div key={item.title}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{item.icon}</div>
                <div style={{ color: "#ffcc00", fontWeight: "bold", fontSize: 13, fontFamily: RETRO_FONT, marginBottom: 4 }}>{item.title}</div>
                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontFamily: RETRO_FONT }}>{item.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <Link href="/">
              <button style={{
                background: "#ffcc00", color: "#003399", fontWeight: "bold",
                border: "2px solid #cc9900", padding: "6px 20px",
                fontSize: 13, cursor: "pointer", fontFamily: RETRO_FONT,
              }}>← Terug naar Pijltjesschieten.nl</button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
