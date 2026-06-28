# Suggestions

A running list of improvements, features, and optimizations for project_101.

---

## Database & Performance

- [ ] **Materialized view for leaderboard** — Replace the per-user `user_stats_snapshots` with a materialized view that refreshes on a schedule. This gives real-time read performance and avoids the cron-based stale-snapshot issue entirely.
- [ ] **Webhook-triggered snapshot refresh** — When a user syncs data, trigger an immediate stats snapshot recalc via a Supabase Edge Function or database trigger, instead of waiting for the daily cron.
- [x] **Server-side paginated friends search** — Split into three queries: pending requests (no pagination), accepted count (for pagination), and one page of accepted friends with `.order().range()`. Profiles/stats fetched only for paged + pending users.
- [x] **Covering indexes for leaderboard reads** — Four covering indexes on `user_stats_snapshots` for each sort column (level, current_streak, consistency_14d, total_completions), each `INCLUDE`ing all display columns for index-only scans.
- [ ] **Connection pooling tuning** — Supabase's PgBouncer may be in transaction mode. Check if prepared statements or long-running queries are causing connection churn.
- [x] **Query plan regression monitoring** — `pg_stat_statements` extension enabled via migration 012. Query it via `SELECT query, calls, mean_exec_time, rows FROM extensions.pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 20`.
- [ ] **Archive old marks** — The `marks` table grows unboundedly. Add a monthly archive job that moves marks older than 365 days to a `marks_archive` table, keeping the working table lean.

---

## Authentication & Security

- [ ] **Rate-limit auth endpoints** — Supabase Auth supports email rate limiting config. Ensure password-reset and sign-in endpoints are rate-limited to prevent brute force.
- [ ] **Add CAPTCHA to register/login** — Google reCAPTCHA v3 on the auth forms to prevent bot account creation. Integrates cleanly with Supabase Auth.
- [ ] **Session refresh handling** — `useAuth` calls `getUser()` on mount but doesn't handle the token refresh case. If the refresh token expires (e.g. tab left open for a week), the user gets silently logged out with no error UI.
- [ ] **Audit log server-side** — The current `auditLog` lives in localStorage only. For compliance, consider moving critical events (profile changes, friend actions, purchases) to a server-side table.
- [ ] **Passwordless login option** — Add "magic link" email-only login flow via `supabase.auth.signInWithOtp()` for users who prefer not to manage passwords.

---

## Architecture & Code Quality

