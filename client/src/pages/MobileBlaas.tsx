import { useState, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useBlowDetection } from "@/hooks/useBlowDetection";

const SESSION_ID = `mob_${Math.random().toString(36).slice(2, 10)}`;

const DART_IMAGES = [
  "/manus-storage/pijltjegeel_961740f5.png",
  "/manus-storage/pijltjeblauw_c47034bc.png",
  "/manus-storage/pijltjewit_868c31a1.png",
] as const;

const QUOTES: { text: string; author: string }[] = [
  { text: "De beste manier om de toekomst te voorspellen, is door haar zelf te creëren.", author: "Peter Drucker" },
  { text: "Je bent nooit te oud om een nieuw doel te stellen of een nieuwe droom te dromen.", author: "C.S. Lewis" },
  { text: "Succes is niet het eindpunt, falen is niet fataal: het is de moed om door te gaan die telt.", author: "Winston Churchill" },
  { text: "Begin waar je bent. Gebruik wat je hebt. Doe wat je kunt.", author: "Arthur Ashe" },
  { text: "Positief denken is niet doen alsof alles geweldig is, maar weten dat je alles aankunt wat er op je pad komt.", author: "Onbekend" },
  { text: "Het is niet het gewicht van de last, maar de manier waarop je hem draagt die bepaalt hoe vermoeid je raakt.", author: "Lena Horne" },
  { text: "Verandering is de wet van het leven. Degenen die alleen naar het verleden of het heden kijken, zullen de toekomst missen.", author: "John F. Kennedy" },
  { text: "Je kunt de windrichting niet veranderen, maar wel de zeilen zo bijstellen dat je altijd je bestemming bereikt.", author: "Jimmy Dean" },
  { text: "Geluk is geen bestemming, maar een manier van reizen.", author: "Margaret Lee Runbeck" },
  { text: "Grootse resultaten vereisen vaak grootse ambities, maar beginnen altijd met een eerste, kleine stap.", author: "Heraclitus" },
];

const STEPS = [
  { n: 1, text: "Klik op de oranje knop om de microfoon te activeren" },
  { n: 2, text: "Blaas hard in je microfoon (niet te zacht!)" },
  { n: 3, text: "Kijk hoe je pijltje over het scherm vliegt! 🎯" },
  { n: 4, text: "Ergens in Nederland vliegt jouw pijltje over een scherm." },
  { n: 5, text: "Klikt iemand op jouw vliegende pijltje, dan is er een kans dat het een gouden pijltje is! En dan wint hij of zij een prijs! 🏆" },
];

function playWhoosh() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const duration = 1.4;
    const sr = ctx.sampleRate;
    const bufferSize = Math.floor(sr * duration);
    const buffer = ctx.createBuffer(1, bufferSize, sr);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 600;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(3200, ctx.currentTime);
    bp.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + duration * 0.85);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.7, ctx.currentTime + duration * 0.6);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    source.connect(hp); hp.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
    source.start(); source.stop(ctx.currentTime + duration);
    source.onended = () => ctx.close();
  } catch { /* audio not available */ }
}

// ── PVC Yellow Button (simple rounded) ───────────────────────────────────────
function PvcTubeButton({ onClick, label }: { onClick?: () => void; label: string; active: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "min(80vw, 340px)",
        height: 64,
        border: "none",
        borderRadius: 32,
        cursor: onClick ? "pointer" : "default",
        WebkitTapHighlightColor: "transparent",
        userSelect: "none",
        // PVC yellow colour
        background: "#f5d000",
        boxShadow: "0 4px 16px rgba(180,140,0,0.40), 0 1px 0 rgba(255,255,200,0.6) inset",
        transition: "transform 0.15s ease-out, box-shadow 0.15s ease-out",
        outline: "none",
        color: "#5a3e00",
        fontSize: 17,
        fontWeight: 800,
        fontFamily: "'Special Elite', 'Courier New', Courier, monospace",
        letterSpacing: 1.5,
        textShadow: "0 1px 0 rgba(255,255,200,0.7)",
        padding: "0 32px",
      }}
      onPointerDown={e => { e.currentTarget.style.transform = "scale(0.96)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(180,140,0,0.30)"; }}
      onPointerUp={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(180,140,0,0.40), 0 1px 0 rgba(255,255,200,0.6) inset"; }}
      onPointerLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(180,140,0,0.40), 0 1px 0 rgba(255,255,200,0.6) inset"; }}
    >
      {label}
    </button>
  );
}

type AnimState = "idle" | "shooting" | "reloading";

