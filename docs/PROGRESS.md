# project_101 — Redesign Progress & Handoff

Status snapshot for resuming work in a new session. Spec: `docs/script.txt`
(the "Complete UI/UX Redesign & Gamification Specification", 16 sections).

Last updated: 2026-06-15.

---

## How we're working

Implementing `docs/script.txt` in **7 parts**. Architectural rule locked in:
**all gamification (XP, levels, streaks, achievement progress, titles) is
COMPUTED from the immutable mark history via pure functions in `lib/` — never
stored as mutable counters** — so it stays consistent with the existing Honest
Tracking (anti-cheat) policy. The only persisted gamification state is unlocked
achievement IDs + "seen" flags (for one-time popups) and the editable profile.

---

## Part status

| Part | Scope | Status |
|---|---|---|
| 1. Engine | XP, achievements, titles, progress façade, schema v3 | ✅ code done |
| 2. Visual base | Ambient background + animation tokens | ✅ code done |
| 3. Streaks + micro-interactions | Animated flames (S/M/L), completion/counter animations | ✅ code done |
| 4. Achievements UX | Toast/popup/full-screen celebrations, confetti, Achievement Gallery page | ⏳ next |
| 5. Progression UI | XP bar, level, title/rank, profile-as-character-page, showcase, next-milestone widget | ☐ |
| 6. Layout/data viz | Dashboard widgets, stats redesign (equal cards, internal scroll, interactive graphs), habits pagination, tracker alignment | ☐ |
| 7. Final pass | A11y, 60fps/reduced-motion audit, polish | ☐ |

> ✅ **Gates green (2026-06-15):** `tsc` + `lint` + `vitest` (46 passing) +
> `next build` all clean through Part 3.

---

## Part 1 — Engine (done, unverified)

New files:
- `src/lib/xp.ts` — XP (10/completion, 25/perfect-day, rarity bonuses) + super-linear level curve (`levelInfo`, `xpToAdvance`).
- `src/lib/achievements.ts` — 28 achievements (5 categories × 4 rarities), `buildGameStats` (single history walk), `evaluateAchievements`.
- `src/lib/titles.ts` — 19 titles → 5 ranks, `titleForLevel`.
- `src/lib/progress.ts` — `summarizeProgress` (one call → stats/xp/level/title/nextMilestones) + `reconcileUnlocks`.
- `src/lib/gamification.test.ts` — engine tests.

Edits:
- `src/lib/types.ts` — `Rarity`, `AchievementDef`, `AchievementUnlock`/`Unlocks`, `Profile`, `DEFAULT_PROFILE`; `AppData` gained `profile` + `unlocks`.
- `src/lib/storage.ts` — **SCHEMA_VERSION = 3**; `cleanProfile`/`cleanUnlocks`; defaults for pre-v3 saves.
- `src/lib/store.ts` — `updateProfile`, `syncAchievements`, `markAchievementsSeen`; `cycleMark` reconciles unlocks; `clearAllData` preserves profile.
- `src/lib/storage.test.ts` — round-trip + profile/unlocks coverage.

## Part 2 — Visual base (done, unverified)

- `src/components/AmbientBackground.tsx` — fixed, drifting blurred accent blobs; pointer-events-none; both themes; reduced-motion safe.
- `src/app/layout.tsx` — mounts `<AmbientBackground />`.
- `src/app/globals.css` — removed scroll-cutting body gradient; base color moved to `<html>` so the negative-z ambient layer shows; added `--ease-*`/`--dur-*` tokens + `float` keyframe.

(Earlier UI/UX pass — already verified green before this: design-system upgrade,
`Button`/`Skeleton`/`PageSkeleton`, route `loading.tsx`, `useHydrated`.)

## Part 3 — Streaks + micro-interactions (done, verified)

New files:
- `src/components/StreakFlame.tsx` — `flameTier(streak)` → none/small(1–6)/
  medium(7–29)/large(30+). Small=flicker; medium=+glow halo; large=fast flicker
  + filled flame + rising embers. Pure-CSS, reduced-motion safe.
- `src/components/AnimatedCounter.tsx` — rAF count-up, eased, hydration-safe
  (renders final value on server/first paint), reduced-motion snaps instantly.
  NOTE: all `setDisplay` calls go through the rAF callback — the project's
  eslint `react-hooks/set-state-in-effect` rule forbids sync setState in effects.

Edits:
- `src/app/globals.css` — `flicker`/`glow-pulse`/`ember`/`burst` keyframes +
  `--animate-*` tokens.
- `src/components/habits/MarkButton.tsx` — `animate-burst` ring on `done`; hover scale.
- `src/app/today/page.tsx` — hero uses `StreakFlame` + `AnimatedCounter`.
- `src/app/habits/page.tsx`, `src/app/tracker/page.tsx` — streak cells use `StreakFlame`.

---

## Resume checklist

1. Run the gates and fix any failures:
   ```bash
   cd /c/Users/Justin/dev/project_101 && npx tsc --noEmit && npm run lint && npx vitest run && npm run build
   ```
2. Start **Part 4**: achievement unlock UX — toast (small) / popup (medium) /
   full-screen celebration + confetti (major), keyed to rarity. Engine already
   exposes unlock/seen state via `store` (`syncAchievements`,
   `markAchievementsSeen`) and `reconcileUnlocks`. Then the Achievement Gallery
   page (§14: unlocked/locked, progress, filters, search).
3. Reusable pieces from Part 3 available for Part 4: `StreakFlame` (celebrations),
   `AnimatedCounter` (XP/count animations).

## Notes for the next session

- Heed `AGENTS.md`: this is a modified Next.js (16.2.9) — read
  `node_modules/next/dist/docs/` before touching Next-specific APIs. `loading.tsx`
  + Suspense are confirmed valid here.
- `next build` takes ~80s. tsc ~30s.
