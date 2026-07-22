// Reminder service — checks habit reminders and schedules browser notifications.
// Runs on app mount and checks every 60 seconds for due reminders.
// Uses the Notification API with permission request if needed.
//
// This is a singleton module: import it once to start checking.

import { loadData } from "./storage";
import { dateKey } from "./date";

let _intervalId: ReturnType<typeof setInterval> | null = null;
let _permissionRequested = false;

// Track which (habitId, dateKey) pairs have already fired a notification today
// so each reminder fires at most once per day.
const _firedToday = new Set<string>();

function cacheKey(habitId: string, dateKey: string): string {
  return `${habitId}:${dateKey}`;
}

function getCurrentTimeMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function checkReminders(): void {
  // Only check if the browser supports notifications and has granted permission
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "denied") return;
  if (Notification.permission === "default") {
    if (!_permissionRequested) {
      _permissionRequested = true;
      Notification.requestPermission();
    }
    return;
  }

  const data = loadData();
  const todayKey = dateKey(new Date());
  const nowMinutes = getCurrentTimeMinutes();

  for (const habit of data.habits) {
    if (habit.archived || habit.deletedAt) continue;
    if (!habit.reminder?.enabled || !habit.reminder?.time) continue;

    const [hours, minutes] = habit.reminder.time.split(":").map(Number);
    if (hours === undefined || minutes === undefined) continue;

    const reminderMinutes = hours * 60 + minutes;

    // Fire if we're within the 1-minute window of the reminder time
    if (Math.abs(nowMinutes - reminderMinutes) <= 1) {
      const key = cacheKey(habit.id, todayKey);
      if (!_firedToday.has(key)) {
        _firedToday.add(key);

        // Limit fired set size to prevent memory leak
        if (_firedToday.size > 500) {
          _firedToday.clear();
        }

        try {
          const notification = new Notification("Growly — Habit Reminder", {
            body: `Time for: ${habit.name}`,
            icon: "/icon-192.svg",
            tag: `habit-reminder-${habit.id}-${todayKey}`,
            silent: false,
          });

          // Focus the app when the notification is clicked
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        } catch {
          // Notification may fail in some environments — silently ignore
        }
      }
    }
  }
}

/**
 * Start the reminder service. Checks every 60 seconds for due reminders.
 * Safe to call multiple times — only one interval runs.
 */
export function startReminderService(): void {
  if (_intervalId) return;

  // Initial check after a short delay to let the app mount
  setTimeout(checkReminders, 2000);

  _intervalId = setInterval(checkReminders, 60_000);
}

/**
 * Stop the reminder service. Clears the check interval and fired-set.
 */
export function stopReminderService(): void {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
  _firedToday.clear();
}
