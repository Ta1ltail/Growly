import type { ReactNode } from "react";
import { motion } from "motion/react";
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
    <motion.div
      layout
      whileHover={
        interactive
          ? {
              scale: 1.015,
              y: -2,
              transition: { type: "spring", stiffness: 300, damping: 20 },
            }
          : undefined
      }
      className={cn(
        "rounded-2xl border border-line bg-surface/80 shadow-[var(--shadow-sm)] backdrop-blur-sm",
        interactive &&
          "transition-[border-color,box-shadow,background-color] duration-300 ease-out hover:border-accent/40 hover:shadow-[var(--shadow-lg)] hover:bg-surface/90",
        glow && "shadow-[0_0_24px_-8px_var(--c-accent-glow)]",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
