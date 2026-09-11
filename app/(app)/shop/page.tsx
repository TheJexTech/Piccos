import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShopForm } from "./shop-form";
import { ShopSubNav } from "@/components/shop-sub-nav";
import type { Business } from "@/lib/business/types";

export default async function ShopPage() {
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

  if (!membership) {
    redirect("/onboarding/business");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", membership.business_id)
    .single<Business>();

  if (!business) {
    redirect("/onboarding/business");
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Shop overview</h1>
      <ShopSubNav active="/shop" />
      <ShopForm business={business} readOnly={membership.role !== "owner"} />
    </div>
  );
}
