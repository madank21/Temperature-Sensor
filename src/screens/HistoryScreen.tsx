import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useMemo, useState } from "react";
import { FadeUp } from "../components/FadeUp";
import { GlassCard } from "../components/GlassCard";
import { SegmentedControl } from "../components/SegmentedControl";
import { StatusDot } from "../components/StatusDot";
import { TrendChart } from "../components/TrendChart";
import { formatTemp } from "../lib/format";
import type { Metric } from "../lib/types";
import { useApp } from "../state/app";
import { cn } from "../utils/cn";

type Range = "15M" | "1H" | "ALL";

const RANGE_MS: Record<Range, number> = {
  "15M": 15 * 60 * 1000,
  "1H": 60 * 60 * 1000,
  ALL: Infinity,
};

export default function HistoryScreen() {
  const { sensor, unit } = useApp();
  const { buffer, connection } = sensor;
  const [range, setRange] = useState<Range>("15M");
  const [metric, setMetric] = useState<Metric>("temperature");

  const filtered = useMemo(() => {
    if (range === "ALL" || buffer.length === 0) return buffer;
    const anchor = buffer[buffer.length - 1].timestamp;
    return buffer.filter((r) => r.timestamp >= anchor - RANGE_MS[range]);
  }, [buffer, range]);

  const stats = useMemo(() => {
    if (filtered.length === 0) return null;
    const vals = filtered.map((r) => (metric === "temperature" ? r.temperature : r.humidity));
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { min, max, avg };
  }, [filtered, metric]);

  const format = (v: number) =>
    metric === "temperature" ? formatTemp(v, unit) : `${v.toFixed(1)}%`;

  const statCards = stats
    ? [
        { label: `Low · ${rangeLabel(range)}`, value: format(stats.min), icon: ArrowDownRight, color: "var(--aqua-start)" },
        { label: "Average", value: format(stats.avg), icon: Minus, color: "var(--text-secondary)" },
        { label: `High · ${rangeLabel(range)}`, value: format(stats.max), icon: ArrowUpRight, color: "var(--accent-end)" },
      ]
    : [];

  function rangeLabel(r: Range): string {
    return r === "15M" ? "15M" : r === "1H" ? "1H" : "ALL";
  }

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-5 pb-32 pt-7">
      <FadeUp i={0}>
        <header className="flex items-end justify-between">
          <div>
            <span className="caption-label">Telemetry stream</span>
            <h1 className="mt-1 font-display text-[28px] font-semibold leading-none text-ink">History</h1>
          </div>
          <div className="flex items-center gap-2 pb-0.5">
            <StatusDot state={connection} />
            <span className="tnum font-mono text-[10px] tracking-[0.14em] text-dim">
              {filtered.length} SAMPLES
            </span>
          </div>
        </header>
      </FadeUp>

      <FadeUp i={1} className="mt-5">
        <div className="flex flex-col gap-2">
          <SegmentedControl
            className="w-full"
            ariaLabel="Metric"
            options={[
              { value: "temperature" as const, label: "Temperature" },
              { value: "humidity" as const, label: "Humidity" },
            ]}
            value={metric}
            onChange={setMetric}
          />
          <SegmentedControl
            className="w-full"
            ariaLabel="Time range"
            options={[
              { value: "15M" as const, label: "15 min" },
              { value: "1H" as const, label: "1 hour" },
              { value: "ALL" as const, label: "All" },
            ]}
            value={range}
            onChange={setRange}
          />
        </div>
      </FadeUp>

      <FadeUp i={2} className="mt-3">
        <GlassCard className="p-4 pt-3">
          {/* key remount → clean draw-in animation when metric/range changes */}
          <TrendChart
            key={`${metric}:${range}`}
            data={filtered}
            metric={metric}
            format={format}
            ariaLabel={
              metric === "temperature" ? "Temperature trend chart" : "Humidity trend chart"
            }
          />
        </GlassCard>
      </FadeUp>

      <FadeUp i={3} className="mt-3">
        <div className="grid grid-cols-3 gap-3">
          {statCards.map((s) => (
            <GlassCard key={s.label} className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="caption-label !text-[9.5px]">{s.label.split(" · ")[0]}</span>
                <s.icon size={13} strokeWidth={1.5} style={{ color: s.color }} />
              </div>
              <div className="tnum mt-2 font-mono text-[15px] text-ink">{s.value}</div>
              <div className="mt-1 font-mono text-[8.5px] tracking-[0.18em] text-dim">
                {s.label.includes("·") ? s.label.split(" · ")[1] : "WINDOW"}
              </div>
            </GlassCard>
          ))}
        </div>
      </FadeUp>

      <FadeUp i={4} className="mt-6">
        <p className="flex items-center justify-center gap-2 font-mono text-[9.5px] tracking-[0.2em] text-dim">
          <span className={cn("h-1 w-1 rounded-full", connection === "live" ? "bg-live" : connection === "stale" ? "bg-stale" : "bg-offline")} />
          BUFFER {buffer.length} · CADENCE 2.2S · {connection.toUpperCase()}
          <span className="animate-blink text-sub">▌</span>
        </p>
      </FadeUp>
    </div>
  );
}
