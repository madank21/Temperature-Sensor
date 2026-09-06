import { motion } from "framer-motion";
import { haptic } from "../lib/haptics";
import { cn } from "../utils/cn";

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
}

/** Gradient track switch — not the default platform styling. 52×32 thumb travel, 44px hit area. */
export function Toggle({ checked, onChange, ariaLabel }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => {
        haptic();
        onChange(!checked);
      }}
      className="press relative flex h-11 w-[60px] items-center justify-center"
    >
      <span
        className={cn(
          "relative h-[32px] w-[52px] rounded-full border transition-colors duration-300",
          checked ? "border-transparent" : "border-border-subtle bg-white/[0.04]"
        )}
      >
        {checked && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 rounded-full"
            style={{
              background: "linear-gradient(120deg, var(--accent-start), var(--accent-end))",
              boxShadow: "0 0 16px -2px rgba(120,140,255,0.6)",
            }}
          />
        )}
        <motion.span
          className="absolute top-1/2 h-[24px] w-[24px] rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
          animate={{ x: checked ? 24 : 2, y: "-50%" }}
          transition={{ type: "tween", duration: 0.3, ease: [0.65, 0, 0.35, 1] }}
        />
      </span>
    </button>
  );
}
