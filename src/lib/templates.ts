// Starter habit sets the user can add in one tap (Templates page).

import type { Category } from "./categories";

export interface TemplateHabit {
  name: string;
  category: Category;
  repeatDays: number[]; // empty = every day
}

export interface Template {
  id: string;
  name: string;
  description: string;
  habits: TemplateHabit[];
}

export const TEMPLATES: Template[] = [
  {
    id: "gym",
    name: "Gym Routine",
    description: "Stay consistent with training and recovery.",
    habits: [
      { name: "Workout", category: "Workout", repeatDays: [1, 2, 4, 5] },
      { name: "Stretch / mobility", category: "Workout", repeatDays: [] },
      { name: "Hit protein target", category: "Health", repeatDays: [] },
      { name: "Sleep 8 hours", category: "Health", repeatDays: [] },
    ],
  },
  {
    id: "student",
    name: "Student Routine",
    description: "Build steady study and focus habits.",
    habits: [
      { name: "Study 1 hour", category: "Studies", repeatDays: [1, 2, 3, 4, 5] },
      { name: "Review notes", category: "Studies", repeatDays: [] },
      { name: "Read 30 min", category: "Hobbies", repeatDays: [] },
      { name: "No phone before noon", category: "Lifestyle", repeatDays: [1, 2, 3, 4, 5] },
    ],
  },
  {
    id: "morning",
    name: "Morning Routine",
    description: "Start every day with intention.",
    habits: [
      { name: "Wake before 7am", category: "Lifestyle", repeatDays: [] },
      { name: "Drink water", category: "Health", repeatDays: [] },
      { name: "Make bed", category: "Chores", repeatDays: [] },
      { name: "Plan the day", category: "Personal", repeatDays: [] },
    ],
  },
  {
    id: "wellbeing",
    name: "Mental Wellbeing",
    description: "Small habits for a calmer mind.",
    habits: [
      { name: "Meditate 10 min", category: "Health", repeatDays: [] },
      { name: "Journal", category: "Personal", repeatDays: [] },
      { name: "Walk outside", category: "Lifestyle", repeatDays: [] },
      { name: "Gratitude note", category: "Personal", repeatDays: [] },
    ],
  },
];
