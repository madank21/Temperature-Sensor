import { motion } from "framer-motion";
import { useId } from "react";
import { haptic } from "../lib/haptics";
import { cn } from "../utils/cn";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}

/**
 * Glass segmented pill — the active segment carries the accent gradient.
 * Used for °C/°F, chart ranges and metric switching.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
  ariaLabel,
}: Props<T>) {
  // instance-unique so gradient pills never fly across screen transitions
  const id = `seg-${options.map((o) => o.value).join("-")}-${useId()}`;
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "glass inline-flex items-center rounded-full p-1",
        size === "sm" ? "gap-0.5" : "gap-1",
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              if (!active) {
                haptic();
                onChange(opt.value);
              }
            }}
            aria-pressed={active}
            className={cn(
              "press relative flex items-center justify-center rounded-full font-display font-medium",
              size === "sm" ? "min-h-[36px] px-3 text-[11px]" : "min-h-[44px] flex-1 px-4 text-[12px]",
              "tracking-[0.08em] uppercase transition-colors duration-300",
              active ? "text-white" : "text-sub hover:text-ink"
            )}
          >
            {active && (
              <motion.span
                layoutId={id}
                className="absolute inset-0 rounded-full"
                style={{
                  background: "linear-gradient(120deg, var(--accent-start), var(--accent-end))",
                  boxShadow: "0 4px 18px -4px rgba(120,140,255,0.55)",
                }}
                transition={{ type: "tween", duration: 0.35, ease: [0.65, 0, 0.35, 1] }}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
