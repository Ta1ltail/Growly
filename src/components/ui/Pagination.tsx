import { memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Simple page switcher (spec §12). Renders nothing for a single page. Shows
// prev/next plus the current range so long lists stay navigable.

export const Pagination = memo(function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onChange,
}: {
  page: number; // 0-based
  pageCount: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  const start = page * pageSize + 1;
  const end = Math.min(total, (page + 1) * pageSize);

  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <span className="font-mono text-xs text-muted">
        {start}–{end} of {total}
      </span>
      <div className="flex items-center gap-1">
        <PageBtn label="Previous page" disabled={page === 0} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="size-4" />
        </PageBtn>
        <span className="px-2 font-mono text-xs text-muted">
          {page + 1} / {pageCount}
        </span>
        <PageBtn label="Next page" disabled={page >= pageCount - 1} onClick={() => onChange(page + 1)}>
          <ChevronRight className="size-4" />
        </PageBtn>
      </div>
    </div>
  );
});

function PageBtn({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:bg-surface2 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}
