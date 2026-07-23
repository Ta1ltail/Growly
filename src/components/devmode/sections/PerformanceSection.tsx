"use client";

import { useAppData, replaceData } from "@/lib/store";
import { useToday } from "@/hooks/useToday";
import { useDevSettings, setDev } from "@/lib/devmode";
import { makeStressData } from "@/lib/devSeed";
import {
  DevGroup,
  DevRow,
  DevStat,
  DevToggle,
  DevButton,
  bytesToSize,
} from "../ui";

export const PERF_TERMS =
  "performance fps frame rate meter storage size memory counts habits marks notes stress test benchmark";

export function PerformanceSection({ query }: { query: string }) {
  const data = useAppData();
  const today = useToday();
  const dev = useDevSettings();

  const totalMarks = Object.values(data.marks).reduce(
    (sum, day) => sum + Object.keys(day).length,
    0,
  );
  const sizeBytes =
    typeof window === "undefined" ? 0 : new Blob([JSON.stringify(data)]).size;

  function stress() {
    if (
      !window.confirm(
        "Append 50 habits × 60 days of random marks? This is heavy.",
      )
    )
      return;
    replaceData(makeStressData(data, today, 50, 60));
  }

  return (
    <>
      <DevGroup title="Live meters">
        <DevRow
          label="FPS meter"
          hint="Overlay an on-screen frame-rate counter."
          query={query}
          terms="frame rate fps"
        >
          <DevToggle
            label="FPS meter"
            checked={dev.showFps}
            onChange={(v) => setDev({ showFps: v })}
          />
        </DevRow>
      </DevGroup>

      <DevGroup title="Footprint">
        <DevRow
          label="Data size"
          hint="Serialized AppData in localStorage."
          query={query}
          terms="storage bytes localstorage"
        >
          <DevStat label="" value={bytesToSize(sizeBytes)} />
        </DevRow>
        <DevRow label="Habits" query={query} terms="count total">
          <span className="font-mono text-xs">
            {data.habits.length} (
            {data.habits.filter((h) => !h.archived && !h.deletedAt).length} active)
          </span>
        </DevRow>
        <DevRow
          label="Mark days / total marks"
          query={query}
          terms="count history"
        >
          <span className="font-mono text-xs">
            {Object.keys(data.marks).length} / {totalMarks}
          </span>
        </DevRow>
        <DevRow label="Notes / goals" query={query} terms="count">
          <span className="font-mono text-xs">
            {data.notes.length} / {data.goals.length}
          </span>
        </DevRow>
        <DevRow
          label="Audit / unlocks / owned"
          query={query}
          terms="count economy"
        >
          <span className="font-mono text-xs">
            {data.auditLog.length} / {Object.keys(data.unlocks).length} /{" "}
            {data.economy.owned.length}
          </span>
        </DevRow>
      </DevGroup>

      <DevGroup title="Benchmark">
        <DevRow
          label="Stress test"
          hint="Seed 50 habits × 60 days to profile renders."
          query={query}
          terms="load generate heavy"
        >
          <DevButton tone="accent" onClick={stress}>
            Generate
          </DevButton>
        </DevRow>
      </DevGroup>
    </>
  );
}
