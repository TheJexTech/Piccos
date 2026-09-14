const TONES = {
  success: "bg-success-bg text-success",
  danger: "bg-danger-bg text-danger",
  warning: "bg-warning-bg text-warning",
  neutral: "bg-tan/25 text-ink-secondary",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof TONES;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

// Maps Piccos' known status strings to a tone automatically, so call
// sites don't have to repeat the mapping (active/inactive, voided/
// correction, maintenance).
const STATUS_TONE: Record<string, keyof typeof TONES> = {
  active: "success",
  inactive: "neutral",
  maintenance: "warning",
  voided: "danger",
  correction: "warning",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{status}</Badge>;
}
