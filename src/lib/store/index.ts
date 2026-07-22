"use client";

// ─── Store — re-export hub ──────────────────────────────────────────
// Core infrastructure
export {
  setSyncCallback,
  useAppData,
  useAppDataSelector,
  replaceData,
  mutateData,
  reloadCache,
  hasPendingSave,
  flushSave,
  importRawData,
  clearAllData,
  dateKey,
  addDays,
} from "./core";

export type { SyncCallback } from "./core";

// Domain modules
export {
  addHabit,
  updateHabit,
  deleteHabit,
  setHabitArchived,
  duplicateHabit,
  cycleMark,
} from "./habits";

export {
  addNote,
  updateNote,
  deleteNote,
  setDailyNote,
} from "./notes";

export {
  addGoal,
  updateGoal,
  deleteGoal,
} from "./goals";

export {
  setTheme,
  setGraceHours,
  setAutoFreezeThreshold,
  setReducedMotion,
  markTemplateUsed,
  completeOnboarding,
  addCustomCategory,
  removeCustomCategory,
  resetTemplateUsage,
} from "./settings";

export { updateProfile } from "./profile";

export {
  buyCosmetic,
  equipCosmetic,
  redeemFreeze,
  claimDailyCheckIn,
  refreshDailyQuest,
  claimDailyQuest,
  doDailySpin,
} from "./economy";

export {
  seedUnlocksSeen,
  markAchievementsSeen,
  seedCelebrationsSeen,
  acknowledgeCelebration,
} from "./celebrations";

export type { CelebrationEvent } from "./celebrations";

export { undoAction, redoAction } from "./undo";
