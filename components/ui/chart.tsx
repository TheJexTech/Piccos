// Two lightweight SVG chart primitives — no charting library is
// installed, and neither of these needs one: a responsive viewBox with
// percentage-based bars covers both a day-by-day trend and a ranked
// breakdown list.

import { EmptyState } from "./empty-state";

// Vertical bar chart for a revenue trend over consecutive days.
export function TrendChart({
  data,
  formatValue = (n) => String(n),
}: {
  data: { label: string; value: number }[];
  formatValue?: (n: number) => string;
}) {
  if (data.length === 0) return <EmptyState message="No activity in this period." />;

  const max = Math.max(1, ...data.map((d) => d.value));
  const width = 100;
  const height = 40;
  const barWidth = width / data.length;
  // Only label every Nth bar so 28-31 daily bars don't overlap.
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height + 8}`} className="h-40 w-full" preserveAspectRatio="none">
        {data.map((d, i) => {
          const barHeight = (d.value / max) * height;
          // A fixed small radius (not proportional to bar width) — with
          // few bars (e.g. a single-day "Daily" view) a width-proportional
          // radius would round the corners into a pill/oval shape.
          const rx = Math.min(1.5, barWidth * 0.3, barHeight / 2);
          return (
            <rect
              key={d.label}
              x={i * barWidth + barWidth * 0.15}
              y={height - barHeight}
              width={barWidth * 0.7}
              height={Math.max(barHeight, 0.5)}
              rx={rx}
              className="fill-brown-700"
            />
          );
        })}
      </svg>
      <div className="mt-2 flex text-[10px] text-muted">
        {data.map((d, i) => (
          <span key={d.label} style={{ width: `${barWidth}%` }} className="truncate text-center">
            {i % labelEvery === 0 ? d.label : ""}
          </span>
        ))}
      </div>
      <p className="sr-only">
        {data.map((d) => `${d.label}: ${formatValue(d.value)}`).join(", ")}
      </p>
    </div>
  );
}

// Horizontal proportional bars for a ranked breakdown (revenue by staff/
// service/product) — replaces a plain label/total list with a visual
// sense of relative scale, without needing a table.
export function BreakdownBars({
  data,
  formatValue = (n) => String(n),
  emptyMessage = "No data in this period.",
}: {
  data: { label: string; total: number }[];
  formatValue?: (n: number) => string;
  emptyMessage?: string;
}) {
  if (data.length === 0) return <EmptyState message={emptyMessage} />;

  const max = Math.max(1, ...data.map((d) => d.total));

  return (
    <ul className="flex flex-col gap-3">
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-ink">{d.label}</span>
            <span className="font-medium text-ink">{formatValue(d.total)}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-app-bg">
            <div
              className="h-1.5 rounded-full bg-brown-700"
              style={{ width: `${Math.max(4, (d.total / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
