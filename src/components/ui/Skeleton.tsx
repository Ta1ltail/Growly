// Loading placeholder. `.skeleton` (globals.css) supplies the shimmer and
// respects prefers-reduced-motion. Compose a few of these into page-shaped
// fallbacks for loading.tsx and pre-hydration states.

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}
