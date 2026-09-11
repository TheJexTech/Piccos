import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShopSubNav } from "@/components/shop-sub-nav";
import { ServicesList } from "./services-list";
import { NewServiceForm } from "./new-service-form";
import type { Service } from "@/lib/services/types";

export default async function ServicesPage() {
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

  const { data: services } = await supabase
    .from("services")
    .select("id, name, description, price, status")
    .eq("business_id", membership.business_id)
    .order("created_at", { ascending: true })
    .returns<Service[]>();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Services</h1>
      <ShopSubNav active="/shop/services" />

      {canManage && <NewServiceForm businessId={membership.business_id} />}

      <ServicesList services={services ?? []} canManage={canManage} />
    </div>
  );
}
