import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useBlowDetection } from "@/hooks/useBlowDetection";
import { DartArena, FlyingDart } from "@/components/DartArena";
import { DartUnfoldModal } from "@/components/DartUnfoldModal";
import { DartGallery } from "@/components/DartGallery";
import { PaperDart, DartSponsor } from "@/components/PaperDart";
import { nanoid } from "nanoid";

const SESSION_ID = `session_${Math.random().toString(36).slice(2, 10)}`;

/** Play a long "sjoeffffff" whoosh sound via Web Audio API — no external file needed */
function playWhoosh() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const duration = 1.4; // seconds — long sjoeffffff
    const sr = ctx.sampleRate;
    const bufferSize = Math.floor(sr * duration);

    // White noise buffer
    const buffer = ctx.createBuffer(1, bufferSize, sr);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // High-pass to remove rumble
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 600;

    // Sweeping band-pass: starts high (sibilant "sj"), sweeps down to low hiss ("fffff")
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(3200, ctx.currentTime);          // sharp "sj" attack
    bp.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + duration * 0.85); // long tail

    // Gain envelope: quick attack, long sustain, fade out at end
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 0.05);  // fast attack
    gain.gain.setValueAtTime(0.7, ctx.currentTime + duration * 0.6); // sustain
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration); // fade out

    source.connect(hp);
    hp.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    source.stop(ctx.currentTime + duration);
    source.onended = () => ctx.close();
  } catch { /* audio not available */ }
}


