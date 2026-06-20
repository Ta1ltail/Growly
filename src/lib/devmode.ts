"use client";

// Developer Mode settings — a separate, hidden power-user layer that does NOT
// touch the app's schema-v4 data. Persisted under its own localStorage key so
// it can never corrupt or migrate alongside real user data. Mirrors the
// store.ts pattern (module cache + listeners + useSyncExternalStore) so dev
// toggles stay in sync across every mounted dev surface.

import { useSyncExternalStore } from "react";

export const DEV_STORAGE_KEY = "project101.devmode.v1";

export interface DevSettings {
  enabled: boolean; // is dev mode unlocked (FAB visible)
  section: string; // last-open panel section id
  // UI Controls
  showGridOverlay: boolean;
  outlineComponents: boolean;
  forceReduceMotion: boolean;
  hideAmbient: boolean;
  // Performance
  showFps: boolean;
  // Debug Tools
  logState: boolean;
}

export const DEFAULT_DEV: DevSettings = {
  enabled: false,
  section: "general",
  showGridOverlay: false,
  outlineComponents: false,
  forceReduceMotion: false,
  hideAmbient: false,
  showFps: false,
  logState: false,
};

let cache: DevSettings | null = null;
const listeners = new Set<() => void>();

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function str(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

function loadDev(): DevSettings {
  if (typeof window === "undefined") return DEFAULT_DEV;
  try {
    const raw = window.localStorage.getItem(DEV_STORAGE_KEY);
    if (!raw) return DEFAULT_DEV;
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (typeof o !== "object" || o === null) return DEFAULT_DEV;
    return {
      enabled: bool(o.enabled, false),
      section: str(o.section, "general"),
      showGridOverlay: bool(o.showGridOverlay, false),
      outlineComponents: bool(o.outlineComponents, false),
      forceReduceMotion: bool(o.forceReduceMotion, false),
      hideAmbient: bool(o.hideAmbient, false),
      showFps: bool(o.showFps, false),
      logState: bool(o.logState, false),
    };
  } catch {
    return DEFAULT_DEV;
  }
}

function getSnapshot(): DevSettings {
  if (cache === null) cache = loadDev();
  return cache;
}

function getServerSnapshot(): DevSettings {
  return DEFAULT_DEV;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function commit(next: DevSettings): void {
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage may be unavailable (private mode / quota) — ignore.
    }
  }
  for (const listener of listeners) listener();
}

export function useDevSettings(): DevSettings {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setDev(patch: Partial<DevSettings>): void {
  commit({ ...getSnapshot(), ...patch });
}

export function disableDevMode(): void {
  setDev({ enabled: false });
}

// Reset every dev toggle but keep the mode unlocked, so the FAB stays available.
export function resetDevSettings(): void {
  commit({ ...DEFAULT_DEV, enabled: true });
}
