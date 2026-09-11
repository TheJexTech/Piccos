"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { StationActionState } from "@/lib/stations/types";

export async function createStation(
  businessId: string,
  _prevState: StationActionState,
  formData: FormData,
): Promise<StationActionState> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { error: "Station name is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("stations").insert({
    business_id: businessId,
    name,
    description: (formData.get("description") as string) || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/shop/stations");
  return { error: null };
}

export async function updateStationStatus(stationId: string, formData: FormData) {
  const status = formData.get("status") as string;
  const supabase = await createClient();
  await supabase.from("stations").update({ status }).eq("id", stationId);
  revalidatePath("/shop/stations");
}

export async function deleteStation(stationId: string) {
  const supabase = await createClient();
  await supabase.from("stations").delete().eq("id", stationId);
  revalidatePath("/shop/stations");
}
