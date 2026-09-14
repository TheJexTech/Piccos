"use client";

import { useState } from "react";
import { useActionState } from "react";
import { voidBatch } from "@/lib/batches/actions";
import { initialBatchActionState } from "@/lib/batches/types";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { ChevronDownIcon } from "@/components/ui/icons";
import type { Batch } from "@/lib/batches/types";

export function BatchList({ batches, isOwner }: { batches: Batch[]; isOwner: boolean }) {
  if (batches.length === 0) {
    return <EmptyState message="No batch entries yet." />;
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {batches.map((batch) => (
        <BatchRow key={batch.id} batch={batch} isOwner={isOwner} />
      ))}
    </ul>
  );
}

function BatchRow({ batch, isOwner }: { batch: Batch; isOwner: boolean }) {
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const voidBatchWithId = voidBatch.bind(null, batch.id);
  const [state, formAction, pending] = useActionState(voidBatchWithId, initialBatchActionState);
  const isVoided = batch.status === "voided";
  const serviceTotal = batch.batch_services.reduce((sum, s) => sum + Number(s.line_total), 0);
  const serviceCount = batch.batch_services.reduce((sum, s) => sum + s.quantity, 0);
  const canVoid = isOwner && !isVoided;

  return (
    <li className="py-4 text-sm first:pt-0 last:pb-0">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="flex w-full items-center justify-between text-left">
        <div className="flex items-center gap-2">
          <ChevronDownIcon className={`size-4 shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : ""}`} />
          <div>
            <p className="flex items-center gap-2 text-ink">
              {batch.staff?.display_name ?? "Unknown staff"} · {serviceCount} service{serviceCount === 1 ? "" : "s"}
              {isVoided && <Badge tone="warning">Voided</Badge>}
            </p>
            <p className="text-xs text-muted">
              {new Date(batch.batch_date).toLocaleDateString("en-US", { timeZone: "UTC" })}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-ink">{serviceTotal.toFixed(2)}</p>
          {Number(batch.tip_amount) > 0 && (
            <p className="text-xs text-muted">Tips: {Number(batch.tip_amount).toFixed(2)}</p>
          )}
        </div>
      </button>

      {expanded && (
        <ul className="mt-2 flex flex-col gap-1 border-t border-border pt-2 pl-6 text-xs text-ink-secondary">
          {batch.batch_services.map((line, i) => (
            <li key={i} className="flex justify-between">
              <span>
                {line.service_name} · {line.quantity} × {(Number(line.line_total) / line.quantity).toFixed(2)}
              </span>
              <span>{Number(line.line_total).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}

      {canVoid && (
        <div className="mt-2 pl-6">
          {showForm ? (
            <form action={formAction} className="flex items-center gap-2">
              <input
                name="reason"
                placeholder="Reason for voiding"
                required
                className="rounded-lg border border-border-strong bg-surface px-2 py-1 text-sm text-ink focus:border-brown-700 focus:outline-none"
              />
              <button type="submit" disabled={pending} className="text-sm text-danger hover:underline">
                {pending ? "Voiding…" : "Confirm void"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm text-muted hover:underline"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button type="button" onClick={() => setShowForm(true)} className="text-sm text-danger hover:underline">
              Void
            </button>
          )}
          {state.error && <p className="mt-1 text-sm text-danger">{state.error}</p>}
        </div>
      )}
    </li>
  );
}
