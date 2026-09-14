"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MaterialActionState } from "@/lib/materials/types";

export async function createMaterial(
  businessId: string,
  _prevState: MaterialActionState,
  formData: FormData,
): Promise<MaterialActionState> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Supply name is required." };

  const currentQuantity = Number(formData.get("current_quantity") as string) || 0;

  const supabase = await createClient();
  // unit is still a required DB column (kept as-is — not renaming/dropping
  // it) but no longer collected from the user; minimum_quantity is left to
  // its DB default of 0 now that low-stock tracking is gone from the UI.
  const { data, error } = await supabase
    .from("materials")
    .insert({
      business_id: businessId,
      name,
      unit: "",
      current_quantity: currentQuantity,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/supplies");
  redirect(`/supplies/${data.id}`);
}

export async function updateMaterial(
  materialId: string,
  _prevState: MaterialActionState,
  formData: FormData,
): Promise<MaterialActionState> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Supply name is required." };

  const supabase = await createClient();
  // current_quantity is intentionally not editable here — it only changes
  // by recording a purchase (record_material_purchase), so it can never
  // drift from the purchase history that explains it.
  const { error } = await supabase.from("materials").update({ name }).eq("id", materialId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/supplies");
  revalidatePath(`/supplies/${materialId}`);
  return { error: null };
}

export async function deleteMaterial(materialId: string) {
  const supabase = await createClient();
  await supabase.from("materials").delete().eq("id", materialId);
  revalidatePath("/supplies");
  redirect("/supplies");
}

export async function recordPurchase(
  materialId: string,
  _prevState: MaterialActionState,
  formData: FormData,
): Promise<MaterialActionState> {
  const quantityRaw = formData.get("quantity") as string;
  const unitCostRaw = formData.get("unit_cost") as string;
  const supplier = (formData.get("supplier") as string) || null;
  const purchaseDateRaw = formData.get("purchase_date") as string;

  const quantity = Number(quantityRaw);
  const unitCost = Number(unitCostRaw);

  if (!quantityRaw || Number.isNaN(quantity) || quantity <= 0) {
    return { error: "Enter a valid quantity." };
  }
  if (!unitCostRaw || Number.isNaN(unitCost) || unitCost < 0) {
    return { error: "Enter a valid unit cost." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_material_purchase", {
    p_material_id: materialId,
    p_quantity: quantity,
    p_unit_cost: unitCost,
    p_supplier: supplier,
    ...(purchaseDateRaw ? { p_purchase_date: purchaseDateRaw } : {}),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/supplies");
  revalidatePath(`/supplies/${materialId}`);
  return { error: null };
}
