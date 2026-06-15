// Titles & ranks. Titles unlock automatically from level (which is derived
// from history-based XP) and can't be manually selected. The current title is
// the highest one whose level requirement is met.

export type Rank = "Beginner" | "Intermediate" | "Advanced" | "Expert" | "Legendary";

export interface Title {
  name: string;
  rank: Rank;
  minLevel: number;
}

// Ordered by minLevel ascending. Current title = last entry with minLevel <= level.
export const TITLES: Title[] = [
  { name: "Habit Newbie", rank: "Beginner", minLevel: 1 },
  { name: "Getting Started", rank: "Beginner", minLevel: 2 },
  { name: "Procrastination Survivor", rank: "Beginner", minLevel: 3 },

  { name: "Consistency Apprentice", rank: "Intermediate", minLevel: 5 },
  { name: "Daily Grinder", rank: "Intermediate", minLevel: 7 },
  { name: "Momentum Builder", rank: "Intermediate", minLevel: 9 },
  { name: "Focus Seeker", rank: "Intermediate", minLevel: 11 },

  { name: "Discipline Warrior", rank: "Advanced", minLevel: 13 },
  { name: "Productivity Knight", rank: "Advanced", minLevel: 15 },
  { name: "Habit Specialist", rank: "Advanced", minLevel: 17 },
  { name: "Self-Mastery Candidate", rank: "Advanced", minLevel: 19 },

  { name: "Consistency Master", rank: "Expert", minLevel: 21 },
  { name: "Discipline Commander", rank: "Expert", minLevel: 25 },
  { name: "Habit Champion", rank: "Expert", minLevel: 29 },
  { name: "Elite Performer", rank: "Expert", minLevel: 33 },

  { name: "Gigachad", rank: "Legendary", minLevel: 36 },
  { name: "Unstoppable", rank: "Legendary", minLevel: 40 },
  { name: "Self-Mastery Legend", rank: "Legendary", minLevel: 45 },
  { name: "Habit Overlord", rank: "Legendary", minLevel: 50 },
  { name: "Legendary Achiever", rank: "Legendary", minLevel: 60 },
];

export interface TitleInfo {
  current: Title;
  next: Title | null;
  levelsToNext: number | null; // levels remaining until the next title
}

export function titleForLevel(level: number): TitleInfo {
  let current = TITLES[0];
  let next: Title | null = null;
  for (const t of TITLES) {
    if (t.minLevel <= level) {
      current = t;
    } else {
      next = t;
      break;
    }
  }
  return {
    current,
    next,
    levelsToNext: next ? next.minLevel - level : null,
  };
}
