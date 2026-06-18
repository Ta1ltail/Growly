"use client";

// Keyboard shortcuts help modal — shows all available shortcuts.
// Triggered by pressing "?" (via useKeyboardShortcuts).
// Listens for the custom "kb:toggle-help" event.

import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import { ALL_SHORTCUTS } from "@/hooks/useKeyboardShortcuts";
import { Modal } from "./Modal";

export function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen((prev) => !prev);
    window.addEventListener("kb:toggle-help", handler);
    return () => window.removeEventListener("kb:toggle-help", handler);
  }, []);

  // Group shortcuts
  const navShortcuts = ALL_SHORTCUTS.filter((s) => s.keys.startsWith("g then"));
  const actionShortcuts = ALL_SHORTCUTS.filter(
    (s) => !s.keys.startsWith("g then") && s.keys !== "?" && !s.keys.startsWith("Ctrl"),
  );
  const editShortcuts = ALL_SHORTCUTS.filter((s) =>
    s.keys.startsWith("Ctrl"),
  );

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Keyboard Shortcuts"
      subtitle="Press keys to navigate and act quickly"
      size="md"
    >
      <div className="space-y-5">
        {/* Navigation */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Navigation
          </h3>
          <div className="space-y-1.5">
            {navShortcuts.map((s) => (
              <div
                key={s.keys}
                className="flex items-center justify-between rounded-lg bg-surface2/50 px-3 py-2"
              >
                <span className="text-sm text-ink">{s.description}</span>
                <kbd className="rounded-md bg-surface px-2 py-0.5 font-mono text-[11px] font-medium text-accent ring-1 ring-line">
                  {s.keys}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Actions
          </h3>
          <div className="space-y-1.5">
            {actionShortcuts.map((s) => (
              <div
                key={s.keys}
                className="flex items-center justify-between rounded-lg bg-surface2/50 px-3 py-2"
              >
                <span className="text-sm text-ink">{s.description}</span>
                <kbd className="rounded-md bg-surface px-2 py-0.5 font-mono text-[11px] font-medium text-accent ring-1 ring-line">
                  {s.keys}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Edit */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Edit
          </h3>
          <div className="space-y-1.5">
            {editShortcuts.map((s) => (
              <div
                key={s.keys}
                className="flex items-center justify-between rounded-lg bg-surface2/50 px-3 py-2"
              >
                <span className="text-sm text-ink">{s.description}</span>
                <kbd className="rounded-md bg-surface px-2 py-0.5 font-mono text-[11px] font-medium text-accent ring-1 ring-line">
                  {s.keys}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-accent/5 p-3 text-xs text-muted">
          <p className="flex items-center gap-2">
            <Keyboard className="size-3.5" />
            Press <kbd className="rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-accent ring-1 ring-line">?</kbd>{" "}
            anytime to toggle this modal.
          </p>
        </div>
      </div>
    </Modal>
  );
}
