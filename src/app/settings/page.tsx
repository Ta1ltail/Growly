"use client";

// Settings — standalone section (no longer buried in Profile): appearance
// (theme + accent + live preview), the Honest Tracking grace window, data
// export/reset, and a transparent audit log.

import { useState, useRef, useEffect } from "react";
import {
  Sun,
  Moon,
  Monitor,
  Palette,
  Check,
  Download,
  Trash2,
  ShieldCheck,
  ScrollText,
  Upload,
  Tags,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { dateKey, DEFAULT_GRACE_HOURS } from "@/lib/storage";
import {
  clearAllData,
  setGraceHours,
  setTheme,
  useAppData,
  replaceData,
  addCustomCategory,
  removeCustomCategory,
} from "@/lib/store";
import { useToday } from "@/hooks/useToday";
import { ACCENTS, type ThemeMode } from "@/lib/theme";
import { exportMarksCSV, exportJSON, importJSON } from "@/lib/export";
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
  // Latest data kept in a ref (updated in an effect, not during render) so the
  // async import handler reads fresh state instead of a stale closure.
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  });

  function download(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  function exportCsv() {
    download(
      exportMarksCSV(data),
      `project_101_export_${dateKey(today)}.csv`,
      "text/csv",
    );
  }

  function exportJson() {
    download(
      exportJSON(data),
      `project_101_backup_${dateKey(today)}.json`,
      "application/json",
    );
  }

  function importJson() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const { data: imported, error } = importJSON(text);
        if (error || !imported) {
          toast.error(error ?? "Invalid backup file.");
          return;
        }
        replaceData({
          ...dataRef.current,
          habits: imported.habits,
          marks: imported.marks,
          notes: imported.notes,
          goals: imported.goals,
        });
        toast.success("Data imported successfully!");
      } catch {
        toast.error("Failed to import: invalid JSON file.");
      }
    };
    input.click();
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Settings"
        subtitle="Appearance, tracking rules, and your data"
      />

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
                    activeMode
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-line text-muted hover:bg-surface2 hover:text-ink"
                  }`}
                >
                  <Icon className="size-5" />
                  {label}
                </button>
              );
            })}
          </div>

          <p className="mb-2 mt-5 text-xs font-medium text-muted">
            Accent color
          </p>
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
                    boxShadow: activeAccent
                      ? `0 0 0 3px var(--c-surface), 0 0 0 5px ${a.color}`
                      : undefined,
                  }}
                >
                  {activeAccent && (
                    <Check className="size-4 text-white" strokeWidth={3} />
                  )}
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
            <span className="rounded-lg bg-surface2 px-2.5 py-1 text-xs text-muted">
              Sample
            </span>
          </div>
        </Card>
      </Section>

      {/* Honest Tracking */}
      <Section icon={ShieldCheck} title="Honest Tracking">
        <Card className="p-5">
          <p className="text-sm text-muted">
            Past days lock automatically so streaks and stats stay honest. The
            grace window lets you still finish <em>yesterday</em> early the next
            morning.
          </p>
          <p className="mb-2 mt-4 text-xs font-medium text-muted">
            Grace window (hours after midnight)
          </p>
          <div className="inline-flex gap-1 rounded-xl border border-line bg-surface2 p-1">
            {GRACE_OPTIONS.map((h) => (
              <button
                key={h}
                onClick={() => setGraceHours(h)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                  grace === h
                    ? "bg-accent text-white shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                {h === 0 ? "Off" : `${h}h`}
              </button>
            ))}
          </div>
        </Card>
      </Section>

      {/* Custom Categories */}
      <Section icon={Tags} title="Custom Categories">
        <Card className="p-5">
          <p className="mb-3 text-sm text-muted">
            Create custom categories beyond the built-in ones.
          </p>
          <CustomCategoryEditor />
        </Card>
      </Section>

      {/* Data */}
      <Section icon={Download} title="Data">
        <Card className="divide-y divide-line overflow-hidden">
          <Row onClick={exportCsv} icon={Download} label="Export marks (CSV)" />
          <Row
            onClick={exportJson}
            icon={Download}
            label="Download full backup (JSON)"
          />
          <Row
            onClick={importJson}
            icon={Upload}
            label="Import backup (JSON)"
          />
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
          <Card className="p-5 text-sm text-muted">
            No changes recorded yet.
          </Card>
        ) : (
          <Card className="max-h-72 divide-y divide-line overflow-y-auto">
            {data.auditLog.slice(0, 50).map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 px-4 py-2.5 text-sm"
              >
                <span className="flex-1">{e.summary}</span>
                <span className="font-mono text-[11px] text-faint">
                  {new Date(e.at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
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
          This deletes all habits, marks, notes, goals, and history on this
          device. Your theme stays. Consider downloading a backup first. This
          cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

function CustomCategoryEditor() {
  const data = useAppData();
  const [name, setName] = useState("");
  const customCats = data.settings.customCategories ?? [];

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addCustomCategory(trimmed);
    setName("");
  };

  return (
    <div>
      {customCats.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {customCats.map((cat) => (
            <span
              key={cat}
              className="flex items-center gap-1.5 rounded-full bg-surface2 px-3 py-1.5 text-xs"
            >
              {cat}
              <button
                onClick={() => removeCustomCategory(cat)}
                className="ml-0.5 rounded-full p-0.5 text-faint hover:text-missed transition-colors"
                aria-label={`Remove ${cat}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder="New category name"
          maxLength={24}
          className="flex-1 rounded-xl border border-line bg-surface2 px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-accent"
        />
        <Button onClick={handleAdd} disabled={!name.trim()} size="sm">
          <Plus className="size-3.5" /> Add
        </Button>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Sun;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 first:mt-0">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
        <Icon className="size-4" /> {title}
      </h2>
      {children}
    </section>
  );
}

function Row({
  onClick,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  icon: typeof Sun;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm transition-colors hover:bg-surface2/50"
    >
      <Icon className="size-[18px] text-muted" />
      <span className="flex-1">{label}</span>
    </button>
  );
}
