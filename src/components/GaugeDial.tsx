import { useId, type ReactNode } from "react";
import { arcLength, describeArc, polar } from "../lib/svg";
import { cn } from "../utils/cn";

const CX = 160;
const CY = 160;
const R = 118;
const START = 225; // degrees — bottom-left, so the 270° sweep opens at the bottom
const SWEEP = 270;
const LEN = arcLength(R, SWEEP);

interface Props {
  /** 0..1 fraction of the dial */
  frac: number;
  minLabel: string;
  maxLabel: string;
  /** dims the instrument while data is stale */
  dimmed?: boolean;
  children?: ReactNode;
}

/** animate the dashoffset with the in-out cubic instrument easing */
const DASH_TRANSITION = "stroke-dashoffset 600ms cubic-bezier(0.65, 0, 0.35, 1)";

export function GaugeDial({ frac, minLabel, maxLabel, dimmed, children }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const clamped = Math.min(1, Math.max(0, frac));
  const path = describeArc(CX, CY, R, START, START + SWEEP);
  const offset = LEN * (1 - clamped);
  // a 0.01-length dash with a round cap renders as a glowing dot at the arc tip
  const dotOffset = 0.01 - clamped * LEN;

  const ticks = Array.from({ length: 41 }, (_, i) => {
    const deg = START + (SWEEP / 40) * i;
    const major = i % 10 === 0;
    const outer = polar(CX, CY, R + 13, deg);
    const inner = polar(CX, CY, R + (major ? 4 : 8), deg);
    return { ...outer, x2: inner.x, y2: inner.y, major, key: i };
  });

  const lo = polar(CX, CY, R + 28, START);
  const hi = polar(CX, CY, R + 28, START + SWEEP);

  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <svg viewBox="0 0 320 320" className="block w-full" aria-hidden="true">
        <defs>
          <linearGradient id={`g-${uid}`} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent-start)" />
            <stop offset="100%" stopColor="var(--accent-end)" />
          </linearGradient>
          <filter id={`b-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        {/* slowly rotating HUD reticle ring */}
        <g
          className="animate-spin-slower"
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        >
          <circle
            cx={CX}
            cy={CY}
            r={140}
            fill="none"
            stroke="var(--text-muted)"
            strokeOpacity={0.4}
            strokeWidth={1}
            strokeDasharray="1 9"
          />
        </g>

        {/* tick ring */}
        {ticks.map((t) => (
          <line
            key={t.key}
            x1={t.x}
            y1={t.y}
            x2={t.x2}
            y2={t.y2}
            stroke="var(--text-muted)"
            strokeOpacity={t.major ? 0.85 : 0.35}
            strokeWidth={t.major ? 1.5 : 1}
          />
        ))}

        {/* background track */}
        <path d={path} fill="none" stroke="var(--border-subtle)" strokeWidth={10} strokeLinecap="round" />

        {/* glow copy of the value arc */}
        <path
          d={path}
          fill="none"
          stroke={`url(#g-${uid})`}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${LEN} ${LEN}`}
          strokeDashoffset={offset}
          filter={`url(#b-${uid})`}
          opacity={dimmed ? 0.15 : 0.55}
          style={{ transition: DASH_TRANSITION }}
        />
        {/* value arc */}
        <path
          d={path}
          fill="none"
          stroke={`url(#g-${uid})`}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${LEN} ${LEN}`}
          strokeDashoffset={offset}
          opacity={dimmed ? 0.3 : 1}
          style={{ transition: DASH_TRANSITION }}
        />
        {/* glowing tip dot */}
        {!dimmed && (
          <path
            d={path}
            fill="none"
            stroke="#EAF2FF"
            strokeWidth={15}
            strokeLinecap="round"
            strokeDasharray={`0.01 ${LEN}`}
            strokeDashoffset={dotOffset}
            filter={`url(#b-${uid})`}
            opacity={0.9}
            style={{ transition: DASH_TRANSITION }}
          />
        )}

        {/* scale end labels */}
        <text x={lo.x} y={lo.y + 4} textAnchor="middle" className="fill-dim font-mono" fontSize={10}>
          {minLabel}
        </text>
        <text x={hi.x} y={hi.y + 4} textAnchor="middle" className="fill-dim font-mono" fontSize={10}>
          {maxLabel}
        </text>
      </svg>

      {/* HTML-centred readout sits over the SVG for crisp text */}
      <div className={cn("pointer-events-none absolute inset-0 flex flex-col items-center justify-center")}>
        {children}
      </div>
    </div>
  );
}
