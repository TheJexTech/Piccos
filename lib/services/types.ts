export type ServiceActionState = { error: string | null };

export const initialServiceActionState: ServiceActionState = { error: null };

// description still exists as a DB column but is no longer part of the
// service-management UI — name, price, and status are the full V1 model.
export type Service = {
  id: string;
  name: string;
  price: number;
  status: "active" | "inactive";
};
