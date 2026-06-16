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
| 6. Layout/data viz | Dashboard widgets, stats redesign, habits pagination, calendar/tracker alignment | ✅ verified |
| 7. Final pass | A11y, 60fps/reduced-motion audit, polish | ✅ verified |

> **Gates last green: through Part 7 (2026-06-16)** — `tsc` + `lint` +
> `vitest` (46 passing) + `next build` all clean. **All 7 parts complete.**

---

## ✅ Redesign complete

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

Future work would be net-new features, not redesign tasks. Standard loop:
edit → `npx tsc --noEmit && npm run lint && npx vitest run && npm run build`.

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
  page memoizes `frozenSet(data.economy)` and gates on `status === "missed" &&
  isFrozen(...)`. `/today` intentionally skipped — it only shows today, which can't
  be frozen (freezes protect past misses). **In-app verified** (Playwright): tracker
  day-6 = red miss + snowflake; calendar day-detail shows the protected indicator.

**In-app verified (Playwright, 2026-06-16):** seeded coin-earning history, drove
the real UI — buy Azure Flame (balance 1140→1020), auto-equip, flame color
changes orange→azure, redeem freeze (→945), persisted ledger correct.
**Bug found + fixed during verify:** the streak-freeze was only consumed by the
achievement/progress engine — five UI streak displays (`/today` hero, `/`
dashboard, habits list, tracker, stats) called `habitStreaks(...)` WITHOUT the
frozen set, so a frozen miss still broke those streaks (hero showed 10 while the
freeze-aware widget showed 45). Threaded `frozenSet(data.economy)` through all
five; both displays now agree (45). Re-verified at the surface.

**Anti-cheat model (locked, same spirit as XP):** coins are DERIVED from the
immutable history, never stored as a balance. The only persisted economy state
is an append-only spend ledger + owned/equipped cosmetics + a dated freeze log.
`balance = coinsEarned(history) − Σ ledger.amount`, clamped ≥ 0. A freeze only
ever protects a GENUINE recorded miss (status `"missed"`), is capped at 1 per
rolling 7 days, and is audit-logged — the miss stays visible in history; the
streak walk just treats that day as neutral. Honest Tracking holds.

### ✅ Done (all four gates green)

Closed out the economy feature:
- **Lint fix** — renamed store action `useFreeze` → `redeemFreeze` (the `use`
  prefix tripped eslint `rules-of-hooks` when called in the shop's onClick).
- **Cosmetic application** — `StreakFlame` now resolves the equipped `flame`
  skin from the store (`FLAME_SKINS[equippedOrDefault(...)]`, optional `colors`
  override prop); free default ramp == old hardcoded colors so default users +
  SSR see no change. `AchievementCelebration` uses the equipped `confetti`
  palette (`CONFETTI_SKINS`), falling back to rarity colors for the default.
- **Coin UI** — `CoinChip` added to the dashboard "Your progress" header and a
  Coins `StatCard` (→ `/shop`) on the profile stat strip.
- **Tests** — `src/lib/economy.test.ts` (balance math/clamp, freeze window cap,
  eligibility, `freezableDays`, `frozenSet`) + 2 freeze-aware `habitStreaks`
  cases in `stats.test.ts`. 63 tests pass.

Engine details below (already done before this session):

DONE (code written, tsc-clean):
- **Engine** — `src/lib/economy.ts` (new): `coinsEarned` (2/completion,
  10/perfect-day, rarity bonuses via `RARITY_COINS`), `coinsSpent`,
  `coinBalance`; `SHOP_ITEMS` catalog (flame skins + confetti palettes, some
  `minLevel`-gated); `FLAME_SKINS`/`CONFETTI_SKINS` color maps;
  `equippedOrDefault`; freeze helpers (`frozenSet`, `isFrozen`, `canUseFreeze`,
  `canFreezeDay`, `freezableDays`, `makeFreezeEntry`, `FREEZE_PRICE=75`,
  `FREEZE_MAX_PER_WINDOW=1`, `FREEZE_WINDOW_DAYS=7`).
- **Schema v4** — `src/lib/types.ts`: `Economy`, `SpendEntry`, `FreezeEntry`,
  `CosmeticSlot`, `DEFAULT_ECONOMY`; `AppData.economy`; audit actions
  `shop.buy`/`freeze.use`. `src/lib/storage.ts`: `SCHEMA_VERSION = 4`,
  `cleanEconomy`/`cleanSpend`/`cleanFreeze` validators, `emptyData.economy`,
  `loadData` wires it (older saves default to empty economy → coins re-derive).
- **Freeze in streak walk** — `src/lib/stats.ts` `habitStreaks(habit, marks,
  today, frozen?)`: a frozen `habitId@dateKey` is neutral like `skipped`.
  Threaded through `buildGameStats(...,frozen?)` (achievements.ts) and
  `summarizeProgress`/`reconcileUnlocks` (progress.ts, which now also return
  `coinsEarned`/`coinBalance`).
- **Store actions** — `src/lib/store.ts`: `buyCosmetic` (guards: exists, not
  owned, level gate, affordable → ledger + owned + auto-equip + audit),
  `equipCosmetic`, `useFreeze` (guards: window cap, genuine miss, affordable →
  ledger + freeze log + audit); helpers `balanceOf`, `summarizeLevel`. Economy
  imports + `clearAllData` reset already in place.
- **Test fixture** — `storage.test.ts` round-trip case extended with `economy`.

All three cosmetic slots (flame, confetti, accent) now have catalog items and
are applied. No known economy loose ends.

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
