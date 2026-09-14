// Pill-shaped buttons in three variants. `buttonClasses` is exported
// separately so a styled action can also be a <Link> (e.g. "+ Add another
// shop") without duplicating the class string.
const VARIANTS = {
  primary: "bg-ink text-white hover:bg-brown-900 disabled:opacity-50",
  secondary:
    "border border-border-strong bg-surface text-ink hover:bg-app-bg disabled:opacity-50",
  danger: "text-danger hover:underline",
};

export function buttonClasses(variant: keyof typeof VARIANTS = "primary"): string {
  const base =
    variant === "danger"
      ? "inline-flex items-center text-sm font-medium"
      : "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-colors";
  return `${base} ${VARIANTS[variant]}`;
}

export function Button({
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
}) {
  return <button className={`${buttonClasses(variant)} ${className}`} {...rest} />;
}
