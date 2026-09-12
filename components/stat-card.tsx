export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-black dark:text-zinc-50">{value}</p>
    </div>
  );
}
