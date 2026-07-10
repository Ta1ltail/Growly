"use client";

// ConnectivityBanner — a fixed banner at the top of the screen that appears
// when the device loses internet connectivity. Only shown inside the Capacitor
// WebView; in the browser the user already knows their network status.
// Core tracking features (habits, marks, localStorage) work offline — this
// banner simply warns that cloud sync, auth, and social features are unavailable.

import { useEffect, useRef, useState } from "react";
import { WifiOff } from "lucide-react";
import { isCapacitor, subscribeToConnectivity } from "@/lib/capacitor";

export function ConnectivityBanner() {
  const [offline, setOffline] = useState(false);
  const [show, setShow] = useState(false);
  const mountedRef = useRef(true);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    // Only show the banner inside Capacitor — browser users see the native
    // browser offline indicator already.
    if (!isCapacitor()) return;

    const unsub = subscribeToConnectivity((online) => {
      if (!mountedRef.current) return;
      setOffline(!online);
      if (!online) {
        setShow(true);
      } else {
        // When coming back online, wait a moment before hiding so the
        // page has time to reconnect to Supabase.
        reconnectTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setShow(false);
        }, 1500);
      }
    });

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      unsub();
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium shadow-lg backdrop-blur-sm transition-all duration-500 ${
        offline
          ? "translate-y-0 bg-amber-600/90 text-white"
          : "translate-y-0 bg-emerald-600/80 text-white"
      }`}
      role="alert"
    >
      <WifiOff className="size-4 shrink-0" />
      <span>
        {offline
          ? "You're offline — tracking still works, sync will resume when connected"
          : "Back online — syncing your data..."}
      </span>
    </div>
  );
}
