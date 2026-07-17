/**
 * Drizzle ORM schema — mirrors the Supabase tables defined in migrations.
 *
 * This schema is the TypeScript-side definition of our database. Every table,
 * index, and foreign key here corresponds 1:1 to a migration in
 * `supabase/migrations/`.
 *
 * Usage:
 *   - Import in server components and API routes for type-safe queries.
 *   - Run `npx drizzle-kit generate` to produce migration SQL from changes.
 *   - Run `npx drizzle-kit push` to apply schema changes to a local database.
 *
 * Key design decisions:
 *   - All user-owned tables reference `auth.users` via the `authUsers` proxy,
 *     declared through `pgSchema("auth")` so Drizzle emits FKs against the
 *     real `auth.users` table instead of creating a shadow `public.users`.
 *   - `onDelete: "cascade"` ensures cleanup when a user is deleted.
 *   - Indexes are defined inline for query performance (user_id lookups,
 *     unique constraints for upsert operations).
 *   - CHECK constraints are declared with `check()` so `drizzle-kit push`
 *     doesn't treat them as untracked, out-of-band DB objects.
 */

import {
  pgTable,
  pgSchema,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Reference to auth.users (for foreign keys) ──────
// Defined FIRST so every table below can reference it via lazy callbacks.
// auth.users is managed by Supabase Auth (auth schema), not by our migrations.
// pgSchema() is the correct way to point Drizzle at a table living in a
// non-default Postgres schema — passing `{ schema: "auth" }` as a pgTable()
// config does NOT work, since pgTable's third argument is an extraConfig
// callback that must return an array of indexes/constraints, not an options
// object. Using pgSchema avoids silently creating a shadow "public.users".
const authSchema = pgSchema("auth");

export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

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
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_habits_user_id").on(table.userId),
    index("idx_habits_active").on(table.userId).where(sql`${table.deletedAt} IS NULL`),
    check("habits_priority_check", sql`${table.priority} IN ('low','med','high')`),
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
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_notes_user_id").on(table.userId),
    index("idx_notes_active").on(table.userId).where(sql`${table.deletedAt} IS NULL`),
  ],
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
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_goals_user_id").on(table.userId),
    index("idx_goals_active").on(table.userId).where(sql`${table.deletedAt} IS NULL`),
  ],
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
  (table) => [
    check(
      "user_settings_grace_hours_check",
      sql`${table.graceHours} >= 0 AND ${table.graceHours} <= 24`,
    ),
  ],
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
  (table) => [
    uniqueIndex("user_profile_username_key").on(table.username),
    index("idx_user_profile_username").on(table.username),
  ],
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
  (table) => [
    index("idx_economy_spent_user_id").on(table.userId),
    check("economy_spent_amount_check", sql`${table.amount} > 0`),
  ],
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
  (table) => [
    index("idx_economy_freezes_user_id").on(table.userId),
    uniqueIndex("economy_freezes_user_date_habit_key").on(
      table.userId,
      table.date,
      table.habitId,
    ),
  ],
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
    index("idx_friends_requester_status").on(table.requester, table.status),
    index("idx_friends_addressee_status").on(table.addressee, table.status),
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
  (table) => [
    index("idx_suggestions_user_id").on(table.userId),
    index("idx_suggestions_created_at").on(table.createdAt),
  ],
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
  (table) => [
    // Simple descending indexes for leaderboard ORDER BY
    index("idx_stats_level_desc").on(table.level.desc()),
    index("idx_stats_streak_desc").on(table.currentStreak.desc()),
    index("idx_stats_consistency_desc").on(table.consistency14d.desc()),
    index("idx_stats_completions_desc").on(table.totalCompletions.desc()),

    // NOTE: the SQL migration also defines 4 covering indexes
    // (idx_stats_level_cover, idx_stats_streak_cover,
    // idx_stats_consistency_cover, idx_stats_completions_cover) using
    // Postgres' INCLUDE clause for index-only scans on the leaderboard
    // queries. The installed drizzle-orm version's IndexBuilder doesn't
    // expose `.include()`, so they can't be declared here without a type
    // error. They still exist in the database (created by the migration)
    // — this is just a gap in schema.ts's coverage, not a missing DB
    // object. If you upgrade drizzle-orm to a version with covering-index
    // support, add them back with `.on(table.level.desc()).include(...)`.
  ],
);

// ── Notifications ───────────────────────────────────
// NOTE: this table existed in the SQL migration but was missing from the
// previous version of this schema.ts file — added here to restore 1:1 parity.
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: ["friend_request", "friend_accept", "achievement", "system"],
    }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    fromUser: uuid("from_user").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    link: text("link").notNull().default(""),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_notifications_user_id").on(table.userId),
    index("idx_notifications_unread").on(table.userId, table.isRead),
    index("idx_notifications_created_at").on(table.createdAt),
  ],
);