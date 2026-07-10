// Full-screen loading state shown while the initial Supabase sync completes.
// Prevents mount-time effects from firing against empty/stale localStorage data.
// Only rendered for authenticated users — public pages load immediately.

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-surface">
      {/* App icon */}
      <div className="relative">
        <svg
          className="size-16 text-accent"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Sprout leaf */}
          <path d="M12 2v4" />
          <path d="M8 6c0-2 2-4 4-4s4 2 4 4" />
          <path d="M8 6a4 4 0 0 0 4 4 4 4 0 0 0 4-4" />
          <path d="M12 10v12" />
          {/* Small leaf detail */}
          <path d="M8 12a4 4 0 0 0 4 4" opacity="0.5" />
          <path d="M16 12a4 4 0 0 1-4 4" opacity="0.5" />
        </svg>

        {/* Glow ring */}
        <span className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
      </div>

      {/* Label */}
      <div className="flex flex-col items-center gap-1">
        <p className="text-lg font-bold tracking-tight text-ink">
          Growly
        </p>
        <p className="text-xs font-medium text-muted animate-pulse">
          Sprouting your data…
        </p>
      </div>
    </div>
  );
}