export default function MobileBlaas() {
  const [animState, setAnimState] = useState<AnimState>("idle");
  const [variant, setVariant] = useState<0 | 1 | 2>(() => (Math.floor(Math.random() * 3)) as 0 | 1 | 2);
  const [showMsg, setShowMsg] = useState(false);
  // micReady: false = mic not yet activated, true = mic active and ready to blow
  const [micReady, setMicReady] = useState(false);
  const dartImg = DART_IMAGES[variant];
  const utils = trpc.useUtils();

  const { data: sponsors } = trpc.sponsors.listActive.useQuery();

  const getRandomSponsor = useCallback(() => {
    if (!sponsors || sponsors.length === 0) return null;
    const active = sponsors.filter(s => s.active === true || (s.active as unknown) === 1);
    return active.length > 0 ? active[Math.floor(Math.random() * active.length)] : null;
  }, [sponsors]);

  const fireDartMutation = trpc.darts.fire.useMutation({
    onSuccess: () => utils.darts.recent.invalidate(),
  });

  const shoot = useCallback((power = 0.5) => {
    if (animState === "shooting") return;

    const isQuoteDart = Math.random() < 1 / 3;
    const quoteDart = isQuoteDart ? QUOTES[Math.floor(Math.random() * QUOTES.length)] : null;
    const sponsor = isQuoteDart ? null : getRandomSponsor();

    setAnimState("shooting");
    playWhoosh();
    // Haptic feedback: short sharp buzz on shoot
    if (navigator.vibrate) navigator.vibrate([60, 20, 40]);

    // "Pijltje onderweg!" toast — tijdelijk uitgeschakeld
    // setShowMsg(true);
    // setTimeout(() => setShowMsg(false), 2000);

    fireDartMutation.mutate({
      sponsorId: (sponsor as { id: number } | null)?.id ?? undefined,
      sessionId: SESSION_ID,
      quoteText: quoteDart?.text ?? undefined,
      quoteAuthor: quoteDart?.author ?? undefined,
      dartVariant: variant,
      trajectoryData: { startX: 50, startY: 80, angle: -90, speed: 0.5 + power * 0.2, spin: 0 },
    });

    setTimeout(() => {
      setVariant((Math.floor(Math.random() * 3)) as 0 | 1 | 2);
      setAnimState("reloading");
    }, 600);
    setTimeout(() => setAnimState("idle"), 1100);
  }, [animState, variant, getRandomSponsor, fireDartMutation]);

  const { state: blowState, start: startListening, stop: stopListening } =
    useBlowDetection({ onFire: shoot, threshold: 0.12, sustainMs: 80 });
  const isListening = blowState !== "idle" && blowState !== "error";

  const toggleMic = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  // First tap: activate mic and mark as ready
  const handleFirstTap = useCallback(() => {
    setMicReady(true);
    startListening();
  }, [startListening]);

  const dartStyle: React.CSSProperties = useMemo(() => {
    const base: React.CSSProperties = {
      transform: "rotate(-90deg)",
      width: "min(105vw, 480px)",
      height: "auto",
      objectFit: "contain",
      userSelect: "none",
      pointerEvents: "none",
      transition: animState === "shooting"
        ? "transform 0.55s cubic-bezier(0.23,1,0.32,1), opacity 0.55s ease-out"
        : animState === "reloading"
        ? "none"
        : "transform 0.4s cubic-bezier(0.23,1,0.32,1), opacity 0.4s ease-out",
    };
    if (animState === "shooting") {
      return { ...base, transform: "rotate(-90deg) translateX(110vw)", opacity: 0 };
    }
    if (animState === "reloading") {
      return { ...base, transform: "rotate(-90deg) translateX(-110vw)", opacity: 0, transition: "none" };
    }
    return base;
  }, [animState]);

  return (
    /* Outer scroll container — full viewport, scrollable */
    <div style={{ minHeight: "100dvh", background: "#ffffff", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>

      {/* ── Above-fold: full-screen shoot area ─────────────────────────────── */}
      <div
        style={{
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Dart */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", overflow: "hidden" }}>
          <img src={dartImg} alt="pijltje" style={dartStyle} draggable={false} />
        </div>

        {/* Button area */}
        <div
          style={{
            paddingBottom: "max(env(safe-area-inset-bottom), 40px)",
            paddingTop: 24,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* PVC-buis knop */}
          <PvcTubeButton
            onClick={!micReady ? handleFirstTap : undefined}
            label={!micReady ? "🎯 Klik hier om te schieten" : "🎤 Blaas nu in de microfoon"}
            active={micReady}
          />
          {micReady && (
            <p style={{ margin: 0, fontSize: 13, color: "#999", fontFamily: "sans-serif" }}>
              Blaas hard in je microfoon…
            </p>
          )}

          {/* Scroll hint arrow */}
          <div
            style={{
              marginTop: 8,
              fontSize: 20,
              color: "#ccc",
              animation: "mbl-bounce 1.6s ease-in-out infinite",
              userSelect: "none",
            }}
          >
            ↓
          </div>
        </div>

        {/* "Pijltje onderweg!" toast — floats in the middle of the shoot area */}
        <div
          style={{
            position: "absolute",
            top: "38%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${showMsg ? 1 : 0.8})`,
            opacity: showMsg ? 1 : 0,
            transition: "opacity 0.25s ease-out, transform 0.25s cubic-bezier(0.23,1,0.32,1)",
            background: "rgba(0,0,0,0.75)",
            color: "#fff",
            borderRadius: 14,
            padding: "14px 28px",
            fontSize: 18,
            fontWeight: 700,
            fontFamily: "sans-serif",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 10,
            letterSpacing: 0.5,
          }}
        >
          🎯 Pijltje onderweg!
        </div>
      </div>

      {/* ── Below-fold: 5 steps ─────────────────────────────────────────────── */}
      <div
        style={{
          padding: "40px 28px 60px",
          maxWidth: 480,
          margin: "0 auto",
          fontFamily: "sans-serif",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#333", marginBottom: 24, textAlign: "center" }}>
          ❓ Hoe werkt het?
        </h2>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 20 }}>
          {STEPS.map(step => (
            <li key={step.n} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <span
                style={{
                  flexShrink: 0,
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#ff6a00",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 15,
                }}
              >
                {step.n}
              </span>
              <p style={{ margin: 0, fontSize: 15, color: "#444", lineHeight: 1.5, paddingTop: 5 }}>
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* Bounce animation keyframes */}
      <style>{`
        @keyframes mbl-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50%       { transform: translateY(6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
