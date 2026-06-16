// Shared presentational kit for the Developer Mode panel. No hooks here, so
// these compose freely inside the client section components. The `query` +
// `terms` props drive in-panel search: a row hides itself when the query
// doesn't match its label/hint/terms.

import type { ReactNode } from "react";

// True when every whitespace token of `query` appears in `terms`.
export function matchQuery(query: string, terms: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = terms.toLowerCase();
  return q.split(/\s+/).every((t) => hay.includes(t));
}

export function DevGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-faint">{title}</p>
      <div className="rounded-xl border border-line bg-surface/60 px-3 divide-y divide-line">{children}</div>
    </div>
  );
}

export function DevRow({
  label,
  hint,
  terms = "",
  query = "",
  children,
}: {
  label: string;
  hint?: string;
  terms?: string;
  query?: string;
  children?: ReactNode;
}) {
  if (!matchQuery(query, `${label} ${hint ?? ""} ${terms}`)) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="mt-0.5 text-xs leading-snug text-muted">{hint}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}

// A stacked row for controls that need full width (textarea, sliders, fields).
export function DevStack({
  label,
  hint,
  terms = "",
  query = "",
  children,
}: {
  label: string;
  hint?: string;
  terms?: string;
  query?: string;
  children: ReactNode;
}) {
  if (!matchQuery(query, `${label} ${hint ?? ""} ${terms}`)) return null;
  return (
    <div className="py-2.5">
      <p className="text-sm font-medium">{label}</p>
      {hint && <p className="mt-0.5 text-xs leading-snug text-muted">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function DevToggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-accent" : "bg-surface2 border border-line"}`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`}
      />
    </button>
  );
}

export type DevBtnTone = "default" | "accent" | "danger";

export function DevButton({
  children,
  onClick,
  tone = "default",
  disabled = false,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: DevBtnTone;
  disabled?: boolean;
  title?: string;
}) {
  const tones: Record<DevBtnTone, string> = {
    default: "border border-line text-muted hover:bg-surface2 hover:text-ink",
    accent: "bg-accent text-white hover:brightness-110",
    danger: "bg-missed text-white hover:brightness-110",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-50 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

export const DEV_INPUT =
  "w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-accent";

// Read-only labelled value used across System Information / Performance.
export function DevStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="truncate text-right font-mono text-xs">{value}</span>
    </div>
  );
}

export function bytesToSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
