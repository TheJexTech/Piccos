"use client";

import { useState } from "react";
import { useActionState } from "react";
import { voidTransaction } from "@/lib/transactions/actions";
import { initialTransactionActionState, PAYMENT_METHODS } from "@/lib/transactions/types";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Th, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Transaction } from "@/lib/transactions/types";

const PAYMENT_LABELS = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.value, m.label]));

export function ActivityList({
  transactions,
  isOwner,
}: {
  transactions: Transaction[];
  isOwner: boolean;
}) {
  if (transactions.length === 0) {
    return <EmptyState message="No activity yet." />;
  }

  const voidedIds = new Set(
    transactions.filter((t) => t.correction_of_id).map((t) => t.correction_of_id),
  );

  return (
    <Table>
      <thead>
        <tr>
          <Th>Service</Th>
          <Th>Staff</Th>
          <Th>Outlet</Th>
          <Th align="right">Amount</Th>
          <Th>Payment</Th>
          <Th>Date</Th>
          {isOwner && <Th align="right">Action</Th>}
        </tr>
      </thead>
      <tbody>
        {transactions.map((t) => (
          <ActivityRow key={t.id} transaction={t} isOwner={isOwner} isVoided={voidedIds.has(t.id)} />
        ))}
      </tbody>
    </Table>
  );
}

function ActivityRow({
  transaction: t,
  isOwner,
  isVoided,
}: {
  transaction: Transaction;
  isOwner: boolean;
  isVoided: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const voidTransactionWithId = voidTransaction.bind(null, t.id);
  const [state, formAction, pending] = useActionState(
    voidTransactionWithId,
    initialTransactionActionState,
  );
  const isCorrection = t.correction_of_id != null;
  const canVoid = isOwner && !isCorrection && !isVoided;

  return (
    <tr>
      <Td>
        <span className="flex items-center gap-2">
          {t.service_name}
          {isCorrection && <Badge tone="warning">Correction</Badge>}
          {isVoided && <Badge tone="warning">Voided</Badge>}
        </span>
        {Number(t.tip_amount) > 0 && (
          <p className="mt-0.5 text-xs text-muted">
            Tip: {Number(t.tip_amount).toFixed(2)}
            {t.tip_payment_method ? ` (${PAYMENT_LABELS[t.tip_payment_method] ?? t.tip_payment_method})` : ""}
          </p>
        )}
      </Td>
      <Td>{t.staff?.display_name ?? "Unknown staff"}</Td>
      <Td>{t.stations?.name ?? "—"}</Td>
      <Td align="right">{Number(t.amount).toFixed(2)}</Td>
      <Td>{PAYMENT_LABELS[t.payment_method] ?? t.payment_method}</Td>
      <Td>{new Date(t.transaction_date).toLocaleString("en-US")}</Td>
      {isOwner && (
        <Td align="right">
          {canVoid &&
            (showForm ? (
              <form action={formAction} className="flex items-center justify-end gap-2">
                <input
                  name="reason"
                  placeholder="Reason for voiding"
                  required
                  className="rounded-lg border border-border-strong bg-surface px-2 py-1 text-sm text-ink focus:border-brown-700 focus:outline-none"
                />
                <button type="submit" disabled={pending} className="text-sm text-danger hover:underline">
                  {pending ? "Voiding…" : "Confirm"}
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
            ))}
          {state.error && <p className="mt-1 text-sm text-danger">{state.error}</p>}
        </Td>
      )}
    </tr>
  );
}
