import { MaterialRow } from "./material-row";
import type { Material } from "@/lib/materials/types";

export function MaterialsList({
  materials,
  canManage,
}: {
  materials: Material[];
  canManage: boolean;
}) {
  if (materials.length === 0) {
    return <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">No materials yet.</p>;
  }

  if (!canManage) {
    return (
      <ul className="mt-8 flex flex-col gap-2">
        {materials.map((m) => {
          const lowStock = Number(m.current_quantity) <= Number(m.minimum_quantity);
          return (
            <li
              key={m.id}
              className="flex items-center justify-between rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800"
            >
              <span className="text-black dark:text-zinc-50">{m.name}</span>
              <span className={lowStock ? "text-amber-600" : "text-zinc-500 dark:text-zinc-400"}>
                {m.current_quantity} {m.unit}
                {lowStock ? " · Low stock" : ""}
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="mt-8 flex flex-col gap-4">
      {materials.map((m) => (
        <MaterialRow key={m.id} material={m} />
      ))}
    </ul>
  );
}
