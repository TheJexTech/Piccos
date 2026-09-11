import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShopSubNav } from "@/components/shop-sub-nav";
import { StaffList } from "./staff-list";
import { NewStaffForm } from "./new-staff-form";

export default async function StaffPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/onboarding/business");

  const canManage = membership.role === "owner" || membership.role === "secretary";
  const isOwner = membership.role === "owner";

  const { data: stations } = await supabase
    .from("stations")
    .select("id, name")
    .eq("business_id", membership.business_id)
    .order("name", { ascending: true });

  const { data: staff } = await supabase
    .from("staff")
    .select("id, display_name, station_id, status, joined_at")
    .eq("business_id", membership.business_id)
    .order("joined_at", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Staff</h1>
      <ShopSubNav active="/shop/staff" />

      {canManage && <NewStaffForm businessId={membership.business_id} stations={stations ?? []} />}

      <StaffList
        staff={staff ?? []}
        stations={stations ?? []}
        canManage={canManage}
        canDelete={isOwner}
      />
    </div>
  );
}
