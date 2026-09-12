import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewMaterialForm } from "./new-material-form";
import { MaterialsList } from "./materials-list";
import { NewPurchaseForm } from "./new-purchase-form";
import { PurchasesList } from "./purchases-list";
import type { Material, MaterialPurchase } from "@/lib/materials/types";

export default async function MaterialsPage() {
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

  const businessId = membership.business_id;
  const canManage = membership.role === "owner" || membership.role === "secretary";

  const { data: materials } = await supabase
    .from("materials")
    .select("id, name, unit, current_quantity, minimum_quantity")
    .eq("business_id", businessId)
    .order("name", { ascending: true })
    .returns<Material[]>();

  const { data: purchases } = canManage
    ? await supabase
        .from("material_purchases")
        .select("id, quantity, unit_cost, total_cost, supplier, purchase_date, materials(name)")
        .eq("business_id", businessId)
        .order("purchase_date", { ascending: false })
        .limit(50)
        .returns<MaterialPurchase[]>()
    : { data: [] as MaterialPurchase[] };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Materials</h1>

      <div className="mt-6">
        {canManage && <NewMaterialForm businessId={businessId} />}
        <MaterialsList materials={materials ?? []} canManage={canManage} />
      </div>

      {canManage && (materials ?? []).length > 0 && (
        <div className="mt-10">
          <NewPurchaseForm materials={materials ?? []} />
          <PurchasesList purchases={purchases ?? []} />
        </div>
      )}
    </div>
  );
}
