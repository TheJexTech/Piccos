import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/onboarding/business");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("name")
    .eq("id", membership.business_id)
    .single();

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <AppNav businessName={business?.name ?? ""} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
