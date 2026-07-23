"use client";

// Accessible modal dialog used for all add/edit actions across the app.
// Closes on Escape or backdrop click, locks body scroll, and traps initial
// focus. Keeps pages clean by moving forms out of the content flow.

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { SoundManager } from "@/lib/sound/SoundManager";

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  headerActions,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  headerActions?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Play modal open sound
    SoundManager.instance.play("button:modal-open");
    const FOCUSABLE =
      'input, textarea, select, button, a[href], [tabindex]:not([tabindex="-1"])';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Close sound is handled by the cleanup effect — don't play it here
        // to avoid double playback.
        onClose();
        return;
      }
      // Trap Tab focus inside the dialog so keyboard users can't tab out.
      if (e.key === "Tab" && panelRef.current) {
        const items = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
        ).filter((el) => !el.hasAttribute("disabled"));
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Move focus into the panel.
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    // Notify the Capacitor back-button handler that a modal is open.
    // The handler listens for these custom events to know to close dialogs
    // before navigating back.
    window.dispatchEvent(new CustomEvent("modal:open"));

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      SoundManager.instance.play("button:modal-close");
      window.dispatchEvent(new CustomEvent("modal:close"));
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4 md:ml-60"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-2xl animate-rise sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {headerActions}
            <button
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface2 hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {footer && (
          <div className="flex justify-end gap-2 border-t border-line px-5 py-3.5 safe-area-bottom">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
