# Suggestions & Future Roadmap — project_101

A comprehensive plan of every idea, enhancement, and direction this app could take.
Organized by priority and impact, with implementation notes for each suggestion.

---

## How To Read This Document

- **P0 (Critical)** — Foundational gaps that block other work
- **P1 (High)** — High-impact features users will notice immediately
- **P2 (Medium)** — Polished additions that improve the experience
- **P3 (Low)** — Nice-to-haves for when the app is mature
- **P4 (Future)** — Ambitious moonshots and long-term vision

Each suggestion includes: **Effort** (S/M/L/XL), **Impact** (🔥 = moderate, 🔥🔥 = high, 🔥🔥🔥 = transformative), and implementation notes.

---

# PHASE A — FOUNDATION (P0)

## A1. Cloud Sync (Supabase + Drizzle ORM)

**Effort:** XL | **Impact:** 🔥🔥🔥

The single biggest unlock. Move from localStorage to Supabase so data persists across devices.

**Status:** Auth layer is done (Supabase Auth, login/register, Remember Me, logout, route protection).
Remaining: Drizzle ORM schema, data migration, RLS, offline sync.

- **Auth:** Supabase Auth (email/password — implemented). Future: Google, GitHub OAuth.
- **DB:** Drizzle ORM with Postgres tables mirroring the AppData shape
- **Migration strategy:**
  1. Add Supabase client + Drizzle schema alongside localStorage (dual-write)
  2. On first launch after auth, merge local data into Supabase
  3. After 30 days of successful sync, disable localStorage fallback
- **RLS (Row Level Security):** CRITICAL — every query must filter by `user_id`. A single leak is catastrophic.
- **Offline:** Keep localStorage as a cache. Use optimistic updates with background sync.
- **Key decision:** Real-time sync via Supabase Realtime (WebSockets) vs. manual pull-to-refresh.

## A2. Full Zod Validation Pipeline

**Effort:** M | **Impact:** 🔥🔥

Currently Zod is only used in `importJSON()`. Extend it to the full data pipeline.

- Create a full `AppData` Zod schema mirroring the hand-rolled sanitizers in `storage.ts`
- Validate on every `loadData()` call from localStorage
- Validate on every `importRawData()` call
- This replaces the `clean*` functions in `storage.ts` with generated Zod schemas
- Save ~200 lines of hand-rolled sanitization code

## A3. Fix Security Vulnerability (postcss)

**Effort:** S | **Impact:** 🔥🔥

`next@16.2.9` depends on `postcss@8.4.31` which has a moderate XSS vulnerability.

- Upgrade Next.js to the latest 16.x patch that uses `postcss >= 8.5.10`
- Test thoroughly — Next.js upgrades can break the dev server config

## A4. Error Monitoring (Sentry)

**Effort:** S | **Impact:** 🔥🔥

Zero visibility into production errors currently.

- Add `@sentry/nextjs` for automatic error tracking
- Capture unhandled React errors, API failures, and localStorage quota exceeded
- Add breadcrumbs for key user actions (habit creation, mark cycling, shop purchases)

---

# PHASE B — SOCIAL & COMMUNITY (P1)

## B1. Friend System

**Effort:** L | **Impact:** 🔥🔥🔥

Account-to-account connections that unlock all social features.

- **Schema:** `friends` table with `user_id_a`, `user_id_b`, `status` (pending/accepted), `created_at`
- **UX:** Search by username, send/accept/reject friend requests, block
- **Privacy:** Opt-in by default. Users choose what to share (streaks, habits, or nothing).
- **Implementation:** Supabase RLS + Realtime for live friend status updates

## B2. Accountability Parties

**Effort:** XL | **Impact:** 🔥🔥🔥

Inspired by Habitica's party system — groups where members see each other's progress.

- **Schema:** `parties` (id, name, created_by, max_members) + `party_members` (party_id, user_id, role)
- **Features:**
  - Shared goal: party agrees on a collective target (e.g., "Everyone complete 80% this week")
  - Progress dashboard: see each member's completion rate
  - Encouragement system: one-tap "kudos" button (like Strava)
  - Optional stakes: if the party goal is met, everyone gets a bonus reward
