import { ServiceRow } from "./service-row";
import type { Service } from "@/lib/services/types";

export function ServicesList({
  services,
  canManage,
}: {
  services: Service[];
  canManage: boolean;
}) {
  if (services.length === 0) {
    return <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">No services yet.</p>;
  }

  if (!canManage) {
    return (
      <ul className="mt-8 flex flex-col gap-2">
        {services.map((service) => (
          <li
            key={service.id}
            className="flex items-center justify-between rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800"
          >
            <span className="text-black dark:text-zinc-50">{service.name}</span>
            <span className="text-zinc-500 dark:text-zinc-400">
              {Number(service.price).toFixed(2)} · {service.status}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="mt-8 flex flex-col gap-4">
      {services.map((service) => (
        <ServiceRow key={service.id} service={service} />
      ))}
    </ul>
  );
}
