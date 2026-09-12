// Shared by the Dashboard (M9, fixed today/month periods) and Reports
// (M10, arbitrary periods) — both need the same "sum amounts" / "sum
// amounts grouped by a label" logic, just over different date ranges.

export function sum(rows: { amount: number }[] | null | undefined): number {
  return (rows ?? []).reduce((total, r) => total + Number(r.amount), 0);
}

export function groupSum<T>(
  rows: T[] | null | undefined,
  keyFn: (row: T) => string,
  amountFn: (row: T) => number,
): { label: string; total: number }[] {
  const map = new Map<string, number>();
  for (const row of rows ?? []) {
    const key = keyFn(row);
    map.set(key, (map.get(key) ?? 0) + amountFn(row));
  }
  return [...map.entries()]
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total);
}
