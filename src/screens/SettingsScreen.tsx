import {
  Check,
  Cpu,
  Database,
  Info,
  Moon,
  Radio,
  Sun,
  Thermometer,
  Trash2,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { FadeUp } from "../components/FadeUp";
import { GlassCard } from "../components/GlassCard";
import { SegmentedControl } from "../components/SegmentedControl";
import { Toggle } from "../components/Toggle";
import { haptic } from "../lib/haptics";
import { DEVICE } from "../lib/types";
import { useApp } from "../state/app";

function Section({ title, children, i }: { title: string; children: ReactNode; i: number }) {
  return (
    <FadeUp i={i} className="mt-6 first:mt-5">
      <span className="caption-label mb-2 block px-1">{title}</span>
      <div className="flex flex-col gap-2">{children}</div>
    </FadeUp>
  );
}

interface RowProps {
  icon: LucideIcon;
  tint: string;
  label: string;
  sub?: string;
  right?: ReactNode;
  onClick?: () => void;
}

function Row({ icon: Icon, tint, label, sub, right, onClick }: RowProps) {
  const inner = (
    <>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]"
        style={{ background: `linear-gradient(140deg, ${tint}22, ${tint}0d)` }}
      >
        <Icon size={16} strokeWidth={1.5} style={{ color: tint }} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[14px] font-medium text-ink">{label}</span>
        {sub && <span className="truncate text-[11px] text-dim">{sub}</span>}
      </span>
      {right}
    </>
  );
  return (
    <GlassCard className="px-4 py-3">
      {onClick ? (
        <button type="button" onClick={onClick} className="press flex min-h-[44px] w-full items-center gap-3 text-left">
          {inner}
        </button>
      ) : (
        <div className="flex min-h-[44px] items-center gap-3">{inner}</div>
      )}
    </GlassCard>
  );
}

export default function SettingsScreen() {
  const { unit, setUnit, theme, setTheme, sensor, setTab } = useApp();
  const [cleared, setCleared] = useState(false);

  const forceDropout = () => {
    haptic(12);
    sensor.simulateDropout();
    // let the switch register, then show the offline state on the dashboard
    setTimeout(() => setTab("home"), 250);
  };

  const clearBuffer = () => {
    haptic();
    sensor.clearBuffer();
    setCleared(true);
    setTimeout(() => setCleared(false), 1400);
  };

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-5 pb-32 pt-7">
      <FadeUp i={0}>
        <header>
          <span className="caption-label">Console configuration</span>
          <h1 className="mt-1 font-display text-[28px] font-semibold leading-none text-ink">System</h1>
        </header>
      </FadeUp>

      <Section title="Display" i={1}>
        <Row
          icon={Thermometer}
          tint="#4F9DFF"
          label="Temperature unit"
          sub="Applied across every readout"
          right={
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
          }
        />
        <Row
          icon={theme === "light" ? Sun : Moon}
          tint="#B26BFF"
          label="Interface theme"
          sub={theme === "light" ? "Daylight" : "Deep space"}
          right={
            <Toggle
              ariaLabel="Toggle light theme"
              checked={theme === "light"}
              onChange={(v) => setTheme(v ? "light" : "dark")}
            />
          }
        />
      </Section>

      <Section title="Device" i={2}>
        <Row icon={Cpu} tint="#35E7C6" label={DEVICE.id} sub={` · FW ${DEVICE.firmware}`} />
        <Row
          icon={Database}
          tint="#24B6FF"
          label="Firebase path"
          sub="firebaseio.com/tehum"
          right={<span className="tnum font-mono text-[10px] text-dim"></span>}
        />
      </Section>

      <Section title="Diagnostics" i={3}>
        <Row
          icon={Radio}
          tint="#FFC94D"
          label="Link source"
          sub="Firebase Realtime Database event stream"
          right={<span className="tnum font-mono text-[10px] text-live">RTDB</span>}
        />
        <Row
          icon={WifiOff}
          tint="#FF5C6C"
          label="Force dropout"
          sub="Sever the stream and preview the offline state"
          onClick={forceDropout}
        />
        <Row
          icon={cleared ? Check : Trash2}
          tint={cleared ? "#3DDC84" : "#9AA3C7"}
          label="Clear history buffer"
          sub={cleared ? "Buffer cleared" : `${sensor.buffer.length} samples held in memory`}
          onClick={clearBuffer}
        />
      </Section>

      <Section title="About" i={4}>
        <Row icon={Info} tint="#9AA3C7" label="TeHum telemetry console" sub="ESP32 · DHT11 · Firebase RTDB" right={<span className="tnum font-mono text-[10px] text-dim">v1.4.2</span>} />
      </Section>

      <FadeUp i={5} className="mt-8">
        <p className="text-center font-mono text-[9px] tracking-[0.34em] text-dim">
          DESIGNED FOR PRECISION
        </p>
        <p className="text-center font-mono text-[8px] tracking-[0.34em] text-dim mt-2">
          Developed by Madan
        </p>
      </FadeUp>
    </div>
  );
}
