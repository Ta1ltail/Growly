// Shared utility helpers. Kept small and framework-free so any module can
// import them without circular-dependency risk.

// Generate a unique ID. Uses crypto.randomUUID when available (modern browsers)
// with a fallback for older environments and SSR.
export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}
