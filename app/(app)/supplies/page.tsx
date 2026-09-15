import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, requireCurrentMembership } from "@/lib/business/current";
import { buttonClasses } from "@/components/ui/button";
import { SuppliesList } from "./supplies-list";
import type { Material } from "@/lib/materials/types";

export default async function SuppliesPage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) redirect("/login");

  const membership = await requireCurrentMembership(supabase, user.id);
  const canManage = membership.role === "owner" || membership.role === "secretary";

  const { data: materials } = await supabase
    .from("materials")
    .select("id, name, current_quantity")
    .eq("business_id", membership.businessId)
    .order("name", { ascending: true })
    .returns<Material[]>();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Supplies</h1>
        {canManage && (
          <Link href="/supplies/new" className={buttonClasses("primary")}>
            + Add supply
          </Link>
        )}
      </div>

      <div className="mt-6">
        <SuppliesList materials={materials ?? []} />
      </div>
    </div>
  );
}
