# project_101 — Redesign Progress & Handoff

Resume state for the gamification/UI redesign. Spec: `docs/script.txt` (the
"Complete UI/UX Redesign & Gamification Specification", 16 sections),
implemented in **7 parts**.

Last updated: 2026-06-16.

---

## How we're working

Architectural rule (locked): **all gamification — XP, levels, streaks,
achievement progress, titles — is COMPUTED from the immutable mark history by
pure functions in `lib/`, never stored as mutable counters.** This keeps it
consistent with the existing Honest Tracking (anti-cheat) policy. The only
persisted gamification state is unlocked-achievement IDs + "seen" flags (for
one-time popups) and the editable profile (schema v3).

Heed `AGENTS.md`: this is a **modified Next.js (16.2.9)** — read
`node_modules/next/dist/docs/` before touching Next-specific APIs. `loading.tsx`
+ Suspense are confirmed valid here. Build ~80s, tsc ~30–55s.

The four gates: `npx tsc --noEmit && npm run lint && npx vitest run && npm run build`.

---

## Part status

| Part | Scope | Status |
|---|---|---|
| 1. Engine | XP, achievements, titles, progress façade, schema v3 | ✅ verified |
| 2. Visual base | Ambient background + animation tokens | ✅ verified |
| 3. Streaks + micro-interactions | Animated flames (S/M/L), completion/counter animations | ✅ verified |
| 4. Achievements UX | Toast/popup/full-screen celebrations, confetti, Achievement Gallery | ✅ verified |
| 5. Progression UI | XP bar, level, title/rank, profile-as-character-page, showcase, next-milestone | ✅ verified |
| 6. Layout/data viz | Dashboard widgets, stats redesign, habits pagination, calendar/tracker alignment | 🟡 in progress |
| 7. Final pass | A11y, 60fps/reduced-motion audit, polish | ☐ |

> **Gates last green: through Part 5 (2026-06-16)** — `tsc` + `lint` +
> `vitest` (46 passing) + `next build` all clean.
> **Part 6 (6a–6c) code is written but UNVERIFIED — gates have NOT been run
> since.** First action next session: run the four gates and fix failures.

---

## ⏭️ Resume here (next session)

1. **Run the gates first** — Part 6a–6c is unverified:
   ```bash
   cd /c/Users/Justin/dev/project_101 && npx tsc --noEmit && npm run lint && npx vitest run && npm run build
   ```
   Watch for: React Compiler lint (`react-hooks/preserve-manual-memoization`)
   wants `useMemo` deps to match the props actually read — use `[data]`, not
   `[data.marks, data.habits]`. Render-phase `setState` for clamping/seeding is
   fine (used in habits pagination + ProfileEditModal).
2. **Finish Part 6:**
   - **6d — Calendar/tracker alignment (spec §13):** align the calendar page's
     two panes (`src/app/calendar/page.tsx`: calendar grid `lg:col-span-3` vs
     day-detail `lg:col-span-2`) to start at the same vertical position with
     consistent heights; responsive pass. Then a spacing/height consistency
     pass on `src/app/tracker/page.tsx`. (NOT started.)
3. **Then Part 7** — a11y + 60fps/reduced-motion audit + polish across the new
   surfaces.

---

## Part 1 — Engine (verified)

- `src/lib/xp.ts` — XP (10/completion, 25/perfect-day, rarity bonuses via
  `RARITY_XP`) + super-linear level curve (`levelInfo`, `xpToAdvance`, max 99).
- `src/lib/achievements.ts` — 28 achievements (5 categories × 4 rarities),
  `buildGameStats` (single history walk), `evaluateAchievements`,
  `RARITY_ORDER`/`RARITY_LABEL`.
- `src/lib/titles.ts` — 20 titles → 5 ranks, `titleForLevel`.
- `src/lib/progress.ts` — `summarizeProgress` (one call → stats/xp/level/title/
  nextMilestones; does NOT include `profile` — read `data.profile`) +
  `reconcileUnlocks`.
- `src/lib/types.ts` — `Rarity`, `AchievementDef`, `Unlocks`, `Profile`,
  `DEFAULT_PROFILE`; `AppData` gained `profile` + `unlocks`.
- `src/lib/storage.ts` — **SCHEMA_VERSION = 3**; `cleanProfile`/`cleanUnlocks`.
- `src/lib/store.ts` — `updateProfile`, `syncAchievements`, `seedUnlocksSeen`,
  `markAchievementsSeen`; `cycleMark` reconciles unlocks; `clearAllData` keeps
  profile.
- Tests: `gamification.test.ts`, `storage.test.ts` (46 total across 3 files).

## Part 2 — Visual base (verified)

- `src/components/AmbientBackground.tsx` — fixed drifting blurred blobs;
  pointer-events-none; both themes; reduced-motion safe. Mounted in `layout.tsx`.
