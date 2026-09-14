"use client";

import { useState } from "react";
import { useActionState } from "react";
import { voidProductSale } from "@/lib/products/actions";
import { initialProductActionState } from "@/lib/products/types";
import { PAYMENT_METHODS } from "@/lib/transactions/types";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Th, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ProductSale } from "@/lib/products/types";

const PAYMENT_LABELS = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.value, m.label]));

export function ProductSalesList({ sales, isOwner }: { sales: ProductSale[]; isOwner: boolean }) {
  const voidedIds = new Set(sales.filter((s) => s.correction_of_id).map((s) => s.correction_of_id));

  return (
    <SectionCard title="Product sales">
      {sales.length === 0 ? (
        <EmptyState message="No product sales yet." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th align="right">Qty</Th>
              <Th align="right">Amount</Th>
              <Th>Payment</Th>
              <Th>Date</Th>
              {isOwner && <Th align="right">Action</Th>}
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <ProductSaleRow
                key={sale.id}
                sale={sale}
                isOwner={isOwner}
                isVoided={voidedIds.has(sale.id)}
              />
            ))}
          </tbody>
        </Table>
      )}
    </SectionCard>
  );
}

function ProductSaleRow({
  sale,
  isOwner,
  isVoided,
}: {
  sale: ProductSale;
  isOwner: boolean;
  isVoided: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const voidSaleWithId = voidProductSale.bind(null, sale.id);
  const [state, formAction, pending] = useActionState(voidSaleWithId, initialProductActionState);
  const isCorrection = sale.correction_of_id != null;
  const canVoid = isOwner && !isCorrection && !isVoided;

  return (
    <tr>
      <Td>
        <span className="flex items-center gap-2">
          {sale.product_name}
          {isCorrection && <Badge tone="warning">Correction</Badge>}
          {isVoided && <Badge tone="warning">Voided</Badge>}
        </span>
      </Td>
      <Td align="right">{sale.quantity}</Td>
      <Td align="right">{Number(sale.amount).toFixed(2)}</Td>
      <Td>{PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method}</Td>
      <Td>{new Date(sale.sale_date).toLocaleString("en-US")}</Td>
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
