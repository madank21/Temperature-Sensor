/**
 * Light haptic feedback on capable devices (Android Chrome etc).
 * Silently no-ops elsewhere — the visual press feedback always applies.
 */
export function haptic(ms = 8): void {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(ms);
    }
  } catch {
    /* unsupported — ignore */
  }
}
