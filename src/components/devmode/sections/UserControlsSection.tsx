"use client";

import {
  useAppData,
  updateProfile,
  setGraceHours,
  replaceData,
  markAchievementsSeen,
} from "@/lib/store";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { DEFAULT_GRACE_HOURS } from "@/lib/storage";
import type { Unlocks } from "@/lib/types";
import { DevGroup, DevRow, DevStack, DevButton, DEV_INPUT } from "../ui";

export const USER_TERMS =
  "user controls profile display name username motto bio grace window honest tracking achievements unlock relock seen unseen level";

const GRACE_OPTIONS = [0, 3, 5, 8, 24];

export function UserControlsSection({ query }: { query: string }) {
  const data = useAppData();
  const { profile } = data;
  const grace = data.settings.graceHours ?? DEFAULT_GRACE_HOURS;

  function unlockAll() {
    const now = new Date().toISOString();
    const unlocks: Unlocks = {};
    for (const a of ACHIEVEMENTS) unlocks[a.id] = { at: now, seen: true };
    replaceData({ ...data, unlocks });
  }

  function setAllSeen(seen: boolean) {
    const unlocks: Unlocks = {};
    for (const [id, rec] of Object.entries(data.unlocks))
      unlocks[id] = { ...rec, seen };
    replaceData({ ...data, unlocks });
  }

  return (
    <>
      <DevGroup title="Profile">
        <DevStack label="Display name" query={query} terms="identity">
          <input
            value={profile.displayName}
            onChange={(e) => updateProfile({ displayName: e.target.value })}
            className={DEV_INPUT}
          />
        </DevStack>
        <DevStack label="Username" query={query} terms="handle">
          <input
            value={profile.username}
            onChange={(e) => updateProfile({ username: e.target.value })}
            className={DEV_INPUT}
          />
        </DevStack>
        <DevStack label="Motto" query={query} terms="tagline">
          <input
            value={profile.motto ?? ""}
            onChange={(e) => updateProfile({ motto: e.target.value })}
            className={DEV_INPUT}
          />
        </DevStack>
        <DevStack label="Bio" query={query} terms="about">
          <textarea
            value={profile.bio ?? ""}
            onChange={(e) => updateProfile({ bio: e.target.value })}
            rows={2}
            className={`${DEV_INPUT} resize-y`}
          />
        </DevStack>
      </DevGroup>

      <DevGroup title="Honest tracking">
        <DevRow
          label="Grace window (hours)"
          hint="How long 'yesterday' stays editable."
          query={query}
          terms="lock anti-cheat midnight"
        >
          <div className="inline-flex gap-1 rounded-lg border border-line bg-surface2 p-0.5">
            {GRACE_OPTIONS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setGraceHours(h)}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-all ${grace === h ? "bg-accent text-white" : "text-muted hover:text-ink"}`}
              >
                {h === 0 ? "Off" : `${h}h`}
              </button>
            ))}
          </div>
        </DevRow>
      </DevGroup>

      <DevGroup title="Achievements (debug)">
        <DevRow
          label="Force-unlock all"
          hint="Marks every achievement unlocked + seen."
          query={query}
          terms="grant complete"
        >
          <DevButton tone="accent" onClick={unlockAll}>
            Unlock all
          </DevButton>
        </DevRow>
        <DevRow
          label="Re-lock all"
          hint="Clears the unlock map."
          query={query}
          terms="reset relock"
        >
          <DevButton
            tone="danger"
            onClick={() => replaceData({ ...data, unlocks: {} })}
          >
            Re-lock
          </DevButton>
        </DevRow>
        <DevRow
          label="Mark all seen"
          hint="Suppress pending celebrations."
          query={query}
          terms="dismiss popups"
        >
          <DevButton
            onClick={() => markAchievementsSeen(Object.keys(data.unlocks))}
          >
            Seen
          </DevButton>
        </DevRow>
        <DevRow
          label="Mark all unseen"
          hint="Re-queue every unlocked celebration."
          query={query}
          terms="replay popups"
        >
          <DevButton onClick={() => setAllSeen(false)}>Unseen</DevButton>
        </DevRow>
      </DevGroup>
    </>
  );
}
