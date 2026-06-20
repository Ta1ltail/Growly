// Custom categories — extends the built-in CATEGORIES with user-defined ones.
// Custom categories are stored in settings and merged at runtime.
// Pure functions, framework-free.

import type { Settings } from "./types";
import { CATEGORIES, CATEGORY_COLORS, type Category } from "./categories";

// Generate a color for a custom category based on its index.
export function customCategoryColor(index: number): string {
  const palette = [
    "#f472b6",
    "#a78bfa",
    "#60a5fa",
    "#34d399",
    "#fbbf24",
    "#fb923c",
    "#f87171",
    "#e879f9",
    "#22d3ee",
    "#a3e635",
    "#fde047",
    "#c084fc",
  ];
  return palette[index % palette.length];
}

// Get all categories including custom ones.
export function allCategories(settings?: Settings): Category[] {
  const custom = settings?.customCategories ?? [];
  return [...CATEGORIES, ...custom] as Category[];
}

// Get all category colors including custom ones.
export function allCategoryColors(settings?: Settings): Record<string, string> {
  const colors: Record<string, string> = { ...CATEGORY_COLORS };
  const custom = settings?.customCategories ?? [];
  custom.forEach((cat, i) => {
    colors[cat] = customCategoryColor(i);
  });
  return colors;
}
