"use client";

import { useState } from "react";
import { useAppData, replaceData } from "@/lib/store";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { DEV_STORAGE_KEY, useDevSettings, setDev } from "@/lib/devmode";
import { STORAGE_KEY } from "@/lib/storage";
import type { Rarity } from "@/lib/types";
import { DevGroup, DevRow, DevToggle, DevButton } from "../ui";

export const DEBUG_TERMS =
  "debug tools trigger celebration toast popup confetti log state console error boundary throw verbose clear storage";

const RARITIES: Rarity[] = ["common", "rare", "epic", "legendary"];

// Render-phase throw to exercise the route error boundary.
function Boom(): null {
  throw new Error(
    "[devmode] test error — thrown intentionally from Debug Tools.",
  );
}

export function DebugToolsSection({ query }: { query: string }) {
  const data = useAppData();
  const dev = useDevSettings();
  const [boom, setBoom] = useState(false);

  // Inject an unseen unlock so CelebrationManager fires the matching tier.
  function celebrate(rarity: Rarity) {
    const def = ACHIEVEMENTS.find((a) => a.rarity === rarity);
    if (!def) return;
    replaceData({
      ...data,
      unlocks: {
        ...data.unlocks,
        [def.id]: { at: new Date().toISOString(), seen: false },
      },
    });
  }

  function nuke() {
    if (
      !window.confirm(
        "Remove ALL app data AND dev settings from localStorage, then reload?",
      )
    )
      return;
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(DEV_STORAGE_KEY);
    window.location.reload();
  }

  if (boom) return <Boom />;

  return (
    <>
      <DevGroup title="Celebrations">
        <DevRow
          label="Trigger unlock"
          hint="Force a celebration by rarity tier."
          query={query}
          terms="toast popup fullscreen confetti"
        >
          <div className="flex flex-wrap gap-1">
            {RARITIES.map((r) => (
              <DevButton key={r} onClick={() => celebrate(r)}>
                {r}
              </DevButton>
            ))}
          </div>
        </DevRow>
      </DevGroup>

      <DevGroup title="Logging">
        <DevRow
          label="Log state to console"
          hint="Print AppData on every change."
          query={query}
          terms="verbose debug console"
        >
          <DevToggle
            label="Log state to console"
            checked={dev.logState}
            onChange={(v) => setDev({ logState: v })}
          />
        </DevRow>
        <DevRow
          label="Dump state now"
          query={query}
          terms="console print snapshot"
        >
          <DevButton onClick={() => console.log("[devmode] snapshot", data)}>
            Log
          </DevButton>
        </DevRow>
      </DevGroup>

      <DevGroup title="Failure modes">
        <DevRow
          label="Throw test error"
          hint="Render-phase throw to test the error boundary."
          query={query}
          terms="crash boundary exception"
        >
          <DevButton tone="danger" onClick={() => setBoom(true)}>
            Throw
          </DevButton>
        </DevRow>
        <DevRow
          label="Nuke localStorage"
          hint="Delete app + dev keys, then reload."
          query={query}
          terms="clear wipe reset everything"
        >
          <DevButton tone="danger" onClick={nuke}>
            Nuke
          </DevButton>
        </DevRow>
      </DevGroup>
    </>
  );
}
