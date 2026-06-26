# System Features — project_101

Comprehensive documentation of every feature in the habit tracking app.

---

## 1. Core Habit Tracking

### Today Page (`/today`)

- **Daily habit marking** — tap buttons to cycle: unmarked → done → missed → skipped
- **Category-grouped layout** — habits organized by category with visual section headers
- **Upcoming habits** — time-ordered list of today's scheduled habits
- **Quick daily note** — inline text area for a date-keyed journal entry
- **Progress ring** — circular completion percentage for today

### Tracker Grid (`/tracker`)

- **Spreadsheet-style grid** — rows = habits, columns = dates (7/14/30 day views)
- **Tap to mark** — single-tap cycling through mark states
- **Visual density** — color-coded cells show mark status at a glance
- **Scrollable** — horizontal scroll for more dates, vertical for more habits

### Calendar (`/calendar`)

- **Month/Week views** — toggle between monthly grid and weekly row
- **Completion shading** — each day cell shows circular progress with color progression
- **Day detail panel** — selected day shows scheduled habits with marks, notes, and goal deadlines
- **"Now" indicator** — live time marker in day detail for today's habits
- **Editable past days** — within grace window (configurable up to 8 hours)

### Manage Habits (`/habits`)

- **CRUD operations** — create, read, update, delete habits
- **Archive/Restore** — soft-delete habits preserving their history
- **Duplicate** — copy existing habit as a template
- **Search + Filter** — search by name, filter by category
- **Pagination** — 7 habits per page with prev/next navigation
- **Priority labels** — low/medium/high with color coding
- **Schedule display** — shows recurrence pattern and next scheduled days
- **Keyboard shortcut** — `n` key opens add habit modal

### Categories

- **9 built-in categories** — Workout, Studies, Work, Health, Lifestyle, Hobbies, Finance, Chores, Personal
- **Custom categories** — user-defined categories via Settings UI
- **Color-coded** — each category has a unique accent color

---

## 2. Statistics & Analytics

### Stats Page (`/stats`)

- **Period selector** — 7/30/90 day ranges
- **5 stat cards** — Completion %, Consistency %, Done count, Best streak, Current streak
- **Interactive trend chart** — SVG line chart with data points
- **Last 7 days** — bar chart visualization
- **Top categories** — ranked by completion rate with progress bars
- **By weekday** — completion breakdown per day of week
- **Insights** — plain-language observations (e.g., "You're 15% more consistent on Tuesdays")
- **Habit correlations** — co-occurrence analysis showing habits done together
- **Prediction engine** — estimated completion %, projected streak, XP per day, level-up ETA

### Dashboard (`/dashboard`)

- **Progress widgets** — 6 fixed cards (XP/Level, Badge Collection, Current Streak, Recent Achievements, Next Milestone, Weekly Trend)
- **Today summary** — completion ring, done/remaining counts, time-of-day indicator
- **4 stat cards** — 14-day consistency, current/best streaks, active habits
- **Insights section** — same smart observations as stats page

---

## 3. Goals & Notes

### Goals (`/goals`)

- **Target tracking** — set targets with current progress (e.g., "Read 20 books")
- **Progress bars** — visual completion with percentage
- **Milestones** — sub-goals at specific progress thresholds
- **Deadlines** — date-linked goals
- **Category association** — link goals to habit categories
- **Quick increment/decrement** — ±1 buttons for rapid progress updates

### Notes (`/notes`)

- **Rich journal entries** — body text with timestamps
- **Tag system** — filterable tags for organization
- **Date linking** — associate notes with specific dates (shown in Calendar)
- **Habit/goal linking** — attach notes to specific habits or goals
- **Search** — full-text search across all notes
- **Pagination** — 12 notes per page

---

## 4. Gamification

### XP & Levels

- **XP sources** — 10 XP per completion, 25 XP per perfect day, milestone bonuses
- **Level curve** — super-linear progression (harder to level up as you advance)
- **Level-up bonuses** — coins rewarded at each new level
- **XP bar** — animated progress toward next level on Dashboard and Profile

### Achievements (28 total)

- **5 categories** — Streak, Completion, Consistency, Category, Special
- **4 rarities** — Common, Rare, Epic, Legendary (with medal icons)
- **Progress tracking** — each achievement shows current/target progress
- **Next achievable** — top 3 closest locked achievements on the gallery page
- **Celebration popups** — full-screen/centered animations on unlock with confetti

