# Tools Used — project_101

All dependencies and tools installed in this project, with purpose and rationale.

---

## Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.2.9 | React framework with App Router, server components, and file-based routing |
| `react` / `react-dom` | 19 | UI library |
| `lucide-react` | 1.18 | Icon library — clean, consistent SVG icons throughout the app |
| `motion` | 12.40 | Animation library (framer-motion v12) — page transitions, stagger list animations, micro-interactions (whileHover, whileTap) |
| `sonner` | 2.0 | Toast notifications — replaced custom toast stack for celebration popups and system notifications |
| `clsx` | 2.1 | Conditional className construction — foundational utility for the `cn()` helper |
| `tailwind-merge` | 3.6 | Tailwind class conflict resolution — foundational utility for the `cn()` helper |
| `zod` | 4.4 | Runtime schema validation — used in `importJSON()` to validate imported backup files instead of unsafe `as unknown as AppData` casts |
| `postcss` | 8.5 | CSS processing (peer dep of Tailwind) |

## Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | 5 | Type checking and compilation |
| `@types/react` / `@types/react-dom` / `@types/node` | 19/20 | TypeScript type definitions |
| `tailwindcss` | 4 | Utility-first CSS framework |
| `@tailwindcss/postcss` | 4 | Tailwind PostCSS plugin for v4 |
| `eslint` + `eslint-config-next` | 9 / 16.2 | Linting with Next.js rules |
| `vitest` | 4 | Unit/integration test runner — 81 tests across 5 files |
| `knip` | 6.17 | Dead code detection — finds unused files, exports, and dependencies. Run: `npx knip` |
| `prettier` | 3.8 | Code formatter — 113 files formatted consistently. Run: `npx prettier --write .` |
| `@next/bundle-analyzer` | 16.2 | Visual bundle size analysis. Run: `ANALYZE=true npm run build` |

## Previously Installed (Removed)

| Package | Reason Removed |
|---------|---------------|
| `@dnd-kit/core / sortable / utilities` | Planned for ReorderableGrid replacement but the hand-rolled version works well enough — tree-shaking savings (~8KB gzipped) |
| `culori` | Planned for accent color generation but theme system uses CSS variables directly |
| `date-fns` | Planned to replace hand-rolled date helpers but existing helpers (`addDays`, `dateKey`, etc.) are sufficient and tree-shaking savings (~4KB) |

## Tools Not In package.json

| Tool | How to Use | Purpose |
|------|-----------|---------|
| Chrome DevTools | `F12` in browser | Runtime performance profiling, network inspection, console debugging |
| React DevTools | Browser extension | Component tree inspection, re-render tracking |
| Lighthouse | Chrome built-in | Performance, accessibility, SEO audits |

## Quality Gates

Run all four after any change:

```bash
npx tsc --noEmit           # Type check
npm run lint                # Lint
npx vitest run              # Tests (81)
npm run build               # Production build
```

## Commands

```bash
npm run dev                 # Start dev server (uses --webpack for Windows compat)
npm run build               # Production build
ANALYZE=true npm run build  # Build with bundle analysis
npx prettier --write .      # Format all files
npx knip                    # Dead code scan
npm audit                   # Vulnerability scan
```
