import type { ReactNode } from "react";

// Glassy surface card with enhanced hover effects. `interactive` adds subtle
// lift + accent glow on hover; `glow` adds a persistent soft accent aura.

export function Card({
  children,
  className = "",
  interactive = false,
  glow = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  // A persistent soft accent glow for featured/callout cards.
  glow?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-surface/80 shadow-[var(--shadow-sm)] backdrop-blur-sm ${
        interactive
          ? "transition-all duration-300 ease-out hover:-translate-y-1 hover:border-accent/40 hover:shadow-[var(--shadow-lg)] hover:bg-surface/90"
          : ""
      } ${glow ? "shadow-[0_0_24px_-8px_var(--c-accent-glow)]" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
