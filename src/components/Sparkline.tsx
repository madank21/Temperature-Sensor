import { motion } from "framer-motion";
import { useId } from "react";
import { smoothArea, smoothLine, type Pt } from "../lib/svg";

interface Props {
  values: number[];
  hue?: "accent" | "aqua";
  className?: string;
}

const W = 300;
const H = 96;
const PAD_Y = 14;

/** Glowing mini trend line — last N readings, no axes, draw-in on mount. */
export function Sparkline({ values, hue = "accent", className }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  if (values.length < 2) return <div className={className} />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(0.4, max - min);
  const pts: Pt[] = values.map((v, i) => ({
    x: (i / (values.length - 1)) * W,
    y: H - PAD_Y - ((v - min) / span) * (H - PAD_Y * 2),
  }));

  const line = smoothLine(pts);
  const area = smoothArea(pts, H);
  const from = hue === "accent" ? "var(--accent-start)" : "var(--aqua-start)";
  const to = hue === "accent" ? "var(--accent-end)" : "var(--aqua-end)";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`sl-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
        <linearGradient id={`sa-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={from} stopOpacity={0.22} />
          <stop offset="1" stopColor={from} stopOpacity={0} />
        </linearGradient>
      </defs>

      <motion.path
        d={area}
        fill={`url(#sa-${uid})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.35 }}
      />
      {/* blurred glow copy */}
      <motion.path
        d={line}
        fill="none"
        stroke={`url(#sl-${uid})`}
        strokeWidth={5}
        strokeLinecap="round"
        style={{ filter: "blur(5px)" }}
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0, opacity: 0.7 }}
        animate={{ pathLength: 1, opacity: 0.7 }}
        transition={{ duration: 1.1, ease: [0.215, 0.61, 0.355, 1] }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke={`url(#sl-${uid})`}
        strokeWidth={2}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: [0.215, 0.61, 0.355, 1] }}
      />
    </svg>
  );
}
