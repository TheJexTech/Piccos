"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ProductActionState, RecordProductSaleInput } from "@/lib/products/types";
import { PAYMENT_METHODS } from "@/lib/transactions/types";

function parseMoney(formData: FormData, field: string): number | null {
  const raw = formData.get(field) as string;
  const value = Number(raw);
  if (!raw || Number.isNaN(value) || value < 0) return null;
  return value;
}

export async function createProduct(
  businessId: string,
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Product name is required." };

  const sellingPrice = parseMoney(formData, "selling_price");
  if (sellingPrice === null) return { error: "Enter a valid selling price." };

  const costPrice = parseMoney(formData, "cost_price");
  if (costPrice === null) return { error: "Enter a valid cost price." };

  const stockQuantity = Number(formData.get("stock_quantity") as string) || 0;
  const stationId = (formData.get("station_id") as string) || null;

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    business_id: businessId,
    name,
    selling_price: sellingPrice,
    cost_price: costPrice,
    stock_quantity: stockQuantity,
    station_id: stationId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/products");
  return { error: null };
}

export async function updateProduct(
  productId: string,
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Product name is required." };

  const sellingPrice = parseMoney(formData, "selling_price");
  if (sellingPrice === null) return { error: "Enter a valid selling price." };

  const costPrice = parseMoney(formData, "cost_price");
  if (costPrice === null) return { error: "Enter a valid cost price." };

  const stationId = (formData.get("station_id") as string) || null;

  const supabase = await createClient();
  // stock_quantity is intentionally not editable here — same rule as
  // Supplies' current_quantity: it only changes by recording a sale, so it
  // can never drift from the sales history that explains it.
  const { error } = await supabase
    .from("products")
    .update({
      name,
      selling_price: sellingPrice,
      cost_price: costPrice,
      status: (formData.get("status") as string) || "active",
      station_id: stationId,
    })
    .eq("id", productId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/products");
  return { error: null };
}

export async function deleteProduct(productId: string) {
  const supabase = await createClient();
  await supabase.from("products").delete().eq("id", productId);
  revalidatePath("/products");
}

// Called directly from the client (not as a <form action>) so the Record
// Product Sale form can show a live selling-price lookup as the product
// changes — same calling convention as recordBatchActivity.
export async function recordProductSale(
  businessId: string,
  input: RecordProductSaleInput,
): Promise<ProductActionState> {
  if (!input.productId) return { error: "Select a product." };
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    return { error: "Enter a valid quantity." };
  }
  if (!PAYMENT_METHODS.some((m) => m.value === input.paymentMethod)) {
    return { error: "Select a payment method." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_product_sale", {
    p_business_id: businessId,
    p_product_id: input.productId,
    p_quantity: input.quantity,
    p_payment_method: input.paymentMethod,
    ...(input.saleDate ? { p_sale_date: new Date(input.saleDate).toISOString() } : {}),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/products");
  revalidatePath("/dashboard");
  revalidatePath("/revenue");
  revalidatePath("/reports");
  return { error: null };
}

export async function voidProductSale(
  saleId: string,
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const reason = (formData.get("reason") as string)?.trim();
  if (!reason) {
    return { error: "A reason is required to void a product sale." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("void_product_sale", {
    p_sale_id: saleId,
    p_reason: reason,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/products");
  revalidatePath("/dashboard");
  revalidatePath("/revenue");
  revalidatePath("/reports");
  return { error: null };
}
