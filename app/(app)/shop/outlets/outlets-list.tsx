"use client";

import { updateStationStatus, deleteStation } from "@/lib/stations/actions";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/badge";
import { OutletsIcon } from "@/components/ui/icons";
import type { Station } from "@/lib/stations/types";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "maintenance", label: "Maintenance" },
];

type StaffRow = { id: string; display_name: string; station_id: string | null };

export function OutletsList({
  outlets,
  staff,
  isOwner,
}: {
  outlets: Station[];
  staff: StaffRow[];
  isOwner: boolean;
}) {
  return (
    <SectionCard title="Outlets">
      {outlets.length === 0 ? (
        <EmptyState message="No outlets yet." />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {outlets.map((outlet) => {
            const assigned = staff.filter((s) => s.station_id === outlet.id);
            return (
              <li key={outlet.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-brown-700/15 text-brown-900">
                    <OutletsIcon className="size-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{outlet.name}</p>
                    {outlet.description && <p className="text-sm text-muted">{outlet.description}</p>}
                    <p className="mt-1 text-xs text-muted">
                      {assigned.length === 0 ? "No staff assigned" : `Assigned: ${assigned.map((s) => s.display_name).join(", ")}`}
                    </p>
                  </div>
                </div>
                {isOwner ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <AutoSubmitSelect
                      name="status"
                      defaultValue={outlet.status}
                      options={STATUS_OPTIONS}
                      action={updateStationStatus.bind(null, outlet.id)}
                    />
                    <form action={deleteStation.bind(null, outlet.id)}>
                      <button type="submit" className="text-sm text-danger hover:underline">
                        Delete
                      </button>
                    </form>
                  </div>
                ) : (
                  <StatusBadge status={outlet.status} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
