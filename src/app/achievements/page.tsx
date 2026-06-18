"use client";

// Achievement Gallery (spec §14): every achievement with unlock state and
// progress, plus badge-collection summary, category/rarity/status filters, and
// search. Pagination keeps the grid manageable. Fixed card sizes prevent layout
// shifting. Better unlock animations for badges.

import { useMemo, useState } from "react";
import { Search, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { useAppData } from "@/lib/store";
import { useToday } from "@/hooks/useToday";
import { summarizeProgress } from "@/lib/progress";
import { RARITY_ORDER, RARITY_LABEL } from "@/lib/achievements";
import { RARITY_STYLE } from "@/lib/rarity";
import type { AchievementCategory, Rarity } from "@/lib/types";
import { useHydrated } from "@/hooks/useHydrated";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { AchievementBadge } from "@/components/achievements/AchievementBadge";

const CATEGORY_OPTS: { value: AchievementCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "streak", label: "Streak" },
  { value: "completion", label: "Completion" },
  { value: "consistency", label: "Consistency" },
  { value: "category", label: "Category" },
  { value: "special", label: "Special" },
];

const STATUS_OPTS: { value: "all" | "unlocked" | "locked"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unlocked", label: "Unlocked" },
  { value: "locked", label: "Locked" },
];

const PAGE_SIZE = 12;

export default function AchievementsPage() {
  const data = useAppData();
  const today = useToday();
  const hydrated = useHydrated();

  const summary = useMemo(() => summarizeProgress(data, today), [data, today]);

  const [category, setCategory] = useState<AchievementCategory | "all">("all");
  const [status, setStatus] = useState<"all" | "unlocked" | "locked">("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const rarityCounts = useMemo(() => {
    const counts: Record<Rarity, { unlocked: number; total: number }> = {
      common: { unlocked: 0, total: 0 },
      rare: { unlocked: 0, total: 0 },
      epic: { unlocked: 0, total: 0 },
      legendary: { unlocked: 0, total: 0 },
    };
    for (const a of summary.achievements) {
      counts[a.def.rarity].total += 1;
      if (a.unlocked) counts[a.def.rarity].unlocked += 1;
    }
    return counts;
  }, [summary.achievements]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return summary.achievements
      .filter((a) => category === "all" || a.def.category === category)
      .filter((a) => status === "all" || (status === "unlocked" ? a.unlocked : !a.unlocked))
      .filter((a) => !q || a.def.name.toLowerCase().includes(q) || a.def.description.toLowerCase().includes(q))
      .sort((a, b) => {
        if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
        const r = RARITY_ORDER[b.def.rarity] - RARITY_ORDER[a.def.rarity];
        if (r !== 0) return r;
        return b.progressPct - a.progressPct;
      });
  }, [summary.achievements, category, status, query]);

  // Closest locked achievements — top 3 by progress percentage
  const nextAchievable = useMemo(() => {
    return summary.achievements
      .filter((a) => !a.unlocked && a.progressPct > 0)
      .sort((a, b) => b.progressPct - a.progressPct)
      .slice(0, 3);
  }, [summary.achievements]);

  // Pagination
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const paged = visible.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const start = safePage * PAGE_SIZE + 1;
  const end = Math.min(visible.length, (safePage + 1) * PAGE_SIZE);

  if (!hydrated) return <PageSkeleton />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Achievements"
        subtitle={`${summary.unlockedCount} of ${summary.totalCount} unlocked`}
      />

      {/* Next achievable — closest locked achievements */}
      {nextAchievable.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            <TrendingUp className="size-4" /> Next achievable
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {nextAchievable.map((a) => {
              const r = RARITY_STYLE[a.def.rarity];
              return (
                <Card
                  key={a.def.id}
                  className="group flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  glow
                >
                  <div className="relative shrink-0">
                    <AchievementBadge def={a.def} size={48} locked />
                    <span
                      className="absolute -bottom-1 -right-1 text-sm opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    >
                      🔓
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.def.name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted">{a.def.description}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1">
                        <ProgressBar value={a.progressPct} color={r.accent} />
                      </div>
                      <span className="shrink-0 font-mono text-[11px] font-bold" style={{ color: r.accent }}>
                        {a.progressPct}%
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Badge collection summary by rarity */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(RARITY_STYLE) as Rarity[]).map((rarity) => {
          const c = rarityCounts[rarity];
          const r = RARITY_STYLE[rarity];
          const pct = c.total ? Math.round((c.unlocked / c.total) * 100) : 0;
          return (
            <Card key={rarity} className="p-4 h-[120px] flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-lg" aria-hidden>{r.medal}</span>
                <span className="font-mono text-sm font-bold">
                  {c.unlocked}/{c.total}
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold" style={{ color: r.accent }}>
                {RARITY_LABEL[rarity]}
              </p>
              <div className="mt-auto">
                <ProgressBar className="mt-2" value={pct} color={r.accent} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search achievements…"
            className="w-full rounded-xl border border-line bg-surface py-2.5 pl-10 pr-3 text-sm outline-none focus:border-accent"
            aria-label="Search achievements"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented options={CATEGORY_OPTS} value={category} onChange={setCategory} />
          <Segmented options={STATUS_OPTS} value={status} onChange={setStatus} />
        </div>
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">No achievements match your filters.</Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 stagger-children">
            {paged.map((a) => {
              const r = RARITY_STYLE[a.def.rarity];
              return (
                <Card
                  key={a.def.id}
                  className={`flex gap-4 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${a.unlocked ? "" : "opacity-90"}`}
                >
                  <AchievementBadge
                    def={a.def}
                    size={64}
                    locked={!a.unlocked}
                    shine={a.unlocked && a.def.rarity === "legendary"}
                  />
                  <div className="min-w-0 flex-1 flex flex-col">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold">{a.def.name}</h3>
                      <span
                        className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase"
                        style={{ background: `${r.accent}1f`, color: r.accent }}
                      >
                        {RARITY_LABEL[a.def.rarity]}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">{a.def.description}</p>
                    {a.unlocked ? (
                      <p className="mt-auto pt-2 text-xs font-semibold text-done animate-fade-in">
                        ✓ Unlocked
                      </p>
                    ) : (
                      <div className="mt-auto pt-2">
                        <ProgressBar value={a.progressPct} color={r.accent} />
                        <p className="mt-1 font-mono text-[11px] text-faint">
                          {a.current}/{a.target}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="mt-6 flex items-center justify-between gap-3">
              <span className="font-mono text-xs text-muted">
                {start}–{end} of {visible.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  aria-label="Previous page"
                  className="flex size-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:bg-surface2 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="px-3 font-mono text-xs text-muted">
                  {safePage + 1} / {pageCount}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={safePage >= pageCount - 1}
                  aria-label="Next page"
                  className="flex size-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:bg-surface2 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
