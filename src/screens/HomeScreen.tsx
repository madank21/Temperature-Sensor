import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Droplets, RotateCw, Settings, Thermometer, Wifi, WifiOff } from "lucide-react";
import { useMemo } from "react";
import { FadeUp } from "../components/FadeUp";
import { GaugeDial } from "../components/GaugeDial";
import { GlassCard } from "../components/GlassCard";
import { SegmentedControl } from "../components/SegmentedControl";
import { Sparkline } from "../components/Sparkline";
import { StatusDot } from "../components/StatusDot";
import { useAnimatedNumber } from "../hooks/useAnimatedNumber";
import { convertTemp, dewPoint, formatAgo, formatTemp } from "../lib/format";
import { haptic } from "../lib/haptics";
import { DEVICE, type ConnectionState } from "../lib/types";
import { useApp } from "../state/app";
import { cn } from "../utils/cn";

const HEADER_LABEL: Record<ConnectionState, string> = {
  connecting: "ESTABLISHING LINK",
  live: "SENSOR ONLINE",
  stale: "SIGNAL STALE",
  offline: "SENSOR OFFLINE",
};

const HEADER_COLOR: Record<ConnectionState, string> = {
  connecting: "text-stale",
  live: "text-live",
  stale: "text-stale",
  offline: "text-offline",
};

