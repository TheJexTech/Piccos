import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, requireCurrentMembership } from "@/lib/business/current";
import { SectionCard } from "@/components/ui/section-card";
import { EditSupplyForm } from "./edit-supply-form";
import { RecordPurchaseForm } from "./record-purchase-form";
import { SupplyPurchasesList } from "./supply-purchases-list";
import type { Material, MaterialPurchase } from "@/lib/materials/types";

export default async function SupplyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) redirect("/login");

  const membership = await requireCurrentMembership(supabase, user.id);
  const canManage = membership.role === "owner" || membership.role === "secretary";

  // Scoped to the current outlet explicitly — an owner with multiple shops
  // is RLS-authorized for all of them, so without this check a supply id
  // from a different outlet would still resolve here instead of 404ing.
  const { data: material } = await supabase
    .from("materials")
    .select("id, name, current_quantity")
    .eq("id", id)
    .eq("business_id", membership.businessId)
    .maybeSingle<Material>();

  if (!material) {
    redirect("/supplies");
  }

  const { data: purchases } = canManage
    ? await supabase
        .from("material_purchases")
        .select("id, quantity, unit_cost, total_cost, supplier, purchase_date")
        .eq("material_id", material.id)
        .order("purchase_date", { ascending: false })
        .limit(50)
        .returns<MaterialPurchase[]>()
    : { data: [] as MaterialPurchase[] };

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/supplies" className="text-sm text-muted hover:text-ink">
        ← Supplies
      </Link>

      <SectionCard className="mt-4">
        <EditSupplyForm material={material} canManage={canManage} />
      </SectionCard>

      {canManage && (
        <div className="mt-6 flex flex-col gap-4">
          <RecordPurchaseForm materialId={material.id} />
          <SupplyPurchasesList purchases={purchases ?? []} />
        </div>
      )}
    </div>
  );
}