- [ ] **Extract a server API layer** — Move Supabase queries from page components (friends, leaderboard, profile, suggestions) into server actions or API routes. This gives a single data-access surface for testing, caching, and rate limiting.
- [ ] **Unify notification creation** — `useNotifications.ts` and `lib/notifications.ts` both call `supabase.from("notifications").insert()`. Consolidate into one `createNotification()` function with server-side validation.
- [ ] **Add E2E tests** — Use Playwright or Cypress to test critical flows: register → create habit → mark done → check leaderboard → add friend → view profile.
- [ ] **Snapshot testing for UI components** — Add `@storybook/test` or Vitest snapshot tests for the 30+ UI components to catch visual regressions.
- [ ] **State machine for sync** — `sync.ts` has 5 states (`idle`, `syncing`, `error`, `offline`) but no state machine. Use XState or a simple reducer to handle edge cases like "push fails during pull" or "offline while syncing."
- [ ] **Dependency cruiser / knip in CI** — Knip already finds unused exports. Add it to CI with a threshold to prevent dead code from accumulating.
- [ ] **Validate all env vars at startup** — Create a `env.ts` module that validates `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, etc. using Zod, throwing a clear error if any are missing.

---

## Features

- [ ] **Habit templates marketplace** — Let users publish habit templates and browse others' (curated). Each template would be a pre-configured habit with name, schedule, category, and recurrence.
- [ ] **Streak freeze cap / economy balance** — Freezes are powerful and currently unbounded. Add a cap (e.g. max 3 active freezes) and integrate with the coin economy (buy freezes with coins).
- [ ] **Habit insights / analytics** — The stats page is good but could show: completion rate by day-of-week, best/worst categories, trend arrows (↑↓), and a "predicted streak" based on recent consistency.
- [ ] **Goal auto-completion** — Goals track current/target but never auto-complete. Add a "Completed!" state with confetti and a notification when `current >= target`.
- [ ] **Push notifications** — Use the Notification API (`navigator.serviceWorker.showNotification()`) to remind users of unmarked habits at their configured `timeOfDay`. The SW is already registered at `app/sw.js/route.ts`.
- [ ] **Dark mode scheduling** — Let users set a schedule for dark/light mode (e.g. dark at sunset, light at sunrise) instead of manual toggle.
- [ ] **Data export as CSV** — The current export is JSON. Add a CSV export option for spreadsheet-friendly downloads.
- [ ] **Bulk habit operations** — Select multiple habits and archive/delete/change-category in one action.
- [ ] **Habit journal** — Attach a short text note to each daily mark (e.g. "Felt tired today" or "Great workout!"). Display these in a timeline view.
- [ ] **Offline-first improvements** — The app already stores data locally. Add a "last synced" timestamp display and a manual "Sync now" button with visual progress.

---

## UI / UX

- [ ] **Responsive table on friends page** — The leaderboard-style table works on desktop but overflows on mobile. Switch to a card layout at small viewports.
- [ ] **Keyboard navigation for habit list** — Arrow keys to move between habits, `Space` to mark, `E` to edit, `Del` to delete (with confirmation).
- [ ] **Loading skeletons everywhere** — Several pages show a `Loader2` spinner during loading. Replace with skeleton matching the page layout for a perceived-speed improvement.
- [ ] **Animated page transitions** — The app uses `motion` (framer-motion) in some places. Add layout animations between route changes using `AnimatePresence`.
- [ ] **Empty state illustrations** — Replace simple icons with lightweight SVG illustrations for empty states (no habits, no friends, no notes, etc.).
- [ ] **Toast notifications for sync errors** — When sync fails, the SyncIndicator shows an icon but there's no toast/notification. Add a toast system for transient errors.
- [ ] **Accessibility audit** — Run axe-core on all pages. Likely issues: missing `aria-label` on icon buttons, low-contrast `text-faint`, no focus indicators on custom selects.
- [ ] **Drag-to-reorder habits** — The widget order is customizable but habits aren't. Add drag-and-drop reordering of the habit list.

---

## Developer Experience

- [ ] **Storybook** — Add Storybook with stories for all 30+ UI components. Useful for visual regression testing and component documentation.
- [ ] **SQLite for local dev** — Running Supabase locally requires Docker. Add a `better-sqlite3` or `libsql` fallback for offline development without Docker.
- [ ] **Script to seed test data** — `lib/devSeed.ts` exists but isn't wired to a CLI script. Add `npm run seed` that populates the local Supabase with realistic test data.
- [ ] **API docs** — Generate OpenAPI/Swagger docs for any server actions/API routes added. Use `zod-to-openapi` for auto-generation from Zod schemas.
- [ ] **Git hooks** — Add `husky` with pre-commit hooks: lint-staged (ESLint + Prettier), type-check only changed files, and test the affected modules.
- [ ] **VS Code workspace settings** — Add `.vscode/settings.json` with format-on-save, ESLint auto-fix, and TypeScript strict mode recommendations.

---

## Monitoring & Observability

- [ ] **Sentry or PostHog** — Add error tracking (Sentry) and product analytics (PostHog) to understand which features users engage with and where errors occur.
- [ ] **Supabase Logs dashboard** — Set up a Supabase Logs query to track average query time, auth error rate, and Realtime connection count. Alert on spikes.
- [ ] **Performance budget** — Use Lighthouse CI to enforce a performance budget: <2s TTI, <100kb JS per page, <3 database queries per page load.
- [ ] **Custom dashboard for the cron job** — The `refresh_stale_snapshots` cron runs daily. Add a Supabase dashboard query that shows how many snapshots it refreshes each run, and alert if it drops to 0.

---

## Internationalization

- [ ] **i18n setup** — Add `next-intl` or similar for multi-language support. Extract all user-facing strings into locale files (en.json, es.json, etc.).
- [ ] **RTL layout support** — Some habit categories use emoji/icon lists that don't reverse in RTL. Test with `dir="rtl"` on the root element.
- [ ] **Date/number formatting** — Use `Intl.DateTimeFormat` and `Intl.NumberFormat` with the user's locale instead of hardcoded `toLocaleDateString("en-US")`.

---

## Testing

- [ ] **Integration tests for sync** — The sync layer (pullAllUserData, pushMutation) has complex logic with error handling. Write integration tests that mock Supabase and verify the full pull→merge→save flow.
- [ ] **Property-based tests for economy** — The economy has coin calculations with bounded/unbounded states. Use `fast-check` to property-test that coin totals are always consistent.
- [ ] **Visual regression tests** — For the celebration system (Confetti, CelebrationManager), visual changes are easy to miss. Add Chromatic or Percy snapshots.
- [ ] **Load test the leaderboard** — With 10k users, the leaderboard query should be <200ms. Write a k6 script that simulates concurrent leaderboard views with realistic user counts.
