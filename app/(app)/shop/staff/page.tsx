import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, requireCurrentMembership } from "@/lib/business/current";
import { ShopSubNav } from "@/components/shop-sub-nav";
import { NextStepHint } from "@/components/next-step-hint";
import { SectionCard } from "@/components/ui/section-card";
import { StaffList } from "./staff-list";
import { NewStaffForm } from "./new-staff-form";

export default async function StaffPage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) redirect("/login");

  const membership = await requireCurrentMembership(supabase, user.id);
  const canManage = membership.role === "owner" || membership.role === "secretary";
  const isOwner = membership.role === "owner";

  // Matches Activity's own "active" filter, so this hint never contradicts
  // whether Activity would actually let you record a transaction. All four
  // queries are independent (none depends on another's result), so they run
  // as one round trip instead of two sequential ones.
  const [{ data: stations }, { data: staff }, { count: stationsCount }, { count: servicesCount }] =
    await Promise.all([
      supabase
        .from("stations")
        .select("id, name")
        .eq("business_id", membership.businessId)
        .order("name", { ascending: true }),
      supabase
        .from("staff")
        .select("id, display_name, station_id, status, joined_at")
        .eq("business_id", membership.businessId)
        .order("joined_at", { ascending: true }),
      supabase
        .from("stations")
        .select("id", { count: "exact", head: true })
        .eq("business_id", membership.businessId)
        .eq("status", "active"),
      supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("business_id", membership.businessId)
        .eq("status", "active"),
    ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Staff</h1>
      <div className="mt-4">
        <ShopSubNav active="/shop/staff" />
      </div>
      <NextStepHint
        counts={{
          stations: stationsCount ?? 0,
          staff: (staff ?? []).filter((s) => s.status === "active").length,
          services: servicesCount ?? 0,
        }}
      />

      {canManage && (
        <SectionCard title="Add staff" className="mb-6">
          <NewStaffForm businessId={membership.businessId} stations={stations ?? []} />
        </SectionCard>
      )}

      <StaffList
        staff={staff ?? []}
        stations={stations ?? []}
        canManage={canManage}
        canDelete={isOwner}
      />
    </div>
  );
}
