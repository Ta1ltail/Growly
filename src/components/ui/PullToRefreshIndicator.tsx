"use client";

// Pull-to-refresh visual indicator — rendered at the top of the page
// during pull gestures or while the app is refreshing data.

interface PullToRefreshIndicatorProps {
  pulling: boolean;
  progress: number; // 0–1
  refreshing: boolean;
}

export function PullToRefreshIndicator({
  pulling,
  progress,
  refreshing,
}: PullToRefreshIndicatorProps) {
  if (!pulling && !refreshing) return null;

  const indicatorHeight = pulling
    ? Math.min(progress * 80, 80)
    : refreshing
      ? 48
      : 0;

  const arrowRotation = progress * 180;

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-0 z-[60] flex items-center justify-center"
      style={{
        height: indicatorHeight + "px",
        overflow: "hidden",
        transition: pulling ? "none" : "height 0.3s ease",
      }}
    >
      <div
        className={
          "flex items-center justify-center gap-2 rounded-full bg-surface px-4 py-1.5 shadow-lg ring-1 ring-line" +
          (refreshing ? " animate-fade-in" : "")
        }
      >
        {refreshing ? (
          <>
            <span className="size-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <span className="text-xs font-medium text-muted">
              Refreshing&hellip;
            </span>
          </>
        ) : (
          <span
            className="block text-accent transition-transform duration-75"
            style={{
              transform: "rotate(" + arrowRotation + "deg)",
              fontSize: "16px",
            }}
          >
            {String.fromCharCode(8595)}
          </span>
        )}
      </div>
    </div>
  );
}
