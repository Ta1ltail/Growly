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

  // ── Track open modals for back-button hierarchy ──
  // Any component can dispatch modal:open / modal:close custom events on
  // window. The back button handler reads this set to know whether to
  // close a dialog or navigate back.
  const modalCountRef = useRef(0);
  useEffect(() => {
    if (!native) return;
    const inc = () => { modalCountRef.current++; };
    const dec = () => { modalCountRef.current = Math.max(0, modalCountRef.current - 1); };
    window.addEventListener("modal:open", inc);
    window.addEventListener("modal:close", dec);
    return () => {
      window.removeEventListener("modal:open", inc);
      window.removeEventListener("modal:close", dec);
    };
  }, [native]);

  // Handle Android back button — close dialogs, then navigate back, then exit.
  // Uses `cancelled` flag to guard against the component unmounting before the
  // Capacitor plugin async chain resolves (same pattern as capacitor.ts).
  useEffect(() => {
    if (!native) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = (window as any).Capacitor?.Plugins?.App;
    if (!app) return;

    let cancelled = false;
    let removeListener: (() => void) | null = null;

    const ROOT_PAGES = ["/", "/dashboard"];

    app
      .addListener("backButton", () => {
        if (cancelled) return;

        // 1. If a modal/dialog is open, close it first by dispatching Escape
        if (modalCountRef.current > 0) {
          // Verify a dialog is actually in the DOM (guards against counter drift)
          const topDialog = document.querySelector<HTMLElement>(
            '[role="dialog"][aria-modal="true"]',
          );
          if (topDialog) {
            // Dispatch Escape key to trigger the modal's close handler.
            // Modal.tsx listens on document for keydown events and closes on Escape.
            topDialog.dispatchEvent(
              new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
            );
          } else {
            // Fallback: modalCount is positive but no dialog in the DOM —
            // likely a counter drift edge case. Reset it.
            modalCountRef.current = 0;
          }
          return;
        }

        // 2. Close the "More" page overlay if it's open
        const moreBtn = document.querySelector<HTMLElement>(
          'button[aria-label="Open all sections"][aria-expanded="true"]',
        );
        if (moreBtn) {
          moreBtn.click();
          return;
        }

        // 3. If there's browser history, go back
        if (window.history.length > 1) {
          window.history.back();
          return;
        }

        // 4. On a root page — exit the app (standard Android behavior)
        const currentPath = window.location.pathname;
        if (ROOT_PAGES.includes(currentPath)) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const capApp = (window as any).Capacitor?.Plugins?.App;
            if (capApp?.exitApp) {
              capApp.exitApp();
            }
          } catch {
            // Plugin not available — just do nothing
          }
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
