import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AskForm } from "./ask-form";

export default async function AskPage() {
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
  if (!membership) redirect("/onboarding/business");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Ask Piccos</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Ask a question about your business in plain language. Answers are based only on your
        recorded data — you&apos;ll only see what you already have access to.
      </p>
      <div className="mt-6">
        <AskForm />
      </div>
    </div>
  );
}
