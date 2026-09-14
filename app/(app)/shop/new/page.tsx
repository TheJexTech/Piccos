import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewBusinessForm } from "@/components/new-business-form";

export default async function NewShopPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Link href="/shop" className="text-sm text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50">
        ← My Shops
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-black dark:text-zinc-50">Add another shop</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        This creates a fully separate outlet with its own stations, staff, services, and activity —
        you&apos;ll remain the owner of both.
      </p>
      <NewBusinessForm />
    </div>
  );
}
