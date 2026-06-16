"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { version as reactVersion } from "react";
import { useAppData } from "@/lib/store";
import { SCHEMA_VERSION } from "@/lib/storage";
import { DevGroup, DevStat, bytesToSize, matchQuery } from "../ui";

export const SYS_TERMS =
  "system information user agent platform language online viewport screen pixel ratio device memory cores react schema storage quota";

interface Dynamic {
  vw: number;
  vh: number;
  online: boolean;
  reducedMotion: boolean;
  colorScheme: string;
}

function readDynamic(): Dynamic {
  if (typeof window === "undefined") {
    return { vw: 0, vh: 0, online: true, reducedMotion: false, colorScheme: "dark" };
  }
  return {
    vw: window.innerWidth,
    vh: window.innerHeight,
    online: navigator.onLine,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    colorScheme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  };
}

export function SystemInfoSection({ query }: { query: string }) {
  const data = useAppData();
  const pathname = usePathname();
  const [dyn, setDyn] = useState<Dynamic>(readDynamic);
  const [storage, setStorage] = useState<string>("—");

  useEffect(() => {
    const id = window.setInterval(() => setDyn(readDynamic()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    navigator.storage?.estimate?.().then((est) => {
      const used = est.usage ?? 0;
      const quota = est.quota ?? 0;
      setStorage(`${bytesToSize(used)} / ${bytesToSize(quota)}`);
    }).catch(() => setStorage("unavailable"));
  }, []);

  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  const navAny = nav as (Navigator & { deviceMemory?: number }) | undefined;
  const appBytes = typeof window === "undefined" ? 0 : new Blob([JSON.stringify(data)]).size;

  const rows: { label: string; value: React.ReactNode; terms: string }[] = [
    { label: "User agent", value: nav?.userAgent ?? "—", terms: "browser ua" },
    { label: "Platform", value: nav?.platform ?? "—", terms: "os" },
    { label: "Language", value: nav?.language ?? "—", terms: "locale" },
    { label: "Online", value: String(dyn.online), terms: "network connection" },
    { label: "CPU cores", value: nav?.hardwareConcurrency ?? "—", terms: "hardware concurrency" },
    { label: "Device memory", value: navAny?.deviceMemory ? `${navAny.deviceMemory} GB` : "—", terms: "ram" },
    { label: "Viewport", value: `${dyn.vw} × ${dyn.vh}`, terms: "window size" },
    { label: "Screen", value: typeof screen !== "undefined" ? `${screen.width} × ${screen.height}` : "—", terms: "display" },
    { label: "Pixel ratio", value: typeof window !== "undefined" ? window.devicePixelRatio : "—", terms: "dpr retina" },
    { label: "OS color scheme", value: dyn.colorScheme, terms: "dark light" },
    { label: "Prefers reduced motion", value: String(dyn.reducedMotion), terms: "accessibility" },
    { label: "React", value: reactVersion, terms: "version" },
    { label: "Schema version", value: `v${SCHEMA_VERSION}`, terms: "data" },
    { label: "Route", value: pathname, terms: "path" },
    { label: "App data size", value: bytesToSize(appBytes), terms: "storage localstorage" },
    { label: "Storage estimate", value: storage, terms: "quota usage disk" },
  ];

  const visible = rows.filter((r) => matchQuery(query, `${r.label} ${r.terms}`));

  return (
    <DevGroup title="Environment">
      {visible.map((r) => (
        <DevStat key={r.label} label={r.label} value={r.value} />
      ))}
    </DevGroup>
  );
}
