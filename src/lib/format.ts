import type { Unit } from "./types";

/** Convert °C to the active display unit. */
export function convertTemp(celsius: number, unit: Unit): number {
  return unit === "C" ? celsius : (celsius * 9) / 5 + 32;
}

export function formatTemp(celsius: number, unit: Unit, digits = 1): string {
  return `${convertTemp(celsius, unit).toFixed(digits)}°`;
}

/** "4S AGO" / "2M AGO" / "1H AGO" — caption-friendly relative time. */
export function formatAgo(seconds: number): string {
  if (seconds < 5) return "JUST NOW";
  if (seconds < 60) return `${Math.floor(seconds)}S AGO`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}M AGO`;
  return `${Math.floor(seconds / 3600)}H AGO`;
}

/** "14:03:22" mono clock from epoch ms. */
export function formatClock(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Relative short label for chart axis: "-09:30" or "NOW". */
export function formatRel(ts: number, newest: number): string {
  const diff = Math.max(0, newest - ts);
  if (diff < 4000) return "NOW";
  const s = Math.round(diff / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `-${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/** Approximate dew point (°C) — Magnus approximation. */
export function dewPoint(tempC: number, humidity: number): number {
  const a = 17.62;
  const b = 243.12;
  const gamma = Math.log(humidity / 100) + (a * tempC) / (b + tempC);
  return (b * gamma) / (a - gamma);
}
