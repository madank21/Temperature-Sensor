import type { SensorReading } from "./types";

/** Boundary between the UI and the Firebase Realtime Database stream. */

export interface SensorSource {
  /** begin streaming; readings arrive via the callback */
  start(onReading: (r: SensorReading) => void): void;
  /** stop streaming and release timers */
  stop(): void;
  /** readings available before the live stream starts */
  backfill(count?: number): SensorReading[];
}

const FIREBASE_HOST = import.meta.env.FIREBASE_HOST?.trim();
const FIREBASE_AUTH = import.meta.env.FIREBASE_AUTH?.trim();
const FIREBASE_PATH = (import.meta.env.FIREBASE_PATH || "/sensor").trim();

function streamUrl(): string {
  if (!FIREBASE_HOST || !FIREBASE_AUTH) {
    throw new Error("FIREBASE_HOST and FIREBASE_AUTH are required");
  }
  const host = /^https?:\/\//i.test(FIREBASE_HOST) ? FIREBASE_HOST : `https://${FIREBASE_HOST}`;
  const path = FIREBASE_PATH.replace(/^\/+|\/+$/g, "");
  return `${host.replace(/\/$/, "")}/${path}.json?auth=${encodeURIComponent(FIREBASE_AUTH)}`;
}

function asNumber(value: unknown, fallback: number): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toReading(value: unknown, previous: SensorReading | null): SensorReading | null {
  if (typeof value === "number" || typeof value === "string") {
    return {
      temperature: asNumber(value, previous?.temperature ?? 0),
      humidity: previous?.humidity ?? 0,
      timestamp: Date.now(),
      link: previous?.link ?? 100,
    };
  }
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const temperature = data.temperature ?? data.temp ?? data.temperatureC;
  if (temperature && typeof temperature === "object") {
    return toReading(temperature, previous);
  }
  if (temperature === undefined) return null;
  const rawTimestamp = data.timestamp ?? data.updatedAt ?? data.time;
  const timestamp = asNumber(rawTimestamp, Date.now());
  return {
    temperature: asNumber(temperature, previous?.temperature ?? 0),
    humidity: asNumber(data.humidity ?? data.hum, previous?.humidity ?? 0),
    timestamp: timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp,
    link: Math.min(100, Math.max(0, asNumber(data.link ?? data.rssi, previous?.link ?? 100))),
  };
}

function applyEvent(current: unknown, path: string, data: unknown): unknown {
  if (path === "/") return data;
  const segments = path.split("/").filter(Boolean);
  const root = current && typeof current === "object" ? { ...(current as Record<string, unknown>) } : {};
  let target = root;
  segments.slice(0, -1).forEach((segment) => {
    const child = target[segment];
    target[segment] = child && typeof child === "object" ? { ...(child as Record<string, unknown>) } : {};
    target = target[segment] as Record<string, unknown>;
  });
  if (segments.length > 0) target[segments[segments.length - 1]] = data;
  return root;
}

export class FirebaseSource implements SensorSource {
  private controller: AbortController | null = null;

  start(onReading: (reading: SensorReading) => void): void {
    this.stop();
    this.controller = new AbortController();
    void this.connect(onReading, this.controller.signal);
  }

  stop(): void {
    this.controller?.abort();
    this.controller = null;
  }

  backfill(): SensorReading[] {
    return [];
  }

  private async connect(onReading: (reading: SensorReading) => void, signal: AbortSignal): Promise<void> {
    try {
      const response = await fetch(streamUrl(), {
        headers: { Accept: "text/event-stream" },
        cache: "no-store",
        signal,
      });
      if (!response.ok || !response.body) throw new Error(`Firebase stream failed (${response.status})`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let current: unknown = null;
      let previous: SensorReading | null = null;
      while (!signal.aborted) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          const eventData = event.match(/^data: (.+)$/m)?.[1];
          if (!eventData) continue;
          const payload = JSON.parse(eventData) as { path?: string; data?: unknown };
          if (payload.data === null) continue;
          current = applyEvent(current, payload.path ?? "/", payload.data);
          const reading = toReading(current, previous);
          if (reading) {
            previous = reading;
            onReading(reading);
          }
        }
      }
    } catch (error) {
      if (!signal.aborted) console.error("Firebase RTDB stream disconnected", error);
    }
  }
}
