import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FirebaseSource, type SensorSource } from "../lib/engine";
import type { ConnectionState, SensorReading } from "../lib/types";

export interface SensorStream {
  latest: SensorReading | null;
  /** rolling session buffer, newest last (capped) */
  buffer: SensorReading[];
  connection: ConnectionState;
  /** seconds since the freshest reading (ticks every 1s) */
  secondsAgo: number;
  /** link quality 0–100 */
  link: number;
  retry: () => void;
  simulateDropout: () => void;
  clearBuffer: () => void;
}

const BUFFER_CAP = 240;
const STALE_AFTER_S = 20; // data older than this → "stale"
const OFFLINE_AFTER_S = 45; // nothing for this long → "offline"

/**
 * Live sensor stream. Subscribes to Firebase RTDB, maintains the rolling
 * buffer, and derives the connection state by
 * comparing lastUpdated against a 1s client-side clock.
 */
export function useSensorStream(): SensorStream {
  const [buffer, setBuffer] = useState<SensorReading[]>([]);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const sourceRef = useRef<SensorSource | null>(null);
  const forcedRef = useRef(false);
  const lastUpdatedRef = useRef<number | null>(null);

  const start = useCallback(() => {
    forcedRef.current = false;
    setConnection("connecting");
    sourceRef.current?.stop();

    const source: SensorSource = new FirebaseSource();
    sourceRef.current = source;

    setBuffer((prev) => (prev.length > 0 ? prev : source.backfill(200)));

    source.start((reading) => {
      lastUpdatedRef.current = reading.timestamp;
      setLastUpdated(reading.timestamp);
      setConnection("live");
      setBuffer((prev) => {
        const next = prev.length >= BUFFER_CAP ? prev.slice(prev.length - BUFFER_CAP + 1) : prev.slice();
        next.push(reading);
        return next;
      });
    });
  }, []);

  // mount once — cleanup stops timers so the listener can never leak
  useEffect(() => {
    start();
    return () => sourceRef.current?.stop();
  }, [start]);

  // 1s clock driving "last updated Xs ago" and stale/offline derivation.
  // Connection state is computed from a ref so the interval body stays pure.
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const lu = lastUpdatedRef.current;
      if (forcedRef.current) {
        setConnection("offline");
      } else if (lu !== null) {
        const age = (t - lu) / 1000;
        setConnection(age > OFFLINE_AFTER_S ? "offline" : age > STALE_AFTER_S ? "stale" : "live");
      } else if (t - now > OFFLINE_AFTER_S * 1000) {
        setConnection("offline");
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const simulateDropout = useCallback(() => {
    forcedRef.current = true;
    sourceRef.current?.stop();
    setConnection("offline");
  }, []);

  const clearBuffer = useCallback(() => {
    setBuffer((prev) => prev.slice(-1));
  }, []);

  const latest = buffer.length > 0 ? buffer[buffer.length - 1] : null;
  const secondsAgo = lastUpdated ? Math.max(0, (now - lastUpdated) / 1000) : 0;

  return useMemo(
    () => ({
      latest,
      buffer,
      connection,
      secondsAgo,
      link: latest?.link ?? 0,
      retry: start,
      simulateDropout,
      clearBuffer,
    }),
    [latest, buffer, connection, secondsAgo, start, simulateDropout, clearBuffer]
  );
}
