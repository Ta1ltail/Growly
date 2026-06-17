# project_101 — Redesign Progress & Handoff

Resume state for the gamification/UI redesign. Spec: `docs/script.txt` (the
"Complete UI/UX Redesign & Gamification Specification", 16 sections),
implemented in **7 parts**.

Last updated: 2026-06-18.

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
| 6. Layout/data viz | Dashboard widgets, stats redesign, habits pagination, calendar/tracker alignment | ✅ verified |
| 7. Final pass | A11y, 60fps/reduced-motion audit, polish | ✅ verified |

> **Gates last green: through Part 7 (2026-06-16)** — `tsc` + `lint` +
> `vitest` (46 passing) + `next build` all clean. **All 7 parts complete.**

---

## ✅ Engagement Features (Phases 2–6 — 2026-06-18)

After the redesign + economy, 5 new engagement features were added to make daily
habit tracking more rewarding. All integrate with the existing coin economy and
celebrations system.

**Gates green 2026-06-18:** `tsc` + `lint` + `vitest` (81 passing) all clean.

### Phase 2: Level-up Unlockables

Bonus coins earned automatically at each level (5 → 100+ coins). Pure function of
level — included in `coinsEarned()` via `levelUpBonus()`. No storage needed.

### Phase 3: Streak Milestone Rewards

Bonus coins at streak milestones: 7/14/30/60/100 days (25 → 500 coins). Pure
function of `maxBestStreak` via `streakMilestoneBonus()`. Included in `coinsEarned()`.

### Phase 4: Daily Check-in

- **Popup** (`src/components/today/CheckInPopup.tsx`): Appears on first visit
  each day with 600ms delay. Shows streak flame, coin reward (3–50 coins based
  on streak), progress bar toward Day 30, and next-tier preview.
- **Streak system**: Consecutive days tracked via `Economy.checkInStreak` and
  `lastCheckIn`. Resets if a day is skipped.
- **Store action**: `claimDailyCheckIn()` returns `{reward, streak}`.

### Phase 5: Daily Quests

- **Card** (`src/components/today/DailyQuestCard.tsx`): Shows on Today page
  sidebar. Random quest generated each day: "Complete X habits", "Perfect day",
  or "Complete X [category] habits" with coin rewards (15–40).
- **Auto-progress**: `cycleMark()` in store.ts automatically progresses the
  quest when a habit is marked `done` today (honoring category filters).
- **Quest generation**: `generateDailyQuest()` in economy.ts picks from 3 quest
  types weighted by the user's active habits.

### Phase 6: Daily Spin

- **Modal** (`src/components/today/DailySpinModal.tsx`): Spin wheel with
  conic-gradient colors and CSS rotation animation (2.5s deceleration).
- **Rewards**: 9 weighted outcomes (10–200 coins or a free Streak Freeze).
  Once per day limit tracked via `Economy.lastSpinDate`.
- **Store action**: `doDailySpin()` returns `{label, amount, isFreeze}`.

### Economy Integration

- `Economy` type extended with: `bonusCoins`, `lastCheckIn`, `checkInStreak`,
  `lastQuestDate`, `currentQuest` (DailyQuest), `lastSpinDate`.
- `coinsEarned()` now accepts optional `economy` param to include `bonusCoins`.
- `coinBreakdown()` includes `fromBonuses` in the derivation.
- Schema v6: `cleanEconomyV6()` sanitizes all new fields on load.

### New/Modified Files

```
NEW: src/lib/util.ts                     — shared uid() (refactored from 5 duplicates)
NEW: src/components/today/CheckInPopup.tsx   — daily check-in celebration
NEW: src/components/today/DailyQuestCard.tsx — daily quest progress + claim
NEW: src/components/today/DailySpinModal.tsx — spin wheel + random rewards

MODIFIED:
  src/lib/types.ts       — Economy extended, DailyQuest interface, DEFAULT_ECONOMY updated
  src/lib/economy.ts     — engagement constants + helpers + updated coinsEarned/coinBreakdown
  src/lib/store.ts       — claimDailyCheckIn, refreshDailyQuest, claimDailyQuest, doDailySpin
  src/lib/storage.ts     — cleanEconomyV6, schema v6 fields
  src/lib/progress.ts    — pass economy to coinsEarned
  src/app/today/page.tsx — CheckInPopup + DailyQuestCard + DailySpinButton + modal
```

---

## ✅ Bug Fixes (2026-06-17)

