// Auth layout — centered card on a clean background, no sidebar or bottom nav.

import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
