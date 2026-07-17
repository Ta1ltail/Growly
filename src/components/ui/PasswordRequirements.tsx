"use client";

// Floating password requirements tooltip — appears beside/below the password
// field when focused and disappears when focus is lost or all requirements
// are met. No layout shifting — uses position: absolute with a portal-style
// floating card.

import { useRef, useState, useEffect, type ReactNode } from "react";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/util";

export interface PasswordRequirement {
  label: string;
  test: (pw: string) => boolean;
}

interface PasswordRequirementsProps {
  password: string;
  requirements: PasswordRequirement[];
  isFocused: boolean;
  strengthLabel?: string;
  strengthColor?: string;
  strengthBars?: number;
  maxBars?: number;
}

export function PasswordRequirements({
  password,
  requirements,
  isFocused,
  strengthLabel,
  strengthColor,
  strengthBars = 0,
  maxBars = 4,
}: PasswordRequirementsProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allMet = requirements.every((r) => r.test(password));

  // Show when focused and password is being typed (not empty) and not all met
  // Hide with a small delay after losing focus
  useEffect(() => {
    if (isFocused && password.length > 0 && !allMet) {
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
    } else if (!isFocused) {
      timerRef.current = setTimeout(() => setVisible(false), 200);
    } else if (allMet) {
      timerRef.current = setTimeout(() => setVisible(false), 600);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isFocused, password, allMet]);

  if (!visible && !isFocused) return null;

  const showAllMet = allMet && password.length > 0;

  return (
    <div
      className={cn(
        "absolute right-0 top-full z-50 mt-2 w-full animate-fade-in",
        "rounded-xl border border-line/60 bg-surface p-3 shadow-lg backdrop-blur-xl",
      )}
      style={{ animationDuration: "0.2s" }}
    >
      {/* Arrow pointing up */}
      <div className="absolute -top-1 right-4 size-2 rotate-45 border-l border-t border-line/60 bg-surface" />

      {/* Strength bars */}
      {strengthLabel && (
        <div className="mb-2 flex items-center gap-2">
          <div className="flex flex-1 gap-0.5">
            {Array.from({ length: maxBars }, (_, i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{
                  backgroundColor:
                    i < strengthBars ? strengthColor : "var(--c-line)",
                  opacity: i < strengthBars ? 1 : 0.3,
                }}
              />
            ))}
          </div>
          <span
            className="shrink-0 text-[10px] font-semibold"
            style={{ color: strengthColor }}
          >
            {strengthLabel}
          </span>
        </div>
      )}

      {/* Requirement checklist */}
      {showAllMet ? (
        <div className="flex items-center gap-2 text-[11px] text-done">
          <Check className="size-3" strokeWidth={3} />
          All requirements met
        </div>
      ) : (
        <div className="space-y-1">
          {requirements.map((req) => {
            const met = req.test(password);
            return (
              <div key={req.label} className="flex items-center gap-2">
                <span
                  className={`flex size-3.5 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
                    met ? "bg-done/15 text-done" : "bg-line/30 text-faint"
                  }`}
                >
                  {met ? (
                    <Check className="size-2.5" strokeWidth={3} />
                  ) : (
                    <Circle className="size-1.5 fill-current" />
                  )}
                </span>
                <span
                  className={`text-[11px] transition-colors duration-200 ${
                    met ? "text-done" : "text-muted"
                  }`}
                >
                  {req.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
