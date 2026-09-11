import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="px-4 py-12 text-center">
      <p className="text-black dark:text-zinc-50">Signed in as {user?.email}</p>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Revenue, expenses, and performance metrics arrive in M9.
      </p>
    </div>
  );
}
