import { useState, useCallback, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useBlowDetection } from "@/hooks/useBlowDetection";
import { nanoid } from "nanoid";

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

type AnimState = "idle" | "shooting" | "reloading";

export default function MobileBlaas() {
  const [animState, setAnimState] = useState<AnimState>("idle");
  const [variant, setVariant] = useState<0 | 1 | 2>(() => (Math.floor(Math.random() * 3)) as 0 | 1 | 2);
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

    // Animate: dart shoots upward out of screen
    setAnimState("shooting");
    playWhoosh();

    fireDartMutation.mutate({
      sponsorId: (sponsor as { id: number } | null)?.id ?? undefined,
      sessionId: SESSION_ID,
      quoteText: quoteDart?.text ?? undefined,
      quoteAuthor: quoteDart?.author ?? undefined,
      dartVariant: variant,
      trajectoryData: { startX: 50, startY: 80, angle: -90, speed: 0.5 + power * 0.2, spin: 0 },
    });

    // After shoot animation, reload new dart from bottom
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

  // Dart CSS: rotated 90° (pointing up), animated on shoot
  const dartStyle: React.CSSProperties = useMemo(() => {
    const base: React.CSSProperties = {
      // Dart image points RIGHT by default → rotate -90° so it points UP
      transform: "rotate(-90deg)",
      width: "min(70vw, 320px)",
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
      return {
        ...base,
        transform: "rotate(-90deg) translateX(110vw)",
        opacity: 0,
      };
    }
    if (animState === "reloading") {
      return {
        ...base,
        transform: "rotate(-90deg) translateX(-110vw)",
        opacity: 0,
        transition: "none",
      };
    }
    return base;
  }, [animState]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        touchAction: "none",
      }}
    >
      {/* Dart — fills most of the screen, pointing upward */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          overflow: "hidden",
        }}
      >
        <img
          src={dartImg}
          alt="pijltje"
          style={dartStyle}
          draggable={false}
        />
      </div>

      {/* Single "Blaas nu!" button */}
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
        <button
          onClick={() => {
            toggleMic();
            // Also fire immediately on tap (for devices that don't support mic)
            if (!isListening) {
              setTimeout(() => shoot(0.6), 80);
            }
          }}
          style={{
            background: isListening ? "#e05a00" : "#ff6a00",
            color: "#fff",
            border: "none",
            borderRadius: 16,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 1,
            padding: "18px 56px",
            cursor: "pointer",
            boxShadow: "0 4px 24px rgba(255,106,0,0.35)",
            transform: "scale(1)",
            transition: "transform 0.15s ease-out, background 0.2s",
            WebkitTapHighlightColor: "transparent",
            userSelect: "none",
          }}
          onPointerDown={e => (e.currentTarget.style.transform = "scale(0.96)")}
          onPointerUp={e => (e.currentTarget.style.transform = "scale(1)")}
          onPointerLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        >
          {isListening ? "🎤 Blaas!" : "🎯 Blaas nu!"}
        </button>
        {isListening && (
          <p style={{ margin: 0, fontSize: 13, color: "#999", fontFamily: "sans-serif" }}>
            Blaas hard in je microfoon…
          </p>
        )}
      </div>
    </div>
  );
}
