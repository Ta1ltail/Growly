import { dayDiff, parseDateKey, startOfDay } from "./date";

// Can the mark for `targetKey` be edited right now?
// today=editable, future=locked, yesterday=grace window, older=permanent
export function canEditMark(
  targetKey: string,
  now: Date,
  graceHours: number,
): boolean {
  const diff = dayDiff(startOfDay(now), parseDateKey(targetKey));
  if (diff === 0) return true;
  if (diff < 0) return false;
  if (diff === 1) {
    const hoursIntoToday = now.getHours() + now.getMinutes() / 60;
    return hoursIntoToday < graceHours;
  }
  return false;
}

// A future day relative to `now` — used to show "planned" cells distinctly.
export function isFutureDay(targetKey: string, now: Date): boolean {
  return dayDiff(startOfDay(now), parseDateKey(targetKey)) < 0;
}
