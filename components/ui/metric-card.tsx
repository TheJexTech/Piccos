// The primary KPI card used across Dashboard/Revenue/Reports. `trend` is
// purely presentational — callers pass an already-computed percentage
// (e.g. Revenue's existing prior-period comparison), nothing is invented
// here.
export function MetricCard({
  label,
  value,
  sublabel,
  trend,
  className = "",
}: {
  label: string;
  value: string;
  sublabel?: string;
  trend?: { direction: "up" | "down"; label: string };
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-5 shadow-sm shadow-ink/[0.02] ${className}`}
    >
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      {(sublabel || trend) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={
                trend.direction === "up"
                  ? "font-medium text-success"
                  : "font-medium text-danger"
              }
            >
              {trend.direction === "up" ? "▲" : "▼"} {trend.label}
            </span>
          )}
          {sublabel && <span className="text-muted">{sublabel}</span>}
        </div>
      )}
    </div>
  );
}
