"use client";

import Link from "next/link";
import { Activity } from "lucide-react";

const footerLinks = [
  { label: "Features", href: "#" },
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
  { label: "Contact", href: "#" },
];

export function Footer() {
  return (
    <footer className="border-t border-line/60 py-10">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          {/* Brand */}
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-glow text-white shadow-sm shadow-accent/20">
              <Activity className="size-4" strokeWidth={2.5} />
            </span>
            <span className="bg-gradient-to-r from-ink to-muted bg-clip-text text-sm font-bold tracking-tight text-transparent">
              Growly
            </span>
          </Link>

          {/* Links */}
          <div className="flex items-center justify-center gap-6">
            {footerLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs text-muted transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Version */}
          <p className="mt-3 w-full text-center font-mono text-[10px] text-faint sm:mt-0 sm:w-auto">
            Growly – Habit Tracking Release v2.5.5
          </p>
        </div>
      </div>
    </footer>
  );
}
