export type ProductActionState = { error: string | null };

export const initialProductActionState: ProductActionState = { error: null };

export type Product = {
  id: string;
  name: string;
  selling_price: number;
  cost_price: number;
  stock_quantity: number;
  status: "active" | "inactive";
  station_id: string | null;
};

export type ProductSale = {
  id: string;
  product_name: string;
  selling_price: number;
  cost_price: number;
  quantity: number;
  amount: number;
  payment_method: string;
  sale_date: string;
  correction_of_id: string | null;
};

export type RecordProductSaleInput = {
  productId: string;
  quantity: number;
  paymentMethod: string;
  saleDate: string;
};
