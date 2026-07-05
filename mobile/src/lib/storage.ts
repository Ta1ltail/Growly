// Mobile storage adapter — replaces browser localStorage with AsyncStorage.
// Implements the same `loadData` / `saveData` contract that the shared business
// logic expects, but backed by `@react-native-async-storage/async-storage`.

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppData } from "@project101/shared";
import { DEFAULT_ECONOMY, DEFAULT_PROFILE, DEFAULT_PROGRESS_SEEN } from "@project101/shared";

// Re-export date helpers from shared
export { dateKey, parseDateKey, prettyDate, addDays, startOfDay, dayDiff } from "@project101/shared";

const STORAGE_KEY = "project101.data.v1";
const SCHEMA_VERSION = 6;

// Empty app data used as the default state.
export const emptyData: AppData = {
  version: SCHEMA_VERSION,
  habits: [],
  marks: {},
  notes: [],
  goals: [],
  auditLog: [],
  settings: {
    theme: { mode: "dark" as const, accent: "blue" },
    graceHours: 5,
    usedTemplateIds: [],
  },
  profile: DEFAULT_PROFILE,
  unlocks: {},
  economy: DEFAULT_ECONOMY,
  progressSeen: DEFAULT_PROGRESS_SEEN,
};

export { SCHEMA_VERSION };

export async function loadData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData;
    return JSON.parse(raw) as AppData;
  } catch {
    return emptyData;
  }
}

export async function saveData(data: AppData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage can fail (quota, permissions). Safe to ignore for now.
  }
}

export async function clearLocalAppData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEY,
      "project101.remember_me",
      "project101.saved_email",
      "project101.last_auth_user",
    ]);
  } catch {
    // Safe to ignore.
  }
}
