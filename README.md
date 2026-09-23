# TeHum-01 Thermal Telemetry Console

TeHum-01 is a mobile-first React dashboard for monitoring an ESP32/DHT11 temperature and humidity sensor. It connects directly to a Firebase Realtime Database event stream and presents the latest reading, connection health, short-term trends, and device diagnostics in a dark HUD-style interface.

The application is entirely client-side. It has no API server, database write path, authentication flow, or persistent historical storage.

## Features

- Live temperature gauge with animated value transitions and Celsius/Fahrenheit conversion.
- Relative humidity, approximate dew point, link quality, firmware, and last-update indicators.
- Connection states: `connecting`, `live`, `stale`, and `offline`.
- History screen with temperature/humidity selection, `15M`, `1H`, and `ALL` windows, interactive SVG chart, and low/average/high statistics.
- Session history buffer capped at 240 readings.
- Light and dark themes, with unit and theme preferences persisted in `localStorage`.
- Manual retry and a diagnostic force-dropout action for previewing the offline UI.
- Responsive presentation: edge-to-edge on mobile and a framed telemetry console on larger screens.
- Animated SVG gauge, sparkline, trend chart, ambient background, tab transitions, and optional device haptics.

## Requirements

- Node.js 18 or newer recommended.
- A Firebase Realtime Database containing the sensor node.
- A browser that supports `fetch`, `ReadableStream`, `AbortController`, and Server-Sent Event style responses.

## Hardware Wiring

The wiring below assumes an ESP32 DevKit board, a 3-pin DHT11 module, and an LED connected through a series resistor.

### Verified Current Wiring

| ESP32 connection | Wire color | Component connection | Status |
| --- | --- | --- | --- |
| `3V3` | Red | DHT11 `+` / `VCC` | Correct |
| `GND` | Green | DHT11 `-` / `GND` | Correct |
| `D2` / `GPIO2` | Blue | DHT11 `OUT` / `DATA` | Electrically valid |
| `D5` / `GPIO5` | Purple/blue | Resistor, then LED anode `+` | Correct |
| `GND` | Green | LED cathode `-` | Correct |

The resulting circuits are:

```text
ESP32 3V3  ───────────── DHT11 + / VCC
ESP32 GND  ───────────── DHT11 - / GND
ESP32 D2   ───────────── DHT11 OUT / DATA

ESP32 D5   ── resistor ── LED anode (+)
ESP32 GND  ────────────── LED cathode (-)
```

No power wire is reversed, the DHT11 polarity is correct, the LED polarity is correct, and the resistor provides the required current limiting for the LED.

### Arduino Pin Definitions

For the verified wiring, use:

```cpp
#define DHTPIN 2
#define LED_PIN 5

// Example DHT11 initialization
DHT dht(2, DHT11);
```

Set the LED output state with:

```cpp
digitalWrite(LED_PIN, HIGH); // LED on
digitalWrite(LED_PIN, LOW);  // LED off
```

### Recommended Beginner Wiring

Although `GPIO2` and `GPIO5` can work, they have boot/strapping functions on ESP32 boards. When other GPIOs are available, use GPIO4 for the DHT11 data line and GPIO18 for the LED to reduce boot-related surprises:

```text
ESP32 3V3  ───────────── DHT11 + / VCC
ESP32 GND  ───────────── DHT11 - / GND
ESP32 GPIO4 ──────────── DHT11 OUT / DATA

ESP32 GPIO18 ─ resistor ─ LED anode (+)
ESP32 GND   ───────────── LED cathode (-)
```

The corresponding definitions are:

```cpp
#define DHTPIN 4
#define LED_PIN 18
```

### DHT11 Pull-up Resistor

The blue sensor shown in the project diagram is assumed to be a 3-pin DHT11 module. These modules normally include the required data-line pull-up circuitry. If you are using a bare 4-pin DHT11 sensor instead, add an external pull-up resistor, typically between `4.7 kΩ` and `10 kΩ`, between `3V3` and the data line.

## Getting Started

Install dependencies:

```powershell
npm install
```

Create a `.env` file in the repository root. There is currently no `.env.example` file, and `.env` is ignored by Git.

```dotenv
FIREBASE_HOST=your-project-default-rtdb.firebaseio.com
FIREBASE_AUTH=your-read-only-token
FIREBASE_PATH=/sensor
```

Start the Vite development server:

```powershell
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

Environment variables are read at build time. Restart the development server after changing `.env`.

## Firebase Connection

The app does not use the Firebase JavaScript SDK. `src/lib/engine.ts` builds an authenticated Realtime Database URL and opens it with native `fetch`:

```text
https://<FIREBASE_HOST>/<FIREBASE_PATH>.json?auth=<FIREBASE_AUTH>
```

The response is consumed as an event stream with `Accept: text/event-stream`. Firebase `put`-style events are applied to a local object using their event path, then normalized into a `SensorReading` before being added to the session buffer.

### Supported environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `FIREBASE_HOST` | Yes | None | Realtime Database host, with or without `https://`. |
| `FIREBASE_AUTH` | Yes | None | Token or database credential appended as the `auth` query parameter. |
| `FIREBASE_PATH` | No | `/sensor` | Database node to stream. Leading and trailing slashes are normalized. |

### Accepted reading shapes

An object reading can use these field aliases:

```json
{
	"temperature": 24.6,
	"humidity": 51.2,
	"timestamp": 1760000000000,
	"link": 96
}
```

Accepted aliases are:

| Reading value | Accepted fields | Fallback |
| --- | --- | --- |
| Temperature | `temperature`, `temp`, `temperatureC` | Previous temperature, then `0` |
| Humidity | `humidity`, `hum` | Previous humidity, then `0` |
| Timestamp | `timestamp`, `updatedAt`, `time` | Current browser time |
| Link quality | `link`, `rssi` | Previous link, then `100`; clamped to `0-100` |

