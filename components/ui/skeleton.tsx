// Shared pulsing placeholder block for route-level loading.tsx fallbacks.
// Purely visual — carries no data and makes no assumption about what the
// real content will look like beyond rough size/shape.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-border/70 ${className}`} />;
}
