export type MaterialActionState = { error: string | null };

export const initialMaterialActionState: MaterialActionState = { error: null };

export type Material = {
  id: string;
  name: string;
  unit: string;
  current_quantity: number;
  minimum_quantity: number;
};

export type MaterialPurchase = {
  id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  supplier: string | null;
  purchase_date: string;
  materials: { name: string } | null;
};
