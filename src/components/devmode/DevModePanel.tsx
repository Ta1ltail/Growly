"use client";

// The Developer Mode popup — an advanced-settings slide-over. A horizontal
// section nav + a live search box that filters rows across sections. When a
// query is active, every matching section is stacked; otherwise the active
// section is shown alone.

import { useEffect, useState, type ComponentType } from "react";
import {
  X,
  Search,
  Settings2,
  Palette,
  Gauge,
  Database,
  UserCog,
  Bug,
  Cpu,
} from "lucide-react";
import { useDevSettings, setDev } from "@/lib/devmode";
import { matchQuery } from "./ui";
import { GeneralSection, GENERAL_TERMS } from "./sections/GeneralSection";
import { UiControlsSection, UI_TERMS } from "./sections/UiControlsSection";
import { PerformanceSection, PERF_TERMS } from "./sections/PerformanceSection";
import {
  DatabaseToolsSection,
  DB_TERMS,
} from "./sections/DatabaseToolsSection";
import {
  UserControlsSection,
  USER_TERMS,
} from "./sections/UserControlsSection";
import { DebugToolsSection, DEBUG_TERMS } from "./sections/DebugToolsSection";
import { SystemInfoSection, SYS_TERMS } from "./sections/SystemInfoSection";

interface SectionDef {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  terms: string;
  Component: ComponentType<{ query: string }>;
}

const SECTIONS: SectionDef[] = [
  {
    id: "general",
    label: "General",
    icon: Settings2,
    terms: GENERAL_TERMS,
    Component: GeneralSection,
  },
  {
    id: "ui",
    label: "UI Controls",
    icon: Palette,
    terms: UI_TERMS,
    Component: UiControlsSection,
  },
  {
    id: "performance",
    label: "Performance",
    icon: Gauge,
    terms: PERF_TERMS,
    Component: PerformanceSection,
  },
  {
    id: "database",
    label: "Database Tools",
    icon: Database,
    terms: DB_TERMS,
    Component: DatabaseToolsSection,
  },
  {
    id: "user",
    label: "User Controls",
    icon: UserCog,
    terms: USER_TERMS,
    Component: UserControlsSection,
  },
  {
    id: "debug",
    label: "Debug Tools",
    icon: Bug,
    terms: DEBUG_TERMS,
    Component: DebugToolsSection,
  },
  {
    id: "system",
    label: "System Information",
    icon: Cpu,
    terms: SYS_TERMS,
    Component: SystemInfoSection,
  },
];

export function DevModePanel({ onClose }: { onClose: () => void }) {
  const dev = useDevSettings();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const searching = query.trim() !== "";
  const active = SECTIONS.find((s) => s.id === dev.section) ?? SECTIONS[0];
  const shown = searching
    ? SECTIONS.filter((s) => matchQuery(query, `${s.label} ${s.terms}`))
    : [active];

  return (
    <div
      className="fixed inset-0 z-[70] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Developer Mode"
    >
      <button
        aria-label="Close developer mode"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside className="relative flex h-full w-full max-w-[26rem] flex-col border-l border-line bg-surface shadow-2xl animate-rise">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-accent text-white">
              <Bug className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold leading-tight">
                Developer Mode
              </h2>
              <p className="font-mono text-[10px] text-faint">
                project_101 · advanced
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface2 hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="border-b border-line px-4 py-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search settings…"
              className="w-full rounded-lg border border-line bg-surface2 py-2 pl-9 pr-3 text-sm outline-none placeholder:text-faint focus:border-accent"
              aria-label="Search developer settings"
            />
          </div>
        </div>

        {!searching && (
          <nav className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2">
            {SECTIONS.map((s) => {
              const on = s.id === active.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setDev({ section: s.id })}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                    on
                      ? "bg-accent/15 text-accent"
                      : "text-muted hover:bg-surface2 hover:text-ink"
                  }`}
                >
                  <s.icon className="size-3.5" />
                  {s.label}
                </button>
              );
            })}
          </nav>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {shown.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              No settings match “{query}”.
            </p>
          ) : (
            shown.map((s) => (
              <section key={s.id} className="mb-2">
                {searching && (
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-accent">
                    <s.icon className="size-3.5" /> {s.label}
                  </p>
                )}
                <s.Component query={query} />
              </section>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
