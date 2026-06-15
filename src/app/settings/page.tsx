"use client";

// Settings — standalone section (no longer buried in Profile): appearance
// (theme + accent + live preview), the Honest Tracking grace window, data
// export/reset, and a transparent audit log.

import { useState } from "react";
import { Sun, Moon, Monitor, Palette, Check, Download, Trash2, ShieldCheck, ScrollText } from "lucide-react";
import { dateKey, DEFAULT_GRACE_HOURS } from "@/lib/storage";
import { clearAllData, setGraceHours, setTheme, useAppData } from "@/lib/store";
import { useToday } from "@/hooks/useToday";
import { ACCENTS, type ThemeMode } from "@/lib/theme";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

const MODES: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

const GRACE_OPTIONS = [0, 3, 5, 8];

export default function SettingsPage() {
  const data = useAppData();
  const today = useToday();
  const { mode, accent } = data.settings.theme;
  const grace = data.settings.graceHours ?? DEFAULT_GRACE_HOURS;
  const [confirmReset, setConfirmReset] = useState(false);

  function exportCsv() {
    const rows = ["date,habit,category,status"];
    const byId = new Map(data.habits.map((h) => [h.id, h]));
    for (const [date, day] of Object.entries(data.marks)) {
      for (const [habitId, status] of Object.entries(day)) {
        const habit = byId.get(habitId);
        if (!habit) continue;
        rows.push(`${date},"${habit.name.replace(/"/g, '""')}",${habit.category},${status}`);
      }
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project_101_export_${dateKey(today)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project_101_backup_${dateKey(today)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Settings" subtitle="Appearance, tracking rules, and your data" />

      {/* Appearance */}
      <Section icon={Palette} title="Appearance">
        <Card className="p-5">
          <p className="mb-2 text-xs font-medium text-muted">Theme</p>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map(({ id, label, icon: Icon }) => {
              const activeMode = mode === id;
              return (
                <button
                  key={id}
                  onClick={() => setTheme({ mode: id })}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition-all ${
                    activeMode ? "border-accent bg-accent/10 text-accent" : "border-line text-muted hover:bg-surface2 hover:text-ink"
                  }`}
                >
                  <Icon className="size-5" />
                  {label}
                </button>
              );
            })}
          </div>

          <p className="mb-2 mt-5 text-xs font-medium text-muted">Accent color</p>
          <div className="flex flex-wrap gap-2.5">
            {ACCENTS.map((a) => {
              const activeAccent = accent === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => setTheme({ accent: a.id })}
                  aria-label={a.label}
                  title={a.label}
                  className="flex size-10 items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95"
                  style={{
                    backgroundColor: a.color,
                    boxShadow: activeAccent ? `0 0 0 3px var(--c-surface), 0 0 0 5px ${a.color}` : undefined,
                  }}
                >
                  {activeAccent && <Check className="size-4 text-white" strokeWidth={3} />}
                </button>
              );
            })}
          </div>

          {/* Live preview */}
          <p className="mb-2 mt-5 text-xs font-medium text-muted">Preview</p>
          <div className="flex items-center gap-3 rounded-xl border border-line bg-bg p-4">
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-white">
              <Check className="size-4" strokeWidth={3} />
            </span>
            <div className="flex-1">
              <div className="h-2 w-2/3 rounded-full bg-accent" />
              <div className="mt-1.5 h-2 w-1/3 rounded-full bg-line" />
            </div>
            <span className="rounded-lg bg-surface2 px-2.5 py-1 text-xs text-muted">Sample</span>
          </div>
        </Card>
      </Section>

      {/* Honest Tracking */}
      <Section icon={ShieldCheck} title="Honest Tracking">
        <Card className="p-5">
          <p className="text-sm text-muted">
            Past days lock automatically so streaks and stats stay honest. The grace window lets you
            still finish <em>yesterday</em> early the next morning.
          </p>
          <p className="mb-2 mt-4 text-xs font-medium text-muted">Grace window (hours after midnight)</p>
          <div className="inline-flex gap-1 rounded-xl border border-line bg-surface2 p-1">
            {GRACE_OPTIONS.map((h) => (
              <button
                key={h}
                onClick={() => setGraceHours(h)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                  grace === h ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                {h === 0 ? "Off" : `${h}h`}
              </button>
            ))}
          </div>
        </Card>
      </Section>

      {/* Data */}
      <Section icon={Download} title="Data">
        <Card className="divide-y divide-line overflow-hidden">
          <Row onClick={exportCsv} icon={Download} label="Export marks (CSV)" />
          <Row onClick={exportJson} icon={Download} label="Download full backup (JSON)" />
          <button
            onClick={() => setConfirmReset(true)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm text-missed transition-colors hover:bg-missed/10"
          >
            <Trash2 className="size-[18px]" />
            <span className="flex-1">Reset all data</span>
          </button>
        </Card>
      </Section>

      {/* Audit log */}
      <Section icon={ScrollText} title="Audit log">
        {data.auditLog.length === 0 ? (
          <Card className="p-5 text-sm text-muted">No changes recorded yet.</Card>
        ) : (
          <Card className="max-h-72 divide-y divide-line overflow-y-auto">
            {data.auditLog.slice(0, 50).map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="flex-1">{e.summary}</span>
                <span className="font-mono text-[11px] text-faint">
                  {new Date(e.at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </Card>
        )}
      </Section>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset all data?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                clearAllData();
                setConfirmReset(false);
              }}
            >
              Delete everything
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          This deletes all habits, marks, notes, goals, and history on this device. Your theme stays.
          Consider downloading a backup first. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Sun; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
        <Icon className="size-4" /> {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ onClick, icon: Icon, label }: { onClick: () => void; icon: typeof Sun; label: string }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm transition-colors hover:bg-surface2/50">
      <Icon className="size-[18px] text-muted" />
      <span className="flex-1">{label}</span>
    </button>
  );
}
