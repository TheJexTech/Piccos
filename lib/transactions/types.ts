export type TransactionActionState = { error: string | null };

export const initialTransactionActionState: TransactionActionState = { error: null };

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "pos", label: "POS" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "other", label: "Other" },
];

export type Transaction = {
  id: string;
  transaction_date: string;
  amount: number;
  payment_method: string;
  service_name: string;
  correction_of_id: string | null;
  tip_amount: number;
  tip_payment_method: string | null;
  staff: { display_name: string } | null;
  stations: { name: string } | null;
};
