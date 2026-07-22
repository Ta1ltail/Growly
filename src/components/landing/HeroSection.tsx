"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Sparkles, Check } from "lucide-react";
import { useOnceInView } from "@/hooks/useOnceInView";

export function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useOnceInView(ref);

  // Lightweight parallax — translates the background at 30% of scroll speed
  const bgRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const bg = bgRef.current;
    if (!bg) return;
    const onScroll = () => {
      const rect = bg.getBoundingClientRect();
      const scrolled = -rect.top;
      bg.style.transform = `translateY(${scrolled * 0.3}px)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section
      ref={ref}
      className="relative flex min-h-screen items-center justify-center overflow-hidden pt-20"
    >
      {/* Parallax background layers */}
      <div ref={bgRef} className="pointer-events-none absolute inset-0">
        <div className="absolute -left-48 -top-48 size-[36rem] rounded-full bg-accent/6 blur-[160px]" />
        <div className="absolute -bottom-48 -right-48 size-[36rem] rounded-full bg-accent/4 blur-[160px]" />
        <div className="absolute left-1/3 top-1/2 size-80 -translate-y-1/2 rounded-full bg-accent/3 blur-[140px]" />

        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(var(--c-line) 1px, transparent 1px), linear-gradient(90deg, var(--c-line) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--c-bg)_80%)]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-5 pb-24 transition-opacity duration-700 sm:px-8 sm:pb-36">
        {/* Mobile logo */}
        <div className="mb-8 flex justify-center md:hidden">
          <div className="inline-flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-glow text-white shadow-lg shadow-accent/20">
              <Activity className="size-5" strokeWidth={2.5} />
            </span>
            <span className="bg-gradient-to-r from-ink to-muted bg-clip-text text-lg font-bold tracking-tight text-transparent">
              Growly
            </span>
          </div>
        </div>

        <div
          className={`mx-auto max-w-4xl text-center ${
            inView ? "animate-fade-in" : "opacity-0"
          }`}
        >
          {/* Badge */}
          <div
            className="mb-6 flex animate-rise justify-center"
            style={{ animationDelay: "0.1s" }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/8 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
              <Sparkles className="size-3" />
              Modern habit tracking
            </span>
          </div>

          {/* Main heading */}
          <h1
            className="animate-rise text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
            style={{ animationDelay: "0.18s" }}
          >
            <span className="text-ink">Make every day</span>
            <br />
            <span className="bg-gradient-to-r from-accent via-accent-glow to-purple-400 bg-clip-text text-transparent">
              count with Growly
            </span>
          </h1>

          {/* Subheading */}
          <p
            className="mx-auto mt-5 max-w-xl animate-rise text-base leading-relaxed text-muted sm:text-lg"
            style={{ animationDelay: "0.26s" }}
          >
            The modern habit tracker that stays in sync across all your devices.
            Build streaks that matter, earn achievements, track goals and notes,
            and grow with friends — all backed by secure cloud sync.
          </p>

          {/* CTA buttons */}
          <div
            className="mt-8 flex animate-rise flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "0.34s" }}
          >
            <Link
              href="/register"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all duration-200 hover:shadow-xl hover:shadow-accent/30 active:scale-[0.97]"
            >
              <span className="relative z-10 flex items-center gap-2">
                Start your streak{" "}
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
              <span className="absolute inset-0 -z-0 bg-gradient-to-r from-accent via-accent-glow to-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-line/60 bg-surface/50 px-6 py-3 text-sm font-semibold text-muted shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-line hover:bg-surface hover:text-ink active:scale-[0.97]"
            >
              <Activity className="size-4" />
              Sign in
            </Link>
          </div>

          {/* Trust markers */}
          <div
            className="mt-10 flex animate-rise flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted"
            style={{ animationDelay: "0.42s" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-done" /> Cross-platform sync
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-done" /> Secure cloud backup
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-done" /> Real-time updates
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-done" /> Free to use
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