- `src/app/globals.css` — removed scroll-cutting body gradient; base color on
  `<html>`; `--ease-*`/`--dur-*` tokens + `float` keyframe.

## Part 3 — Streaks + micro-interactions (verified)

- `src/components/StreakFlame.tsx` — `flameTier()`: none / small(1–6) /
  medium(7–29) / large(30+). Pure-CSS, reduced-motion safe.
- `src/components/AnimatedCounter.tsx` — rAF count-up, hydration-safe (final
  value on server/first paint), reduced-motion snaps. NOTE: all `setDisplay`
  go through the rAF callback (eslint `react-hooks/set-state-in-effect`).
- `globals.css` — `flicker`/`glow-pulse`/`ember`/`burst` keyframes.
- Wired into `MarkButton`, `today`, `habits`, `tracker`.

## Part 4 — Achievements UX (verified)

- `src/lib/rarity.ts` — `RARITY_STYLE`: per-rarity accent/glow/gradient/ring/
  medal/confettiColors + celebration tier (common→toast, rare/epic→popup,
  legendary→fullscreen).
- `src/components/AchievementBadge.tsx` — collectible badge; locked state;
  legendary conic shine.
- `src/components/celebrations/` — `AchievementToast`, `AchievementPopup`,
  `AchievementCelebration` (full-screen + confetti), `CelebrationManager`
  (derives the queue from unseen unlocks; renders the most prestigious; marks
  seen on dismiss; one-time silent `seedUnlocksSeen` on mount).
- `src/components/layout/AppShell.tsx` — mounts `<CelebrationManager />`.
- `src/app/achievements/page.tsx` + nav link — Achievement Gallery (§14):
  rarity summary, category/status/search filters, locked items show progress.

## Part 5 — Progression UI (verified)

- `src/lib/ranks.ts` — `RANK_STYLE` (icon/accent/glow/gradient/`animated`) +
  `RANK_ORDER`. UI-only, mirrors `rarity.ts`; Legendary = `animated`.
- `src/lib/cosmetics.ts` — emoji `AVATAR_PRESETS` + gradient `BANNER_PRESETS`;
  `resolveAvatar` (preset glyph OR `data:` image URL) / `resolveBanner`.
- `src/components/progression/` — `XpBar` (level + eased XP bar + XP-to-next +
  next unlock), `TitleDisplay` (gradient title, legendary `animate-text-sheen`
  sweep + rank chip), `RankAvatar` (rank border/glow, legendary conic shine,
  emoji or uploaded image), `NextMilestoneWidget` (renders `nextMilestones`).
- `src/components/profile/ProfileEditModal.tsx` — edits displayName/username/
  bio/motto/avatar(preset|upload)/banner/showcaseBadgeId via `updateProfile`;
  re-seeds draft on open via render-phase setState.
- `src/app/profile/page.tsx` — rewritten as character page: banner + RankAvatar
  + @username + animated title + motto/bio + XpBar + stat strip + NextMilestone
  + Showcase (favorite/best badge, title, longest streak, most-completed habit)
  + badge gallery + jump links.
- `globals.css` — `text-sheen` keyframe + `--animate-text-sheen` token.

## Part 6 — Layout/data viz (IN PROGRESS — code written, unverified)

Done (code only, gates NOT run):
- **6a §10 Dashboard widgets** — `src/components/dashboard/DashboardWidgets.tsx`
  (XP/level, current streak, next milestone, this-week bars, badge-collection
  progress, recent achievements). Mounted in `src/app/today/page.tsx` below the
  hero. Reuses XpBar/TitleDisplay/NextMilestoneWidget/StreakFlame/
  AchievementBadge.
- **6b §11 Stats redesign** — `src/components/stats/TrendLineChart.tsx` (SVG
  line + gradient area, `non-scaling-stroke`, HTML-overlay dots + hover
  tooltips, responsive). `src/app/stats/page.tsx` reworked into a 2×2 grid of
  equal-height `StatPanel` cards (Recent trends = line chart, Last 7 days,
  Top categories [scroll], By weekday [scroll]).
- **6c §12 Habits pagination** — `src/components/ui/Pagination.tsx`;
  `src/app/habits/page.tsx` paginates active habits 20/page (`PAGE_SIZE`),
  list scrolls after 12 rows (`SCROLL_AFTER`), page clamps during render so
  filtering can't strand past the end.

NOT done:
- **6d §13 Calendar/tracker alignment** — not started (see Resume step 2).
- Gates not run for any of 6a–6c.

Reusable inventory for remaining work: `StreakFlame`, `AnimatedCounter`,
`AchievementBadge`, `XpBar`, `TitleDisplay`, `RankAvatar`,
`NextMilestoneWidget`, `TrendLineChart`, `Pagination`, `RANK_STYLE`,
`RARITY_STYLE`, `StatCard`, `ProgressBar`, `Segmented`, `Card`, `Modal`.
