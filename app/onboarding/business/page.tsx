import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewBusinessForm } from "./new-business-form";

export default async function NewBusinessPage() {
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

  // Already set up — don't let them create a second business by mistake.
  if (membership) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="w-full max-w-lg">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
          Set up your business
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Tell us about your shop. You can change any of this later.
        </p>
        <NewBusinessForm />
      </div>
    </div>
  );
}
