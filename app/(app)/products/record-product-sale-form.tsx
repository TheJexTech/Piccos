"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordProductSale } from "@/lib/products/actions";
import { PAYMENT_METHODS } from "@/lib/transactions/types";
import { SelectField } from "@/components/ui/select-field";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";

type Product = { id: string; name: string; selling_price: number };

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RecordProductSaleForm({
  businessId,
  products,
}: {
  businessId: string;
  products: Product[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [saleDate] = useState(todayLocal);

  const selectedProduct = products.find((p) => p.id === productId) ?? null;

  function handleSubmit() {
    setError(null);
    const quantityNum = Number(quantity);

    if (!productId) return setError("Select a product.");
    if (!Number.isFinite(quantityNum) || quantityNum <= 0) return setError("Enter a valid quantity.");
    if (!paymentMethod) return setError("Select a payment method.");

    startTransition(async () => {
      const result = await recordProductSale(businessId, {
        productId,
        quantity: quantityNum,
        paymentMethod,
        saleDate,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setProductId("");
      setQuantity("1");
      setPaymentMethod("");
      router.refresh();
    });
  }

  return (
    <SectionCard title="Record product sale">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Product"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            <option value="" disabled>
              Select product
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </SelectField>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-secondary">Quantity</label>
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm text-ink focus:border-brown-700 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-secondary">Selling price</span>
            <p className="px-3 py-2 text-sm text-ink">
              {selectedProduct ? Number(selectedProduct.selling_price).toFixed(2) : "—"}
            </p>
          </div>
          <SelectField
            label="Payment method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="" disabled>
              Select method
            </option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </SelectField>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="button" onClick={handleSubmit} disabled={pending} className="self-start">
          {pending ? "Recording…" : "Record Sale"}
        </Button>
      </div>
    </SectionCard>
  );
}
