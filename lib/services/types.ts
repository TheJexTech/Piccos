export type ServiceActionState = { error: string | null };

export const initialServiceActionState: ServiceActionState = { error: null };

export type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  status: "active" | "inactive";
};
