// Route-level loading state — shown while the page JavaScript bundle loads.
// For authenticated pages, the PageSkeleton inside each page handles the
// post-hydration "waiting for sync" phase. This covers the brief gap between
// navigation and first render.
//
// Works for both AppShell pages and standalone pages (login, register).

import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* On mobile the bottom nav lives in AppShell which isn't rendered
          during loading; add a spacer at the top so the spinner stays centered
          on the visible area. */}
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6">
        {/* Pulse ring */}
        <div className="relative">
          <div className="size-12 rounded-2xl bg-accent/10" />
          <span className="absolute inset-0 animate-ping rounded-2xl bg-accent/15" />
        </div>

        {/* Title skeleton */}
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-3.5 w-52" />
        </div>
      </div>
    </div>
  );
}
