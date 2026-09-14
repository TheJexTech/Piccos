"use client";

import { selectClasses } from "@/components/ui/select-field";

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
        className={`${selectClasses()} py-1.5 text-xs`}
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
