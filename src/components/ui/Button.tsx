import type { ButtonHTMLAttributes, ReactNode } from "react";

// One source of truth for button styling across the app. Use <Button> for
// real buttons, or buttonClasses() to give a Next <Link> the same look.

export type ButtonVariant = "primary" | "soft" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "icon";

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold whitespace-nowrap transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white shadow-sm hover:brightness-110",
  soft: "bg-accent/10 text-accent hover:bg-accent/20",
  outline: "border border-line text-muted hover:bg-surface2 hover:text-ink",
  ghost: "text-muted hover:bg-surface2 hover:text-ink",
  danger: "bg-missed text-white shadow-sm hover:brightness-110",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  icon: "size-9 p-0",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className = "",
): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={buttonClasses(variant, size, className)} {...props}>
      {children}
    </button>
  );
}