- **UX:** Party creation flow, invite system, member activity feed
- **Privacy:** Habits are never shared — only completion rates and streak counts

## B3. Friend Leaderboards

**Effort:** M | **Impact:** 🔥🔥

Lightweight competition between friends.

- **Metrics to rank:** Current streak, consistency %, total completions, XP gained this week
- **Periods:** Weekly / Monthly / All-time tabs
- **Privacy:** Opt-in. Users choose which metrics appear on leaderboards.
- **Tech:** Redis `ZSET` for real-time ranking if scale demands it; otherwise Supabase queries
- **UX:** See where you rank among friends with animated rank changes

## B4. Community Challenges

**Effort:** L | **Impact:** 🔥🔥

Time-limited global challenges everyone can participate in.

- **Examples:**
  - "7-day perfect week" — 100% completion for 7 days
  - "Streak builder" — reach a 14-day streak in any habit
  - "Category champion" — complete 20 habits in a specific category
- **Rewards:** Exclusive badges, bonus coins, limited-edition cosmetics
- **UX:** Challenge hub page showing active/upcoming/completed challenges, progress bars, countdown timers
- **Tech:** Supabase scheduled functions to auto-start/end challenges, RLS for participation tracking

---

# PHASE C — AI & INTELLIGENCE (P1)

## C1. AI Habit Coach

**Effort:** XL | **Impact:** 🔥🔥🔥

LLM-powered coach that gives personalized advice based on the user's actual data.

- **Architecture:** RAG (Retrieval-Augmented Generation)
  - Ground responses in the user's mark history, streaks, and patterns
  - Never give generic advice — always reference the user's specific data
- **Capabilities:**
  - "You're 40% more consistent on days after you exercise. Try scheduling your reading right after workouts."
  - "You've missed your morning run 5 Tuesdays in a row. Want to shift it to Wednesday?"
  - Weekly summary: "Great week! You hit 85% completion. Your best day was Thursday."
- **Tech:** Vercel AI SDK + OpenAI/Anthropic API, edge-deployed for low latency
- **Privacy:** Process on-device where possible; never train on user data
- **UX:** Chat panel in the dashboard, optional weekly email summary

## C2. Smart Scheduling (Adaptive AI)

**Effort:** L | **Impact:** 🔥🔥

AI that learns when you're most likely to complete each habit and suggests schedule changes.

- **Pattern detection:**
  - Analyze completion rates by day-of-week and time-of-day
  - Detect consistently missed slots and suggest alternatives
  - Account for calendar events (if Google Calendar is connected)
- **Implementation:**
  - Client-side analysis (no server needed for the pattern math)
  - Offer suggestions as non-intrusive toast notifications
  - One-tap to accept the schedule change

## C3. Burnout & Plateau Detection

**Effort:** M | **Impact:** 🔥🔥

Detect when a user is burning out (declining engagement) and suggest recovery strategies.

- **Signals:** Declining completion rate over 2+ weeks, increased skips vs. misses, longer gaps between sessions
- **Response:**
  - "It looks like things have been tough lately. Want to reduce your habit load for a week?"
  - Offer a "rest mode" that pauses non-critical habits
  - Suggest lowering targets temporarily rather than abandoning them
- **Ethical boundary:** Never diagnose. Frame as observations with optional actions.
- **Tech:** Simple trend analysis in `lib/insights.ts` — extend `buildInsights()` with burnout signals

## C4. Natural Language Habit Creation

**Effort:** M | **Impact:** 🔥🔥

"Add 'read 20 minutes every weekday at 9pm'" → auto-parses and fills the form.

- **Tech:** OpenAI function calling or Claude tool use — extract fields (name, schedule, category, time)
- **UX:** Single text input that expands into a preview card before confirming
- **Fallback:** If parsing fails, open the regular form pre-filled with what we could extract

---

