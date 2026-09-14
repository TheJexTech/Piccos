"use client";

import { useState } from "react";
import { ServiceRow } from "./service-row";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Th, Td } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { ChevronDownIcon } from "@/components/ui/icons";
import type { Service } from "@/lib/services/types";

// Collapsed by default so a shop with many services doesn't turn the page
// into a long scroll of editable cards — expanding reveals the exact same
// Save/Delete/Active-Inactive functionality as before, just tucked away
// until the owner actually wants to manage services.
export function ServicesList({
  services,
  canManage,
}: {
  services: Service[];
  canManage: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-sm shadow-ink/[0.02]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-ink">Services</span>
        <span className="flex items-center gap-3 text-sm text-muted">
          {services.length} service{services.length === 1 ? "" : "s"}
          <ChevronDownIcon className={`size-4 text-ink transition-transform ${expanded ? "rotate-180" : ""}`} />
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border p-5">
          {services.length === 0 ? (
            <EmptyState message="No services yet." />
          ) : canManage ? (
            <ul className="flex flex-col gap-4">
              {services.map((service) => (
                <ServiceRow key={service.id} service={service} />
              ))}
            </ul>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Service</Th>
                  <Th align="right">Price</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>
                    <Td>{service.name}</Td>
                    <Td align="right">{Number(service.price).toFixed(2)}</Td>
                    <Td>
                      <StatusBadge status={service.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}
