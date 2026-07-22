"use client";

import { useRef } from "react";
import { Smartphone, ArrowRight } from "lucide-react";
import { useOnceInView } from "@/hooks/useOnceInView";

export function DownloadApkSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useOnceInView(ref);

  return (
    <section ref={ref} className="relative overflow-hidden py-16 sm:py-20">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-[160px]" />
      </div>

      <div
        className={`relative mx-auto max-w-4xl px-5 text-center sm:px-8 ${
          inView ? "animate-fade-slide-up-lg" : "opacity-0"
        }`}
      >
        <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-accent/10">
          <Smartphone className="size-6 text-accent" />
        </span>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Get the Android App
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted">
          Download the native Growly APK for a faster, smoother experience.
          Install it directly on your Android device and take your habits
          anywhere — with full offline support and cross-device sync.
        </p>

        <span className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full border border-accent/15 bg-accent/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
          <Smartphone className="size-3" />
          v2.2.5
        </span>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/api/download-apk"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all duration-200 hover:shadow-xl hover:shadow-accent/30 active:scale-[0.97]"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download APK (3.1 MB)
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
            <span className="absolute inset-0 -z-0 bg-gradient-to-r from-accent via-accent-glow to-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </a>
          <p className="w-full text-[11px] text-faint sm:w-auto">
            Compatible with Android 8.0+
          </p>
        </div>
      </div>
    </section>
  );
}
