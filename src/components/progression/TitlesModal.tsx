"use client";

// Full titles list (opened by clicking the title on the profile). Shows every
// title grouped by rank, with the level each needs, a check when already earned
// at the current level, a lock otherwise, and the current title highlighted.

import { Check, Lock } from "lucide-react";
import { TITLES, type Rank } from "@/lib/titles";
import { RANK_STYLE, RANK_ORDER } from "@/lib/ranks";
import { Modal } from "@/components/ui/Modal";

export function TitlesModal({
  open,
  onClose,
  level,
  currentTitleName,
}: {
  open: boolean;
  onClose: () => void;
  level: number;
  currentTitleName: string;
}) {
  // Group titles by rank, ranks in ascending order.
  const ranks = Array.from(new Set(TITLES.map((t) => t.rank))).sort(
    (a, b) => RANK_ORDER[a] - RANK_ORDER[b],
  ) as Rank[];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Titles"
      subtitle="Earn them by leveling up"
      size="md"
    >
      <div className="flex flex-col gap-5">
        {ranks.map((rank) => {
          const style = RANK_STYLE[rank];
          return (
            <div key={rank}>
              <h3
                className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide"
                style={{ color: style.accent }}
              >
                <span aria-hidden>{style.icon}</span> {rank}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {TITLES.filter((t) => t.rank === rank).map((t) => {
                  const earned = level >= t.minLevel;
                  const isCurrent = t.name === currentTitleName;
                  return (
                    <li
                      key={t.name}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm ${
                        isCurrent ? "border-accent bg-accent/10" : "border-line"
                      }`}
                    >
                      <span
                        className={`grid size-6 shrink-0 place-items-center rounded-full ${
                          earned ? "text-done" : "text-faint"
                        }`}
                      >
                        {earned ? (
                          <Check className="size-4" strokeWidth={3} />
                        ) : (
                          <Lock className="size-3.5" />
                        )}
                      </span>
                      <span
                        className={`flex-1 ${earned ? "font-semibold" : "text-muted"}`}
                      >
                        {t.name}
                        {isCurrent && (
                          <span className="ml-2 text-[10px] font-bold uppercase text-accent">
                            Current
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-faint">
                        Lv {t.minLevel}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
