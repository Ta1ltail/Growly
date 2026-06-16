# LifeGrid

A spreadsheet-style habit & task tracker — "Excel but better." Tap a date cell to
mark a habit **done / missed / skipped**, organized by life categories, with
streaks, statistics, goals, notes, and a full gamification + economy layer.

Fully local (localStorage) and private — no account required. Cloud sync,
accounts, and payments are future phases (see `docs/FINAL_BUILD_PLAN.txt`).

## Features

- **Tracker grid** — rows = habits, columns = dates; tap to cycle a mark.
- **Today / Calendar / Stats** — daily dashboard, month/week planning, and an
  interactive trends chart with streaks and plain-language insights.
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

## Tech

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 (CSS-variable theming) ·
lucide-react · hand-built SVG charts · localStorage (schema v4) via
`useSyncExternalStore` · Vitest.

> ⚠️ This is a **modified** Next.js. Read `node_modules/next/dist/docs/` before
> using Next-specific APIs — see `AGENTS.md`.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

## Quality gates

Run all four after any change:

```bash
npx tsc --noEmit && npm run lint && npx vitest run && npm run build
```

## Project docs

- `docs/ARCHITECTURE.txt` — folder structure, gamification + economy model, data flow
- `docs/FINAL_BUILD_PLAN.txt` — phases, tech stack, production checklist
- `docs/TODO.txt` — progress checklist
- `docs/PROGRESS.md` — detailed status + file inventory
- `docs/script.txt` — the gamification/UI redesign spec (16 sections)
