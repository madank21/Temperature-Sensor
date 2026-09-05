import { motion, useAnimationControls } from "framer-motion";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { formatRel } from "../lib/format";
import { smoothArea, smoothLine, type Pt } from "../lib/svg";
import type { Metric, SensorReading } from "../lib/types";

const MAX_PTS = 96;

interface Props {
  data: SensorReading[];
  metric: Metric;
  /** formats a raw metric value for labels/tooltips */
  format: (v: number) => string;
  ariaLabel: string;
}

/**
 * Live area chart. New readings append at the right edge and the whole
 * trace slides left by one slot (600ms in-out cubic) instead of redrawing
 * from scratch — the window commit happens after the slide completes.
 */
export function TrendChart({ data, metric, format, ariaLabel }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const controls = useAnimationControls();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const windowOf = (arr: SensorReading[]) => arr.slice(-MAX_PTS);
  const [shown, setShown] = useState<SensorReading[]>(() => windowOf(data));
  const [slide, setSlide] = useState<SensorReading[] | null>(null);
  const shownRef = useRef(shown);
  shownRef.current = shown;
  const sigRef = useRef(shown.length ? shown[shown.length - 1].timestamp : 0);

  const pick = (r: SensorReading) => (metric === "temperature" ? r.temperature : r.humidity);
  const sig = data.length ? data[data.length - 1].timestamp : 0;

  useEffect(() => {
    if (sig === sigRef.current) return;
    sigRef.current = sig;
    const next = windowOf(data);
    const prev = shownRef.current;
    // window advanced by exactly one reading (append right, drop left) →
    // animate the left shift; growing windows simply extend the trace
    const shiftedByOne =
      prev.length >= 8 && next.length === prev.length && next[0]?.timestamp === prev[1]?.timestamp;
    if (shiftedByOne) {
      const combined = [...prev, next[next.length - 1]];
      setSlide(combined);
      controls
        .start({
          x: `-${100 / prev.length}%`,
          transition: { duration: 0.6, ease: [0.65, 0, 0.35, 1] },
        })
        .then(() => {
          setShown(next);
          setSlide(null);
        });
    } else {
      setShown(next);
    }
  }, [sig, data, controls]);

  // after the window commits (slide → null), reset the strip transform in
  // the same frame as the width change so the swap can never flicker
  useLayoutEffect(() => {
    if (!slide) controls.set({ x: "0%" });
  }, [slide, shown, controls]);

  const pts = slide ?? shown;
  const len = pts.length;

  const [lo, hi] = useMemo(() => {
    if (len === 0) return [0, 1];
    let mn = Infinity;
    let mx = -Infinity;
    for (const p of pts) {
      const v = pick(p);
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    const span = Math.max(1.5, mx - mn);
    // quantised domain so the chart doesn't jitter between frames
    return [Math.floor((mn - span * 0.25) * 2) / 2, Math.ceil((mx + span * 0.25) * 2) / 2];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pts, metric]);

  if (len < 2) {
    return (
      <div className="flex h-[220px] items-center justify-center">
        <span className="animate-shimmer font-mono text-[11px] tracking-[0.2em] text-dim">
          AWAITING TELEMETRY
        </span>
      </div>
    );
  }

  const slots = len - 1;
  // during a slide the inner strip holds one extra slot so spacing stays constant
  const innerWidthPct = slide ? (100 * (len - 1)) / (len - 2) : 100;

  const yPct = (v: number) => 6 + (1 - (v - lo) / (hi - lo)) * 86;
  const linePts: Pt[] = pts.map((p, i) => ({ x: i, y: yPct(pick(p)) }));
  const line = smoothLine(linePts);
  const area = smoothArea(linePts, 108);

  const theme = metric === "temperature"
    ? { from: "var(--accent-start)", to: "var(--accent-end)" }
    : { from: "var(--aqua-start)", to: "var(--aqua-end)" };

  const newest = shown[shown.length - 1]?.timestamp ?? Date.now();
  const axisIdx = [0, Math.floor(shown.length / 2), shown.length - 1];
  const gridRows = [0.25, 0.5, 0.75].map((f) => ({
    top: `${f * 100}%`,
    label: format(hi - ((f * 100 - 6) / 86) * (hi - lo)),
  }));

  const onPointer = (e: React.PointerEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const raw = ((e.clientX - rect.left) / rect.width) * (shown.length - 1);
    setHover(Math.max(0, Math.min(shown.length - 1, Math.round(raw))));
  };

  const hoverPct = hover !== null ? (hover / (shown.length - 1)) * 100 : 0;

  return (
    <div role="img" aria-label={ariaLabel}>
      <div
        ref={containerRef}
        className="relative h-[220px] cursor-crosshair touch-pan-y select-none overflow-hidden"
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onPointerLeave={() => setHover(null)}
      >
        {/* horizontal gridlines + value labels */}
        {gridRows.map((g, i) => (
          <div key={i} className="pointer-events-none absolute inset-x-0" style={{ top: g.top }}>
            <div className="h-px w-full" style={{ background: "var(--grid-line)" }} />
            <span className="absolute right-0 top-[-7px] font-mono text-[9px] text-dim">{g.label}</span>
          </div>
        ))}

        {/* sliding trace strip */}
        <motion.div
          className="absolute inset-y-0 left-0"
          style={{ width: `${innerWidthPct}%` }}
          animate={controls}
          initial={false}
        >
          <svg
            viewBox={`0 0 ${slots} 100`}
            preserveAspectRatio="none"
            className="h-full w-full"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={`tl-${uid}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor={theme.from} />
                <stop offset="1" stopColor={theme.to} />
              </linearGradient>
              <linearGradient id={`ta-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={theme.from} stopOpacity={0.28} />
                <stop offset="0.75" stopColor={theme.from} stopOpacity={0.02} />
                <stop offset="1" stopColor={theme.from} stopOpacity={0} />
              </linearGradient>
            </defs>
            <motion.path
              d={area}
              fill={`url(#ta-${uid})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
            />
            <motion.path
              d={line}
              fill="none"
              stroke={`url(#tl-${uid})`}
              strokeWidth={5}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              style={{ filter: "blur(4px)" }}
              initial={{ pathLength: 0, opacity: 0.6 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{ duration: 1, ease: [0.215, 0.61, 0.355, 1] }}
            />
            <motion.path
              d={line}
              fill="none"
              stroke={`url(#tl-${uid})`}
              strokeWidth={2}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: [0.215, 0.61, 0.355, 1] }}
            />
          </svg>
        </motion.div>

        {/* live end point */}
        {hover === null && !slide && (
          <div
            className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: "100%",
              top: `${yPct(pick(shown[shown.length - 1]))}%`,
              background: theme.to,
              boxShadow: `0 0 12px 2px ${theme.to}`,
              marginLeft: "-3px",
            }}
          />
        )}

        {/* crosshair */}
        {hover !== null && !slide && (
          <>
            <div
              className="pointer-events-none absolute inset-y-0 w-px"
              style={{ left: `${hoverPct}%`, background: "var(--border-glow)" }}
            />
            <div
              className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
              style={{
                left: `${hoverPct}%`,
                top: `${yPct(pick(shown[hover]))}%`,
                borderColor: theme.to,
                background: "var(--bg-base)",
                boxShadow: `0 0 10px 1px ${theme.to}`,
              }}
            />
            <div
              className="glass pointer-events-none absolute top-2 -translate-x-1/2 rounded-full px-2.5 py-1"
              style={{ left: `${Math.max(16, Math.min(84, hoverPct))}%` }}
            >
              <span className="tnum whitespace-nowrap font-mono text-[10px] text-ink">
                {format(pick(shown[hover]))}
                <span className="ml-2 text-dim">{formatRel(shown[hover].timestamp, newest)}</span>
              </span>
            </div>
          </>
        )}
      </div>

      {/* time axis */}
      <div className="mt-2 flex items-center justify-between font-mono text-[9.5px] tracking-[0.08em] text-dim">
        {axisIdx.map((i, k) => (
          <span key={k} className="tnum">
            {formatRel(shown[i].timestamp, newest)}
          </span>
        ))}
      </div>
    </div>
  );
}
