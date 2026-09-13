"use client";

import { useActionState } from "react";
import { askPiccos } from "@/lib/ask/actions";
import { initialAskActionState } from "@/lib/ask/types";

export function AskForm() {
  const [state, formAction, pending] = useActionState(askPiccos, initialAskActionState);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-3">
        <textarea
          name="question"
          required
          rows={3}
          placeholder="e.g. How did we do this week compared to last week?"
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Asking…" : "Ask"}
        </button>
      </form>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      {state.answer && (
        <div className="whitespace-pre-wrap rounded border border-zinc-200 p-4 text-sm text-black dark:border-zinc-800 dark:text-zinc-50">
          {state.answer}
        </div>
      )}
    </div>
  );
}