# PHASE D — UI/UX POLISH (P1-P2)

## D1. Dark/Light Mode Auto-Schedule

**Effort:** S | **Impact:** 🔥

Currently theme mode is manual (light/dark/system). Add:

- Schedule: "Dark mode from sunset to sunrise"
- Location-based: Use browser geolocation or IP to determine sunset time
- **Tech:** `date-fns-tz` or hand-rolled sunset calculation based on lat/lng

## D2. Mobile App (PWA + TWA)

**Effort:** L | **Impact:** 🔥🔥🔥

The PWA is already functional. Elevate it to feel native.

- **Add to homescreen prompts:** Custom in-app banner for iOS Safari (which doesn't auto-prompt)
- **Touch gestures:** Swipe to complete habits (like Streaks app), pull-to-refresh
- **Haptic feedback:** `navigator.vibrate()` on mark completion (Android)
- **Badge API:** Show pending habit count on the app icon
- **Share target:** Register as a share target so users can add habits from other apps
- **Trusted Web Activity (TWA):** Wrap for Google Play Store distribution

## D3. Widgets (iOS + Android)

**Effort:** L | **Impact:** 🔥🔥

- **iOS:** Use Scriptable or build a native widget extension
- **Android:** PWA widgets via the Web App Manifest `display_override` API
- **Widget types:**
  - Today's habit list (checkable from widget)
  - Streak counter
  - Quick-add button
- **Fallback:** If native widgets aren't feasible, a pinned browser shortcut with `?widget=true` URL param

## D4. Habit Categories as Tabs

**Effort:** S | **Impact:** 🔥

On the Today page, add horizontal category tabs at the top so users can focus on one category at a time (Workout, Studies, etc.). Clear visual indicator of which category is active.

## D5. Drag-to-Reorder Habits

**Effort:** M | **Impact:** 🔥🔥

Add drag-and-drop reordering within Today's habit list and the Manage Habits page.

- **Tech:** `@dnd-kit` is already installed (was removed — re-add it). Or use the existing `ReorderableGrid` pattern adapted for single-column lists.
- **Persistence:** Order stored in settings. User-controlled priority.

## D6. Empty State Illustrations

**Effort:** S | **Impact:** 🔥

The current empty states are text-only. Add simple inline SVG illustrations for each (no habits, no goals, no achievements, etc.). Creates emotional warmth (like Finch's approach).

## D7. Streak Recovery Animations

**Effort:** S | **Impact:** 🔥

When a streak is broken and then rebuilt, show a special animation:

- "Streak revived!" badge
- Small flame re-igniting animation
- The "Never Miss Twice" principle — celebrate the recovery, not just the streak

## D8. Weekly Progress Report (Email + In-App)

**Effort:** M | **Impact:** 🔥🔥

- **Content:** Completion % vs. previous week, best streak, top category, insight of the week, upcoming challenges
- **Delivery:** Resend (transactional email) + in-app notification center
- **Frequency:** Every Sunday at 8pm (configurable)
- **AI version:** "Your AI coach's weekly summary" with personalized observations

---

# PHASE E — GAMIFICATION ENHANCEMENTS (P2)

## E1. Monthly/Yearly Streaks

**Effort:** S | **Impact:** 🔥🔥

Beyond daily streaks, track monthly and yearly completions.

- **Monthly streak:** Completed at least one habit every day this month
- **Yearly streak:** Completed every month this year
- **UX:** Show in the streak display (alongside current daily streak)
- **Rewards:** Bonus coins and exclusive badges for monthly/yearly milestones

## E2. Streak Freeze Shop Upgrade

**Effort:** S | **Impact:** 🔥

Make streak freezes more engaging:

- **Multi-pack discount:** Buy 3 freezes for the price of 2
- **Free daily freeze:** One free streak freeze per week (claimed on Monday)
- **Streak freeze cap:** Max 3 active freezes to prevent abuse

## E3. Achievement Tier Unlock Animations

**Effort:** M | **Impact:** 🔥🔥

When a user gets their first Legendary achievement, first Epic, etc., show a special "tier unlock" celebration — not just the achievement popup but a collection milestone with confetti and a summary of what this tier means.

## E4. Character Customization Expansion

**Effort:** M | **Impact:** 🔥🔥

- **More slots:** Background (banner), title font, frame/border for the RankAvatar
- **Trading:** Trade duplicate cosmetics with friends (requires social system)
- **Gacha pulls:** Random cosmetic for coins (with duplicate protection)

## E5. Title Prestige System

**Effort:** M | **Impact:** 🔥

After reaching the max title (Titan), allow "prestiging" — reset your level but keep achievements, with a special prestige badge and exclusive cosmetics.

---

# PHASE F — DATA & ANALYTICS (P2)

## F1. Advanced Insights Engine

**Effort:** M | **Impact:** 🔥🔥

Extend `buildInsights()` with 10+ new insight types:

- **Correlation insights:** "When you exercise, you're 23% more likely to eat healthy"
- **Time-of-day patterns:** "You're most productive between 9-11am"
- **Day-of-week patterns:** "Tuesday is your weakest day across all categories"
- **Trend alerts:** "Your completion rate has dropped 15% compared to last month"
- **Goal tracking:** "You're on track to reach your 'Read 20 books' goal by March"
- **Streak predictions:** "You'll hit a 30-day streak in 2 more days at your current pace"

## F2. Export Enhancements

**Effort:** S | **Impact:** 🔥

- **PDF export:** Beautiful, printable monthly report with charts and insights
- **Auto-backup:** Daily localStorage backup to Google Drive / iCloud (via third-party API)
- **CSV with all fields:** Include notes, goals, and audit log alongside marks

## F3. Habit Templates User-Created

**Effort:** M | **Impact:** 🔥

Let users create, save, and share their own templates.

- **Create:** After setting up a set of habits, "Save as template" button
- **Share:** Generate a shareable link (requires cloud sync)
- **Import:** Paste a friend's template link to add it to your library
- **Featured:** Curated community templates with ratings

## F4. Mood & Energy Tracking

**Effort:** M | **Impact:** 🔥🔥

Add a simple mood/energy slider to the daily check-in.

- **UX:** 1-5 emoji scale for mood, 1-5 bar for energy
- **Analysis:** Correlate mood/energy with habit completion rates
- **Visualization:** Mood trend line on the stats page alongside the completion chart
- **Insights:** "You tend to complete 30% more habits on high-energy days"

---

# PHASE G — INTERNATIONALIZATION & ACCESSIBILITY (P2)

## G1. i18n (Internationalization)

**Effort:** L | **Impact:** 🔥🔥

- **Framework:** `next-intl` or `react-intl` for Next.js App Router
- **Initial languages:** Spanish, French, German, Japanese (highest demand)
- **Scope:** All user-facing strings in components, celebration text, insights
- **Crowdsourcing:** Allow community translations via pull requests
- **Persistence:** Language preference stored in settings

## G2. Accessibility Audit & Improvements

**Effort:** M | **Impact:** 🔥🔥

Beyond the current a11y basics:

- **Screen reader testing:** Full NVDA/VoiceOver pass on all pages
- **Keyboard navigation:** Tab order audit, focus trapping in modals, skip-to-content link
- **Color contrast:** Automated WCAG 2.1 AA/AAA check on all theme combinations
- **Reduced motion:** Extend the existing `prefers-reduced-motion` to also disable motion page transitions and stagger animations
- **Font scaling:** Test with 200% browser zoom — no overlapping or clipped content
- **Touch targets audit:** Ensure ALL interactive elements (not just MarkButton/IconBtn) meet 44×44px

## G3. RTL Support

**Effort:** M | **Impact:** 🔥

Right-to-left layout for Arabic, Hebrew, and Persian users.

- Add `dir="rtl"` support to all layout components
- Flip all margin/padding directions and icon rotations
- Test with Arabic translation

---

# PHASE H — PERFORMANCE & ARCHITECTURE (P2)

## H1. Image Optimization

**Effort:** S | **Impact:** 🔥

- Convert all SVG icons from `<img>` to inline SVGs or `next/image`
- Lazy-load the RankAvatar and achievement badge images
- Add `loading="lazy"` to any off-screen images

## H2. Route-Level Code Splitting

**Effort:** M | **Impact:** 🔥🔥

- Audit bundle with `ANALYZE=true npm run build`
- Identify large dependencies that could be lazy-loaded per route
- Split `motion` — currently imported globally via AppShell. Could be route-scoped.
- Dynamic imports for heavy pages (Stats with TrendLineChart, Shop with full catalog)

## H3. Service Worker Upgrade

**Effort:** M | **Impact:** 🔥

The current `sw.js` is a basic cache-first strategy. Upgrade to:

- **Background sync:** Queue offline mark changes and sync when online
- **Periodic sync:** Check for challenge updates in the background
- **Cache versioning:** Auto-increment cache version based on app build hash
- **Offline analytics:** Queue page views when offline, send when connected

## H4. Pagination Refactor

**Effort:** S | **Impact:** 🔥

The current pagination resets to page 0 when filters change. Improve:

- **Preserved page:** When changing category filter, stay on the current page if possible
- **Scroll to top:** Smooth scroll to the top of the list on page change
- **Infinite scroll option:** Optional "load more" button at the bottom of lists

---

# PHASE I — PLATFORM & INFRASTRUCTURE (P2-P3)

## I1. GitHub Actions CI/CD

**Effort:** M | **Impact:** 🔥🔥

Automated quality gates on every push:

```yaml
# .github/workflows/ci.yml
- npx tsc --noEmit
- npm run lint
- npx vitest run
- npm run build
- npx playwright test  (when E2E tests exist)
```

- **PR checks:** Block merging if any gate fails
- **Auto-deploy:** Deploy to Vercel production on `main` branch pushes
- **Preview deployments:** Vercel preview URLs for every PR

## I2. E2E Tests (Playwright)

**Effort:** L | **Impact:** 🔥🔥

Critical user paths end-to-end:

- **Auth flow:** Sign up → create habit → mark today → see stats update
- **Shop flow:** Earn coins → buy cosmetic → equip it → see it applied
- **Engagement flow:** Daily check-in → complete quest → spin wheel
- **Data flow:** Export JSON → clear data → import JSON → verify all data restored
- **Responsive:** Test mobile viewport (375×667) for all critical paths

## I3. Rate Limiting (Upstash)

**Effort:** S | **Impact:** 🔥🔥

Protect API routes and auth endpoints:

- **Login attempts:** 5 per 15 minutes per IP
- **Data export:** 3 per hour per user
- **Mark cycling:** 100 per minute per user (anti-spam)
- **Tech:** `@upstash/ratelimit` with Redis for serverless compatibility

## I4. Analytics (PostHog / Plausible)

**Effort:** S | **Impact:** 🔥🔥

Understand how users actually use the app:

- **Events to track:** Habit created, habit completed, shop purchase, feature discovery
- **Dashboards:** Daily/weekly active users, retention cohorts, feature adoption rates
- **Privacy:** Cookie-less tracking with Plausible (GDPR-compliant), or PostHog for richer data
- **Decision:** Use data to prioritize which suggestions to build next

---

# PHASE J — BUSINESS & MONETIZATION (P3)

## J1. Free vs. Pro Tiers

**Effort:** L | **Impact:** 🔥🔥🔥

| Feature    | Free              | Pro                        |
| ---------- | ----------------- | -------------------------- |
| Habits     | Unlimited         | Unlimited                  |
| Templates  | 8 basic           | All + community            |
| Stats      | 7/30/90 day       | Custom date range + export |
| AI Coach   | —                 | ✓                          |
| Cloud sync | —                 | ✓ (up to 3 devices)        |
| Social     | View leaderboards | Create challenges, parties |
| Cosmetics  | Standard          | Full catalog               |
| Backup     | Manual JSON       | Auto-daily cloud backup    |
| Support    | Community         | Priority email             |

- **Pricing:** $4.99/month or $39.99/year (common for this category)
- **Trial:** 14-day free Pro trial on signup
- **Grandfathering:** Early users (pre-cloud) get lifetime Pro discount

## J2. Payment Integration (PayMongo + PayPal)

**Effort:** L | **Impact:** 🔥🔥

- **PayMongo:** Primary processor for Philippines (GCash, Maya, card)
- **PayPal:** International coverage
- **Webhooks:** Handle subscription lifecycle (created, renewed, cancelled, failed)
- **Schema:** `subscriptions` table linked to auth user
- **Legal:** Privacy Policy + Terms of Service pages REQUIRED before taking money

## J3. Referral Program

**Effort:** M | **Impact:** 🔥🔥

- **Mechanic:** Share a referral link → friend signs up for Pro → you get 1 month free
- **Cap:** Max 6 months free per year
- **Tracking:** Unique referral codes stored in user profile
- **UX:** Referral card in Settings with share button

## J4. Team/Organization Plans

**Effort:** XL | **Impact:** 🔥🔥

B2B play — teams use the app together for shared habit challenges:

- **Workspace:** Manager creates a workspace, invites members
- **Team challenges:** "80% completion this month as a team — bonus if achieved"
- **Dashboard:** Manager dashboard with team-wide stats
- **Pricing:** $19/month per 10 seats
- **Target:** Corporate wellness programs, school groups, fitness communities

---

# PHASE K — DEEP GAMIFICATION (P3)

## K1. Skill Trees

**Effort:** XL | **Impact:** 🔥🔥🔥

Each category becomes a skill tree with unlockable nodes:

- **Nodes:** Each node is a milestone (e.g., "Complete 30 workouts" → +5% XP bonus for workouts)
- **Branches:** Different specializations (e.g., "Strength" vs. "Endurance" in Workout tree)
- **Visualization:** Interactive tree or constellation map
- **Tech:** Tree data as JSON config, progress derived from marks
- **Engagement:** Unlockable passives make users feel their history has lasting value

## K2. Seasonal Battle Pass

**Effort:** L | **Impact:** 🔥🔥

- **Duration:** 4-week seasons with a theme (e.g., "Summer of Strength")
- **Free track:** Badges, titles, basic cosmetics
- **Premium track ($):** Exclusive cosmetics, rare titles, XP boosts
- **Progress:** Earn XP through habit completion — each level unlocks a reward
- **UX:** Battle pass UI in a dedicated tab with reward preview

## K3. Daily/Weekly Quests Expansion

**Effort:** M | **Impact:** 🔥

The current daily quest is one generic challenge. Expand to:

- **Difficulty tiers:** Easy (5 coins), Medium (15), Hard (30)
- **Quest variety:** 20+ quest templates (category-specific, streak-based, perfect-day, social)
- **Weekly quests:** "Complete 40 habits this week" — bigger rewards
- **Quest streaks:** Complete a quest every day for 7 days → bonus reward

---

# PHASE L — INTEGRATIONS (P3)

## L1. Google Calendar Sync

**Effort:** M | **Impact:** 🔥🔥

Two-way sync with Google Calendar:

- **Import:** Create a habit from a calendar event
- **Export:** Show habit time slots as calendar events
- **Auto-detect:** When a user marks a habit at the same time as a recurring event, suggest linking them
- **Tech:** Google Calendar API + OAuth2

## L2. Apple Health / Google Fit Integration

**Effort:** M | **Impact:** 🔥🔥

Auto-track health metrics as habits:

- **Steps:** "Walk 10k steps" — auto-checks based on Health data
- **Sleep:** "Sleep 8 hours" — auto from sleep tracking
- **Workouts:** Auto-detect via Health/Fit API
- **Tech:** Web app can't directly read Health/Fit APIs — needs native companion app or Apple Watch integration

## L3. IFTTT / Zapier Connector

**Effort:** M | **Impact:** 🔥

Let users create automations:

- "If I mark 'Gym' as done, turn off my lights (Philips Hue)"
- "If I miss 'Read' 3 days in a row, send me an encouraging email"
- "Log completed habits to a Google Sheet"

## L4. Discord / Slack Integration

**Effort:** S | **Impact:** 🔥

- **Daily summary bot:** Post your daily habit progress to a Discord channel
- **Accountability channels:** Party members see each other's check-ins
- **Challenge announcements:** Community challenge start/end notifications
- **Tech:** Incoming webhooks + OAuth bot

---

# PHASE M — LOGISTICAL & TECHNICAL DEBT (P2-P3)

## M1. Monorepo Split

**Effort:** L | **Impact:** 🔥🔥

Split into a monorepo for clearer separation:

```
project_101/
  apps/
    web/          # Current Next.js app
    mobile/       # Future React Native / native app
  packages/
    shared/       # Types, Zod schemas, pure lib functions
    ui/           # Shared component library
  docs/           # Documentation
```

- **Tech:** Turborepo for monorepo management
- **Benefit:** Types and business logic shared between web and potential mobile app

## M2. Storybook Component Library

**Effort:** M | **Impact:** 🔥

- Catalog all 30+ UI components in Storybook
- Visual regression testing with Chromatic
- Design system documentation (spacing, typography, color tokens)
- Interactive playground for each component

## M3. Performance Budget

**Effort:** S | **Impact:** 🔥

Define and enforce performance budgets:

- **Lighthouse scores:** 90+ across all categories
- **Bundle size:** < 200KB initial JS, < 50KB per route
- **First Contentful Paint:** < 1.5s on 3G
- **Time to Interactive:** < 3.5s on 3G
- **Enforcement:** CI fails if budget is exceeded

## M4. Remove Remaining Dead Code

**Effort:** S | **Impact:** 🔥

Knip still reports ~20 unused exports:

- `flameTier` (used internally in StreakFlame, but exported — make it private)
- `LEVEL_UP_COINS`, `STREAK_MILESTONES`, etc. (constants used in economy.ts internally)
- `CYCLE` (used internally in marks.ts)
- `recurrenceText` (used internally in format.ts)
- `XP_PER_COMPLETION`, `XP_PER_PERFECT_DAY` (used internally in xp.ts)

These are low-risk removals. Run `knip` after each to verify.

## M5. CSS Cleanup

**Effort:** M | **Impact:** 🔥

- Remove unused keyframes: `particle-float`, `particle-float-alt`, `ember` (ambient background was removed)
- Remove unused classes: `fixed-card*`, `scroll-shadows`, `ring-accent-soft`
- Consolidate duplicate transitions (some components have both CSS and motion animations)
- Audit: 442 lines of CSS, ~80 lines may be dead

---

# PHASE N — MOONSHOTS (P4)

## N1. AR Mode (Mobile)

**Effort:** XL | **Impact:** 🔥🔥🔥

Using the phone camera, overlay habit progress and streaks on the real world through AR.

- Point camera at your gym → shows "You've worked out 12 times this month"
- Point at your bookshelf → "You've read 3 of 5 books toward your goal"
- **Tech:** WebXR API or native ARKit/ARCore integration

## N2. Habit Marketplace

**Effort:** XL | **Impact:** 🔥🔥

Community-curated habit templates that users can sell:

- **Create:** Power users build specialized routines (e.g., "Marathon Training — 16 weeks")
- **Price:** Free or paid (developer takes 15% cut)
- **Quality:** Rating system, verified creator badge
- **Categories:** Fitness, Study, Career, Mental Health, Finance, etc.

## N3. Predictive Relapse Prevention

**Effort:** XL | **Impact:** 🔥🔥🔥

Using machine learning to predict when a user is likely to abandon a habit and intervene before it happens.

- **Model:** Lightweight ONNX model running in-browser (via Transformers.js or ONNX Runtime Web)
- **Features:** Recent completion rate, streak status, day of week, time of year, mood/energy
- **Action:** When risk is high (>70%), show a motivational prompt, suggest lowering difficulty, or trigger a friend notification (with user consent)

## N4. Biofeedback Integration

**Effort:** XL | **Impact:** 🔥🔥

Integrate with wearables for biofeedback-driven habit suggestions:

- **Heart rate variability (HRV):** Suggest rest days when HRV is low
- **Sleep quality:** Adjust morning habit difficulty based on sleep score
- **Stress levels:** Recommend calming habits when stress is detected
- **Tech:** Apple Health API, Google Fit API, or direct wearable SDKs (requires companion app)

## N5. Gamified Life RPG

**Effort:** XL | **Impact:** 🔥🔥🔥

Turn the app into a full life RPG:

- **Character:** Full avatar customization, stats (strength, intelligence, vitality) that grow with habit categories
- **Quests:** Story-driven quest chains (not just daily) with NPC dialogue
- **World map:** Regions unlocked by leveling different skill trees
- **Multiplayer:** Raid bosses where guilds work together to defeat them through collective habit completion
- **Economy:** Player-to-player trading of cosmetics and items

---

# PRIORITY QUICK WINS (Can Be Done In A Day Each)

These are small-effort, high-impact items that can be implemented in a single session:

| #   | Suggestion                                                         | Effort | Impact | File(s)                |
| --- | ------------------------------------------------------------------ | ------ | ------ | ---------------------- |
| 1   | Fix postcss vulnerability (upgrade Next.js)                        | S      | 🔥🔥   | package.json           |
| 2   | Add Sentry error monitoring                                        | S      | 🔥🔥   | New + next.config.ts   |
| 3   | Category tabs on Today page                                        | S      | 🔥     | today/page.tsx         |
| 4   | Empty state illustrations (SVG)                                    | S      | 🔥     | EmptyState.tsx + pages |
| 5   | Streak recovery animation                                          | S      | 🔥     | CelebrationManager.tsx |
| 6   | Mood/energy slider in check-in                                     | M      | 🔥🔥   | CheckInPopup.tsx       |
| 7   | Full Zod validation in loadData                                    | M      | 🔥🔥   | storage.ts, export.ts  |
| 8   | GitHub Actions CI                                                  | M      | 🔥🔥   | .github/workflows/     |
| 9   | Remove remaining dead CSS/CSS vars                                 | S      | 🔥     | globals.css            |
| 10  | Drag-to-reorder habits (with removed @dnd-kit or reorderable list) | M      | 🔥🔥   | today/page.tsx         |

---

# IMPLEMENTATION ORDER (Recommended Sequence)

```
Phase A — Foundation (Weeks 1-2)
  A1 → A2 → A3 → A4
  (Cloud sync unlocks everything else)

Phase B — Social (Weeks 3-6)
  B1 → B3 → B4 → B2
  (Friends first, then lightweight competition, then challenges, then parties)

Phase C — AI (Weeks 5-8, can overlap with B)
  C2 → C4 → C1 → C3
  (Smart scheduling first — easiest — then NL creation, then coach, then burnout)

Phase D — UI Polish (Weeks 7-10)
  D4 → D6 → D7 → D5 → D2 → D3 → D1
  (Quick wins first)

Phase E — Gamification (Weeks 9-12)
  E1 → E3 → E2 → E4 → E5

Phase F — Data (Weeks 10-13)
  F4 → F1 → F2 → F3

Phase G — i18n & a11y (Weeks 11-14)
  G2 → G1 → G3

Phase H — Performance (Weeks 13-15)
  H1 → H2 → H3 → H4

Phase I — Infrastructure (Weeks 14-16)
  I1 → I2 → I3 → I4

Phase J — Business (Weeks 16-20)
  J3 → J1 → J2 → J4

Phase K+ — Advanced (Weeks 20+)
  K1 → K2 → K3 → L1 → L2 → L3 → L4 → N*
```

---

_This document was generated on 2026-06-20. It is a living document — revisit and reprioritize as the app evolves and user feedback comes in._
