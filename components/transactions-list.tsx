import { PAYMENT_METHODS } from "@/lib/transactions/types";
import type { Transaction } from "@/lib/transactions/types";
import { Table, Th, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

const PAYMENT_LABELS = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.value, m.label]));

export function TransactionsList({
  transactions,
  emptyMessage = "No activity yet.",
}: {
  transactions: Transaction[];
  emptyMessage?: string;
}) {
  if (transactions.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

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
        </tr>
      </thead>
      <tbody>
        {transactions.map((t) => (
          <tr key={t.id}>
            <Td>{t.service_name}</Td>
            <Td>{t.staff?.display_name ?? "Unknown staff"}</Td>
            <Td>{t.stations?.name ?? "—"}</Td>
            <Td align="right">{Number(t.amount).toFixed(2)}</Td>
            <Td>{PAYMENT_LABELS[t.payment_method] ?? t.payment_method}</Td>
            <Td>{new Date(t.transaction_date).toLocaleString("en-US")}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
