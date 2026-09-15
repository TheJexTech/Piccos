import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, requireCurrentMembership } from "@/lib/business/current";
import { ShopSubNav } from "@/components/shop-sub-nav";
import { NextStepHint } from "@/components/next-step-hint";
import { SectionCard } from "@/components/ui/section-card";
import { ServicesList } from "./services-list";
import { NewServiceForm } from "./new-service-form";
import type { Service } from "@/lib/services/types";

export default async function ServicesPage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) redirect("/login");

  const membership = await requireCurrentMembership(supabase, user.id);
  const canManage = membership.role === "owner" || membership.role === "secretary";

  // Matches Activity's own "active" filter, so this hint never contradicts
  // whether Activity would actually let you record a transaction. All three
  // queries are independent (none depends on another's result), so they run
  // as one round trip instead of two sequential ones.
  const [{ data: services }, { count: stationsCount }, { count: staffCount }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, price, status")
      .eq("business_id", membership.businessId)
      .order("created_at", { ascending: true })
      .returns<Service[]>(),
    supabase
      .from("stations")
      .select("id", { count: "exact", head: true })
      .eq("business_id", membership.businessId)
      .eq("status", "active"),
    supabase
      .from("staff")
      .select("id", { count: "exact", head: true })
      .eq("business_id", membership.businessId)
      .eq("status", "active"),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Services</h1>
      <div className="mt-4">
        <ShopSubNav active="/shop/services" />
      </div>
      <NextStepHint
        counts={{
          stations: stationsCount ?? 0,
          staff: staffCount ?? 0,
          services: (services ?? []).filter((s) => s.status === "active").length,
        }}
      />

      {canManage && (
        <SectionCard title="Add service" className="mb-6">
          <NewServiceForm businessId={membership.businessId} />
        </SectionCard>
      )}

      <ServicesList services={services ?? []} canManage={canManage} />
    </div>
  );
}
