<div align="center">

  <h1>🏆 project_101</h1>
  <p><strong>A modern, gamified habit tracker — spreadsheet-style, local-first, beautifully designed.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-16-000?logo=next.js" alt="Next.js 16">
    <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript" alt="TypeScript">
    <img src="https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss" alt="Tailwind CSS v4">
    <img src="https://img.shields.io/badge/Supabase-FFCA28?logo=supabase" alt="Supabase">
    <img src="https://img.shields.io/badge/tests-195-22C55E?logo=vitest" alt="195 tests">
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT">
  </p>

  <br>

  <p><em>Tap a date cell. Mark it done. Watch your streak grow.</em></p>

  <p>
    <a href="#-features">Features</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-tech-stack">Tech Stack</a> •
    <a href="#-architecture">Architecture</a> •
    <a href="#-docs">Docs</a>
  </p>

  <br>

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 📊 Smart Tracker
- **Spreadsheet grid** — habits × dates, tap to cycle marks
- **Rich scheduling** — daily, weekly, monthly, time-of-day
- **Priority levels** — Low, Medium, High
- **Archiving** — hide habits without losing history
- **9 templates** — Gym, Student, Morning, and more

</td>
<td width="50%">

### 🎮 Gamification
- **99 levels** — XP from completions + perfect days
- **28 achievements** — 5 categories × 4 rarity tiers
- **20 titles** — 5 ranks (Beginner → Legendary)
- **Streaks** — per-habit, scheduled-day-aware
- **Engagement** — daily check-in, quests, spin wheel

</td>
</tr>
<tr>
<td width="50%">

### 🪙 Economy & Shop
- **21 cosmetics** — flame skins, confetti palettes, accent themes
- **Coins derived** from history (never stored as a balance)
- **Streak freezes** — protect a streak without rewriting history
- **Level gating** — prestige items unlock at higher levels

</td>
<td width="50%">

### 🛡️ Honest Tracking
- **No cheat possible** — XP, coins, streaks are *derived*
- **Past days lock** after a configurable grace window
- **Immutable history** — your mark record is the source of truth
- **Audit trail** — all habit changes logged

</td>
</tr>
<tr>
<td width="50%">

### 🌐 Local-first + Cloud Sync
- **Works fully offline** — all data in localStorage
- **Optional Supabase sync** — cross-device backups
- **PWA** — installable, service worker, offline fallback
- **No account required** to start tracking

</td>
<td width="50%">

### 🎨 Beautiful UI
- **Dark/Light/System** themes
- **6 accent colors** — Blue, Violet, Cyan, Emerald, Rose, Amber
- **Animations** — with reduced-motion support
- **Celebrations** — toasts, popups, fullscreen confetti
- **Developer mode** — hidden power-user panel (Ctrl+Shift+D)

</td>
</tr>
</table>

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server (Turbopack)
npm run dev          # → http://localhost:3000

# Run tests
npm run test         # 195 tests, 12 suites

# Build for production
npm run build

# Start production server
npm start
```

No Supabase account needed to get started. Everything works locally.

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript 5 (strict) |
| **Styling** | Tailwind CSS v4 (CSS variable theming) |
| **Animation** | motion (Framer Motion successor) |
| **State** | localStorage + `useSyncExternalStore` |
| **Database** | PostgreSQL via Supabase |
| **ORM** | Drizzle ORM + Drizzle Kit |
| **Auth** | Supabase Auth (SSR) |
| **Testing** | Vitest 4 (195 tests) |
| **Linting** | ESLint 9 + Knip |
| **Icons** | Lucide React |
| **Validation** | Zod |
| **Toasts** | Sonner |

---

## 🏗️ Architecture

```
User Action  →  Component  →  Store (store.ts)
                                  ↓
                   localStorage (persist)  ←  Pure Functions
                                  ↓
                   Supabase Sync (optional)
```

### Core Principles

1. **Local-first** — All data persisted to localStorage. Cloud sync is optional, never required.
2. **Derived state** — XP, coins, streaks, and achievements are computed from immutable mark history by pure functions. Nothing is ever stored as a counter.
3. **Anti-cheat** — Past days lock after a configurable grace window. Once locked, marks cannot be changed.
4. **Incremental sync** — Only changed tables are pushed to Supabase after each mutation.

### Project Structure

```
src/
├── app/              # 21 Next.js App Router pages
├── components/       # ~40 reusable UI components
├── hooks/            # 5 custom React hooks
└── lib/              # ~30 pure business logic modules
    ├── store.ts      # Reactive state store
    ├── storage.ts    # localStorage persistence (schema v6)
    ├── achievement   # 28 achievements engine
    ├── economy.ts    # Coin derivation & shop
    ├── xp.ts         # XP & leveling
    ├── stats.ts      # Scheduling & streaks
    ├── progress.ts   # Progress summary facade
    └── supabase/     # Client, session, sync

docs/                 # Full project documentation
├── ARCHITECTURE.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── FINAL_BUILD_PLAN.md
├── SECURITY.md
├── SYSTEM_FEATURES.md
└── TOOLS_USED.md
```

---

## 🧪 Testing

**195 unit tests** across 12 suites covering:

| Suite | What's tested |
|-------|---------------|
| `basic.test.ts` | Core data transforms, scheduling logic |
| `stats.test.ts` | Completion stats, consistency scores |
| `storage.test.ts` | Schema migration, data persistence |
| `economy.test.ts` | Coin derivation, shop, engagement |
| `xp.test.ts` | XP calculation, level info, edge cases |
| `gamification.test.ts` | Achievements, titles, ranks |
| `policy.test.ts` | Anti-cheat `canEditMark()`, grace window |
| `celebrations.test.ts` | Celebration queue, seen-markers |
| `marks.test.ts` | Mark status cycle through all states |
| `insights.test.ts` | `todayHeadline()`, `buildInsights()` |
| `format.test.ts` | Schedule text, time formatting |
| `util.test.ts` | `cn()` class merging, `uid()` generation |

```bash
npm run test          # Run all tests
npm run test:watch    # Watch mode (TDD)
```

---

## ☁️ Supabase Cloud Sync

Optional cloud features for cross-device use:

```bash
cp .env.example .env.local
# Add your Supabase URL and anon key
```

- **Auth** — Email/password via Supabase Auth (SSR)
- **Database** — 6 migration files, RLS-protected
- **Sync** — Push/pull with conflict resolution

All features work without Supabase. It's purely additive.

---

<div align="center">
  <p>
    <sub>Built with ❤️ using Next.js, TypeScript, and Tailwind CSS</sub>
  </p>
  <p>
    <a href="https://codebuff.com">Codebuff</a> •
    <a href="https://supabase.com">Supabase</a> •
    <a href="https://vercel.com">Vercel</a>
  </p>
</div>
