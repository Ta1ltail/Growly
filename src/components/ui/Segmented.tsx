"use client";

import { memo } from "react";

// A segmented control / pill group for filters and toggles.

function SegmentedInner<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="group"
      className="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-surface/60 p-1"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
              active
                ? "bg-accent text-white shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export const Segmented = memo(SegmentedInner) as typeof SegmentedInner;
