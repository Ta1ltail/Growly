// Starter habit sets the user can add in one tap (Templates page).

import type { Category } from "./categories";

interface TemplateHabit {
  name: string;
  category: Category;
  repeatDays: number[]; // empty = every day
}

export interface Template {
  id: string;
  name: string;
  description: string;
  benefits?: string;
  difficulty?: "Beginner" | "Intermediate" | "Advanced";
  habits: TemplateHabit[];
}

export const TEMPLATES: Template[] = [
  {
    id: "gym",
    name: "Gym Routine",
    description: "Stay consistent with training and recovery.",
    benefits: "Build strength, improve recovery, and establish a consistent fitness routine.",
    difficulty: "Intermediate",
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
    benefits: "Sharpen your focus, retain more information, and ace your studies.",
    difficulty: "Intermediate",
    habits: [
      {
        name: "Study 1 hour",
        category: "Studies",
        repeatDays: [1, 2, 3, 4, 5],
      },
      { name: "Review notes", category: "Studies", repeatDays: [] },
      { name: "Read 30 min", category: "Hobbies", repeatDays: [] },
      {
        name: "No phone before noon",
        category: "Lifestyle",
        repeatDays: [1, 2, 3, 4, 5],
      },
    ],
  },
  {
    id: "morning",
    name: "Morning Routine",
    description: "Start every day with intention.",
    benefits: "Start each day with purpose and set a positive tone for the hours ahead.",
    difficulty: "Beginner",
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
    benefits: "Reduce stress, increase mindfulness, and find calm in your daily life.",
    difficulty: "Beginner",
    habits: [
      { name: "Meditate 10 min", category: "Health", repeatDays: [] },
      { name: "Journal", category: "Personal", repeatDays: [] },
      { name: "Walk outside", category: "Lifestyle", repeatDays: [] },
      { name: "Gratitude note", category: "Personal", repeatDays: [] },
    ],
  },
  {
    id: "evening-winddown",
    name: "Evening Wind-Down",
    description: "End your day with calm and reflection.",
    benefits: "Improve sleep quality, process your day, and wake up refreshed.",
    difficulty: "Beginner",
    habits: [
      { name: "No screens 1hr before bed", category: "Lifestyle", repeatDays: [] },
      { name: "Journal 5 min", category: "Personal", repeatDays: [] },
      { name: "Read fiction 20 min", category: "Hobbies", repeatDays: [] },
      { name: "Stretch / light yoga", category: "Health", repeatDays: [] },
      { name: "Plan tomorrow", category: "Personal", repeatDays: [] },
    ],
  },
  {
    id: "productivity-max",
    name: "Productivity Max",
    description: "Crush your work goals with laser focus.",
    benefits: "Eliminate distractions, maintain deep focus, and ship more work.",
    difficulty: "Advanced",
    habits: [
      { name: "Pomodoro 4x sessions", category: "Work", repeatDays: [1, 2, 3, 4, 5] },
      { name: "Inbox zero", category: "Work", repeatDays: [1, 2, 3, 4, 5] },
      { name: "Top 3 priorities list", category: "Personal", repeatDays: [] },
      { name: "No social media until noon", category: "Lifestyle", repeatDays: [1, 2, 3, 4, 5] },
      { name: "Review weekly goals", category: "Work", repeatDays: [5] },
    ],
  },
  {
    id: "mindful-living",
    name: "Mindful Living",
    description: "Cultivate presence and gratitude every day.",
    benefits: "Reduce anxiety, increase happiness, and build emotional resilience.",
    difficulty: "Beginner",
    habits: [
      { name: "Meditate 10 min", category: "Health", repeatDays: [] },
      { name: "Gratitude journal", category: "Personal", repeatDays: [] },
      { name: "Digital detox 1hr", category: "Lifestyle", repeatDays: [] },
      { name: "Mindful meal (no phone)", category: "Health", repeatDays: [] },
      { name: "Evening reflection", category: "Personal", repeatDays: [] },
    ],
  },
  {
    id: "health-optimizer",
    name: "Health Optimizer",
    description: "Transform your physical and mental well-being.",
    benefits: "More energy, better sleep, stronger body, and sharper mind.",
    difficulty: "Intermediate",
    habits: [
      { name: "Workout 45 min", category: "Workout", repeatDays: [1, 2, 4, 5] },
      { name: "Drink 8 glasses water", category: "Health", repeatDays: [] },
      { name: "Sleep 8 hours", category: "Health", repeatDays: [] },
      { name: "Meal prep / healthy eating", category: "Health", repeatDays: [0] },
      { name: "Walk 10k steps", category: "Workout", repeatDays: [] },
      { name: "Take vitamins", category: "Health", repeatDays: [] },
    ],
  },
  {
    id: "creative-spark",
    name: "Creative Spark",
    description: "Nurture your creative side and explore new passions.",
    benefits: "Unlock creativity, learn new skills, and find joy in creation.",
    difficulty: "Beginner",
    habits: [
      { name: "Create something (write/draw/build)", category: "Hobbies", repeatDays: [] },
      { name: "Learn a new skill 30 min", category: "Studies", repeatDays: [1, 3, 5] },
      { name: "Read inspiring content", category: "Hobbies", repeatDays: [] },
      { name: "Brain dump ideas", category: "Personal", repeatDays: [] },
    ],
  },
];
