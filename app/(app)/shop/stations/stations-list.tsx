"use client";

import { updateStationStatus, deleteStation } from "@/lib/stations/actions";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import type { Station } from "@/lib/stations/types";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "maintenance", label: "Maintenance" },
];

type StaffRow = { id: string; display_name: string; station_id: string | null };

export function StationsList({
  stations,
  staff,
  isOwner,
}: {
  stations: Station[];
  staff: StaffRow[];
  isOwner: boolean;
}) {
  if (stations.length === 0) {
    return <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">No stations yet.</p>;
  }

  return (
    <ul className="mt-8 flex flex-col gap-4">
      {stations.map((station) => {
        const assigned = staff.filter((s) => s.station_id === station.id);
        return (
          <li
            key={station.id}
            className="rounded border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-black dark:text-zinc-50">{station.name}</p>
                {station.description && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{station.description}</p>
                )}
              </div>
              {isOwner ? (
                <div className="flex items-center gap-2">
                  <AutoSubmitSelect
                    name="status"
                    defaultValue={station.status}
                    options={STATUS_OPTIONS}
                    action={updateStationStatus.bind(null, station.id)}
                  />
                  <form action={deleteStation.bind(null, station.id)}>
                    <button type="submit" className="text-sm text-red-600 hover:underline">
                      Delete
                    </button>
                  </form>
                </div>
              ) : (
                <span className="text-sm capitalize text-zinc-500 dark:text-zinc-400">
                  {station.status}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {assigned.length === 0
                ? "No staff assigned"
                : `Assigned: ${assigned.map((s) => s.display_name).join(", ")}`}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
