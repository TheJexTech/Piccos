const inputClassName =
  "rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

type FormFieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  textarea?: boolean;
};

export function FormField({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  textarea,
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm text-zinc-600 dark:text-zinc-400">
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
          className={inputClassName}
        />
      )}
    </div>
  );
}
