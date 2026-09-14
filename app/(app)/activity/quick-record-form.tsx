"use client";

import { useActionState, useState } from "react";
import { createTransaction } from "@/lib/transactions/actions";
import { initialTransactionActionState, PAYMENT_METHODS } from "@/lib/transactions/types";
import { LAST_STAFF_COOKIE } from "@/lib/activity/constants";
import { FormField } from "@/components/form-field";
import { SelectField, selectClasses } from "@/components/ui/select-field";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";

type Staff = { id: string; display_name: string; station_id: string | null; stations: { name: string } | null };
type Service = { id: string; name: string; price: number };

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function rememberStaff(staffId: string) {
  document.cookie = `${LAST_STAFF_COOKIE}=${staffId}; path=/; max-age=${60 * 60 * 24 * 30}`;
}

export function QuickRecordForm({
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
  const createTransactionWithBusiness = createTransaction.bind(null, businessId);
  const [state, formAction, pending] = useActionState(
    createTransactionWithBusiness,
    initialTransactionActionState,
  );
  const [amount, setAmount] = useState("");
  const [now] = useState(() => toDatetimeLocalValue(new Date()));
  const [staffId, setStaffId] = useState(() =>
    staff.some((s) => s.id === defaultStaffId) ? defaultStaffId : "",
  );
  const [tipAmount, setTipAmount] = useState("");
  // Station is derived entirely from the selected staff member's
  // Shop -> Staff assignment (the source of truth) rather than chosen
  // manually here — this only affects new transactions going forward;
  // past transactions already have their own station_id recorded and
  // never change when a staff member is reassigned later.
  const selectedStaff = staff.find((s) => s.id === staffId) ?? null;
  const hasTip = tipAmount !== "" && Number(tipAmount) > 0;

  function handleStaffChange(id: string) {
    setStaffId(id);
    if (id) rememberStaff(id);
  }

  return (
    <SectionCard>
      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Staff"
            id="staff_id"
            name="staff_id"
            value={staffId}
            onChange={(e) => handleStaffChange(e.target.value)}
            required
          >
            <option value="" disabled>
              Select staff
            </option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.display_name}
              </option>
            ))}
          </SelectField>

          <div className="flex flex-col gap-1">
            <label htmlFor="station_id" className="text-xs font-medium text-ink-secondary">
              Outlet
            </label>
            <div id="station_id" className="rounded-xl border border-border bg-app-bg px-3 py-2 text-sm text-muted">
              {selectedStaff ? (selectedStaff.stations?.name ?? "Unassigned") : "Select staff first"}
            </div>
            <input type="hidden" name="station_id" value={selectedStaff?.station_id ?? ""} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Service"
            id="service_id"
            name="service_id"
            defaultValue=""
            required
            onChange={(e) => {
              const selected = services.find((s) => s.id === e.target.value);
              if (selected) setAmount(String(selected.price));
            }}
          >
            <option value="" disabled>
              Select service
            </option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {Number(s.price).toFixed(2)}
              </option>
            ))}
          </SelectField>

          <div className="flex flex-col gap-1">
            <label htmlFor="amount" className="text-xs font-medium text-ink-secondary">
              Amount charged
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={selectClasses()}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField label="Payment method" id="payment_method" name="payment_method" defaultValue="" required>
            <option value="" disabled>
              Select method
            </option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </SelectField>

          <FormField label="Date / time" name="transaction_date" type="datetime-local" defaultValue={now} />
        </div>

        {/* Tip is a separate financial concept from service revenue — never
            summed into `amount`, never counted toward estimated profit. */}
        <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="tip_amount" className="text-xs font-medium text-ink-secondary">
              Tip (optional)
            </label>
            <input
              id="tip_amount"
              name="tip_amount"
              type="number"
              step="0.01"
              min="0"
              value={tipAmount}
              onChange={(e) => setTipAmount(e.target.value)}
              className={selectClasses()}
            />
          </div>

          <SelectField
            label="Tip payment method"
            id="tip_payment_method"
            name="tip_payment_method"
            defaultValue=""
            required={hasTip}
            disabled={!hasTip}
            className="disabled:opacity-50"
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

        {state.error && <p className="text-sm text-danger">{state.error}</p>}

        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Recording…" : "Record transaction"}
        </Button>
      </form>
    </SectionCard>
  );
}
