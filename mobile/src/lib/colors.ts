// Color constants matching the web app's dark theme.
// These are used directly by every UI component so we don't
// have to repeat hex values or rely on a CSS-to-RN bridge.

export const colors = {
  // Backgrounds
  surface: "#1e293b",
  surface2: "#334155",
  empty: "#0f172a",

  // Text
  ink: "#f1f5f9",
  muted: "#64748b",
  faint: "#475569",

  // Accent (blue primary)
  accent: "#3b82f6",
  accentGlow: "#60a5fa",

  // Borders
  line: "#334155",

  // Status marks
  done: "#22c55e",
  missed: "#ef4444",
  skipped: "#f59e0b",

  // Misc
  white: "#ffffff",
  black: "#000000",
  overlay: "rgba(0,0,0,0.5)",
} as const;
