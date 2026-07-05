# LifeGrid

A spreadsheet-style habit & task tracker — "Excel but better." Tap a date cell to
mark a habit **done / missed / skipped**, organized by life categories, with
streaks, statistics, goals, notes, and a full gamification + economy + engagement
layer.

Fully local (localStorage) and private — no account required. Cloud sync via
Supabase is available for cross-device use.

## Features

- **Tracker grid** — rows = habits, columns = dates; tap to cycle a mark.
- **Today / Calendar / Stats** — daily dashboard with **engagement features**
  (check-in popup, quest card, spin wheel), month/week planning, and interactive
  trends chart with streaks and plain-language insights.
- **Goals, Notes, Templates** — targets with milestones, daily journal, starter
  routines.
- **Gamification** — XP, levels, 28 achievements (5 categories × 4 rarities),
  titles/ranks, and a character-page profile. All **derived from your mark
  history** by pure functions — never stored as a counter, so it can't be cheated
  or desync from the record (the "Honest Tracking" rule).
- **Coins + Shop** — coins are derived the same way (completions, perfect days,
  achievement bonuses). Spend them on cosmetics (flame skins, confetti palettes,
  app-wide accent themes) and a **streak-freeze** that protects one genuine past
  miss — the miss stays in your history; it just doesn't break the streak.
- **Engagement features** — daily check-in bonus (streak-based coins), daily
  quests (randomized challenges), daily spin wheel (weighted rewards), level-up
  bonuses, and streak milestone rewards.
- **Progression system** — XP bar with next-milestone widget, rank avatars with
  animated title displays, and tiered unlock celebrations (toast → popup →
  fullscreen).
- **Developer Mode** — hidden power-user panel (Ctrl/Cmd+Shift+D): data tools,
  debug overlays, FPS meter, state inspector, and cross-section search.
- **Offline-first PWA** — service worker with network-first strategy and offline
  fallback page. Cache versioned per build for reliable updates.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 (CSS-variable theming) |
| Animation | motion (Framer Motion) |
| Icons | lucide-react |
| State | localStorage via `useSyncExternalStore` (schema v6) |
| Toasts | sonner |
| Validation | Zod |
| ORM (cloud) | Drizzle ORM + Supabase Postgres |
| Auth (cloud) | Supabase Auth (SSR) |
| Testing | Vitest (163 tests across 11 suites) |
| Linting | ESLint + knip (dead code analysis) |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Landing page (server component)
│   ├── layout.tsx          # Root layout with theme no-flash script
│   ├── globals.css         # Design system, animations, theme tokens
│   ├── login/              # Auth pages
│   ├── register/
│   ├── dashboard/          # Authenticated app pages
│   ├── today/
│   ├── tracker/
│   ├── habits/
│   ├── goals/
│   ├── calendar/
│   ├── stats/
│   ├── achievements/
│   ├── shop/
│   ├── profile/
│   ├── settings/
│   ├── friends/
│   ├── leaderboard/
│   ├── notes/
│   ├── notifications/
│   ├── suggestions/
│   ├── templates/
│   ├── offline/            # PWA offline fallback
│   └── sw.js/route.ts     # Build-versioned service worker
├── components/
│   ├── ui/                 # Atomic design system (Button, Card, Modal, etc.)
│   ├── layout/             # AppShell, Sidebar, BottomNav, ThemeApplier
│   ├── habits/             # MarkButton, StreakFlame, HabitForm
│   ├── today/              # CheckInPopup, DailyQuestCard, DailySpinModal
│   ├── achievements/       # AchievementBadge
│   ├── celebrations/       # CelebrationCenter, CelebrationManager, Confetti
│   ├── economy/            # CoinBreakdownCard, CoinChip
│   ├── progression/        # XpBar, RankAvatar, TitleDisplay, TitlesModal
│   ├── stats/              # TrendLineChart
│   ├── sync/               # SyncProvider, SyncIndicator
│   ├── notes/              # NoteEditor
│   ├── devmode/            # DevModePanel + 7 section panels
│   └── [others]/           # Feature-specific components
├── hooks/
│   ├── useAuth.ts          # Supabase auth state management
│   ├── useToday.ts         # Date/time utilities
│   ├── useSync.ts          # Cloud sync hook
│   ├── useNotifications.ts # Notification scheduling
│   └── useKeyboardShortcuts.ts
└── lib/
    ├── types.ts            # Core AppData type definitions
    ├── storage.ts          # localStorage persistence (schema v6)
    ├── store.ts            # State store (useSyncExternalStore)
    ├── util.ts             # cn(), uid(), date helpers
    ├── format.ts           # Habit schedule text, time formatting
    ├── policy.ts           # Anti-cheat "Honest Tracking" rules
    ├── marks.ts            # Mark status cycle logic
    ├── habits.ts           # Habit CRUD + filtering
    ├── history.ts          # Undo/redo stack (50-entry circular buffer)
    ├── stats.ts            # Completion stats, consistency scores
    ├── insights.ts         # Plain-language daily insights
    ├── prediction.ts       # Streak prediction (risk analysis)
    ├── progress.ts         # Progress calculation helpers
    ├── xp.ts               # XP/level derived from history
    ├── achievements.ts     # 28 achievements with criteria
    ├── economy.ts          # Coin derivation + shop logic
    ├── store.ts            # Item definitions, purchase logic
    ├── marks.ts            # Mark status cycle
    ├── celebrations.ts     # Unlock celebration tier logic
    ├── ranks.ts            # Rank definitions
    ├── titles.ts           # Title definitions
    ├── cosmetics.ts        # Avatar/banner presets
    ├── categories.ts       # Habit categories with colors
    ├── notifications.ts    # Notification scheduling
    ├── theme.ts            # Theme mode + accent configuration
    ├── templates.ts        # Starter habit templates
    ├── devmode.ts          # Developer mode settings
    ├── devSeed.ts          # Demo/stress data generators
    ├── export.ts           # JSON/CSV import/export with Zod validation
    ├── rarity.ts           # Rarity tier definitions
    ├── supabase/
    │   ├── client.ts       # Supabase client factory
    │   ├── db.ts           # Drizzle query helpers
    │   ├── proxy.ts        # Auth proxy route helpers
    │   └── sync.ts         # Local↔remote sync engine
    └── drizzle/
        └── schema.ts       # Drizzle ORM schema (mirrors Supabase tables)
