"use client";

import { useState, useTransition } from "react";
import { recordBatchActivity } from "@/lib/batches/actions";
import { PAYMENT_METHODS } from "@/lib/transactions/types";
import { selectClasses } from "@/components/ui/select-field";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";

type Staff = { id: string; display_name: string };
type Service = { id: string; name: string; price: number };

type ServiceLine = { key: string; serviceId: string; quantity: string };
type PaymentRow = { key: string; paymentMethod: string; amount: string };

function newKey() {
  return Math.random().toString(36).slice(2);
}

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function BatchEntryForm({
  businessId,
  staff,
  services,
  onRecorded,
}: {
  businessId: string;
  staff: Staff[];
  services: Service[];
  onRecorded: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [staffId, setStaffId] = useState("");
  const [batchDate, setBatchDate] = useState(todayLocal);
  const [lines, setLines] = useState<ServiceLine[]>([{ key: newKey(), serviceId: "", quantity: "" }]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [tipAmount, setTipAmount] = useState("");
  const [tipPayments, setTipPayments] = useState<PaymentRow[]>([]);

  const lineTotal = (line: ServiceLine) => {
    const service = services.find((s) => s.id === line.serviceId);
    const quantity = Number(line.quantity);
    if (!service || !Number.isFinite(quantity) || quantity <= 0) return 0;
    return service.price * quantity;
  };

  const serviceTotal = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const paymentTotal = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const paymentRemaining = serviceTotal - paymentTotal;
  const tipTotal = Number(tipAmount) || 0;
  const tipPaymentTotal = tipPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const tipRemaining = tipTotal - tipPaymentTotal;

  const paymentsReconciled = payments.length === 0 || Math.abs(paymentRemaining) < 0.005;
  const tipPaymentsReconciled = tipPayments.length === 0 || Math.abs(tipRemaining) < 0.005;

  function updateLine(key: string, patch: Partial<ServiceLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }
  function updatePayment(
    list: PaymentRow[],
    setList: (rows: PaymentRow[]) => void,
    key: string,
    patch: Partial<PaymentRow>,
  ) {
    setList(list.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  }

  function handleSubmit() {
    setError(null);

    if (!staffId) return setError("Select a staff member.");
    const validLines = lines.filter((l) => l.serviceId && Number(l.quantity) > 0);
    if (validLines.length === 0) return setError("Add at least one service with a quantity.");
    if (!paymentsReconciled) return setError("Payment breakdown must add up to the total service revenue.");
    if (!tipPaymentsReconciled) return setError("Tip payment breakdown must add up to the total tip.");

    startTransition(async () => {
      const result = await recordBatchActivity(businessId, {
        staffId,
        batchDate,
        services: validLines.map((l) => ({ serviceId: l.serviceId, quantity: Number(l.quantity) })),
        tipAmount: tipTotal,
        payments: payments
          .filter((p) => Number(p.amount) > 0)
          .map((p) => ({ paymentMethod: p.paymentMethod, amount: Number(p.amount) })),
        tipPayments: tipPayments
          .filter((p) => Number(p.amount) > 0)
          .map((p) => ({ paymentMethod: p.paymentMethod, amount: Number(p.amount) })),
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setStaffId("");
      setLines([{ key: newKey(), serviceId: "", quantity: "" }]);
      setPayments([]);
      setTipAmount("");
      setTipPayments([]);
      onRecorded();
    });
  }

  return (
    <SectionCard>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-secondary">Staff</label>
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={selectClasses()}>
              <option value="" disabled>
                Select staff
              </option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-secondary">Date</label>
            <input
              type="date"
              value={batchDate}
              onChange={(e) => setBatchDate(e.target.value)}
              className={selectClasses()}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-ink">Services</p>
          {lines.map((line) => (
            <div key={line.key} className="flex items-center gap-2">
              <select
                value={line.serviceId}
                onChange={(e) => updateLine(line.key, { serviceId: e.target.value })}
                className={`${selectClasses()} flex-1`}
              >
                <option value="" disabled>
                  Select service
                </option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {Number(s.price).toFixed(2)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="Qty"
                value={line.quantity}
                onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                className={`${selectClasses()} w-20`}
              />
              <span className="w-28 text-right text-sm text-ink-secondary">{lineTotal(line).toFixed(2)}</span>
              <button
                type="button"
                onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                disabled={lines.length === 1}
                className="text-sm text-danger hover:underline disabled:opacity-30"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLines((prev) => [...prev, { key: newKey(), serviceId: "", quantity: "" }])}
            className="self-start text-sm font-medium text-brown-700 hover:underline"
          >
            + Add service
          </button>
          <p className="text-sm font-medium text-ink">Total service revenue: {serviceTotal.toFixed(2)}</p>
        </div>

        <PaymentBreakdown
          title="Payment breakdown (optional)"
          total={serviceTotal}
          rows={payments}
          setRows={setPayments}
          updateRow={(key, patch) => updatePayment(payments, setPayments, key, patch)}
        />

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-secondary">
              Tips (optional, total for this staff member)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={tipAmount}
              onChange={(e) => setTipAmount(e.target.value)}
              className={`${selectClasses()} w-40`}
            />
          </div>
          {tipTotal > 0 && (
            <PaymentBreakdown
              title="Tip payment breakdown (optional)"
              total={tipTotal}
              rows={tipPayments}
              setRows={setTipPayments}
              updateRow={(key, patch) => updatePayment(tipPayments, setTipPayments, key, patch)}
            />
          )}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="button" onClick={handleSubmit} disabled={pending} className="self-start">
          {pending ? "Recording…" : "Record batch"}
        </Button>
      </div>
    </SectionCard>
  );
}

function PaymentBreakdown({
  title,
  total,
  rows,
  setRows,
  updateRow,
}: {
  title: string;
  total: number;
  rows: PaymentRow[];
  setRows: (rows: PaymentRow[]) => void;
  updateRow: (key: string, patch: Partial<PaymentRow>) => void;
}) {
  const paid = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const remaining = total - paid;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-ink">{title}</p>
      {rows.map((row) => (
        <div key={row.key} className="flex items-center gap-2">
          <select
            value={row.paymentMethod}
            onChange={(e) => updateRow(row.key, { paymentMethod: e.target.value })}
            className={`${selectClasses()} flex-1`}
          >
            <option value="" disabled>
              Select method
            </option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            min="0"
            value={row.amount}
            onChange={(e) => updateRow(row.key, { amount: e.target.value })}
            className={`${selectClasses()} w-32`}
          />
          <button
            type="button"
            onClick={() => setRows(rows.filter((r) => r.key !== row.key))}
            className="text-sm text-danger hover:underline"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows([...rows, { key: newKey(), paymentMethod: "", amount: "" }])}
        className="self-start text-sm font-medium text-brown-700 hover:underline"
      >
        + Add payment
      </button>
      {rows.length > 0 && (
        <p className={`text-sm ${Math.abs(remaining) < 0.005 ? "text-muted" : "text-danger"}`}>
          {Math.abs(remaining) < 0.005 ? "Balanced" : `Remaining: ${remaining.toFixed(2)}`}
        </p>
      )}
    </div>
  );
}
