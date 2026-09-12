import Link from "next/link";
import { signOut } from "@/lib/auth/actions";

export function AppNav({ businessName }: { businessName: string }) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="font-semibold text-black dark:text-zinc-50">
          Piccos
        </Link>
        <nav className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/dashboard" className="hover:text-black dark:hover:text-zinc-50">
            Dashboard
          </Link>
          <Link href="/shop" className="hover:text-black dark:hover:text-zinc-50">
            Shop
          </Link>
          <Link href="/activity" className="hover:text-black dark:hover:text-zinc-50">
            Activity
          </Link>
          <Link href="/expenses" className="hover:text-black dark:hover:text-zinc-50">
            Expenses
          </Link>
          <Link href="/materials" className="hover:text-black dark:hover:text-zinc-50">
            Materials
          </Link>
          <Link href="/reports" className="hover:text-black dark:hover:text-zinc-50">
            Reports
          </Link>
          <Link href="/settings/audit-log" className="hover:text-black dark:hover:text-zinc-50">
            Audit Log
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
        <span>{businessName}</span>
        <form action={signOut}>
          <button type="submit" className="hover:text-black dark:hover:text-zinc-50">
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}
