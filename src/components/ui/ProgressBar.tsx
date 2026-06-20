import { memo } from "react";

// Thin animated progress bar. `color` overrides the accent fill.

export const ProgressBar = memo(function ProgressBar({
  value,
  color,
  className = "",
}: {
  value: number; // 0-100
  color?: string;
  className?: string;
}) {
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-empty ${className}`}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          background: color ?? "var(--c-accent)",
        }}
      />
    </div>
  );
});
