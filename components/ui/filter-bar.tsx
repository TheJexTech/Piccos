// The filter container every GET-form filter (outlet + period selectors)
// already uses (`flex flex-wrap items-end gap-4 rounded border p-4`) —
// same layout contract, restyled to match the card language.
//
// method="get" stays as a no-JS fallback, but onSubmit (when passed)
// intercepts the submit and does a client-side router.push instead — same
// URL/query-param contract, just a soft navigation instead of a full
// browser reload.
export function FilterBar({
  children,
  onSubmit,
}: {
  children: React.ReactNode;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      method="get"
      onSubmit={onSubmit}
      className="flex flex-wrap items-end gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm shadow-ink/[0.02]"
    >
      {children}
    </form>
  );
}
