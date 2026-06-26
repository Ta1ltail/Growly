// Drizzle ORM schema — mirrors the Supabase tables defined in migrations.
// Import this file in server components and API routes for type-safe queries.
// Run `npx drizzle-kit generate` to produce migration SQL from this schema.

import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Reference to auth.users (for foreign keys) ──────
// Defined FIRST so every table below can reference it via lazy callbacks.
// auth.users is managed by Supabase Auth (auth schema), not by our migrations.
// The `schema` callback tells Drizzle to prefix the table as "auth"."users".
export const authUsers = pgTable(
  "users",
  { id: uuid("id").primaryKey() },
  () => ({ schema: "auth" }),
);

// ── Habits ──────────────────────────────────────────
export const habits = pgTable(
  "habits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull(),
    repeatDays: integer("repeat_days").array().notNull().default(sql`'{}'::int[]`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    recurrence: jsonb("recurrence"),
    startDate: date("start_date"),
    timeOfDay: text("time_of_day"),
    priority: text("priority"),
    archived: boolean("archived").notNull().default(false),
    reminder: jsonb("reminder"),
  },
  (table) => [
    index("idx_habits_user_id").on(table.userId),
  ],
);

// ── Marks ───────────────────────────────────────────
export const marks = pgTable(
  "marks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    dateKey: date("date_key").notNull(),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["done", "missed", "skipped"] }).notNull(),
  },
  (table) => [
    uniqueIndex("marks_user_date_habit_key").on(
      table.userId,
      table.dateKey,
      table.habitId,
    ),
    index("idx_marks_user_id").on(table.userId),
    index("idx_marks_habit_id").on(table.habitId),
    index("idx_marks_date_key").on(table.dateKey),
  ],
);

// ── Notes ───────────────────────────────────────────
export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    body: text("body").notNull(),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    links: jsonb("links").notNull().default(sql`'{}'::jsonb`),
  },
  (table) => [index("idx_notes_user_id").on(table.userId)],
);

// ── Goals ───────────────────────────────────────────
export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    target: integer("target").notNull(),
    current: integer("current").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    category: text("category"),
    deadline: date("deadline"),
    linkedHabitIds: uuid("linked_habit_ids").array().default(sql`'{}'::uuid[]`),
    milestones: jsonb("milestones"),
  },
  (table) => [index("idx_goals_user_id").on(table.userId)],
);

// ── User Settings (single row per user) ─────────────
export const userSettings = pgTable(
  "user_settings",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    themeMode: text("theme_mode", { enum: ["light", "dark", "system"] })
      .notNull()
      .default("dark"),
    themeAccent: text("theme_accent").notNull().default("blue"),
    graceHours: integer("grace_hours").notNull().default(5),
    usedTemplateIds: text("used_template_ids")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    widgetOrder: text("widget_order").array(),
    onboardingComplete: boolean("onboarding_complete").notNull().default(false),
    customCategories: text("custom_categories")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
  },
);

// ── User Profile (single row per user) ──────────────
export const userProfile = pgTable(
  "user_profile",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    username: text("username").notNull(),
    bio: text("bio"),
    motto: text("motto"),
    avatar: text("avatar"),
    banner: text("banner"),
    showcaseBadgeId: text("showcase_badge_id"),
  },
);

// ── Unlocks (achievement unlocks) ───────────────────
export const unlocks = pgTable(
  "unlocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    achievementId: text("achievement_id").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    seen: boolean("seen").notNull().default(false),
  },
  (table) => [
    uniqueIndex("unlocks_user_achievement_key").on(
      table.userId,
      table.achievementId,
    ),
    index("idx_unlocks_user_id").on(table.userId),
  ],
);

// ── Economy State (single row per user) ─────────────
export const economyState = pgTable(
  "economy_state",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    owned: text("owned").array().notNull().default(sql`'{}'::text[]`),
    equipped: jsonb("equipped").notNull().default(sql`'{}'::jsonb`),
    bonusCoins: integer("bonus_coins").notNull().default(0),
    lastCheckIn: date("last_check_in"),
    checkInStreak: integer("check_in_streak").notNull().default(0),
    lastQuestDate: date("last_quest_date"),
    currentQuest: jsonb("current_quest"),
    lastSpinDate: date("last_spin_date"),
    lastSpinResult: jsonb("last_spin_result"),
  },
);

// ── Economy Spent (append-only ledger) ──────────────
export const economySpent = pgTable(
  "economy_spent",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    amount: integer("amount").notNull(),
    item: text("item").notNull(),
  },
  (table) => [index("idx_economy_spent_user_id").on(table.userId)],
);

// ── Economy Freezes (streak-freeze log) ─────────────
export const economyFreezes = pgTable(
  "economy_freezes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    date: date("date").notNull(),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
  },
  (table) => [index("idx_economy_freezes_user_id").on(table.userId)],
);

// ── Progress Seen (celebration markers, single row) ─
export const progressSeen = pgTable(
  "progress_seen",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    seeded: boolean("seeded").notNull().default(false),
    level: integer("level").notNull().default(1),
    title: text("title").notNull().default("Habit Newbie"),
    shop: text("shop").array().notNull().default(sql`'{}'::text[]`),
    streaks: jsonb("streaks").notNull().default(sql`'{}'::jsonb`),
    tierUnlocks: text("tier_unlocks")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
  },
);

// ── Friends ─────────────────────────────────────────
export const friends = pgTable(
  "friends",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requester: uuid("requester")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    addressee: uuid("addressee")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["pending", "accepted", "blocked"],
    })
      .notNull()
      .default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("friends_pair_key").on(table.requester, table.addressee),
    index("idx_friends_requester").on(table.requester),
    index("idx_friends_addressee").on(table.addressee),
  ],
);

// ── Suggestions / Feedback ──────────────────────────
export const suggestions = pgTable(
  "suggestions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    title: text("title").notNull().default(""),
    body: text("body").notNull(),
    category: text("category", {
      enum: ["general", "bug", "feature", "improvement", "other"],
    })
      .notNull()
      .default("general"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: text("status", {
      enum: ["new", "read", "acknowledged", "completed", "declined"],
    })
      .notNull()
      .default("new"),
  },
  (table) => [index("idx_suggestions_user_id").on(table.userId)],
);

// ── User Stats Snapshots (for public profiles) ──────
export const userStatsSnapshots = pgTable(
  "user_stats_snapshots",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    level: integer("level").notNull().default(1),
    currentStreak: integer("current_streak").notNull().default(0),
    bestStreak: integer("best_streak").notNull().default(0),
    totalCompletions: integer("total_completions").notNull().default(0),
    consistency14d: integer("consistency_14d").notNull().default(0),
    achievementCount: integer("achievement_count").notNull().default(0),
    titleName: text("title_name").notNull().default("Habit Newbie"),
    rankIcon: text("rank_icon").notNull().default("⬡"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);


