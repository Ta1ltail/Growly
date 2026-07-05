"use client";

import { usePathname } from "next/navigation";
import { useAppData } from "@/lib/store";
import { SCHEMA_VERSION } from "@/lib/storage";
import { disableDevMode, resetDevSettings } from "@/lib/devmode";
import { DevGroup, DevRow, DevStat, DevButton } from "../ui";

export const GENERAL_TERMS =
  "general app version schema route reload reset disable developer mode status";

export function GeneralSection({ query }: { query: string }) {
  const data = useAppData();
  const pathname = usePathname();

  return (
    <>
      <DevGroup title="Application">
        <DevRow label="App" query={query} terms="name title">
          <DevStat label="" value="project_101" />
        </DevRow>
        <DevRow label="Schema version" query={query} terms="data migration v4">
          <span className="font-mono text-xs">v{SCHEMA_VERSION}</span>
        </DevRow>
        <DevRow label="Data version" query={query} terms="schema">
          <span className="font-mono text-xs">v{data.version}</span>
        </DevRow>
        <DevRow label="Current route" query={query} terms="path url page">
          <span className="font-mono text-xs">{pathname}</span>
        </DevRow>
      </DevGroup>

      <DevGroup title="Quick actions">
        <DevRow
          label="Reload app"
          hint="Hard re-read of localStorage and remount."
          query={query}
          terms="refresh restart"
        >
          <DevButton onClick={() => window.location.reload()}>Reload</DevButton>
        </DevRow>
        <DevRow label="Scroll to top" query={query} terms="top up">
          <DevButton
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Top
          </DevButton>
        </DevRow>
        <DevRow
          label="Reset dev settings"
          hint="Clears all dev toggles. Keeps dev mode unlocked."
          query={query}
          terms="default clear"
        >
          <DevButton tone="danger" onClick={resetDevSettings}>
            Reset
          </DevButton>
        </DevRow>
      </DevGroup>

      <DevGroup title="Developer mode">
        <DevRow
          label="Disable developer mode"
          hint="Hides the FAB. Re-open anytime with Ctrl/Cmd+Shift+D."
          query={query}
          terms="turn off exit hide fab"
        >
          <DevButton tone="danger" onClick={disableDevMode}>
            Disable
          </DevButton>
        </DevRow>
      </DevGroup>
    </>
  );
}
