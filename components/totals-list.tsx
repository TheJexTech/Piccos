export function TotalsList({
  title,
  emptyMessage,
  totals,
}: {
  title: string;
  emptyMessage: string;
  totals: { label: string; formattedTotal: string }[];
}) {
  return (
    <div>
      <h2 className="text-sm font-medium text-black dark:text-zinc-50">{title}</h2>
      {totals.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{emptyMessage}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {totals.map((t) => (
            <li key={t.label} className="flex justify-between gap-4">
              <span className="text-black dark:text-zinc-50">{t.label}</span>
              <span className="text-zinc-500 dark:text-zinc-400">{t.formattedTotal}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
