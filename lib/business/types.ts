export type BusinessActionState = { error: string | null };

export const initialBusinessActionState: BusinessActionState = { error: null };

export type Business = {
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  currency: string;
  timezone: string;
};
