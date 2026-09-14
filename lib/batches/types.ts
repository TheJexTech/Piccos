export type BatchActionState = { error: string | null };

export const initialBatchActionState: BatchActionState = { error: null };

export type BatchServiceInput = { serviceId: string; quantity: number };
export type BatchPaymentInput = { paymentMethod: string; amount: number };

export type RecordBatchInput = {
  staffId: string;
  batchDate: string;
  services: BatchServiceInput[];
  tipAmount: number;
  payments: BatchPaymentInput[];
  tipPayments: BatchPaymentInput[];
};

export type Batch = {
  id: string;
  batch_date: string;
  tip_amount: number;
  status: "active" | "voided";
  staff: { display_name: string } | null;
  batch_services: { service_name: string; quantity: number; line_total: number }[];
};
