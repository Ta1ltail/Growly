import { Skeleton } from "./Skeleton";

// A neutral, app-shaped loading placeholder: header + stat tiles + two panels.
// Used by route loading.tsx and by client pages before localStorage hydration,
// so the first paint reads as "loading" rather than a misleading empty state.

export function PageSkeleton() {
  return (
    <div className="opacity-60">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="h-52 rounded-2xl" />
      </div>
    </div>
  );
}
