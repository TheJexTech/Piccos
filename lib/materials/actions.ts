"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MaterialActionState } from "@/lib/materials/types";

export async function createMaterial(
  businessId: string,
  _prevState: MaterialActionState,
  formData: FormData,
): Promise<MaterialActionState> {
  const name = (formData.get("name") as string)?.trim();
  const unit = (formData.get("unit") as string)?.trim();
  if (!name) return { error: "Material name is required." };
  if (!unit) return { error: "Unit is required." };

  const currentQuantity = Number(formData.get("current_quantity") as string) || 0;
  const minimumQuantity = Number(formData.get("minimum_quantity") as string) || 0;

  const supabase = await createClient();
  const { error } = await supabase.from("materials").insert({
    business_id: businessId,
    name,
    unit,
    current_quantity: currentQuantity,
    minimum_quantity: minimumQuantity,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/materials");
  return { error: null };
}

export async function updateMaterial(
  materialId: string,
  _prevState: MaterialActionState,
  formData: FormData,
): Promise<MaterialActionState> {
  const name = (formData.get("name") as string)?.trim();
  const unit = (formData.get("unit") as string)?.trim();
  if (!name) return { error: "Material name is required." };
  if (!unit) return { error: "Unit is required." };

  const currentQuantity = Number(formData.get("current_quantity") as string);
  const minimumQuantity = Number(formData.get("minimum_quantity") as string);
  if (Number.isNaN(currentQuantity) || currentQuantity < 0) {
    return { error: "Enter a valid current quantity." };
  }
  if (Number.isNaN(minimumQuantity) || minimumQuantity < 0) {
    return { error: "Enter a valid minimum quantity." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("materials")
    .update({
      name,
      unit,
      current_quantity: currentQuantity,
      minimum_quantity: minimumQuantity,
    })
    .eq("id", materialId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/materials");
  return { error: null };
}

export async function deleteMaterial(materialId: string) {
  const supabase = await createClient();
  await supabase.from("materials").delete().eq("id", materialId);
  revalidatePath("/materials");
}

export async function recordPurchase(
  _prevState: MaterialActionState,
  formData: FormData,
): Promise<MaterialActionState> {
  const materialId = formData.get("material_id") as string;
  const quantityRaw = formData.get("quantity") as string;
  const unitCostRaw = formData.get("unit_cost") as string;
  const supplier = (formData.get("supplier") as string) || null;
  const purchaseDateRaw = formData.get("purchase_date") as string;

  const quantity = Number(quantityRaw);
  const unitCost = Number(unitCostRaw);

  if (!materialId) return { error: "Select a material." };
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

  revalidatePath("/materials");
  return { error: null };
}