export default function HomeScreen() {
  const { unit, setUnit, setTab, sensor } = useApp();
  const { latest, buffer, connection, secondsAgo, link, retry } = sensor;

  const tempC = latest?.temperature ?? null;
  const animatedT = useAnimatedNumber(tempC);
  const animatedH = useAnimatedNumber(latest?.humidity ?? null);

  const offline = connection === "offline";
  const stale = connection === "stale";
  const frac = tempC === null ? 0 : Math.min(1, Math.max(0, tempC / 50));

  const { lo, hi, spark, delta } = useMemo(() => {
    if (buffer.length === 0) return { lo: null as number | null, hi: null as number | null, spark: [] as number[], delta: 0 };
    const temps = buffer.map((b) => b.temperature);
    const last15 = temps.slice(-15);
    return {
      lo: Math.min(...temps),
      hi: Math.max(...temps),
      spark: last15,
      delta: last15.length > 1 ? last15[last15.length - 1] - last15[0] : 0,
    };
  }, [buffer]);

  const displayT = animatedT === null ? null : convertTemp(animatedT, unit);
  const degLabel = unit === "C" ? "Celsius" : "Fahrenheit";

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-5 pb-32 pt-7">
      {/* ——— header ——— */}
      <FadeUp i={0}>
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <StatusDot state={connection} />
            <span className={cn("text-[11px] font-medium uppercase tracking-[0.16em]", HEADER_COLOR[connection])}>
              {HEADER_LABEL[connection]}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Refresh sensor link"
              onClick={() => {
                haptic();
                retry();
              }}
              className="press flex h-11 w-11 items-center justify-center rounded-full text-sub transition-colors hover:text-ink"
            >
              <RotateCw size={17} strokeWidth={1.5} className={connection === "connecting" ? "animate-spin" : undefined} />
            </button>
            <button
              type="button"
              aria-label="Open settings"
              onClick={() => {
                haptic();
                setTab("settings");
              }}
              className="press flex h-11 w-11 items-center justify-center rounded-full text-sub transition-colors hover:text-ink"
            >
              <Settings size={18} strokeWidth={1.5} />
            </button>
          </div>
        </header>
      </FadeUp>

      {/* ——— hero gauge card ——— */}
      <FadeUp i={1} className="mt-4">
        <GlassCard
          glow={connection === "live"}
          className="overflow-hidden px-5 pb-5 pt-6"
        >
          <AnimatePresence mode="wait" initial={false}>
              {offline ? (
                <motion.div
                  key="offline"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: [0.215, 0.61, 0.355, 1] }}
                  className="flex h-[336px] flex-col items-center justify-center"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-border-subtle">
                    <WifiOff size={26} strokeWidth={1.5} className="text-dim" />
                  </div>
                  <h2 className="mt-5 font-display text-[20px] font-medium text-ink">Sensor Offline</h2>
                  {tempC !== null && (
                    <p className="tnum mt-2 font-mono text-[12px] text-dim">
                      LAST KNOWN {formatTemp(tempC, unit)} · {formatAgo(secondsAgo)}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      haptic(12);
                      retry();
                    }}
                    className="press mt-6 flex min-h-[44px] items-center gap-2 rounded-full px-6 font-display text-[12px] font-medium uppercase tracking-[0.12em] text-white"
                    style={{
                      background: "linear-gradient(120deg, var(--accent-start), var(--accent-end))",
                      boxShadow: "0 8px 24px -6px rgba(120,140,255,0.6)",
                    }}
                  >
                    <RotateCw size={14} strokeWidth={2} />
                    Retry link
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="online"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: [0.215, 0.61, 0.355, 1] }}
                  role="img"
                  aria-label={
                    displayT !== null
                      ? `Temperature ${displayT.toFixed(1)} degrees ${degLabel}`
                      : "Waiting for first temperature reading"
                  }
                >
                  <GaugeDial
                    frac={frac}
                    dimmed={stale || connection === "connecting"}
                    minLabel={unit === "C" ? "0°" : "32°"}
                    maxLabel={unit === "C" ? "50°" : "122°"}
                  >
                    {displayT === null ? (
                      <span className="animate-shimmer font-mono text-[13px] tracking-[0.2em] text-dim">
                        SYNCING…
                      </span>
                    ) : (
                      <>
                        <Thermometer size={15} strokeWidth={1.5} className="mb-2 text-dim" />
                        <div className="flex items-start">
                          <span className="text-gradient-accent tnum font-display text-[60px] font-bold leading-[0.95] tracking-tight">
                            {displayT.toFixed(1)}
                          </span>
                          <span className="ml-1 mt-1.5 font-display text-[18px] font-medium text-sub">
                            °{unit}
                          </span>
                        </div>
                        <div className="pointer-events-auto mt-3">
                          <SegmentedControl
                            size="sm"
                            ariaLabel="Temperature unit"
                            options={[
                              { value: "C" as const, label: "°C" },
                              { value: "F" as const, label: "°F" },
                            ]}
                            value={unit}
                            onChange={setUnit}
                          />
                        </div>
                      </>
                    )}
                  </GaugeDial>

                  <div className="mt-2 flex items-center justify-between">
                    <span className={cn("caption-label", stale && "text-stale")}>
                      {connection === "connecting" ? "ESTABLISHING LINK…" : `UPDATED ${formatAgo(secondsAgo)}`}
                    </span>
                    <span className="tnum font-mono text-[10px] text-dim">
                      {lo !== null && hi !== null
                        ? `LO ${formatTemp(lo, unit)} · HI ${formatTemp(hi, unit)}`
                        : "LO -- · HI --"}
                    </span>
                  </div>
                </motion.div>
              )}
          </AnimatePresence>
        </GlassCard>
      </FadeUp>

      {/* ——— secondary metrics ——— */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <FadeUp i={2} className="h-full">
          <GlassCard
            className="h-full p-4"
          >
            <div className="caption-label mb-3">Relative humidity</div>
            <div
              className="flex items-center justify-between"
              aria-label={latest ? `Humidity ${latest.humidity.toFixed(1)} percent` : "Humidity pending"}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-[10px]"
                style={{ background: "linear-gradient(140deg, rgba(53,231,198,0.16), rgba(36,182,255,0.1))" }}
              >
                <Droplets size={15} strokeWidth={1.5} style={{ color: "var(--aqua-start)" }} />
              </span>
              <span className="tnum font-display text-[24px] font-semibold leading-none text-ink">
                {animatedH === null ? "--" : animatedH.toFixed(1)}
                <span className="ml-0.5 text-[12px] font-medium text-sub">%</span>
              </span>
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full" style={{ background: "var(--border-subtle)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${latest ? Math.min(100, latest.humidity) : 0}%`,
                  background: "linear-gradient(90deg, var(--aqua-start), var(--aqua-end))",
                  transition: "width 600ms cubic-bezier(0.65, 0, 0.35, 1)",
                }}
              />
            </div>
            <div className="mt-3 flex items-end justify-between">
              <span className="caption-label">Current level</span>
              <span className="tnum font-mono text-[9.5px] text-dim">
                {latest && tempC !== null ? `DEW ${formatTemp(dewPoint(tempC, latest.humidity), unit)}` : "DEW --"}
              </span>
            </div>
          </GlassCard>
        </FadeUp>

        <FadeUp i={3} className="h-full">
          <GlassCard className="flex h-full flex-col p-4">
            <div className="flex items-center justify-between">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-[10px]"
                style={{ background: "linear-gradient(140deg, rgba(79,157,255,0.16), rgba(178,107,255,0.1))" }}
              >
                <Wifi size={15} strokeWidth={1.5} style={{ color: "var(--accent-start)" }} />
              </span>
              {/* link quality bars */}
              <span className="flex items-end gap-[3px]" aria-label={`Link quality ${link} percent`}>
                {[6, 9, 12, 15].map((h, i) => (
                  <span
                    key={h}
                    className="w-[3px] rounded-full transition-colors duration-500"
                    style={{
                      height: h,
                      background:
                        link >= (i + 1) * 25 - 12
                          ? "linear-gradient(to top, var(--accent-start), var(--accent-end))"
                          : "var(--border-subtle)",
                    }}
                  />
                ))}
              </span>
            </div>
            <div className="mt-3">
              <div className="tnum truncate font-mono text-[11px] text-sub">7k:jj:hh:yy:zz:oo</div>
              <div className="tnum mt-1 font-mono text-[9.5px] text-dim">
                · FW {DEVICE.firmware}
              </div>
            </div>
            <div className="mt-auto flex items-end justify-between pt-3">
              <span className="caption-label">Device link</span>
              <span className="tnum font-mono text-[9.5px] text-dim">{link}%</span>
            </div>
          </GlassCard>
        </FadeUp>
      </div>

      {/* ——— trend preview ——— */}
      <FadeUp i={4} className="mt-3">
        <button
          type="button"
          onClick={() => {
            haptic();
            setTab("history");
          }}
          className="press block w-full text-left"
          aria-label="Open full temperature trend"
        >
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="caption-label">Trend — last 15 readings</span>
              </div>
              <ChevronRight size={15} strokeWidth={1.5} className="text-dim" />
            </div>
            <Sparkline values={spark} hue="accent" className="mt-2 h-[64px] w-full" />
            <div className="mt-1 flex items-center justify-between font-mono text-[9.5px] text-dim">
              <span className="tnum">
                Δ {delta >= 0 ? "+" : "−"}
                {(unit === "C" ? Math.abs(delta) : (Math.abs(delta) * 9) / 5).toFixed(1)}° / WINDOW
              </span>
              <span className="tracking-[0.16em]">OPEN HISTORY</span>
            </div>
          </GlassCard>
        </button>
      </FadeUp>
    </div>
  );
}
