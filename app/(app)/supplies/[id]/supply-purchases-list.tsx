import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Th, Td } from "@/components/ui/table";
import type { MaterialPurchase } from "@/lib/materials/types";

export function SupplyPurchasesList({ purchases }: { purchases: MaterialPurchase[] }) {
  return (
    <SectionCard title="Purchase history">
      {purchases.length === 0 ? (
        <EmptyState message="No purchases yet." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Quantity</Th>
              <Th align="right">Unit cost</Th>
              <Th align="right">Total</Th>
              <Th>Supplier</Th>
              <Th>Date</Th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id}>
                <Td>{p.quantity}</Td>
                <Td align="right">{Number(p.unit_cost).toFixed(2)}</Td>
                <Td align="right">{Number(p.total_cost).toFixed(2)}</Td>
                <Td>{p.supplier ?? "—"}</Td>
                <Td>{new Date(p.purchase_date).toLocaleDateString("en-US")}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </SectionCard>
  );
}
