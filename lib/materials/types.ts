export type MaterialActionState = { error: string | null };

export const initialMaterialActionState: MaterialActionState = { error: null };

// "Material" mirrors the underlying `materials` table name (unchanged) —
// the user-facing term is "Supply" everywhere in the UI. unit/
// minimum_quantity still exist as DB columns but are no longer surfaced —
// V1 keeps supply tracking to name + quantity + purchase history.
export type Material = {
  id: string;
  name: string;
  current_quantity: number;
};

export type MaterialPurchase = {
  id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  supplier: string | null;
  purchase_date: string;
};
