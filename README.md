<div align="center">

# 🌱 Growly

### Make Today Count.

*A modern habit tracker and personal growth platform that helps you build better habits, stay consistent, and achieve your goals through productivity, gamification, and social accountability.*

<p>

<img src="https://img.shields.io/badge/Next.js-16.2.9-000?logo=next.js" alt="Next.js">
<img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript">
<img src="https://img.shields.io/badge/Tailwind-v4-06D6D4?logo=tailwindcss" alt="Tailwind CSS">
<img src="https://img.shields.io/badge/Tests-313_%E2%9C%85-22c55e" alt="Tests 313">
<img src="https://img.shields.io/badge/License-MIT-blue" alt="MIT">

</p>

<p>

<a href="#-features">Features</a> •
<a href="#-getting-started">Getting Started</a> •
<a href="#-tech-stack">Tech Stack</a> •
<a href="#-project-stats">Project Stats</a> •
<a href="#-documentation">Documentation</a>

</p>

</div>

---

# 📖 Overview

Habit tracker with gamification, analytics, and cloud sync.

Whether you're building healthy habits, managing routines, organizing tasks, tracking goals, or competing with friends, Growly transforms daily progress into an engaging and rewarding experience through gamification, insightful analytics, and social accountability.

**Architecture:** Local-first with optional Supabase cloud sync. All core data lives in localStorage — you own your data. Cloud sync is additive and optional.

---

# ✨ Features

<table>
<tr>
<td width="50%">

### 📅 Habit & Routine

- Spreadsheet-style tracker with tap-to-cycle marks
- Rich scheduling (daily, weekly, monthly, time-of-day)
- Priority levels (Low, Medium, High)
- Archiving (hide without losing history)
- Duplication
- 9 starter habit templates
- Goals & Milestones
- Notes with Markdown
- Calendar (month/week) with live "now" marker

</td>

<td width="50%">

### 🎮 Gamification

- XP & Leveling (99 levels)
- Per-habit streak system with scheduled-day-awareness
- **54 achievements** across 5 categories with 4 rarity tiers
- **20 titles** across 5 ranks (Beginner → Legendary)
- Coin economy with shop cosmetics
- Daily check-in bonus, daily quests, daily spin
- Streak freeze consumables

</td>
</tr>

<tr>
<td width="50%">

### 📊 Analytics

- Statistics Dashboard with trend line chart, bar charts & projections
- Per-category breakdowns with progress bars
- By-weekday completion analysis
- Interactive trend chart with hover tooltips & animated line drawing
- Habit correlations — habits you tend to complete together
- Projection engine: estimated completion, streak, XP, next level timing
- Daily, Weekly & Monthly Reviews
- CSV/JSON import/export

</td>

<td width="50%">

### 👥 Social

- Friends (request/accept flow)
- Public profiles with custom avatars & banners
- Leaderboard (multiple sort modes)
- In-app notifications

</td>
</tr>

<tr>
<td width="50%">

### 🎨 Personalization

- Dark, Light & System themes
- **6 accent colors** (Blue, Violet, Cyan, Emerald, Rose, Amber)
- **12 avatar presets**, **6 banner gradients**
- **22 shop cosmetics** (flame skins, confetti palettes, accent themes)
- Custom profile photos

</td>

<td width="50%">

### 🚀 More

- Anti-cheat Honest Tracking policy
- Developer mode panel (Ctrl+Shift+D)
- Celebration system (toast → popup → fullscreen)
- Offline-first architecture
- Responsive design (sidebar + bottom nav)
- No-flash theme application

</td>
</tr>
</table>

---

# 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev          # → http://localhost:3000

# Full quality check before pushing
npm run typecheck && npm run lint && npm test

# Build for production
npm run build

# Start production server
npm start
```

---

# 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16.2.9 (App Router, Turbopack) |
| **Language** | TypeScript 5 (strict mode) |
| **Styling** | Tailwind CSS v4 |
| **Animations** | CSS Animations + Tailwind |
| **Database** | PostgreSQL (Supabase) |
| **ORM** | Drizzle ORM 0.45.x + Drizzle Kit 0.31.x |
| **Auth** | Supabase Auth (SSR) |
| **Validation** | Zod 4.x |
| **Icons** | Lucide React 1.x |
| **Toasts** | Sonner 2.x |
| **State** | React `useSyncExternalStore` + localStorage |
| **Testing** | Vitest 4.x (unit) + Playwright (E2E) |
| **Linting** | ESLint 9 + Knip |
| **CI** | GitHub Actions (quality → build → E2E) |
| **Hosting** | Vercel (auto-deploy from Git) |
| **Mobile** | Capacitor 7.x (Android APK wrapper) |

---

# 📊 Project Stats

| Metric | Value |
|--------|-------|
| **Routes** | 20 + 1 dynamic + proxy |
| **Components** | 55 across 16 directories |
| **Lib modules** | 29 (131 exported functions) |
| **Custom hooks** | 5 |
| **Unit tests** | **313 passing** (15 files) |
| **E2E tests** | **21 passing** (5 files, 4 skipped without Supabase) |
| **Android APK** | **Signed release** (sideloadable, `android/app/release/app-release.apk`) |
| **TypeScript errors** | **0** |
| **Lint warnings** | **0** |
| **Dead exports (knip)** | **0** |
| **Database tables** | 16 (Supabase PostgreSQL) |
| **Dependencies** | 15 + 13 dev |

---

---

# 🌱 Built With

Growly is built on the belief that lasting change comes from showing up every day. Every completed habit, every maintained streak, and every milestone achieved brings you one step closer to becoming the person you want to be.

---

<div align="center">

## 🌱 Growly

### Make Today Count.

**Build Better Habits • Stay Consistent • Grow Every Day**

</div>