The stream also accepts a numeric or numeric-string node as a temperature. In that case, humidity starts at `0%`, link quality starts at `100`, and the timestamp is the browser receipt time. A nested temperature object is recursively supported. Timestamps smaller than `10,000,000,000` are interpreted as Unix seconds and converted to milliseconds.

The normalized internal shape is:

```ts
interface SensorReading {
	temperature: number; // Celsius
	humidity: number;    // Relative humidity percentage
	timestamp: number;   // Epoch milliseconds
	link: number;        // 0-100 estimate
}
```

## Runtime Behavior

### Connection states

- `connecting`: the app is opening the Firebase stream or has not received a reading yet.
- `live`: the latest reading is no more than 20 seconds old.
- `stale`: the latest reading is more than 20 seconds old but no more than 45 seconds old. The gauge is dimmed.
- `offline`: the latest reading is more than 45 seconds old, the stream is manually stopped, or the user selects **Force dropout**.

The connection timer runs every second. **Retry link** creates a new Firebase source and clears the forced-dropout state. A failed fetch is logged in the browser console; the timeout logic subsequently determines whether the UI becomes offline.

### History and persistence

- History is held only in the current browser session.
- The rolling buffer stores at most 240 readings, newest last.
- The History screen filters this buffer; it does not query historical Firebase data.
- The clear action keeps the newest reading (`slice(-1)`) so the dashboard can continue showing the last known value.
- Temperature unit is stored under `nova.unit`.
- Theme is stored under `nova.theme`.
- No sensor readings are written back to Firebase or local storage.

### Display calculations

- Fahrenheit is calculated from the normalized Celsius value.
- Dew point uses the Magnus approximation.
- The home sparkline shows the last 15 temperature readings.
- The trend chart renders up to the last 96 readings in its visible plot.
- Link quality is treated as a percentage from `0` to `100`; a conventional negative RSSI value will therefore clamp to `0` unless it is converted before reaching the app.

## Project Structure

```text
.
├── index.html                 HTML shell, title, fonts, and metadata
├── package.json               Scripts and dependencies
├── vite.config.ts             React, Tailwind, alias, and single-file build config
├── tsconfig.json              Strict TypeScript configuration
├── src/
│   ├── main.tsx               React root and StrictMode entry point
│   ├── App.tsx                Provider, device shell, tab transitions, and ambience
│   ├── index.css              Tailwind import, theme tokens, animations, and utilities
│   ├── components/            Reusable UI, chart, gauge, and interaction primitives
│   ├── screens/
│   │   ├── HomeScreen.tsx     Live gauge and current metrics
│   │   ├── HistoryScreen.tsx  Filterable trend chart and statistics
│   │   └── SettingsScreen.tsx Display, device, diagnostics, and about sections
│   ├── hooks/
│   │   ├── useSensorStream.ts Firebase subscription, buffer, and state derivation
│   │   └── useAnimatedNumber.ts Smooth numeric interpolation for live readouts
│   ├── lib/
│   │   ├── engine.ts          Firebase SSE source and payload normalization
│   │   ├── format.ts           Temperature, time, clock, and dew-point helpers
│   │   ├── haptics.ts          Optional navigator vibration wrapper
│   │   ├── svg.ts              Gauge and chart geometry helpers
│   │   └── types.ts            Domain types and display device metadata
│   ├── state/app.tsx           Global context for tab, unit, theme, and sensor state
│   └── utils/cn.ts             clsx plus tailwind-merge class helper
└── .env                       Local Firebase configuration; ignored by Git
```

Important reusable components include `GaugeDial`, `Sparkline`, `TrendChart`, `TabBar`, `SegmentedControl`, `Toggle`, `GlassCard`, `StatusDot`, `FadeUp`, and `Backdrop`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server with hot reload. |
| `npm run build` | Produce the production bundle in `dist/` through Vite. |
| `npm run preview` | Serve the built `dist/` output locally. |

The Vite configuration includes `vite-plugin-singlefile`, so the production output is intended to be self-contained in `dist/index.html` for simple static hosting. No hosting, CI, Firebase Rules, or deployment provider configuration is included in this repository.

## Security

`FIREBASE_HOST`, `FIREBASE_AUTH`, and `FIREBASE_PATH` are exposed to the browser because this is a client-side application. They are not server-side secrets. Use a credential with the smallest possible read scope, configure Firebase Realtime Database Rules to allow only the required read access, and avoid using an unrestricted database secret in a deployed build.

Also remember that the Firebase stream URL is visible to anyone who can inspect the running application or browser network requests.

## Known Limitations

- There is no automatic fake-data mode. Without valid Firebase configuration, the interface remains in `connecting` and eventually transitions to `offline`.
- The history view is session-only and is lost on refresh.
- `FirebaseSource.backfill()` currently returns an empty array, so startup has no historical backfill.
- The UI contains presentation metadata in `src/lib/types.ts` and a few static labels, including firmware, channel, coordinates, and some device/path text. These values do not configure the Firebase connection and should be updated if the dashboard is repurposed for another device.
- There are currently no automated tests or lint scripts in `package.json`.
- Browser support depends on streaming `fetch` response bodies and Firebase Realtime Database SSE behavior.

## Development Notes

The UI uses React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion, Lucide React, `clsx`, and `tailwind-merge`. The `@` path alias maps to `src`, although most existing imports use relative paths. The app uses SVG for the gauge and charts rather than a charting library, keeping the visual behavior and animations inside the repository.
