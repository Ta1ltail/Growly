import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// Friendly empty state: icon in a soft circle, message, optional action.

export const EmptyState = memo(function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-12 text-center animate-fade-in">
      <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-surface2 text-muted">
        <Icon className="size-6" />
      </span>
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-xs text-muted">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
});
