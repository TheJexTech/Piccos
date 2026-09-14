"use client";

import { useTransition } from "react";
import { signOut } from "@/lib/auth/actions";

// Lets someone who signed into the wrong account back out of setup without
// losing any data — signOut() only clears the session (existing M1 logic)
// and redirects to /login; it never touches business data.
export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm("Log out of Piccos?")) return;
    startTransition(() => {
      signOut();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="text-sm text-zinc-500 hover:text-black disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-50"
    >
      {pending ? "Logging out…" : "Log out"}
    </button>
  );
}
