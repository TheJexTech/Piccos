"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QuickRecordForm } from "./quick-record-form";
import { BatchEntryForm } from "./batch-entry-form";

type Staff = { id: string; display_name: string; station_id: string | null; stations: { name: string } | null };
type Service = { id: string; name: string; price: number };

export function RecordingTabs({
  businessId,
  staff,
  services,
  defaultStaffId,
}: {
  businessId: string;
  staff: Staff[];
  services: Service[];
  defaultStaffId: string;
}) {
  const [mode, setMode] = useState<"quick" | "batch">("quick");
  const router = useRouter();

  return (
    <div>
      <div className="mb-4 flex w-fit gap-1 rounded-full border border-border bg-surface p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("quick")}
          className={
            mode === "quick"
              ? "rounded-full bg-ink px-4 py-1.5 font-medium text-white"
              : "rounded-full px-4 py-1.5 text-ink-secondary hover:bg-app-bg"
          }
        >
          Quick Record
        </button>
        <button
          type="button"
          onClick={() => setMode("batch")}
          className={
            mode === "batch"
              ? "rounded-full bg-ink px-4 py-1.5 font-medium text-white"
              : "rounded-full px-4 py-1.5 text-ink-secondary hover:bg-app-bg"
          }
        >
          Batch Entry
        </button>
      </div>

      {mode === "quick" ? (
        <QuickRecordForm
          businessId={businessId}
          staff={staff}
          services={services}
          defaultStaffId={defaultStaffId}
        />
      ) : (
        <BatchEntryForm
          businessId={businessId}
          staff={staff}
          services={services}
          onRecorded={() => router.refresh()}
        />
      )}
    </div>
  );
}
