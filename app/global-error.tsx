"use client";

import { useEffect } from "react";

// Same as error.tsx, but for errors thrown by the root layout itself —
// Next.js requires this file to render its own <html>/<body> since it
// replaces the root layout entirely when triggered.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-4 text-center dark:bg-black">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Something went wrong</h1>
          <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
            An unexpected error occurred. Try again, and if it keeps happening, let us know.
          </p>
          <button
            onClick={reset}
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
