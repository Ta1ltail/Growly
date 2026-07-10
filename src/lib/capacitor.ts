// Capacitor environment detection and connectivity utilities.
// These are safe to import in browser contexts — they gracefully return
// fallback values when not running inside a Capacitor WebView.

type CapacitorEnv = "browser" | "capacitor";

let _env: CapacitorEnv | null = null;

/**
 * Detect whether the app is running inside a Capacitor WebView or a
 * regular browser. Uses multiple signals for reliability:
 * 1. `window.Capacitor` global (set by @capacitor/core)
 * 2. `window.androidBridge` (Android WebView)
 * 3. User-agent check for Android WebView
 *
 * IMPORTANT: The `_env` cache must only be populated on the client side.
 * During SSR, `window` is undefined and we return `"browser"` without
 * caching, so that the client (hydrating) can re-detect correctly.
 */
export function detectCapacitorEnvironment(): CapacitorEnv {
  // SSR guard — no window, no detection possible. Don't cache this result.
  if (typeof window === "undefined") return "browser";

  // Client-side cache hit
  if (_env) return _env;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;

  if (
    w?.Capacitor?.isNativePlatform?.() === true ||
    w?.androidBridge ||
    (navigator.userAgent.includes("Android") &&
      navigator.userAgent.includes("wv"))
  ) {
    _env = "capacitor";
  } else {
    _env = "browser";
  }

  return _env;
}

/**
 * Returns true when running inside a Capacitor native WebView.
 */
export function isCapacitor(): boolean {
  return detectCapacitorEnvironment() === "capacitor";
}

/**
 * Get the current connectivity status.
 * In Capacitor, falls back to "online" since the Network plugin listener
 * (set up by subscribeToConnectivity) will correct the status immediately.
 * In the browser, uses navigator.onLine.
 */
export function getConnectivityStatus(): "online" | "offline" {
  return typeof navigator !== "undefined" && navigator.onLine === false
    ? "offline"
    : "online";
}

/**
 * Start listening for connectivity changes. Returns an unsubscribe function.
 *
 * In Capacitor, uses the native Network plugin via a dynamic import (safe
 * to bundle in the browser — the import resolves to a no-op shim). A
 * `cancelled` flag guards against a component unmounting before the
 * dynamic import chain resolves, so the native listener is always cleaned
 * up properly.
 *
 * In the browser, uses the `online` and `offline` events on window.
 */
export function subscribeToConnectivity(
  onStatusChange: (online: boolean) => void,
): () => void {
  if (!isCapacitor()) {
    const handleOnline = () => onStatusChange(true);
    const handleOffline = () => onStatusChange(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }

  // In Capacitor, import dynamically to avoid bundling issues in browser.
  // `cancelled` prevents a listener leak when the component unmounts before
  // the dynamic import / addListener chain resolves.
  let cancelled = false;
  let removeHandle: (() => void) | null = null;

  import("@capacitor/network").then(({ Network }) => {
    if (cancelled) return;

    Network.addListener("networkStatusChange", (status) => {
      if (cancelled) return;
      onStatusChange(status.connected);
    }).then((handle) => {
      if (cancelled) {
        handle.remove();
        return;
      }
      removeHandle = () => {
        handle.remove();
      };
    });

    // Check initial status
    Network.getStatus().then((status) => {
      if (cancelled) return;
      onStatusChange(status.connected);
    });
  });

  return () => {
    cancelled = true;
    removeHandle?.();
  };
}
