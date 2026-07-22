"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { useOnceInView } from "@/hooks/useOnceInView";

export function CtaSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useOnceInView(ref);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden border-t border-line/50 py-20 sm:py-28"
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/6 blur-[140px]" />
      </div>

      <div
        className={`relative mx-auto max-w-2xl px-5 text-center sm:px-8 ${
          inView ? "animate-fade-slide-up-lg" : "opacity-0"
        }`}
      >
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-accent/10">
          <Star className="size-6 text-accent" />
        </span>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Start your streak today
        </h2>
        <p className="mt-3 text-muted">
          Free to use. Synced across devices. No data collection, no hidden
          fees — just a habit tracker that works the way you do.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all duration-200 hover:shadow-xl hover:shadow-accent/30 active:scale-[0.97]"
          >
            <span className="relative z-10 flex items-center gap-2">
              Get started free{" "}
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
            <span className="absolute inset-0 -z-0 bg-gradient-to-r from-accent via-accent-glow to-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-line/60 bg-surface/50 px-6 py-3 text-sm font-semibold text-muted shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-line hover:bg-surface hover:text-ink active:scale-[0.97]"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Sign in with GitHub
          </Link>
        </div>
      </div>
    </section>
  );
}
