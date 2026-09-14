"use client";

import { useState } from "react";
import { updateStaffName, updateStaffStation, updateStaffStatus, deleteStaff } from "@/lib/staff/actions";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
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
  const [editingId, setEditingId] = useState<string | null>(null);

  const stationOptions = [
    { value: "", label: "Unassigned" },
    ...stations.map((s) => ({ value: s.id, label: s.name })),
  ];

  return (
    <SectionCard title="Staff">
      {staff.length === 0 ? (
        <EmptyState message="No staff yet." />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {staff.map((member) => {
            const isEditing = editingId === member.id;
            return (
              <li key={member.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={member.display_name} />
                  <div className="min-w-0">
                    {isEditing ? (
                      <form
                        action={updateStaffName.bind(null, member.id)}
                        onSubmit={() => setEditingId(null)}
                        className="flex items-center gap-2"
                      >
                        <input
                          name="display_name"
                          defaultValue={member.display_name}
                          autoFocus
                          className="rounded-lg border border-border-strong bg-surface px-2 py-1 text-sm text-ink focus:border-brown-700 focus:outline-none"
                        />
                        <button type="submit" className="text-sm font-medium text-brown-700 hover:underline">
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="text-sm text-muted hover:underline"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <p className="flex items-center gap-2 font-medium text-ink">
                        {member.display_name}
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => setEditingId(member.id)}
                            className="text-xs font-normal text-muted hover:underline"
                          >
                            Edit
                          </button>
                        )}
                      </p>
                    )}
                    <p className="text-xs text-muted">
                      Joined {new Date(member.joined_at).toLocaleDateString("en-US")}
                    </p>
                  </div>
                </div>
                {canManage ? (
                  <div className="flex shrink-0 items-center gap-2">
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
                        <button type="submit" className="text-sm text-danger hover:underline">
                          Delete
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-2 text-sm text-muted">
                    <span>{stations.find((s) => s.id === member.station_id)?.name ?? "Unassigned"}</span>
                    <StatusBadge status={member.status} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
