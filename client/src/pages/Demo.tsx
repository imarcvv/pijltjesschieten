import { useState, useCallback, useRef } from "react";
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
  { id: 1, cat: "Nieuws", catColor: "#c0392b", title: "Kabinet presenteert nieuw klimaatakkoord voor 2035", time: "14 min geleden", img: "🌿", hot: true },
  { id: 2, cat: "Sport", catColor: "#2980b9", title: "Ajax wint met 3-1 van PSV in de Johan Cruijff Arena", time: "32 min geleden", img: "⚽", hot: false },
  { id: 3, cat: "Tech", catColor: "#8e44ad", title: "Nederlandse startup haalt €50 miljoen op voor AI-platform", time: "1 uur geleden", img: "🤖", hot: false },
  { id: 4, cat: "Economie", catColor: "#27ae60", title: "AEX sluit hoger na positief Amerikaans banenrapport", time: "2 uur geleden", img: "📈", hot: false },
  { id: 5, cat: "Entertainment", catColor: "#e67e22", title: "Marco Borsato kondigt grote comeback-tour aan", time: "3 uur geleden", img: "🎤", hot: false },
  { id: 6, cat: "Nieuws", catColor: "#c0392b", title: "RIVM waarschuwt voor hittegolf komend weekend", time: "4 uur geleden", img: "☀️", hot: false },
];

