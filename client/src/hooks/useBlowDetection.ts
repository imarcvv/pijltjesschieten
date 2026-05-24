import { useRef, useState, useCallback, useEffect } from "react";

export type BlowState = "idle" | "requesting" | "ready" | "blowing" | "fired" | "error";

interface UseBlowDetectionOptions {
  /** RMS threshold 0-1 to trigger a shot. Default 0.28 (requires deliberate blow) */
  threshold?: number;
  /** How long (ms) the blow must sustain before firing. Default 120ms */
  sustainMs?: number;
  /** Cooldown after firing (ms). Default 1500ms */
  cooldownMs?: number;
  onFire?: (power: number) => void;
  onLevelChange?: (level: number) => void;
}

export function useBlowDetection({
  threshold = 0.28,
  sustainMs = 120,
  cooldownMs = 1500,
  onFire,
  onLevelChange,
}: UseBlowDetectionOptions = {}) {
  const [state, setState] = useState<BlowState>("idle");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const blowStartRef = useRef<number | null>(null);
  const cooldownRef = useRef(false);
  const firedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stop();
    };
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    blowStartRef.current = null;
    firedRef.current = false;
    if (mountedRef.current) {
      setState("idle");
      setLevel(0);
    }
  }, []);

  const start = useCallback(async () => {
    if (state === "requesting" || state === "ready" || state === "blowing") return;
    setState("requesting");
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }

      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      setState("ready");
      firedRef.current = false;
      cooldownRef.current = false;

      const dataArray = new Float32Array(analyser.fftSize);

      const tick = () => {
        if (!mountedRef.current || !analyserRef.current) return;

        analyserRef.current.getFloatTimeDomainData(dataArray);

        // Calculate RMS (root mean square) — measures breath energy
        let sumSq = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sumSq += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sumSq / dataArray.length);
        const normalized = Math.min(1, rms * 5); // scale for display

        if (mountedRef.current) {
          setLevel(normalized);
          onLevelChange?.(normalized);
        }

        if (!cooldownRef.current && !firedRef.current) {
          if (rms >= threshold) {
            // Blow detected — start sustain timer
            if (blowStartRef.current === null) {
              blowStartRef.current = performance.now();
              if (mountedRef.current) setState("blowing");
            } else if (performance.now() - blowStartRef.current >= sustainMs) {
              // Sustained blow — FIRE!
              firedRef.current = true;
              cooldownRef.current = true;
              blowStartRef.current = null;
              if (mountedRef.current) setState("fired");
              onFire?.(normalized);

              setTimeout(() => {
                cooldownRef.current = false;
                firedRef.current = false;
                if (mountedRef.current) setState("ready");
              }, cooldownMs);
            }
          } else {
            // Blow dropped below threshold — reset sustain
            blowStartRef.current = null;
            if (mountedRef.current) setState(prev => prev === "blowing" ? "ready" : prev);
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch (err: any) {
      console.error("[BlowDetection] Error:", err);
      const msg = err?.name === "NotAllowedError"
        ? "Microfoon toegang geweigerd. Sta toegang toe in je browser."
        : "Microfoon niet beschikbaar.";
      setError(msg);
      setState("error");
    }
  }, [state, threshold, sustainMs, cooldownMs, onFire, onLevelChange]);

  return { state, level, error, start, stop };
}
