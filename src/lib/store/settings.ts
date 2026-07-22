"use client";

// Settings mutations — domain logic extracted from index.ts

import { update } from "./core";
import type { ThemeSettings } from "../theme";

/* ---------------- settings ---------------- */

export function setTheme(patch: Partial<ThemeSettings>): void {
  update((prev) => ({
    ...prev,
    settings: {
      ...prev.settings,
      theme: { ...prev.settings.theme, ...patch },
    },
  }));
}

export function setGraceHours(hours: number): void {
  update((prev) => ({
    ...prev,
    settings: { ...prev.settings, graceHours: Math.max(0, hours) },
  }));
}

export function setAutoFreezeThreshold(threshold: number): void {
  update((prev) => ({
    ...prev,
    settings: {
      ...prev.settings,
      autoFreezeThreshold: threshold > 0 ? threshold : undefined,
    },
  }));
}

export function setReducedMotion(reduced: boolean): void {
  update((prev) => ({
    ...prev,
    settings: { ...prev.settings, reducedMotion: reduced },
  }));
  // Apply immediately via data attribute so animations stop right away
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute(
      "data-reduced-motion",
      reduced ? "true" : "false",
    );
  }
}

export function markTemplateUsed(templateId: string): void {
  update((prev) => {
    const used = new Set(prev.settings.usedTemplateIds ?? []);
    used.add(templateId);
    return {
      ...prev,
      settings: { ...prev.settings, usedTemplateIds: [...used] },
    };
  });
}

export function completeOnboarding(): void {
  update((prev) => ({
    ...prev,
    settings: { ...prev.settings, onboardingComplete: true },
  }));
}

export function addCustomCategory(name: string): void {
  update((prev) => {
    const existing = prev.settings.customCategories ?? [];
    if (existing.includes(name)) return prev;
    return {
      ...prev,
      settings: { ...prev.settings, customCategories: [...existing, name] },
    };
  });
}

export function removeCustomCategory(name: string): void {
  update((prev) => ({
    ...prev,
    settings: {
      ...prev.settings,
      customCategories: (prev.settings.customCategories ?? []).filter(
        (c) => c !== name,
      ),
    },
  }));
}

export function resetTemplateUsage(templateId: string): void {
  update((prev) => ({
    ...prev,
    settings: {
      ...prev.settings,
      usedTemplateIds: (prev.settings.usedTemplateIds ?? []).filter(
        (id) => id !== templateId,
      ),
    },
  }));
}
