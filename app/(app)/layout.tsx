import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentMembership } from "@/lib/business/current";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await requireCurrentMembership(supabase, user.id);

  return (
    <div className="min-h-screen bg-app-bg">
      <Sidebar role={membership.role} email={user.email ?? ""} />
      <div className="lg:pl-64">
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
