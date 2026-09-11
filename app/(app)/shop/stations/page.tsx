import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShopSubNav } from "@/components/shop-sub-nav";
import { StationsList } from "./stations-list";
import { NewStationForm } from "./new-station-form";

export default async function StationsPage() {
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

  const isOwner = membership.role === "owner";

  const { data: stations } = await supabase
    .from("stations")
    .select("id, name, description, status")
    .eq("business_id", membership.business_id)
    .order("created_at", { ascending: true });

  const { data: staff } = await supabase
    .from("staff")
    .select("id, display_name, station_id")
    .eq("business_id", membership.business_id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Stations</h1>
      <ShopSubNav active="/shop/stations" />

      {isOwner && <NewStationForm businessId={membership.business_id} />}

      <StationsList stations={stations ?? []} staff={staff ?? []} isOwner={isOwner} />
    </div>
  );
}
