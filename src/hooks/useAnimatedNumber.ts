import { useEffect, useRef, useState } from "react";

/** Easing.inOut(cubic) — instrument calibration feel, no bounce. */
function easeInOutCubic(p: number): number {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

/**
 * Interpolated counting: whenever `target` changes, the returned value
 * sweeps from the previously displayed value to the new one over
 * `duration` ms instead of snapping. Returns null while no reading exists.
 */
export function useAnimatedNumber(target: number | null, duration = 650): number | null {
  const [display, setDisplay] = useState<number | null>(target);
  const fromRef = useRef<number | null>(target);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (target === null) {
      fromRef.current = null;
      setDisplay(null);
      return;
    }
    const from = fromRef.current;
    if (from === null || from === target) {
      fromRef.current = target;
      setDisplay(target);
      return;
    }
    const started = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - started) / duration);
      const v = from + (target - from) * easeInOutCubic(p);
      setDisplay(v);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
      }
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}
