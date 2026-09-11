"use client";

type Option = { value: string; label: string };

export function AutoSubmitSelect({
  name,
  defaultValue,
  options,
  action,
}: {
  name: string;
  defaultValue: string;
  options: Option[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action}>
      <select
        name={name}
        defaultValue={defaultValue}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </form>
  );
}
