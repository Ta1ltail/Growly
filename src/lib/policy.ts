// Honest Tracking Policy (anti-cheat).
//
// Past records lock permanently once their day ends, so users cannot
// retroactively mark, edit, or manipulate history or streaks. A short grace
// window lets a user still finish "yesterday" early the next morning
// (configurable in Settings).

import { dayDiff, parseDateKey, startOfDay } from "./storage";

// Can the mark for `targetKey` ("YYYY-MM-DD") be edited right now?
//   today        -> always editable
//   future days  -> locked (you cannot complete something that hasn't happened)
//   yesterday    -> editable only until `graceHours` past midnight
//   older        -> permanently locked
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