### Titles & Ranks

- **20 titles across 5 ranks** — from "Rookie" (Rank I) to "Titan" (Rank V)
- **Rank avatars** — unique SVG avatars per rank
- **Title display** — shown on profile, can be previewed in Titles modal
- **Automatic progression** — titles unlock at level thresholds

### Profile (`/profile`)

- **Character page** — banner, rank avatar, display name, bio, motto
- **Showcase** — favorite badge, best achievement, current title, longest streak, most-completed habit
- **Badge collection** — gallery of all unlocked achievement badges
- **Stats summary** — level, XP progress, achievement counts

### Streaks

- **Current & best streaks** — tracked per habit and globally
- **Tiered flames** — visual flame icons scale with streak length (small/medium/large)
- **Flicker animation** — organic flame flicker via CSS keyframes
- **Streak freeze** — purchaseable item that protects one missed day (see Economy)

---

## 5. Economy & Shop

### Coins

- **Derived from history** — never stored as a counter (anti-cheat)
- **Sources** — 2 coins per completion, 10 coins per perfect day, achievement rarity bonuses, level-up bonuses, streak milestone rewards
- **Balance** = earned coins + bonus coins − spent coins (clamped ≥ 0)

### Shop (`/shop`)

- **Cosmetics** — flame skins (7), confetti palettes (7), accent themes (10+)
- **Streak freeze** — consumable item protecting one genuine miss
- **Level gates** — some items require minimum level
- **Owned/equipped tracking** — purchased items tracked, can be equipped/unequipped

### Engagement Features

- **Daily check-in** — streak-based coin bonus (popup on Today page)
- **Daily quests** — randomized challenges (e.g., "Complete 5 habits") with coin rewards
- **Daily spin** — weighted wheel-of-fortune with coin rewards and streak freeze consolation prize

---

## 6. Templates

### Starter Routines (`/templates`)

- **8 templates** — Morning Routine, Student, Gym, Wellbeing, Evening Wind-Down, Productivity Max, Mindful Living, Health Optimizer, Creative Spark
- **Difficulty labels** — Beginner/Intermediate/Advanced
- **Preview modal** — see full habit list and benefits before applying
- **One-tap apply** — adds all habits from template at once
- **Used tracking** — templates disappear from available after use (re-enable from Settings)
- **3×2 grid** with pagination

---

## 7. UI/UX

### Design System

- **Light theme** — warm cream tones (off-white surfaces, warm shadows)
- **Dark theme** — rich charcoal with purple undertones
- **Accent colors** — 10+ accent presets (blue, violet, cyan, emerald, rose, amber, etc.)
- **Motion tokens** — CSS variable-based easing and duration system
- **Animation keyframes** — fade-in, rise, pop, shimmer, flicker, glow-pulse, burst, toast, celebrate-in, icon-wiggle/bounce/pulse
- **Card system** — rounded-2xl borders, backdrop blur, hover lift effects, glow variants
- **Responsive layout** — sidebar on desktop, bottom nav on mobile, max-width content area

### Page Transitions

- **AnimatePresence** — fade + slide (8px) animation between routes
- **Micro-interactions** — motion.div spring animations on cards (`whileHover`) and buttons (`whileTap`)
- **Staggered entrances** — children animate in sequentially via motion variants on dashboard insights, stats cards, habits list, and achievements grid

### Navigation

- **Sidebar** — desktop icon+label nav with active highlighting, icon animations, notification bell (unread count badge), and logout button
- **Bottom nav** — mobile-optimized tab bar with 5 primary destinations + scrollable secondary chip bar with 10 extra destinations (Habits, Goals, Friends, Leaderboard, Notifications, Shop, Achievements, Notes, Templates, Suggestions)
- **Keyboard shortcuts** — `g+d` Dashboard, `g+t` Today, `g+h` Habits, `g+r` Tracker, `g+s` Stats, `g+c` Calendar, `g+a` Achievements, `g+p` Profile, `g+o` Shop, `g+n` Notes, `g+g` Goals, `g+l` Settings, `?` help, `n` new habit, Ctrl+Z/Ctrl+Shift+Z undo/redo

---

## 8. Social Features

### Friends (`/friends`)

