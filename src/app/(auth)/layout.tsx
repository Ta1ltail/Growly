// Auth layout — centered card on a branded dark background, no sidebar or bottom nav.
// Includes the project logo/branding, a subtle background effect, and a footer.

import type { ReactNode } from "react";
import Link from "next/link";
import { Activity } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-bg">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 size-96 rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-accent/3 blur-[120px]" />
      </div>

      {/* Brand header */}
      <div className="relative z-10 flex items-center justify-center pt-8 sm:pt-12">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-white shadow-lg shadow-accent/25">
            <Activity className="size-5" strokeWidth={2.5} />
          </span>
          <span className="font-mono text-base font-bold tracking-tight">
            project_101
          </span>
        </Link>
      </div>

      {/* Auth card */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">{children}</div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 pb-6 text-center">
        <p className="font-mono text-[10px] text-faint">
          honest habit tracking &mdash; v0.5
        </p>
      </footer>
    </div>
  );
}
