"use client";

// Developer Mode settings — a separate, hidden power-user layer that does NOT
// touch the app's schema-v4 data. Persisted under its own localStorage key so
// it can never corrupt or migrate alongside real user data. Mirrors the
// store.ts pattern (module cache + listeners + useSyncExternalStore) so dev
// toggles stay in sync across every mounted dev surface.

import { useSyncExternalStore } from "react";

export const DEV_STORAGE_KEY = "project101.devmode.v1";

// Inert AI config — there is no AI backend in this app. These fields are stored
// purely so the AI Settings panel is a real, persistent prototype surface.
export interface AiDevConfig {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  streaming: boolean;
  systemPrompt: string;
  apiKey: string;
}

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
  // AI (inert)
  ai: AiDevConfig;
}

const DEFAULT_AI: AiDevConfig = {
  provider: "anthropic",
  model: "claude-opus-4-8",
  temperature: 0.7,
  maxTokens: 2048,
  streaming: true,
  systemPrompt: "",
  apiKey: "",
};

export const DEFAULT_DEV: DevSettings = {
  enabled: false,
  section: "general",
  showGridOverlay: false,
  outlineComponents: false,
  forceReduceMotion: false,
  hideAmbient: false,
  showFps: false,
  logState: false,
  ai: DEFAULT_AI,
};

let cache: DevSettings | null = null;
const listeners = new Set<() => void>();

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function str(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function cleanAi(v: unknown): AiDevConfig {
  const o = typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
  return {
    provider: str(o.provider, DEFAULT_AI.provider),
    model: str(o.model, DEFAULT_AI.model),
    temperature: num(o.temperature, DEFAULT_AI.temperature),
    maxTokens: num(o.maxTokens, DEFAULT_AI.maxTokens),
    streaming: bool(o.streaming, DEFAULT_AI.streaming),
    systemPrompt: str(o.systemPrompt, DEFAULT_AI.systemPrompt),
    apiKey: str(o.apiKey, DEFAULT_AI.apiKey),
  };
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
      ai: cleanAi(o.ai),
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

export function setAi(patch: Partial<AiDevConfig>): void {
  const prev = getSnapshot();
  commit({ ...prev, ai: { ...prev.ai, ...patch } });
}

export function toggleDev<K extends keyof DevSettings>(key: K): void {
  const prev = getSnapshot();
  if (typeof prev[key] === "boolean") commit({ ...prev, [key]: !prev[key] });
}

export function enableDevMode(): void {
  setDev({ enabled: true });
}

export function disableDevMode(): void {
  setDev({ enabled: false });
}

// Reset every dev toggle but keep the mode unlocked, so the FAB stays available.
export function resetDevSettings(): void {
  commit({ ...DEFAULT_DEV, enabled: true });
}
