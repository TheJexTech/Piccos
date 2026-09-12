"use client";

import { updateStaffStation, updateStaffStatus, deleteStaff } from "@/lib/staff/actions";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import type { StaffMember } from "@/lib/staff/types";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

type Station = { id: string; name: string };

export function StaffList({
  staff,
  stations,
  canManage,
  canDelete,
}: {
  staff: StaffMember[];
  stations: Station[];
  canManage: boolean;
  canDelete: boolean;
}) {
  const stationOptions = [
    { value: "", label: "Unassigned" },
    ...stations.map((s) => ({ value: s.id, label: s.name })),
  ];

  if (staff.length === 0) {
    return <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">No staff yet.</p>;
  }

  return (
    <ul className="mt-8 flex flex-col gap-4">
      {staff.map((member) => (
        <li key={member.id} className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-black dark:text-zinc-50">{member.display_name}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Joined {new Date(member.joined_at).toLocaleDateString("en-US")}
              </p>
            </div>
            {canManage ? (
              <div className="flex items-center gap-2">
                <AutoSubmitSelect
                  name="station_id"
                  defaultValue={member.station_id ?? ""}
                  options={stationOptions}
                  action={updateStaffStation.bind(null, member.id)}
                />
                <AutoSubmitSelect
                  name="status"
                  defaultValue={member.status}
                  options={STATUS_OPTIONS}
                  action={updateStaffStatus.bind(null, member.id)}
                />
                {canDelete && (
                  <form action={deleteStaff.bind(null, member.id)}>
                    <button type="submit" className="text-sm text-red-600 hover:underline">
                      Delete
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {stations.find((s) => s.id === member.station_id)?.name ?? "Unassigned"} ·{" "}
                {member.status}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
