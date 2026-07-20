// Habit categories with associated colors.

export const CATEGORIES = [
  "Workout",
  "Studies",
  "Work",
  "Health",
  "Lifestyle",
  "Hobbies",
  "Finance",
  "Chores",
  "Personal",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_COLORS: Record<Category, string> = {
  Workout: "#6366F1",
  Studies: "#0EA5E9",
  Work: "#8B5CF6",
  Health: "#22C55E",
  Lifestyle: "#F59E0B",
  Hobbies: "#EC4899",
  Finance: "#10B981",
  Chores: "#94A3B8",
  Personal: "#F43F5E",
};
