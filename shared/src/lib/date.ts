// Pure date utility functions — extracted from storage.ts so they can be
// shared between web and mobile apps without any browser dependency.
// These are the only parts of storage.ts that the business logic files need.

// Local date as "YYYY-MM-DD" (not UTC, so "today" matches the user).
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Parse a "YYYY-MM-DD" key back into a local-midnight Date.
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function prettyDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// Return a new Date that is `n` days before/after `d` (n can be negative).
export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

// Local midnight of the given date. Lets callers compare days by timestamp
// (DST-safe, since every result sits at 00:00 local) without formatting strings.
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