- **User search** — search by name or username with debounced results (ILike, 300ms debounce)
- **Friend requests** — send, accept, and decline requests with loading states
- **Friend list** — all accepted friends with links to their public profiles
- **Request notifications** — pending requests shown prominently with count badge (rose-500)
- **Notification wiring** — friend request notifications auto-created on send (to addressee) and on accept (to requester)
- **RLS** — Insert by requester, Update by addressee, Delete by either party

### Public Profiles (`/profile/[username]`)

- **View other users** — see display name, username, bio, motto, rank avatar, banner
- **Stats display** — level, current/best streaks, consistency %, total completions, achievements count, title name/rank icon
- **Live stats** — stats come from `user_stats_snapshots` table (refreshed on every sync)
- **Friend button** — add friend directly from profile page with notification
- **Self-redirect** — visiting your own username redirects to your profile page

### Leaderboard (`/leaderboard`)

- **Rankings** — top 50 users sorted by selected metric
- **4 sort tabs** — Level, Streak (current), Consistency (14-day), Completions (total)
- **Podium** — 🥇🥈🥉 medals for top 3 positions
- **Current user** — highlighted row with "You" badge and crown icon
- **Data source** — `user_stats_snapshots` table with profile joins

### Notifications System

- **NotificationBell** — bell icon in sidebar header with live unread count badge (rose-500, 99+ overflow)
- **Notifications page** (`/notifications`) — full history with read/unread styling, time ago timestamps
- **Types** — friend_request (UserPlus icon), friend_accept (UserCheck), achievement (Trophy), system (Sparkles)
- **Mark all read** — batch mark button for bulk operations
- **Auto-refresh** — 30s polling + visibilitychange listener keeps badge current
- **Create utility** — `lib/notifications.ts` for client-side notification creation

### Suggestions (`/suggestions`)

- **Categorized feedback** — General, Feature Request, Improvement, Bug Report, Other
- **Submission form** — title, body, and category picker
- **History** — all past suggestions with status tracking (New, Read, Acknowledged, Completed, Declined)
- **Thank-you flow** — success confirmation after submission

## 9. Authentication & Security

### Route Architecture

| Route                 | Access    | Description                  |
|-----------------------|-----------|------------------------------|
| `/`                   | Public    | Landing page                 |
| `/login`              | Public    | Sign in form                 |
| `/register`           | Public    | Create account               |
| `/dashboard`          | Protected | Main dashboard               |
| `/today`              | Protected | Daily habit marking          |
| `/habits`             | Protected | Manage habits                |
| `/tracker`            | Protected | Spreadsheet tracker grid     |
| `/calendar`           | Protected | Month/week views             |
| `/stats`              | Protected | Analytics and insights       |
| `/goals`              | Protected | Goal tracking                |
| `/notes`              | Protected | Journal entries              |
| `/templates`          | Protected | Starter routines             |
| `/achievements`       | Protected | Achievement gallery          |
| `/shop`               | Protected | Cosmetics + streak-freeze    |
| `/profile`            | Protected | Character page                |
| `/friends`            | Protected | Friend search and requests   |
| `/leaderboard`        | Protected | User rankings                |
| `/notifications`      | Protected | Notification history         |
| `/suggestions`        | Protected | Feedback submission          |
| `/settings`           | Protected | Preferences and data tools   |
| `/offline`            | Public    | PWA offline fallback         |

### Layout Architecture

