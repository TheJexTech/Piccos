import { PAYMENT_METHODS } from "@/lib/transactions/types";
import type { Transaction } from "@/lib/transactions/types";

const PAYMENT_LABELS = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.value, m.label]));

export function TransactionsList({
  transactions,
  emptyMessage = "No activity yet.",
}: {
  transactions: Transaction[];
  emptyMessage?: string;
}) {
  if (transactions.length === 0) {
    return <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">{emptyMessage}</p>;
  }

  return (
    <ul className="mt-8 flex flex-col gap-2">
      {transactions.map((t) => (
        <li
          key={t.id}
          className="flex items-center justify-between rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800"
        >
          <div>
            <p className="text-black dark:text-zinc-50">
              {t.service_name} · {t.staff?.display_name ?? "Unknown staff"}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {new Date(t.transaction_date).toLocaleString()}
              {t.stations?.name ? ` · ${t.stations.name}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-black dark:text-zinc-50">{Number(t.amount).toFixed(2)}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {PAYMENT_LABELS[t.payment_method] ?? t.payment_method}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
