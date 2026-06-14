import type { ReactNode } from "react";

// Glassy surface card. `as` lets it render a section/div; `interactive`
// adds a subtle hover lift.

export function Card({
  children,
  className = "",
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-surface/80 backdrop-blur-sm ${
        interactive
          ? "transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-xl hover:shadow-black/5"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
