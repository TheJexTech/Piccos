"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { StaffActionState } from "@/lib/staff/types";

export async function createStaff(
  businessId: string,
  _prevState: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const displayName = (formData.get("display_name") as string)?.trim();
  if (!displayName) {
    return { error: "Staff name is required." };
  }

  const stationId = (formData.get("station_id") as string) || null;

  const supabase = await createClient();
  const { error } = await supabase.from("staff").insert({
    business_id: businessId,
    display_name: displayName,
    station_id: stationId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/shop/staff");
  return { error: null };
}

export async function updateStaffName(staffId: string, formData: FormData) {
  const displayName = (formData.get("display_name") as string)?.trim();
  if (!displayName) return;
  const supabase = await createClient();
  await supabase.from("staff").update({ display_name: displayName }).eq("id", staffId);
  revalidatePath("/shop/staff");
}

export async function updateStaffStation(staffId: string, formData: FormData) {
  const stationId = (formData.get("station_id") as string) || null;
  const supabase = await createClient();
  await supabase.from("staff").update({ station_id: stationId }).eq("id", staffId);
  revalidatePath("/shop/staff");
}

export async function updateStaffStatus(staffId: string, formData: FormData) {
  const status = formData.get("status") as string;
  const supabase = await createClient();
  await supabase.from("staff").update({ status }).eq("id", staffId);
  revalidatePath("/shop/staff");
}

export async function deleteStaff(staffId: string) {
  const supabase = await createClient();
  await supabase.from("staff").delete().eq("id", staffId);
  revalidatePath("/shop/staff");
}
