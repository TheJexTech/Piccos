"use client";

import { useState } from "react";
import { useActionState } from "react";
import { voidExpense } from "@/lib/expenses/actions";
import { initialExpenseActionState } from "@/lib/expenses/types";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Th, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Expense } from "@/lib/expenses/types";

export function ExpensesList({
  expenses,
  isOwner,
}: {
  expenses: Expense[];
  isOwner: boolean;
}) {
  const voidedIds = new Set(
    expenses.filter((e) => e.correction_of_id).map((e) => e.correction_of_id),
  );

  return (
    <SectionCard title="Expenses">
      {expenses.length === 0 ? (
        <EmptyState message="No expenses recorded yet." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Description</Th>
              <Th>Category</Th>
              <Th align="right">Amount</Th>
              <Th>Date</Th>
              {isOwner && <Th align="right">Action</Th>}
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <ExpenseRow key={e.id} expense={e} isOwner={isOwner} isVoided={voidedIds.has(e.id)} />
            ))}
          </tbody>
        </Table>
      )}
    </SectionCard>
  );
}

function ExpenseRow({
  expense: e,
  isOwner,
  isVoided,
}: {
  expense: Expense;
  isOwner: boolean;
  isVoided: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const voidExpenseWithId = voidExpense.bind(null, e.id);
  const [state, formAction, pending] = useActionState(voidExpenseWithId, initialExpenseActionState);
  const isCorrection = e.correction_of_id != null;
  const canVoid = isOwner && !isCorrection && !isVoided;

  return (
    <tr>
      <Td>
        <span className="flex items-center gap-2">
          {e.description || e.expense_categories?.name || "Expense"}
          {isCorrection && <Badge tone="warning">Correction</Badge>}
          {isVoided && <Badge tone="warning">Voided</Badge>}
        </span>
      </Td>
      <Td>{e.expense_categories?.name ?? "—"}</Td>
      <Td align="right">{Number(e.amount).toFixed(2)}</Td>
      <Td>{new Date(e.expense_date).toLocaleDateString("en-US")}</Td>
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
