import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, requireCurrentMembership } from "@/lib/business/current";
import { SectionCard } from "@/components/ui/section-card";
import { NewSupplyForm } from "./new-supply-form";

export default async function NewSupplyPage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) redirect("/login");

  const membership = await requireCurrentMembership(supabase, user.id);
  if (membership.role !== "owner" && membership.role !== "secretary") {
    redirect("/supplies");
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/supplies" className="text-sm text-muted hover:text-ink">
        ← Supplies
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-ink">Add supply</h1>
      <SectionCard className="mt-6">
        <NewSupplyForm businessId={membership.businessId} />
      </SectionCard>
    </div>
  );
}
