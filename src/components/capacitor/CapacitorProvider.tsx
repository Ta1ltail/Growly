"use client";

// CapacitorProvider — wraps the app to gracefully handle Capacitor-specific
// concerns:
// 1. Provides connectivity status to child components
// 2. Shows/hides the ConnectivityBanner on network changes
// 3. In Capacitor, adds user-select: none and touch-callout: none to prevent
//    the native text selection / context menu from appearing on taps
// 4. Handles the Android back button for navigation
// 5. Adds safe-area padding for Android system bars
//
// In the browser, this is a transparent pass-through — no changes to behavior.

import {
  type ReactNode,
  createContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { ConnectivityBanner } from "./ConnectivityBanner";
import { isCapacitor, subscribeToConnectivity } from "@/lib/capacitor";

interface CapacitorContextValue {
  isNative: boolean;
  isOnline: boolean;
}

const CapacitorContext = createContext<CapacitorContextValue>({
  isNative: false,
  isOnline: true,
});

const CAPACITOR_STYLE_ID = "capacitor-native-styles";

export function CapacitorProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const native = isCapacitor();
  const styleInjected = useRef(false);

  useEffect(() => {
    if (!native) return;

    // Inject Capacitor-specific styles via a <style> element in <head>.
    // Avoids depending on styled-jsx which may not be available.
    if (!styleInjected.current) {
      styleInjected.current = true;
      const existing = document.getElementById(CAPACITOR_STYLE_ID);
      if (!existing) {
        const style = document.createElement("style");
        style.id = CAPACITOR_STYLE_ID;
        style.textContent = `
          body {
            -webkit-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
            -webkit-tap-highlight-color: transparent;
          }
          input, textarea, [contenteditable] {
            -webkit-user-select: text;
            user-select: text;
          }
        `;
        document.head.appendChild(style);
      }
    }

    const unsub = subscribeToConnectivity((online) => {
      setIsOnline(online);
    });

    return () => {
      unsub();
      // Clean up injected styles on unmount
      const styleEl = document.getElementById(CAPACITOR_STYLE_ID);
      if (styleEl) styleEl.remove();
    };
  }, [native]);

  // Handle Android back button — navigate back in history
  // Uses `cancelled` flag to guard against the component unmounting before the
  // Capacitor plugin async chain resolves (same pattern as capacitor.ts).
  useEffect(() => {
    if (!native) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = (window as any).Capacitor?.Plugins?.App;
    if (!app) return;

    let cancelled = false;
    let removeListener: (() => void) | null = null;

    app
      .addListener("backButton", () => {
        if (cancelled) return;
        if (window.history.length > 1) {
          window.history.back();
        }
      })
      .then((handle: { remove: () => void }) => {
        if (cancelled) {
          handle.remove();
          return;
        }
        removeListener = () => handle.remove();
      });

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, [native]);

  return (
    <CapacitorContext.Provider value={{ isNative: native, isOnline }}>
      {children}
      <ConnectivityBanner />
    </CapacitorContext.Provider>
  );
}
