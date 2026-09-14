// The filter container every GET-form filter (outlet + period selectors)
// already uses (`flex flex-wrap items-end gap-4 rounded border p-4`) —
// same layout contract, restyled to match the card language.
export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <form
      method="get"
      className="flex flex-wrap items-end gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm shadow-ink/[0.02]"
    >
      {children}
    </form>
  );
}
