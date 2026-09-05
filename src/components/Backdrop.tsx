import { useEffect, useState } from "react";

function useUtcClock(): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(now.getUTCHours())}:${p(now.getUTCMinutes())}:${p(now.getUTCSeconds())} UTC`;
}

function Corner({ className }: { className: string }) {
  return (
    <span className={`pointer-events-none absolute h-5 w-5 ${className}`}>
      <span className="absolute inset-x-0 top-1/2 h-px bg-dim/40" />
      <span className="absolute inset-y-0 left-1/2 w-px bg-dim/40" />
    </span>
  );
}


export function Backdrop() {
  const clock = useUtcClock();

  return (
    <div className="noise pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* aurora orbs */}
      <div
        className="animate-drift-a absolute -left-[15%] -top-[20%] h-[58vmax] w-[58vmax] rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, var(--orb-1), transparent 62%)` }}
      />
      <div
        className="animate-drift-b absolute -right-[20%] top-[8%] h-[52vmax] w-[52vmax] rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, var(--orb-2), transparent 62%)` }}
      />
      <div
        className="animate-drift-a absolute -bottom-[25%] left-[18%] h-[48vmax] w-[48vmax] rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, var(--orb-3), transparent 60%)` }}
      />

      {/* blueprint grid */}
      <div className="bg-grid mask-fade-center absolute inset-0" />

      {/* scan sweep */}
      <div className="animate-scan absolute inset-x-0 top-0 hidden h-[26vh] md:block">
        <div
          className="h-full w-full"
          style={{
            background:
              "linear-gradient(to bottom, transparent, rgba(140,180,255,0.05), transparent)",
          }}
        />
      </div>

      {/* slow reticle ring behind the device */}
      <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block">
        <div
          className="animate-spin-slower h-[840px] w-[840px] rounded-full border border-dashed opacity-[0.35]"
          style={{ borderColor: "var(--grid-line)" }}
        />
      </div>

      {/* HUD chrome — desktop only */}
      <div className="absolute inset-0 hidden md:block">
        <Corner className="left-6 top-6" />
        <Corner className="right-6 top-6" />
        <Corner className="bottom-6 left-6" />
        <Corner className="bottom-6 right-6" />

        <div className="absolute left-10 top-8 flex items-center gap-3">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-live shadow-[0_0_8px_2px_rgba(61,220,132,0.5)]" />
          <span className="font-mono text-[10px] tracking-[0.28em] text-sub">
            TeHum·01 // SENSOR TELEMETRY
          </span>
        </div>

        <div className="absolute right-10 top-8 text-right">
          <div className="tnum font-mono text-[10px] tracking-[0.22em] text-sub">{clock}</div>
          <div className="mt-1 font-mono text-[9px] tracking-[0.28em] text-dim">
            RTDB LINK · CH·04
          </div>
        </div>

        <div className="absolute bottom-8 left-10 font-mono text-[9.5px] leading-relaxed tracking-[0.2em] text-dim">
          <div>LAT 51.5072°N · LON 0.1276°W</div>
          <div className="mt-1">
            MODE <span className="text-sub">INDUSTRIAL IOT</span> · FW 2.3.1
          </div>
        </div>

        <div className="absolute bottom-8 right-10 flex items-center gap-3">
          <div className="relative h-9 w-9">
            <div className="absolute inset-0 rounded-full border border-border-subtle" />
            <div
              className="animate-radar absolute inset-0 rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, rgba(79,157,255,0.5), transparent 24%)",
              }}
            />
            <div className="absolute inset-[3px] rounded-full" style={{ background: "var(--bg-base)" }} />
            <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-start" />
          </div>
          <span className="font-mono text-[9.5px] tracking-[0.24em] text-dim">SWEEP·ACT</span>
        </div>

        {/* vertical edge captions */}
        <div className="absolute left-9 top-1/2 hidden -translate-y-1/2 -rotate-90 lg:block">
          <span className="font-mono text-[9px] tracking-[0.42em] text-dim">
            THERMAL LINK — ACTIVE
          </span>
        </div>
        <div className="absolute right-9 top-1/2 hidden -translate-y-1/2 rotate-90 lg:block">
          <span className="tnum font-mono text-[9px] tracking-[0.42em] text-dim">
            DHT11 · GPIO·04 · 2.2S
          </span>
        </div>
      </div>
    </div>
  );
}
