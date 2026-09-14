// Restyled <select>, same underlying element/name/id contract every page
// already uses (plain GET-form fields, AutoSubmitSelect actions) — only
// the classes change.
export function selectClasses(): string {
  return "rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm text-ink focus:border-brown-700 focus:outline-none";
}

export function SelectField({
  label,
  id,
  className = "",
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-ink-secondary">
          {label}
        </label>
      )}
      <select id={id} className={`${selectClasses()} ${className}`} {...rest}>
        {children}
      </select>
    </div>
  );
};
