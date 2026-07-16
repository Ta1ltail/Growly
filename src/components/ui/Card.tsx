import type { ReactNode } from "react";
import { cn } from "@/lib/util";

export function Card({
  children,
  className = "",
  interactive = false,
  glow = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-surface/80 shadow-[var(--shadow-sm)] backdrop-blur-sm",
        interactive &&
          "transition-all duration-300 ease-out hover:scale-[1.015] hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[var(--shadow-lg)] hover:bg-surface/90",
        glow && "shadow-[0_0_24px_-8px_var(--c-accent-glow)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
