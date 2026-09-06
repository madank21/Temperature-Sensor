import type { ConnectionState } from "../lib/types";
import { cn } from "../utils/cn";

const STATE_COLOR: Record<ConnectionState, string> = {
  connecting: "bg-stale",
  live: "bg-live",
  stale: "bg-stale",
  offline: "bg-offline",
};

interface Props {
  state: ConnectionState;
  className?: string;
}

/** Pulsing status dot — slow 1.8s pulse while live, solid static otherwise. */
export function StatusDot({ state, className }: Props) {
  const live = state === "live";
  return (
    <span
      className={cn("relative inline-flex h-2 w-2 shrink-0", className)}
      role="status"
      aria-label={`Connection ${state}`}
    >
      {live && (
        <span className={cn("absolute inset-0 rounded-full animate-halo", STATE_COLOR[state])} />
      )}
      <span
        className={cn(
          "relative h-2 w-2 rounded-full",
          STATE_COLOR[state],
          live && "animate-pulse-dot",
          state === "live" && "shadow-[0_0_10px_2px_rgba(61,220,132,0.55)]"
        )}
      />
    </span>
  );
}
