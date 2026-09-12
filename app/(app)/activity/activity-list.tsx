"use client";

import { useState } from "react";
import { useActionState } from "react";
import { voidTransaction } from "@/lib/transactions/actions";
import { initialTransactionActionState, PAYMENT_METHODS } from "@/lib/transactions/types";
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
    return <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">No activity yet.</p>;
  }

  const voidedIds = new Set(
    transactions.filter((t) => t.correction_of_id).map((t) => t.correction_of_id),
  );

  return (
    <ul className="mt-8 flex flex-col gap-2">
      {transactions.map((t) => (
        <ActivityRow
          key={t.id}
          transaction={t}
          isOwner={isOwner}
          isVoided={voidedIds.has(t.id)}
        />
      ))}
    </ul>
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
    <li className="rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-black dark:text-zinc-50">
            {t.service_name} · {t.staff?.display_name ?? "Unknown staff"}
            {isCorrection && <span className="ml-2 text-xs text-amber-600">Correction</span>}
            {isVoided && <span className="ml-2 text-xs text-amber-600">Voided</span>}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {new Date(t.transaction_date).toLocaleString("en-US")}
            {t.stations?.name ? ` · ${t.stations.name}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-black dark:text-zinc-50">{Number(t.amount).toFixed(2)}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {PAYMENT_LABELS[t.payment_method] ?? t.payment_method}
          </p>
        </div>
      </div>

      {canVoid && (
        <div className="mt-2">
          {showForm ? (
            <form action={formAction} className="flex items-center gap-2">
              <input
                name="reason"
                placeholder="Reason for voiding"
                required
                className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
              <button type="submit" disabled={pending} className="text-sm text-red-600 hover:underline">
                {pending ? "Voiding…" : "Confirm void"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="text-sm text-red-600 hover:underline"
            >
              Void
            </button>
          )}
          {state.error && <p className="mt-1 text-sm text-red-600">{state.error}</p>}
        </div>
      )}
    </li>
  );
}