const TRENDING = [
  "Koningshuis nieuws",
  "Formule 1 Grand Prix",
  "Woningmarkt 2025",
  "Vakantietips zomer",
  "Energieprijzen dalen",
];

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

    // Darts always shoot from left side, varying heights
    const startX = vw * 0.02;
    const startY = vh * 0.15 + Math.random() * vh * 0.65;
    const angle = -8 + Math.random() * 16;
    const speed = 0.65 + power * 0.35;
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
      {
        sponsorId: sponsor?.id,
        sessionId: SESSION_ID,
        shooterName: "Demo bezoeker",
        trajectoryData: { startX, startY, angle, speed, spin },
      },
      {
        onSuccess: (savedDart) => {
          if (savedDart?.isGolden) {
            setFlyingDarts(prev =>
              prev.map(d => d.id === dartId ? { ...d, isGolden: true } : d)
            );
          }
        },
      }
    );
  }, [getRandomSponsor, fireDartMutation]);

  const { state: blowState, level, error: blowError, start: startBlow, stop: stopBlow } = useBlowDetection({
    threshold: 0.28,
    sustainMs: 120,
    cooldownMs: 1500,
    onFire: shootDart,
  });

  const isActive = blowState === "ready" || blowState === "blowing" || blowState === "fired";
  const pct = Math.round(level * 100);

  return (
    <div className="min-h-screen bg-white" ref={containerRef}>
      {/* Flying darts overlay — covers the ENTIRE page */}
      <DartArena
        darts={flyingDarts}
        onDartClick={d => setSelectedDart(d)}
        onDartLanded={() => {}}
      />

      {selectedDart && (
        <DartUnfoldModal
          sponsor={selectedDart.sponsor}
          isGolden={selectedDart.isGolden}
          onClose={() => setSelectedDart(null)}
        />
      )}

      {/* ── Pijltjesschieten.nl control bar (floating, sticky top) ─────────── */}
      <div
        className="sticky top-0 z-[9998] flex items-center gap-3 px-4 py-2 shadow-lg"
        style={{ background: "oklch(0.52 0.18 40)", borderBottom: "3px solid oklch(0.35 0.12 40)" }}
      >
        {/* Logo */}
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <PaperDart width={50} height={18} />
            <span className="font-display text-white text-sm hidden sm:block" style={{ letterSpacing: "0.02em" }}>
              Pijltjesschieten.nl
            </span>
          </div>
        </Link>

        <div className="w-px h-6 bg-white/30" />

        {/* Blow meter — compact inline version */}
        <div
          className="relative flex-1 max-w-xs h-9 rounded-full border-2 border-white/40 overflow-hidden cursor-pointer select-none"
          onClick={!isActive ? startBlow : undefined}
          title={isActive ? "Blaas nu!" : "Klik om te starten"}
        >
          <div
            className="blow-meter-fill absolute left-0 top-0 h-full rounded-full"
            style={{ width: `${pct}%`, opacity: isActive ? 1 : 0.4 }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-xs text-white drop-shadow" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
              {blowError
                ? "❌ Geen microfoon"
                : blowState === "idle" ? "🎯 Klik & blaas om te schieten"
                : blowState === "requesting" ? "🎤 Microfoon..."
                : blowState === "ready" ? "💨 Blaas hard!"
                : blowState === "blowing" ? "💨 HARDER BLAZEN..."
                : blowState === "fired" ? "🎯 RAAK!"
                : ""}
            </span>
          </div>
          {/* Threshold line */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-white/50 z-10" style={{ left: "28%" }} />
        </div>

        {/* Shot counter */}
        {shotCount > 0 && (
          <div className="font-display text-white text-sm hidden sm:flex items-center gap-1">
            <span className="text-amber-300">{shotCount}</span>
            <span className="opacity-70 text-xs">geschoten</span>
          </div>
        )}

        {/* Stop button */}
        {isActive && (
          <button
            onClick={stopBlow}
            className="font-retro text-xs text-white/70 hover:text-white transition-colors"
          >
            ✕ Stop
          </button>
        )}

        <Link href="/">
          <button className="ml-auto font-retro text-xs text-white/70 hover:text-white transition-colors hidden sm:block">
            ← Terug
          </button>
        </Link>
      </div>

      {/* ── Tip overlay ───────────────────────────────────────────────────── */}
      {showTip && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9997] px-5 py-3 rounded-2xl shadow-xl
            font-display text-sm text-white text-center max-w-xs"
          style={{ background: "oklch(0.52 0.18 40)", border: "2px solid oklch(0.82 0.16 85)" }}
        >
          🎯 Klik op de balk hierboven en blaas hard in je microfoon!
          <button className="ml-3 text-amber-300 hover:text-white" onClick={() => setShowTip(false)}>✕</button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          NU.NL MOCK PAGE
      ════════════════════════════════════════════════════════════════════ */}

      {/* ── NU.nl Header ─────────────────────────────────────────────────── */}
      <header style={{ background: "#1a1a2e", borderBottom: "1px solid #333" }}>
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-1">
            <span
              className="font-display text-3xl font-black"
              style={{ color: "#e63946", letterSpacing: "-0.02em" }}
            >
              NU
            </span>
            <span className="font-display text-3xl font-black text-white" style={{ letterSpacing: "-0.02em" }}>.nl</span>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-4">
            {["Nieuws", "Sport", "Tech", "Economie", "Entertainment", "Gezondheid"].map(item => (
              <span key={item} className="text-gray-300 hover:text-white cursor-pointer text-sm font-medium transition-colors">
                {item}
              </span>
            ))}
          </nav>

          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
              <span className="text-gray-400 text-xs">🔍</span>
              <span className="text-gray-400 text-xs">Zoeken...</span>
            </div>
            <span className="text-gray-400 text-sm cursor-pointer">☰</span>
          </div>
        </div>

        {/* Sub-nav */}
        <div style={{ background: "#e63946" }}>
          <div className="max-w-5xl mx-auto px-4 py-1 flex items-center gap-4 overflow-x-auto">
            {["Binnenland", "Buitenland", "Politiek", "Koningshuis", "Misdaad", "Wetenschap"].map(item => (
              <span key={item} className="text-white text-xs font-medium whitespace-nowrap cursor-pointer hover:underline">
                {item}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* ── RTB BILLBOARD BANNER (Thuisbezorgd-style) ────────────────────── */}
      {/* This is the #1 RTB slot — where pijltjes fly OVER */}
      <div className="relative" style={{ background: "#f5f5f5", borderBottom: "1px solid #ddd" }}>
        <div className="max-w-5xl mx-auto px-4 py-2">
          <div
            className="relative rounded-lg overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #ffd700 0%, #ff8c00 40%, #ff4500 100%)",
              minHeight: 120,
              border: "2px solid #e0a000",
            }}
          >
            {/* RTB label */}
            <div
              className="absolute top-1 left-2 text-xs px-2 py-0.5 rounded"
              style={{ background: "rgba(0,0,0,0.3)", color: "rgba(255,255,255,0.8)", fontSize: 10 }}
            >
              Advertentie
            </div>

            {/* Banner content — Thuisbezorgd style */}
            <div className="flex items-center justify-between h-full px-6 py-4">
              <div className="flex items-center gap-6">
                {/* Food emoji as placeholder for food image */}
                <div className="text-7xl" style={{ filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.3))" }}>
                  🍔
                </div>
                <div>
                  <div
                    className="font-black text-white"
                    style={{ fontSize: 48, lineHeight: 1, textShadow: "2px 2px 0 rgba(0,0,0,0.3)" }}
                  >
                    50%
                  </div>
                  <div className="font-bold text-white text-lg" style={{ textShadow: "1px 1px 0 rgba(0,0,0,0.3)" }}>
                    KORTING
                  </div>
                </div>
                <div className="hidden sm:block">
                  <div className="text-white font-bold text-xl" style={{ textShadow: "1px 1px 0 rgba(0,0,0,0.3)" }}>
                    Op je eerste bestelling
                  </div>
                  <div className="text-yellow-100 text-sm mt-1">
                    Gebruik code: <strong>WELKOM50</strong>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div
                  className="font-black text-2xl"
                  style={{ color: "#1a1a2e", letterSpacing: "-0.02em" }}
                >
                  thuisbezorgd.nl
                </div>
                <button
                  className="font-bold text-white px-6 py-2 rounded-full text-sm"
                  style={{ background: "#1a1a2e", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}
                >
                  Bestel nu →
                </button>
              </div>
            </div>

            {/* "Pijltje zone" indicator — subtle dashed border showing dart flight path */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                border: "2px dashed rgba(255,255,255,0.3)",
                borderRadius: 8,
              }}
            />
          </div>

          {/* RTB explanation label for demo */}
          <div
            className="mt-1 text-center text-xs font-retro"
            style={{ color: "#999" }}
          >
            ↑ RTB Billboard slot (970×250) — pijltjes vliegen hier OVERHEEN ↑
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Left: News feed (2/3 width) */}
          <div className="md:col-span-2 space-y-4">

            {/* Breaking news ticker */}
            <div
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
              style={{ background: "#e63946" }}
            >
              <span className="font-bold text-white text-xs px-2 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.3)" }}>
                BREAKING
              </span>
              <span className="text-white text-sm font-medium">
                Pijltjesschieten.nl lanceert digitale blaaspijp — schiet pijltjes over je favoriete websites!
              </span>
            </div>

            {/* Top story */}
            <div
              className="rounded-xl overflow-hidden border"
              style={{ borderColor: "#e0e0e0" }}
            >
              <div
                className="relative h-48 flex items-center justify-center text-8xl"
                style={{ background: "linear-gradient(135deg, #1a1a2e, #2d3561)" }}
              >
                🌿
                <div
                  className="absolute bottom-0 left-0 right-0 p-4"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }}
                >
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded text-white"
                    style={{ background: "#c0392b" }}
                  >
                    NIEUWS
                  </span>
                  <h2 className="text-white font-bold text-lg mt-1 leading-tight">
                    Kabinet presenteert nieuw klimaatakkoord voor 2035
                  </h2>
                </div>
              </div>
              <div className="p-3 bg-white">
                <p className="text-gray-600 text-sm">
                  Het kabinet heeft vandaag een ambitieus klimaatplan gepresenteerd dat Nederland in 2035 klimaatneutraal moet maken. Experts reageren verdeeld op de plannen...
                </p>
                <p className="text-gray-400 text-xs mt-2">14 minuten geleden</p>
              </div>
            </div>

            {/* News grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {NEWS_ITEMS.slice(1).map(item => (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 rounded-xl border cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ borderColor: "#e0e0e0", background: "#fff" }}
                >
                  <div
                    className="w-16 h-16 rounded-lg flex items-center justify-center text-3xl flex-shrink-0"
                    style={{ background: "#f5f5f5" }}
                  >
                    {item.img}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span
                      className="text-xs font-bold px-1.5 py-0.5 rounded text-white"
                      style={{ background: item.catColor }}
                    >
                      {item.cat}
                    </span>
                    <p className="text-gray-800 text-sm font-medium mt-1 leading-tight line-clamp-2">
                      {item.title}
                    </p>
                    <p className="text-gray-400 text-xs mt-1">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* In-article MPU banner (mid-page) */}
            <div
              className="rounded-xl overflow-hidden relative"
              style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", minHeight: 90 }}
            >
              <div
                className="absolute top-1 left-2 text-xs px-2 py-0.5 rounded"
                style={{ background: "rgba(0,0,0,0.3)", color: "rgba(255,255,255,0.8)", fontSize: 10 }}
              >
                Advertentie
              </div>
              <div className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-white font-bold text-lg">ANWB Wegenwacht</p>
                  <p className="text-purple-200 text-sm">Al 125 jaar voor u op de weg</p>
                </div>
                <div className="text-5xl">🚗</div>
                <button className="font-bold text-purple-900 bg-white px-4 py-2 rounded-full text-sm">
                  Word lid
                </button>
              </div>
              <div className="px-4 pb-1 text-center text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                ↑ In-article banner slot — ook geschikt voor pijltjes ↑
              </div>
            </div>

            {/* More news */}
            <div className="space-y-2">
              {[
                { cat: "Tech", color: "#8e44ad", title: "ChatGPT krijgt nieuw geheugen dat gesprekken onthoudt", time: "5 uur geleden" },
                { cat: "Economie", color: "#27ae60", title: "Huizenprijzen stijgen voor het vijfde kwartaal op rij", time: "6 uur geleden" },
                { cat: "Sport", color: "#2980b9", title: "Sifan Hassan breekt wereldrecord op de 10.000 meter", time: "7 uur geleden" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ borderColor: "#e0e0e0", background: "#fff" }}
                >
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded text-white flex-shrink-0"
                    style={{ background: item.color }}
                  >
                    {item.cat}
                  </span>
                  <p className="text-gray-800 text-sm flex-1">{item.title}</p>
                  <p className="text-gray-400 text-xs flex-shrink-0">{item.time}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right rail */}
          <div className="space-y-4">

            {/* Right rail MPU 300x250 */}
            <div
              className="rounded-xl overflow-hidden relative"
              style={{
                background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                minHeight: 250,
              }}
            >
              <div
                className="absolute top-1 left-2 text-xs px-2 py-0.5 rounded"
                style={{ background: "rgba(0,0,0,0.3)", color: "rgba(255,255,255,0.8)", fontSize: 10 }}
              >
                Advertentie
              </div>
              <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center gap-3">
                <div className="text-5xl">📻</div>
                <p className="text-white font-bold text-xl">Radio Veronica</p>
                <p className="text-pink-100 text-sm">De beste hits van de 80s en 90s!</p>
                <button className="font-bold text-pink-900 bg-white px-4 py-2 rounded-full text-sm mt-2">
                  Luister live
                </button>
              </div>
              <div className="pb-1 text-center text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                ↑ Right rail MPU (300×250) ↑
              </div>
            </div>

            {/* Trending */}
            <div className="rounded-xl border p-4" style={{ borderColor: "#e0e0e0", background: "#fff" }}>
              <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                🔥 <span>Trending</span>
              </h3>
              <div className="space-y-2">
                {TRENDING.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 cursor-pointer hover:text-red-600 transition-colors">
                    <span className="text-gray-400 text-xs font-bold w-4">{i + 1}</span>
                    <span className="text-gray-700 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right rail skyscraper 300x600 */}
            <div
              className="rounded-xl overflow-hidden relative"
              style={{
                background: "linear-gradient(180deg, #0f3460 0%, #16213e 100%)",
                minHeight: 300,
              }}
            >
              <div
                className="absolute top-1 left-2 text-xs px-2 py-0.5 rounded"
                style={{ background: "rgba(0,0,0,0.3)", color: "rgba(255,255,255,0.8)", fontSize: 10 }}
              >
                Advertentie
              </div>
              <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center gap-3">
                <div className="text-5xl">🛒</div>
                <p className="text-white font-bold text-xl">Wehkamp</p>
                <p className="text-blue-200 text-sm">Mode, wonen & meer</p>
                <p className="text-yellow-300 font-bold text-2xl">-30%</p>
                <p className="text-blue-200 text-xs">op zomercollectie</p>
                <button className="font-bold text-blue-900 bg-white px-4 py-2 rounded-full text-sm mt-2">
                  Shop nu
                </button>
              </div>
              <div className="pb-1 text-center text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                ↑ Skyscraper (300×600) ↑
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Demo explanation footer ───────────────────────────────────────── */}
      <div
        className="mt-8 py-6 px-4"
        style={{ background: "oklch(0.52 0.18 40)", borderTop: "4px solid oklch(0.35 0.12 40)" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-6 text-center">
            {[
              { emoji: "🎯", title: "RTB Integratie", desc: "Pijltjes vliegen over bestaande RTB-banners via een lichtgewicht JavaScript snippet" },
              { emoji: "💨", title: "Microphone Trigger", desc: "Gebruikers blazen in hun microfoon om pijltjes te schieten — net als vroeger met de blaaspijp" },
              { emoji: "🏷️", title: "Sponsor Branding", desc: "Elk pijltje draagt het logo van een sponsor — klikbaar met een boodschap en clickthrough URL" },
            ].map(item => (
              <div key={item.title} className="text-center">
                <div className="text-3xl mb-2">{item.emoji}</div>
                <h3 className="font-display text-white text-lg mb-1">{item.title}</h3>
                <p className="font-retro text-amber-200 text-xs opacity-80">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link href="/">
              <button
                className="btn-retro px-6 py-3 rounded-xl font-display text-lg"
                style={{ background: "oklch(0.82 0.16 85)", color: "#3d2800" }}
              >
                ← Terug naar Pijltjesschieten.nl
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
