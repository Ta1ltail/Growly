import type { LucideIcon } from "lucide-react";

// A compact stat tile: icon, big value, label.

export function StatCard({
  icon: Icon,
  value,
  label,
  accent = false,
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface/80 p-4 shadow-[var(--shadow-sm)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40">
      <span
        className={`mb-3 flex size-9 items-center justify-center rounded-xl ${
          accent ? "bg-accent/15 text-accent" : "bg-surface2 text-muted"
        }`}
      >
        <Icon className="size-[18px]" />
      </span>
      <div className="font-mono text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </div>
  );
}
