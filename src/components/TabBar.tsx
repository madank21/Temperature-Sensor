import { Gauge, Settings, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { haptic } from "../lib/haptics";
import type { Tab } from "../lib/types";
import { useApp } from "../state/app";
import { cn } from "../utils/cn";

const TABS: { id: Tab; label: string; icon: typeof Gauge }[] = [
  { id: "home", label: "Live", icon: Gauge },
  { id: "history", label: "Trend", icon: TrendingUp },
  { id: "settings", label: "System", icon: Settings },
];

/** Floating glass dock — active tab carries the gradient pill. */
export function TabBar() {
  const { tab, setTab, sensor } = useApp();
  const degraded = sensor.connection === "stale" || sensor.connection === "offline";

  return (
    <nav
      aria-label="Primary"
      className="absolute inset-x-4 bottom-4 z-30"
    >
      <div className="glass flex items-stretch gap-1 rounded-full p-1.5 shadow-[0_16px_48px_-16px_rgba(0,0,0,0.8)]">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => {
                if (!active) {
                  haptic();
                  setTab(id);
                }
              }}
              className={cn(
                "press relative flex min-h-[48px] flex-1 flex-col items-center justify-center gap-[3px] rounded-full",
                "transition-colors duration-300",
                active ? "text-white" : "text-sub hover:text-ink"
              )}
            >
              {active && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "linear-gradient(120deg, var(--accent-start), var(--accent-end))",
                    boxShadow: "0 6px 22px -6px rgba(120,140,255,0.65)",
                  }}
                  transition={{ type: "tween", duration: 0.4, ease: [0.65, 0, 0.35, 1] }}
                />
              )}
              <span className="relative z-10 flex items-center">
                <Icon size={19} strokeWidth={1.5} />
                {id === "home" && degraded && (
                  <span
                    className={cn(
                      "absolute -right-1.5 -top-1 h-[7px] w-[7px] rounded-full border border-bg-base",
                      sensor.connection === "stale" ? "bg-stale" : "bg-offline"
                    )}
                  />
                )}
              </span>
              <span className="relative z-10 text-[9px] font-medium uppercase tracking-[0.18em]">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
