import type { MaterialPurchase } from "@/lib/materials/types";

export function PurchasesList({ purchases }: { purchases: MaterialPurchase[] }) {
  if (purchases.length === 0) {
    return <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">No purchases yet.</p>;
  }

  return (
    <ul className="mt-8 flex flex-col gap-2">
      {purchases.map((p) => (
        <li
          key={p.id}
          className="flex items-center justify-between rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800"
        >
          <div>
            <p className="text-black dark:text-zinc-50">
              {p.materials?.name ?? "Unknown material"} · {p.quantity} @ {Number(p.unit_cost).toFixed(2)}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {new Date(p.purchase_date).toLocaleDateString("en-US")}
              {p.supplier ? ` · ${p.supplier}` : ""}
            </p>
          </div>
          <p className="text-black dark:text-zinc-50">{Number(p.total_cost).toFixed(2)}</p>
        </li>
      ))}
    </ul>
  );
}