export default function Home() {
  const [flyingDarts, setFlyingDarts] = useState<FlyingDart[]>([]);
  const [selectedDart, setSelectedDart] = useState<FlyingDart | null>(null);
  const [shooterName, setShooterName] = useState("");
  const [isRolling, setIsRolling] = useState(false);
  const [dartShotAnim, setDartShotAnim] = useState<"idle" | "shooting" | "reloading">("idle");
  const [galleryTab, setGalleryTab] = useState<"recent" | "gallery">("recent");
  const [totalShots, setTotalShots] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: sponsors } = trpc.sponsors.listActive.useQuery();
  // Use local shot counter for public stats (admin-only endpoint not available here)
  const publicStats = { total: totalShots, golden: 0 };
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
    const startX = -20;
    const startY = vh * 0.2 + Math.random() * vh * 0.6;
    const angle = -5 + Math.random() * 10;
    const speed = 0.45 + power * 0.2; // slower speed for floating drift effect

    setIsRolling(true);
    setTimeout(() => setIsRolling(false), 500);
    // Trigger shoot animation: slide out right, then slide in new dart
    setDartShotAnim("shooting");
    // Whoosh sound lasts 1.4s — slide out fast, then wait for sound to finish before reloading
    setTimeout(() => setDartShotAnim("reloading"), 1500); // new dart slides in after whoosh ends
    setTimeout(() => setDartShotAnim("idle"), 1950);

    const spin = (Math.random() - 0.5) * 2;

    fireDartMutation.mutate(
      {
        sponsorId: sponsor?.id ?? undefined,
        sessionId: SESSION_ID,
        shooterName: shooterName || undefined,
        trajectoryData: { startX, startY, angle, speed, spin },
      },
      {
        onSuccess: (result) => {
          playWhoosh();
          const dartResult = result ?? null;
          const newDart: FlyingDart = {
            id: nanoid(),
            startX,
            startY,
            angle,
            speed,
            spin,
            firedAt: Date.now(),
            dbId: dartResult?.id,
            shooterName: shooterName || null,
            sponsor: sponsor ? {
              ...sponsor,
              prizeText: dartResult?.sponsor?.prizeText ?? undefined,
              prizeClaimUrl: dartResult?.sponsor?.prizeClaimUrl ?? undefined,
            } : null,
            isGolden: dartResult?.isGolden ?? false,
          };
          setFlyingDarts(prev => [...prev, newDart]);
          setTotalShots(prev => prev + 1);
        },
      }
    );
  }, [getRandomSponsor, fireDartMutation, shooterName]);

  const { state: blowState, level, start: startListening, stop: stopListening, error: blowError } =
    useBlowDetection({ onFire: shootDart, threshold: 0.12, sustainMs: 80 });
  const isListening = blowState !== "idle" && blowState !== "error";

  const handleDartClick = useCallback((dart: FlyingDart) => {
    setSelectedDart(dart);
  }, []);

  const handleDartLanded = useCallback((id: string) => {
    // Dart landed — keep in arena until it fades out naturally
    void id;
  }, []);

  const toggleMic = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);
  void blowError;

  const activeSponsor = sponsors?.[0];

  return (
    <div className="startpagina-bg" ref={containerRef}>
      {/* ── Dart Arena overlay ─────────────────────────────────────────────── */}
      <DartArena
        darts={flyingDarts}
        onDartClick={handleDartClick}
        onDartLanded={handleDartLanded}
      />

      {/* ── Unfolded dart modal ────────────────────────────────────────────── */}
      {selectedDart && (
        <DartUnfoldModal
          sponsor={selectedDart.sponsor}
          isGolden={selectedDart.isGolden}
          shooterName={selectedDart.shooterName}
          onClose={() => setSelectedDart(null)}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          HEADER — Hyves orange gradient bar
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="hyves-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Logo dart */}
          <div className={isRolling ? "animate-dart-roll" : ""}>
            <PaperDart
              sponsor={activeSponsor ? {
                id: activeSponsor.id,
                name: activeSponsor.name,
                logoUrl: activeSponsor.logoUrl,
                color: activeSponsor.color,
                message: activeSponsor.message,
                clickUrl: activeSponsor.clickUrl,
              } : null}
              width={60}
              height={14}
            />
          </div>
          <div>
            <div style={{
              fontFamily: "'Fredoka One', Verdana, Arial, sans-serif",
              fontSize: 22,
              color: "#2d1a00",
              lineHeight: 1,
              textShadow: "0 1px 2px rgba(255,255,255,0.4)",
            }}>
              Pijltjesschieten.nl
            </div>
            <div style={{
              fontFamily: "Verdana, Arial, sans-serif",
              fontSize: 10,
              color: "#5c3000",
              fontStyle: "italic",
            }}>
              digitale nostalgie uit de jaren 80 ☺
            </div>
          </div>
        </div>

        {/* Right side: member count like Hyves */}
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontFamily: "Verdana, Arial, sans-serif", fontSize: 10, color: "#5c3000" }}>
            Al <span className="hyves-counter">{(publicStats.total ?? 0) + 2439}</span> pijltjes geschoten!
          </div>
          <div style={{ fontFamily: "Verdana, Arial, sans-serif", fontSize: 9, color: "#7a4a00" }}>
            ⭐ {publicStats.golden ?? 0} gouden pijltjes gevonden
          </div>
        </div>
      </div>

      {/* ── Top navigation bar ────────────────────────────────────────────── */}
      <div className="hyves-nav">
        <div className="container" style={{ display: "flex", alignItems: "center" }}>
          <a href="/">🏠 HOME</a>
          <a href="#schieten">🎯 SCHIETEN</a>
          <a href="#galerij">📋 GALERIJ</a>
          <Link href="/demo" style={{ color: "#ffffff", textDecoration: "none", fontSize: 11, fontWeight: "bold", padding: "5px 10px", display: "inline-block", borderRight: "1px solid rgba(255,255,255,0.2)" }}>
              🗞️ DEMO NU.NL
          </Link>
          <Link href="/admin" style={{ color: "#ffdd44", textDecoration: "none", fontSize: 11, fontWeight: "bold", padding: "5px 10px", display: "inline-block" }}>
              ⚙️ ADMIN
          </Link>
          <div style={{ marginLeft: "auto", padding: "3px 8px", fontSize: 10, color: "rgba(255,255,255,0.7)" }}>
            {new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>
      </div>

      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <div className="container" style={{ padding: "3px 8px", fontSize: 10, color: "#555", borderBottom: "1px solid #a8c4e0", background: "#f0f4fa" }}>
        Je bent hier: <strong>Home</strong> &nbsp;|&nbsp;
        <span style={{ color: "#666" }}>Zoeken: </span>
        <input className="retro-input" style={{ width: 120, marginLeft: 4 }} placeholder="zoek pijltjes..." />
        &nbsp;
        <button className="retro-btn retro-btn-blue" style={{ fontSize: 10, padding: "1px 8px" }}>Ok</button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN CONTENT — Two-column Startpagina layout
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="container" style={{ paddingTop: 8, paddingBottom: 16 }}>
        <div className="sp-columns-2">

          {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
          <div>

            {/* ── NIEUW banner ────────────────────────────────────────── */}
            <div style={{
              background: "#fffbe6",
              border: "1px solid #f5a623",
              padding: "6px 10px",
              marginBottom: 8,
              fontSize: 11,
            }}>
              <span className="retro-badge-new">NIEUW</span>
              &nbsp;
              <span style={{ color: "#cc0000", fontWeight: "bold" }}>
                Al {(publicStats.total ?? 0) + 2439} pijltjes geschoten
              </span>
              &nbsp;— Jij kan ook meedoen! ☺
              &nbsp;&nbsp;
              <span style={{ color: "#555", fontSize: 10 }}>
                🏆 {publicStats.golden ?? 0} gouden pijltjes gevonden
              </span>
            </div>

            {/* ── SCHIETEN PANEL ──────────────────────────────────────── */}
            <div id="schieten" className="retro-panel">
              <div className="retro-panel-header orange">
                🎯 Schiet een pijltje! — Blaas hard in je microfoon
              </div>
              <div className="retro-panel-body">

                {/* Dart preview */}
                <div style={{ textAlign: "center", padding: "8px 0", borderBottom: "1px dotted #d0d8e8", marginBottom: 8, overflow: "hidden" }}>
                  <div style={{ fontSize: 10, color: "#666", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Jouw pijltje:
                  </div>
                  <div
                    style={{
                      display: "inline-block",
                      transition: dartShotAnim === "shooting"
                        ? "transform 0.38s cubic-bezier(0.55,0,1,0.45), opacity 0.32s ease"
                        : dartShotAnim === "reloading"
                        ? "none"
                        : "transform 0.42s cubic-bezier(0.23,1,0.32,1), opacity 0.38s ease",
                      transform: dartShotAnim === "shooting"
                        ? "translateX(140%)"
                        : dartShotAnim === "reloading"
                        ? "translateX(-120%)"
                        : "translateX(0)",
                      opacity: dartShotAnim === "shooting" ? 0 : dartShotAnim === "reloading" ? 0 : 1,
                    }}
                    className={isRolling ? "animate-dart-roll" : ""}
                  >
                    <PaperDart
                      sponsor={activeSponsor ? {
                        id: activeSponsor.id,
                        name: activeSponsor.name,
                        logoUrl: activeSponsor.logoUrl,
                        color: activeSponsor.color,
                        message: activeSponsor.message,
                        clickUrl: activeSponsor.clickUrl,
                      } : null}
                      width={200}
                      height={32}
                      spinning={blowState === "blowing"}
                    />
                  </div>
                  {isRolling && (
                    <div style={{ fontSize: 10, color: "#cc6600", marginTop: 4 }}>
                      ⟳ Pijltje rollen...
                    </div>
                  )}
                </div>

                {/* Name input */}
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 10, color: "#555", display: "block", marginBottom: 2 }}>
                    Jouw naam (optioneel):
                  </label>
                  <input
                    className="retro-input"
                    style={{ width: "100%" }}
                    placeholder="Bijv. Marc"
                    value={shooterName}
                    onChange={e => setShooterName(e.target.value)}
                  />
                </div>

                {/* Blow meter */}
                {isListening && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>
                      Blaassterkte:
                    </div>
                    <div className="blow-meter-container">
                      <div
                        className="blow-meter-fill"
                        style={{ width: `${Math.min(100, level * 100)}%` }}
                      />
                    </div>
                    <div style={{ fontSize: 9, color: "#888", marginTop: 2 }}>
                      {blowState === "blowing"
                        ? "💨 BLAZEN GEDETECTEERD!"
                        : blowState === "ready"
                        ? "✅ Klaar — blaas nu hard!"
                        : "🎤 Microfoon actief..."}
                    </div>
                  </div>
                )}

                {/* Shoot button + direct fire button */}
                <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                  <button
                    className={`retro-btn ${isListening ? "retro-btn-blue" : "retro-btn-orange"}`}
                    style={{ fontSize: 13, padding: "5px 14px", flex: 1 }}
                    onClick={toggleMic}
                  >
                    {isListening
                      ? "🛑 Stop microfoon"
                      : "🎯 Blaas!"}
                  </button>
                  <button
                    className="retro-btn retro-btn-green"
                    style={{ fontSize: 13, padding: "5px 14px", whiteSpace: "nowrap" }}
                    onClick={() => shootDart(0.8)}
                    title="Schiet direct een pijltje zonder microfoon"
                  >
                    🏹 Schiet!
                  </button>
                </div>

                {!isListening && (
                  <div style={{ fontSize: 10, color: "#888", marginTop: 6, textAlign: "center" }}>
                    Blaas in je microfoon <em>of</em> klik op <strong>Schiet!</strong> om direct een pijltje te sturen
                  </div>
                )}
              </div>
            </div>

            {/* ── HOE WERKT HET PANEL ──────────────────────────────────── */}
            <div className="retro-panel">
              <div className="retro-panel-header">
                ❓ Hoe werkt het?
              </div>
              <div className="retro-panel-body">
                <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11, lineHeight: 1.8 }}>
                  <li>Klik op de <strong>oranje knop</strong> om de microfoon te activeren</li>
                  <li>Blaas <strong>hard</strong> in je microfoon (niet te zacht!)</li>
                  <li>Kijk hoe je pijltje over het scherm vliegt! 🎯</li>
                  <li>Ergens in Nederland vliegt jouw pijltje over een scherm. Klikt iemand op jouw vliegende pijltje, dan is er een kans dat het een <strong style={{ color: "#cc8800" }}>gouden pijltje</strong> is! En dan wint hij of zij een prijs! 🏆</li>
                </ol>
              </div>
            </div>

            {/* ── SPONSORS PANEL ───────────────────────────────────────── */}
            <div className="retro-panel">
              <div className="retro-panel-header green">
                ⭐ Pijltjes gesponsord door
              </div>
              <div className="retro-panel-body">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {sponsors?.filter(s => s.active).map(s => (
                    <span
                      key={s.id}
                      style={{
                        background: s.color,
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: "bold",
                        padding: "2px 8px",
                        border: "1px solid rgba(0,0,0,0.3)",
                        fontFamily: "Verdana, Arial, sans-serif",
                      }}
                    >
                      {s.name}
                    </span>
                  ))}
                  {(!sponsors || sponsors.length === 0) && (
                    <span style={{ fontSize: 10, color: "#888" }}>Geen sponsors actief</span>
                  )}
                </div>
                <div style={{ marginTop: 6, fontSize: 10, color: "#888" }}>
                  <a href="mailto:reizen@gmail.com?subject=Sponsor%20worden%20bij%20Pijltjesschieten.nl&body=Hallo%2C%0A%0AIk%20ben%20ge%C3%AFnteresseerd%20in%20het%20sponsoren%20van%20pijltjes%20op%20Pijltjesschieten.nl.%0A%0AMijn%20naam%3A%0ABedrijf%3A%0ATelefoonnummer%3A%0A%0AGraag%20neem%20ik%20contact%20met%20jullie%20op.%0A%0AMet%20vriendelijke%20groet">Sponsor worden? Klik hier →</a>
                </div>
              </div>
            </div>

            {/* ── OVER HET CONCEPT PANEL ───────────────────────────────── */}
            <div className="retro-panel">
              <div className="retro-panel-header">
                📖 Over Pijltjesschieten.nl
              </div>
              <div className="retro-panel-body" style={{ lineHeight: 1.7 }}>
                <p style={{ margin: "0 0 6px 0" }}>
                  Weet je nog? In de jaren 80 en begin 90 maakten we pijltjes van stroken
                  glossy tijdschriftpapier — de <strong>Veronica Gids</strong>, <strong>Wehkamp catalogus</strong>
                  of <strong>ANWB Kampioen</strong>. Door een hoek van de strook tussen je wijs- en ringvinger
                  te klemmen en hem op te rollen maakte je een strakke cilinder met een scherpe punt.
                  Met speeksel plakte je de punt vast op het glanzende papier.
                </p>
                <p style={{ margin: 0 }}>
                  Dan in een PVC buis blazen en... <strong>WHOOSH!</strong> ☺ Pijltjesschieten.nl
                  brengt die nostalgie terug in digitale vorm!
                </p>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ────────────────────────────────────────────── */}
          <div>

            {/* ── GRATIS AANMELDEN box (like Hyves) ───────────────────── */}
            <div style={{ marginBottom: 8 }}>
              <button
                className="retro-btn retro-btn-orange"
                style={{ width: "100%", fontSize: 13, padding: "6px 10px", textAlign: "center" }}
                onClick={toggleMic}
              >
                🎯 SCHIET EEN PIJLTJE!
              </button>
            </div>

            {/* ── IN DE SPOTLIGHT (stats) ──────────────────────────────── */}
            <div className="retro-panel">
              <div className="retro-panel-header">
                📊 In de spotlight
              </div>
              <div className="retro-panel-body">
                <ul className="retro-list">
                  <li>
                    <strong>{publicStats.total ?? 0}</strong> pijltjes geschoten vandaag
                  </li>
                  <li>
                    <strong style={{ color: "#cc8800" }}>{publicStats.golden ?? 0}</strong> gouden pijltjes gevonden 🏆
                  </li>
                  <li>
                    <strong>{sponsors?.filter(s => s.active).length ?? 0}</strong> actieve sponsors
                  </li>
                  <li>
                    <strong>{totalShots}</strong> pijltjes in deze sessie
                  </li>
                </ul>
              </div>
            </div>

            {/* ── GALERIJ PANEL ────────────────────────────────────────── */}
            <div id="galerij" className="retro-panel">
              <div className="retro-panel-header" style={{ justifyContent: "space-between" }}>
                <span>📋 Recente pijltjes</span>
                <div style={{ display: "flex", gap: 2 }}>
                  <button
                    className={`retro-btn ${galleryTab === "recent" ? "retro-btn-orange" : "retro-btn-blue"}`}
                    style={{ fontSize: 9, padding: "1px 6px" }}
                    onClick={() => setGalleryTab("recent")}
                  >
                    Recent
                  </button>
                  <button
                    className={`retro-btn ${galleryTab === "gallery" ? "retro-btn-orange" : "retro-btn-blue"}`}
                    style={{ fontSize: 9, padding: "1px 6px" }}
                    onClick={() => setGalleryTab("gallery")}
                  >
                    Galerij
                  </button>
                </div>
              </div>
              <div className="retro-panel-body" style={{ padding: 0 }}>
                <DartGallery />
              </div>
            </div>

            {/* ── DEMO LINK ────────────────────────────────────────────── */}
            <div className="retro-panel">
              <div className="retro-panel-header orange">
                🗞️ Bekijk de NU.nl demo
              </div>
              <div className="retro-panel-body">
                <p style={{ margin: "0 0 6px 0", fontSize: 11 }}>
                  Zie hoe pijltjes over een echte nieuwssite vliegen — inclusief RTB banners!
                </p>
                <Link href="/demo">
                  <button className="retro-btn retro-btn-blue" style={{ width: "100%", fontSize: 11, padding: "4px 10px" }}>
                    🗞️ Open NU.nl demo →
                  </button>
                </Link>
              </div>
            </div>

            {/* ── POPULAIRE SPONSORS ───────────────────────────────────── */}
            <div className="retro-panel">
              <div className="retro-panel-header">
                🏆 Populaire sponsors
              </div>
              <div className="retro-panel-body">
                <ul className="retro-list">
                  {sponsors?.slice(0, 5).map((s, i) => (
                    <li key={s.id}>
                      <a href={s.clickUrl} target="_blank" rel="noopener noreferrer"
                        style={{ color: s.color, fontWeight: "bold" }}>
                        {s.name}
                      </a>
                      {s.goldenChance && s.goldenChance > 0 && (
                        <span style={{ marginLeft: 4, fontSize: 9, color: "#cc8800" }}>🏆 prijs</span>
                      )}
                    </li>
                  ))}
                  {(!sponsors || sponsors.length === 0) && (
                    <li style={{ color: "#888" }}>Nog geen sponsors</li>
                  )}
                </ul>
                <div style={{ marginTop: 4, fontSize: 10, borderTop: "1px dotted #d0d8e8", paddingTop: 4 }}>
                  <a href="/admin">meer sponsors, adverteren</a>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(180deg, #3a6aaa 0%, #2d5a8e 100%)",
        borderTop: "2px solid #1a3a6a",
        padding: "8px 0",
        textAlign: "center",
        fontSize: 10,
        color: "rgba(255,255,255,0.8)",
      }}>
        <div className="container">
          <strong style={{ color: "#ffdd44" }}>Pijltjesschieten.nl</strong>
          &nbsp;—&nbsp;Digitale nostalgie uit de jaren 80
          &nbsp;|&nbsp;
          <a href="/admin" style={{ color: "rgba(255,255,255,0.7)" }}>Admin</a>
          &nbsp;|&nbsp;
          <a href="/demo" style={{ color: "rgba(255,255,255,0.7)" }}>Demo NU.nl</a>
          &nbsp;|&nbsp;
          <span style={{ color: "rgba(255,255,255,0.5)" }}>
            Geïnspireerd op de PVC blaaspijp uit de jaren 80 · www.pijltjesschieten.nl
          </span>
        </div>
      </div>
    </div>
  );
}
