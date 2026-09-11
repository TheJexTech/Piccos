"use client";

import { useActionState, useState } from "react";
import { createTransaction } from "@/lib/transactions/actions";
import { initialTransactionActionState, PAYMENT_METHODS } from "@/lib/transactions/types";
import { FormField } from "@/components/form-field";

type Staff = { id: string; display_name: string };
type Station = { id: string; name: string };
type Service = { id: string; name: string; price: number };

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function NewTransactionForm({
  businessId,
  staff,
  stations,
  services,
}: {
  businessId: string;
  staff: Staff[];
  stations: Station[];
  services: Service[];
}) {
  const createTransactionWithBusiness = createTransaction.bind(null, businessId);
  const [state, formAction, pending] = useActionState(
    createTransactionWithBusiness,
    initialTransactionActionState,
  );
  const [amount, setAmount] = useState("");
  const [now] = useState(() => toDatetimeLocalValue(new Date()));

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="staff_id" className="text-sm text-zinc-600 dark:text-zinc-400">
            Staff
          </label>
          <select
            id="staff_id"
            name="staff_id"
            defaultValue=""
            required
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
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
          <label htmlFor="station_id" className="text-sm text-zinc-600 dark:text-zinc-400">
            Station
          </label>
          <select
            id="station_id"
            name="station_id"
            defaultValue=""
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">Unassigned</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="service_id" className="text-sm text-zinc-600 dark:text-zinc-400">
            Service
          </label>
          <select
            id="service_id"
            name="service_id"
            defaultValue=""
            required
            onChange={(e) => {
              const selected = services.find((s) => s.id === e.target.value);
              if (selected) setAmount(String(selected.price));
            }}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
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
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="amount" className="text-sm text-zinc-600 dark:text-zinc-400">
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
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="payment_method" className="text-sm text-zinc-600 dark:text-zinc-400">
            Payment method
          </label>
          <select
            id="payment_method"
            name="payment_method"
            defaultValue=""
            required
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
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
        </div>

        <FormField
          label="Date / time"
          name="transaction_date"
          type="datetime-local"
          defaultValue={now}
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Recording…" : "Record transaction"}
      </button>
    </form>
  );
}
