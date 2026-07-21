// Date utilities extracted from storage.ts for sharing across packages.
// All use local timezone so "today" matches the user's calendar.
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Parse "YYYY-MM-DD" back into a local-midnight Date.
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function prettyDate(d: Date, locales?: string | string[]): string {
  // Default to en-US to avoid Windows locale hang (30s+ on first call)
  return d.toLocaleDateString(locales ?? "en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

// Return a new Date n days before/after d (n can be negative).
export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

// Local midnight (DST-safe, enables day comparison by timestamp).
export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

// Whole-day difference a - b (positive when a is later). DST-safe.
export function dayDiff(a: Date, b: Date): number {
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
  return Math.round(ms / 86_400_000);
}
