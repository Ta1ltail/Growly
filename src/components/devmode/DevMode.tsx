"use client";

// Developer Mode entry point, mounted once in AppShell. Hidden by default; the
// FAB is revealed (and persisted) via Ctrl/Cmd+Shift+D. Hosts the popup plus the
// always-on dev overlays (style injector, FPS meter, state logger).

import { useEffect, useRef, useState } from "react";
import { Bug } from "lucide-react";
import { useAppData } from "@/lib/store";
import { useDevSettings, setDev, DEV_STORAGE_KEY } from "@/lib/devmode";
import { DevModePanel } from "./DevModePanel";

export function DevMode() {
  const dev = useDevSettings();
  const [open, setOpen] = useState(false);

  // Global unlock/lock shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === "D" || e.key === "d")
      ) {
        e.preventDefault();
        setDev({ enabled: !readPersistedEnabled() });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!dev.enabled) return null;

  return (
    <>
      <DevStyleInjector
        grid={dev.showGridOverlay}
        outline={dev.outlineComponents}
        reduceMotion={dev.forceReduceMotion}
        hideAmbient={dev.hideAmbient}
      />
      {dev.showFps && <FpsMeter />}
      {dev.logState && <DevLogger />}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open developer mode"
        title="Developer Mode (Ctrl/Cmd+Shift+D)"
        className="fixed bottom-24 right-4 z-[65] grid size-12 place-items-center rounded-full bg-accent text-white shadow-lg ring-1 ring-white/20 transition-transform hover:scale-105 active:scale-95 md:bottom-6"
      >
        <Bug className="size-5" />
      </button>

      {open && <DevModePanel onClose={() => setOpen(false)} />}
    </>
  );
}

// The keydown handler runs outside React render; read the live persisted flag
// rather than the stale closure value.
function readPersistedEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(DEV_STORAGE_KEY);
    if (!raw) return false;
    const o = JSON.parse(raw) as { enabled?: unknown };
    return o.enabled === true;
  } catch {
    return false;
  }
}

function DevStyleInjector({
  grid,
  outline,
  reduceMotion,
  hideAmbient,
}: {
  grid: boolean;
  outline: boolean;
  reduceMotion: boolean;
  hideAmbient: boolean;
}) {
  useEffect(() => {
    const id = "dev-mode-styles";
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = [
      grid &&
        `body::after{content:"";position:fixed;inset:0;z-index:9990;pointer-events:none;background-image:linear-gradient(to right,color-mix(in srgb,var(--c-accent) 22%,transparent) 1px,transparent 1px),linear-gradient(to bottom,color-mix(in srgb,var(--c-accent) 22%,transparent) 1px,transparent 1px);background-size:24px 24px;}`,
      outline &&
        `*{outline:1px solid color-mix(in srgb,var(--c-accent) 35%,transparent) !important;}`,
      reduceMotion &&
        `*,*::before,*::after{animation-duration:.001ms !important;animation-iteration-count:1 !important;transition-duration:.001ms !important;}`,
      hideAmbient && `.fixed.inset-0.\-z-10{display:none!important;}`,
    ]
      .filter(Boolean)
      .join("\n");
    return () => {
      if (el) el.textContent = "";
    };
  }, [grid, outline, reduceMotion, hideAmbient]);

  return null;
}

function FpsMeter() {
  const [fps, setFps] = useState(0);
  const frames = useRef(0);
  const last = useRef(0);

  useEffect(() => {
    let raf = 0;
    let mounted = true;
    const loop = (now: number) => {
      if (!mounted) return;
      if (last.current === 0) last.current = now;
      frames.current += 1;
      const elapsed = now - last.current;
      if (elapsed >= 500) {
        setFps(Math.round((frames.current * 1000) / elapsed));
        frames.current = 0;
        last.current = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  const color = fps >= 50 ? "#22c55e" : fps >= 30 ? "#f59e0b" : "#f43f5e";
  return (
    <div className="fixed left-4 top-4 z-[68] rounded-lg border border-line bg-surface/90 px-2.5 py-1 font-mono text-xs shadow-lg backdrop-blur">
      <span style={{ color }}>{fps}</span>{" "}
      <span className="text-faint">fps</span>
    </div>
  );
}

function DevLogger() {
  const data = useAppData();
  useEffect(() => {
    console.log("[devmode] app state", data);
  }, [data]);
  return null;
}