- **Root layout** (`app/layout.tsx`): HTML setup, theme injection, service worker, `RootSyncWrapper`
- **No route groups** — pages are at root level (flat directory structure)
- **App pages** (dashboard, today, habits, etc.) wrap content in `<AppPageShell>` which provides `AppShell` (sidebar, bottom nav, decorations)
- **SyncProvider** lives in `RootSyncWrapper` at the root layout level so it persists across page navigations (doesn't remount on route changes)
- **Auth pages** (login, register) at root level with own full-page layout

### Auth Flow

- **Supabase Auth** (email/password) — sessions managed via secure cookies
- **proxy.ts** — Next.js 16 proxy (replaces middleware.ts) handles:
  - Session refresh on every request (`getUser()` server-side verification)
  - Redirects unauthenticated users to `/login`
  - Redirects authenticated users away from `/login`/`/register` to `/dashboard`
- **Login**: Professional form with show/hide password, Remember Me toggle, user-friendly error mapping
- **Register**: Auto-login after successful signup (email confirmation disabled), display name optional
- **Logout**: Button in sidebar with hard redirect to landing page

### Remember Me

- **Checked (opt-in)**: Session persists across browser restarts via localStorage flag + Supabase cookies. Email is saved and auto-filled on return visits.
- **Unchecked (default)**: User is signed out on tab close — a `useAuth` hook monitors the flag on page load and signs out if missing. Local app data is cleared on sign-out to prevent data leakage between users.

### Session Handling

- **Token refresh**: Proxy calls `getUser()` on every request to refresh expired tokens
- **Auto-logout**: Expired/invalid sessions are silently redirected to `/login`
- **Auth state changes**: `useAuth` hook subscribes to `onAuthStateChange` for real-time updates
- **Hard navigation**: Login/register use `window.location.href` instead of `router.push()` to ensure proxy runs on redirect

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

---

## 10. Drizzle ORM (Server-Side Queries)

- **drizzle-orm** + **drizzle-kit** installed for type-safe server queries
- **Schema** (`src/lib/drizzle/schema.ts`) — full TypeScript definitions for all 15+ tables
- **Cross-schema references** — `auth.users` referenced via `pgSchema("auth")`
- **Config** (`drizzle.config.ts`) — configured for Supabase Postgres
- Run `npx drizzle-kit generate` to produce migration SQL
- Run `npx drizzle-kit push` to sync schema to Supabase (dev only)
- Requires `DATABASE_URL` env var (Supabase connection string with pgBouncer)

## 11. Performance Optimizations

### Rendering

- **React.memo** — 11 components: StatCard, ProgressBar, ProgressRing, CoinChip, EmptyState, Pagination, Segmented, StreakFlame, AchievementBadge, TrackerCell, CircularProgress
- **useMemo** — heavily used across all pages for derived data
- **useAppDataSelector** — granular subscriptions (StreakFlame only re-renders on equipped flame change)
- **Stabilized callbacks** — useCallback on handler functions

### Data

- **Debounced saves** — high-frequency mark toggles batched with 100ms debounce; immediate saves for destructive actions
- **Lazy-loaded Confetti** — React.lazy() + Suspense
- **Zod validation** — importJSON validated with strict schema before data load

---

## 12. PWA & Offline

- **Web app manifest** — standalone display, SVG icons (192×192, 512×512), theme color
- **Service worker** — offline-first caching strategy (network-first for navigation, cache-first for assets)
- **Offline page** — `/offline` route with user-friendly message
- **Apple meta tags** — `apple-mobile-web-app-capable`, `status-bar-style`

---

## 13. Developer Mode

Hidden panel (Ctrl/Cmd+Shift+D) with:

- **General** — theme mode toggle, accent color preview
- **UI Controls** — grid overlay, component outlines, reduce motion
- **Performance** — FPS meter, state logging
- **Database Tools** — raw JSON editor, import/export, seed data generator, data wipe
- **User Controls** — grace hours, force onboarding
- **System Info** — runtime stats, version info

---

## 14. Data Management

### Persistence

- **localStorage** — single key (`project101.data.v1`), schema v6
- **Schema migration** — automatic forward migration on load
- **Sanitized loading** — all records validated and malformed entries dropped

### Export/Import

- **CSV export** — habit marks as spreadsheet-compatible CSV
- **JSON backup** — full app data export for safekeeping
- **JSON import** — restore from backup with Zod schema validation

### Reset

- **Clear all data** — preserves settings and profile identity

---

## 15. Accessibility

- **aria-current="page"** — on active navigation links
- **aria-labels** — on all interactive elements (buttons, inputs, icon buttons)
- **:focus-visible** — global focus outline with accent color
- **prefers-reduced-motion** — blanket media query disables all animations
- **Touch targets** — 44px minimum hit area via pseudo-element on MarkButton and IconBtn
- **Keyboard navigation** — tab-through forms, shortcut keys, modal focus trapping
- **Color contrast** — themed color tokens meet WCAG AA standards

---

## 16. Testing

- **81 unit tests** across 5 files:
  - `storage.test.ts` (18) — data load/save, migration, sanitization
  - `stats.test.ts` (17) — streak math, completion calculations, correlations
  - `celebrations.test.ts` (12) — celebration queuing and acknowledgment
  - `economy.test.ts` (18) — coin derivation, shop logic, freeze rules
  - `gamification.test.ts` (16) — XP, levels, achievements, titles
- **Vitest** — fast, ESM-compatible test runner
- All tests pass: `npx vitest run`
