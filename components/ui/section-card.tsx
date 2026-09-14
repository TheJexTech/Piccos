// The generic rounded white container every page currently builds inline
// as `rounded border border-zinc-200 p-4 dark:border-zinc-800` — Bruno's
// cards are more generously rounded with a soft shadow instead of a hard
// border-only look.
export function SectionCard({
  title,
  description,
  actions,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-5 shadow-sm shadow-ink/[0.02] ${className}`}
    >
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
