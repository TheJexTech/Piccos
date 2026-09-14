const inputClassName =
  "rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brown-700 focus:outline-none";

type FormFieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  textarea?: boolean;
  // Optional autocomplete suggestions (HTML <datalist>) — these are
  // suggestions only, never a restriction; the user can still type
  // anything. Also sets autoComplete="off" so the browser's own saved-value
  // autofill (which can otherwise surface unrelated values from other
  // fields sharing the same `name`, e.g. "name") doesn't mix in.
  suggestions?: string[];
};

export function FormField({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  textarea,
  suggestions,
}: FormFieldProps) {
  const listId = suggestions ? `${name}-suggestions` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-xs font-medium text-ink-secondary">
        {label}
      </label>
      {textarea ? (
        <textarea
          id={name}
          name={name}
          required={required}
          defaultValue={defaultValue}
          rows={3}
          className={inputClassName}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          required={required}
          defaultValue={defaultValue}
          list={listId}
          autoComplete={suggestions ? "off" : undefined}
          className={inputClassName}
        />
      )}
      {suggestions && (
        <datalist id={listId}>
          {suggestions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      )}
    </div>
  );
}
