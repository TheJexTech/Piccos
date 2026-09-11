import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth/actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-black">
      <p className="text-black dark:text-zinc-50">Signed in as {user?.email}</p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Business setup and the real dashboard arrive in later milestones.
      </p>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded border border-zinc-300 px-3 py-2 text-sm text-black dark:border-zinc-700 dark:text-zinc-50"
        >
          Log out
        </button>
      </form>
    </div>
  );
}