```

## Architecture Philosophy

### Local-first
All core data lives in localStorage. The app works completely offline with no
backend. Cloud sync is an enhancement, not a dependency.

### Derived state (Honest Tracking)
XP, levels, coins, streaks, and achievements are **never stored directly**.
They are derived from raw mark history via pure functions. This means:
- You can't cheat by manually editing a counter
- Data is self-consistent — no sync conflicts on derived values
- A full audit trail exists in the mark history

### Anti-cheat policy
- Past days lock automatically based on grace hours
- `canEditMark()` determines editability from day difference + grace window
- Once locked, marks cannot be changed (prevents retroactive streak fixing)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev        # → http://localhost:3000

# Build for production
npm run build

# Start production server
npm start
```

## Quality Gates

Run all four after any change:

```bash
npx tsc --noEmit       # TypeScript strict check
npm run lint           # ESLint
npx vitest run         # 163 tests across 11 suites
npm run build          # Next.js production build
```

## Testing

The project uses **Vitest** with 163 unit tests across 11 test suites:

| Test file | Coverage |
|-----------|----------|
| `lib/stats.test.ts` | Completion stats, consistency scores |
| `lib/storage.test.ts` | Schema migration, data persistence |
| `lib/celebrations.test.ts` | Celebration tier logic |
| `lib/economy.test.ts` | Coin derivation, shop purchases |
| `lib/gamification.test.ts` | XP, levels, achievements |
| `lib/policy.test.ts` | Anti-cheat `canEditMark()`, `isFutureDay()` |
| `lib/xp.test.ts` | `xpToAdvance()`, `totalXp()`, `levelInfo()` edge cases |
| `lib/marks.test.ts` | `nextStatus()` cycle through all states |
| `lib/insights.test.ts` | `todayHeadline()`, `buildInsights()` |
| `lib/format.test.ts` | `habitScheduleText()`, `formatTime()`, `recurrenceText()` |
| `lib/util.test.ts` | `cn()` with conflicting classes, `uid()` structure |

## Supabase / Cloud Sync

The project integrates with Supabase for optional cloud features:

- **Auth**: Email/password authentication with Supabase Auth (SSR)
- **Database**: 12 migration files covering users, habits, marks, notes, goals,
  settings, profiles, unlocks, economy, friends, suggestions, and stats snapshots
- **Sync**: Local-first sync engine with conflict resolution
- **Setup**: Copy `.env.example` to `.env.local` with your Supabase project URL
  and anon key, then run `npx supabase migration up`

For local development without Supabase, all features work via localStorage only.

## PWA / Offline

The app is a fully functional Progressive Web App:
- Service worker with build-versioned cache (auto-evicts stale caches)
- Network-first for navigation, cache-first for static assets
- Offline fallback page
- Manifest with install prompts
- Apple touch icons for iOS home screen

## Dev Mode

Press `Ctrl+Shift+D` (or `Cmd+Shift+D`) to open the developer panel with:

- **General**: Logging, motion reduction, keyboard shortcut toggle
- **Database Tools**: Raw JSON editor, JSON/CSV export/import, seeded data
- **User Controls**: Strength/weakness overrides, onboarding reset
- **Performance**: FPS meter, re-render tracking
- **UI Controls**: Theme/accent testing, animation visualization
- **Debug Tools**: Celebration triggers, state logging, error boundary test
- **System Info**: Viewport, storage quota, CPU cores, React version
