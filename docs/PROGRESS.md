# project_101 — Progress

**Last updated:** 2026-06-26

---

## ✅ Phase 1-3: Core App

- Data shape, localStorage persistence, Today page, Tracker grid
- Categories, Statistics, Calendar, Goals, Notes, Templates

## ✅ Gamification + Economy + UI

- XP, 28 achievements, titles/ranks, coins (derived from history)
- Strengths, streaks, celebration popups, confetti, profile
- Shop with cosmetics + streak-freeze consumable
- Light/dark themes, animated nav, touch targets (44px)
- Keyboard shortcuts, undo/redo, onboarding wizard
- CSV/JSON export/import, prediction engine, habit correlations
- PWA + service worker + offline page
- 81 unit tests across 5 files

## ✅ Auth & Sync (2026-06-25)

- Supabase Auth (email/password) with `@supabase/ssr`
- Login/register pages, Remember Me toggle, proxy.ts route protection
- Sync layer: pushMutation (incremental), pullAllUserData (full), pushAllUserData
- Registration data isolation, hard redirect fix, flat route structure
- Improved sync error logging (stack traces + Supabase codes)
- RootSyncWrapper — SyncProvider at root layout level (persists across navigations)

## ✅ Social Features (2026-06-26)

- **Friends** (`/friends`) — search users, send/accept/decline requests, friend list
- **Public profiles** (`/profile/[username]`) — stats (level, streaks, consistency, completions), friend button
- **Suggestions** (`/suggestions`) — categorized feedback form, submission history with status
- **Leaderboard** (`/leaderboard`) — top 50 users, 4 sort tabs (level/streak/consistency/completions), medal icons
- **Notifications** — bell icon in sidebar (30s polling + visibilitychange), `/notifications` page with read/unread, mark-all-read, friend request notifications wired on send and accept
- **Stats snapshot writer** — `saveUserStatsSnapshot()` in db.ts, `refreshStatsSnapshot()` in sync.ts on all 3 push/pull paths
- **Navigation** — sidebar "Social" group (Friends, Leaderboard, Notifications, Suggestions), bottom chip bar

## ✅ Drizzle ORM (2026-06-26)

- `drizzle-orm`, `drizzle-kit`, `postgres` installed
- `drizzle.config.ts` for Supabase Postgres
- `src/lib/drizzle/schema.ts` — schema for all 15+ tables with cross-schema `auth.users` reference

## ❌ Still Unfinished

- Full localStorage → Supabase data migration
- Row Level Security audit
- Zod validation full pipeline
- Social OAuth (Google, GitHub)
- Phase 5: Business & Launch

---

## Quality Gates

**Status: GREEN** — tsc 0 errors, vitest 81/81, build clean
