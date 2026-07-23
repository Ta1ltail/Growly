"use client";

// Small icon button with a hover tooltip label. Used in habit rows and action
// lists. Touch target is at least 44px for WCAG compliance via pseudo-element.

import { SoundManager } from "@/lib/sound/SoundManager";

export function IconBtn({
  children,
  label,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  const handleClick = () => {
    SoundManager.instance.play(danger ? "button:delete" : "button:click");
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      title={label}
      className={`group relative rounded-lg p-1.5 text-muted transition-all duration-200 hover:scale-110 ${
        danger
          ? "hover:bg-missed/10 hover:text-missed"
          : "hover:bg-surface2 hover:text-ink"
      } before:absolute before:inset-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:min-w-11 before:min-h-11 before:content-['']`}
    >
      <span className="inline-flex items-center justify-center group-hover:animate-icon-wiggle">
        {children}
      </span>
    </button>
  );
}
