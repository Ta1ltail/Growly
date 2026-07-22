"use client";

import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";

export function LandingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line/60 bg-bg/85 backdrop-blur-xl max-md:hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-glow text-white shadow-lg shadow-accent/20 transition-shadow duration-300 group-hover:shadow-accent/40">
            <Activity className="size-5" strokeWidth={2.5} />
          </span>
          <span className="bg-gradient-to-r from-ink to-muted bg-clip-text text-base font-bold tracking-tight text-transparent">
            Growly
          </span>
        </Link>

        {/* Nav links + CTAs */}
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="hidden rounded-xl px-4 py-1.5 text-sm font-medium text-muted transition-colors hover:text-ink sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-1.5 text-sm font-semibold text-white shadow-sm shadow-accent/20 transition-all duration-200 hover:brightness-110 hover:shadow-accent/30 active:scale-[0.97]"
          >
            Get started
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
