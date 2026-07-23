import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/util";
import { SoundManager, type SoundEvent } from "@/lib/sound/SoundManager";

export type ButtonVariant = "primary" | "soft" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "icon";

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold whitespace-nowrap transition-all active:scale-[0.93] disabled:pointer-events-none disabled:opacity-50";

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

// Default sound mapping by variant — danger/delete gets the "delete" sound.
function variantSound(variant: ButtonVariant): SoundEvent | undefined {
  if (variant === "danger") return "button:delete";
  return "button:click";
}

function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className = "",
): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

type ButtonSound = SoundEvent | false | undefined;

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  sound: soundProp,
  onClick,
  ...props
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
  /**
   * Sound event to play on click. Defaults based on variant.
   * Set to `false` to disable sound for this button.
   */
  sound?: ButtonSound;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Play sound if not disabled
    if (!props.disabled) {
      const event =
        soundProp !== undefined
          ? soundProp
          : variantSound(variant);
      if (event) {
        SoundManager.instance.play(event);
      }
    }
    onClick?.(e);
  };

  return (
    <button
      type="button"
      className={buttonClasses(variant, size, className)}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}
