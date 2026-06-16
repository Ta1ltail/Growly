"use client";

import { useAppData, setTheme } from "@/lib/store";
import { ACCENTS, type ThemeMode } from "@/lib/theme";
import { useDevSettings, setDev } from "@/lib/devmode";
import { DevGroup, DevRow, DevToggle } from "../ui";

export const UI_TERMS =
  "ui controls theme light dark system accent color grid overlay outline components animation motion ambient background";

const MODES: ThemeMode[] = ["light", "dark", "system"];

export function UiControlsSection({ query }: { query: string }) {
  const data = useAppData();
  const dev = useDevSettings();
  const { mode, accent } = data.settings.theme;

  return (
    <>
      <DevGroup title="Theme">
        <DevRow label="Mode" query={query} terms="light dark system appearance">
          <div className="inline-flex gap-1 rounded-lg border border-line bg-surface2 p-0.5">
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setTheme({ mode: m })}
                className={`rounded-md px-2 py-1 text-xs font-medium capitalize transition-all ${
                  mode === m ? "bg-accent text-white" : "text-muted hover:text-ink"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </DevRow>
        <DevRow label="Accent" query={query} terms="color hue">
          <div className="flex flex-wrap gap-1.5">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-label={a.label}
                title={a.label}
                onClick={() => setTheme({ accent: a.id })}
                className="size-6 rounded-full transition-transform hover:scale-110"
                style={{
                  backgroundColor: a.color,
                  boxShadow: accent === a.id ? `0 0 0 2px var(--c-surface), 0 0 0 4px ${a.color}` : undefined,
                }}
              />
            ))}
          </div>
        </DevRow>
      </DevGroup>

      <DevGroup title="Debug overlays">
        <DevRow label="Layout grid overlay" hint="Pixel grid over the viewport." query={query} terms="ruler guides">
          <DevToggle label="Layout grid overlay" checked={dev.showGridOverlay} onChange={(v) => setDev({ showGridOverlay: v })} />
        </DevRow>
        <DevRow label="Outline components" hint="Outline every element to inspect boxes." query={query} terms="borders boxes">
          <DevToggle label="Outline components" checked={dev.outlineComponents} onChange={(v) => setDev({ outlineComponents: v })} />
        </DevRow>
        <DevRow label="Force reduced motion" hint="Neutralize all animations/transitions." query={query} terms="animation disable">
          <DevToggle label="Force reduced motion" checked={dev.forceReduceMotion} onChange={(v) => setDev({ forceReduceMotion: v })} />
        </DevRow>
        <DevRow label="Hide ambient background" hint="Remove the drifting aurora blobs." query={query} terms="blobs aurora">
          <DevToggle label="Hide ambient background" checked={dev.hideAmbient} onChange={(v) => setDev({ hideAmbient: v })} />
        </DevRow>
      </DevGroup>
    </>
  );
}