- **Render-phase setState** — `habits/page.tsx`: moved page clamping from render
  body + useEffect to passing `safePage` directly to Pagination (avoids React
  anti-pattern + eslint rule).
- **Unused variable** — `page.tsx`: restored `todayKey` (used on line 47).
- **CosmeticSlot duplication** — `economy.ts`: removed duplicate type, imported
  from `types.ts` instead. Updated `shop/page.tsx` import.
- **Invalid Date guard** — `economy.ts`: added `Number.isFinite(ts)` check in
  `freezesUsedInWindow()` to handle unparseable date strings.
- **Next.js Image + data URIs** — `RankAvatar.tsx`: replaced `<Image>` with
  plain `<img>` for uploaded avatar data URIs.
- **Flame flicker tiers** — `globals.css` + `StreakFlame.tsx`: added
  `--animate-flicker-medium` (1.6s) so small=2.2s, medium=1.6s, large=0.9s.

---

## ✅ UI/UX Overhaul (2026-06-17)

### Theme Redesign
- **Light mode** — Warm cream tones (#f5f0eb bg) replaced harsh blue-gray (#eef1f6).
- **Dark mode** — Deep rich purple-black (#0f0e17 bg) replaced flat gray (#11151d).

### Animated Icons
- **Sidebar nav** — Icons bounce (`animate-icon-bounce`) when active, wiggle on
  hover (`group-hover:animate-icon-wiggle`), pulsing glow ring behind active items.
- **Bottom nav** — Active icons float with bounce + indicator bar.
- All CSS-only (GPU-composited transform/opacity — zero JS overhead).

### Enhanced Background
- 12 floating star/particle dots at varying depths with slow rise-and-fade.
- 5 aurora glow blobs (was 4). Improved vignette with warmer tint.

### Card & Layout Polish
- Cards lift `-translate-y-1` on hover (was -0.5) with 300ms transition.
- Optional `glow` prop for featured cards (accent glow shadow).
- Theme transitions smoothed to 0.4s.

### New Animation Tokens
- `animate-icon-bounce`, `animate-icon-pulse`, `animate-icon-wiggle`
- `animate-particle-float`, `animate-particle-float-alt`

---

## ✅ `uid()` Refactor (2026-06-17)

5 duplicated `uid()`/`newId()` functions consolidated into `src/lib/util.ts`:
- `src/lib/store.ts`, `src/lib/habits.ts`, `src/lib/devSeed.ts`
- `src/components/goals/GoalForm.tsx`, `src/app/templates/page.tsx`

---

## ✅ Redesign complete (pre-session)

All 7 parts implemented and verified (gates green 2026-06-16). The 16-section
`docs/script.txt` spec is fully executed.

**Part 6 close-out (§13):** 6d added a matching `h2` header to the calendar
left pane so both panes' `Card`s start at the same vertical position;
tracker/calendar already responsive + consistent.

**Part 7 a11y/perf pass (§16):**
- A11y baseline was already strong — `Modal` (role=dialog, Escape, focus trap),
  `Pagination`, `TrendLineChart` (SVG `aria-hidden` + per-point sr hit-areas),
  and all celebration dismiss buttons were already labeled.
- Reduced-motion: global `@media (prefers-reduced-motion: reduce)` blanket
  override neutralizes every keyframe/transition — no per-component guards needed.
- Keyboard focus: global `:focus-visible` accent outline covers all grid cells.
- New surfaces use transform/opacity animations (GPU-friendly, 60fps).
- Fixed the only unlabeled icon-only buttons: calendar prev/next chevrons
  (`src/app/calendar/page.tsx`) + goals progress +/- (`src/app/goals/page.tsx`).

---

## 🪙 Post-redesign: Coins + Shop (✅ COMPLETE — 2026-06-16)

First net-new feature after the redesign: a spendable **coin economy**, a
**shop** for cosmetics, and a **logged/limited streak-freeze** consumable.

**Gates green 2026-06-16:** `tsc` + `lint` + `vitest` (66 passing) + `next build`
all clean. `/shop` route prerenders.

### Follow-ups shipped 2026-06-16 (accent slot + coin breakdown)

- **Accent cosmetic slot wired** (was the one reserved loose end). `ACCENT_SKINS`
  + 4 catalog items (crimson/emerald/violet/amber, amber `minLevel:8`) in
  `economy.ts`; `equippedAccent()` returns the override or null. New client
  `AccentThemeApplier` (mounted in `AppShell`) sets `--c-accent`/`--c-accent-glow`
  on `<html>`, or clears them for the default so the themed accent applies. Shop
  `SLOTS` now includes `accent` (+ per-slot `DEFAULT_PREVIEW`). **In-app verified:**
  default `#4b8bf7` → equip Emerald `#10b981` (persists app-wide on `/today`) →
  revert to Default clears back to `#4b8bf7`.
- **Coin breakdown** (net-new): `coinBreakdown(stats, rarities, economy)` in
  `economy.ts` (itemizes completions/perfect-days/achievements − spends, reconciles
  to `coinBalance`); `CoinBreakdownCard` on `/shop` under the header. **In-app
  verified:** 42 + 210 + 240 = 492 earned − 120 spent = 372 balance, matches the
  header chip. +3 `coinBreakdown` unit tests.
- **Frozen-day indicator** (UX follow-up): a protected miss used to render as a
  plain miss everywhere. Added an optional `frozen` prop to `MarkButton` (corner
  snowflake badge + "protected by a streak freeze" in the `aria-label`); wired it
  in the calendar day-detail (editable `MarkButton` + a faded-✕/snowflake in the
  read-only branch) and the tracker grid cell (corner snowflake + tooltip). Each
  page memoizes `frozenSet(data.economy)` and gates on `status === "missed" && isFrozen(...)`.

**In-app verified (Playwright, 2026-06-16):** seeded coin-earning history, drove
the real UI — buy Azure Flame (balance 1140→1020), auto-equip, flame color
changes orange→azure, redeem freeze (→945), persisted ledger correct.
**Bug found + fixed during verify:** the streak-freeze was only consumed by the
achievement/progress engine — five UI streak displays (`/today` hero, `/`
dashboard, habits list, tracker, stats) called `habitStreaks(...)` WITHOUT the
frozen set. Threaded `frozenSet(data.economy)` through all five; both displays
now agree (45).

### ✅ Done (all four gates green)

Closed out the economy feature:
- **Lint fix** — renamed store action `useFreeze` → `redeemFreeze` (the `use`
  prefix tripped eslint `rules-of-hooks`).
- **Cosmetic application** — `StreakFlame` now resolves the equipped `flame`
  skin from the store; `AchievementCelebration` uses the equipped `confetti`
  palette.
- **Coin UI** — `CoinChip` added to the dashboard header and profile stat strip.
- **Tests** — `src/lib/economy.test.ts` + freeze-aware `habitStreaks` cases. 63 tests.

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
  value on server/first paint), reduced-motion snaps.
- `globals.css` — `flicker`/`glow-pulse`/`ember`/`burst` keyframes.
- Wired into `MarkButton`, `today`, `habits`, `tracker`.

## Part 4 — Achievements UX (verified)

- `src/lib/rarity.ts` — `RARITY_STYLE`: per-rarity accent/glow/gradient/ring/
  medal/confettiColors + celebration tier.
- `src/components/AchievementBadge.tsx` — collectible badge; locked state;
  legendary conic shine.
- `src/components/celebrations/` — `AchievementToast`, `AchievementPopup`,
  `AchievementCelebration` (full-screen + confetti), `CelebrationManager`.
- `src/components/layout/AppShell.tsx` — mounts `<CelebrationManager />`.
- `src/app/achievements/page.tsx` + nav link — Achievement Gallery.

## Part 5 — Progression UI (verified)

- `src/lib/ranks.ts` — `RANK_STYLE` (icon/accent/glow/gradient/`animated`) +
  `RANK_ORDER`. UI-only, mirrors `rarity.ts`.
- `src/lib/cosmetics.ts` — emoji `AVATAR_PRESETS` + gradient `BANNER_PRESETS`.
- `src/components/progression/` — `XpBar`, `TitleDisplay`, `RankAvatar`,
  `NextMilestoneWidget`.
- `src/components/profile/ProfileEditModal.tsx`.
- `src/app/profile/page.tsx` — character page.
- `globals.css` — `text-sheen` keyframe + `--animate-text-sheen` token.

## Part 6 — Layout/data viz (verified)

- **6a §10 Dashboard widgets** — `DashboardWidgets.tsx` (XP/level, current
  streak, next milestone, this-week bars, badge-collection, recent achievements).
- **6b §11 Stats redesign** — `TrendLineChart.tsx` (SVG line + gradient area,
  hover tooltips, responsive). Stats page 2×2 grid.
- **6c §12 Habits pagination** — `Pagination.tsx`; habits page paginates 20/page.
- **6d §13 Calendar/tracker alignment** — matching headers.
