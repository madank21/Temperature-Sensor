/** Core domain types for the telemetry console. */

export interface SensorReading {
  /** temperature in °C */
  temperature: number;
  /** relative humidity in % */
  humidity: number;
  /** epoch ms */
  timestamp: number;
  /** link quality estimate 0–100 */
  link: number;
}

export type ConnectionState = "connecting" | "live" | "stale" | "offline";

export type Unit = "C" | "F";
export type Theme = "dark" | "light";
export type Tab = "home" | "history" | "settings";
export type Metric = "temperature" | "humidity";

export const DEVICE = {
  id: "TeHum·01",
  mac: "7C:9E:BD:3A:41:F2",
  firmware: "v2.3.1",
  path: "/sensor/temperature",
  host: "nova-telemetry-default-rtdb.firebaseio.com",
  channel: "CH·04 / 2.4GHz",
} as const;
