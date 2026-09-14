// A small hand-built line-icon set (18px, stroke-based) — no icon
// library is installed, and the sidebar only needs about a dozen glyphs.
type IconProps = { className?: string };
const base = "1.5";

export function DashboardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <rect x="2.5" y="2.5" width="6.5" height="7" rx="1.5" stroke="currentColor" strokeWidth={base} />
      <rect x="11" y="2.5" width="6.5" height="4.5" rx="1.5" stroke="currentColor" strokeWidth={base} />
      <rect x="11" y="9" width="6.5" height="8.5" rx="1.5" stroke="currentColor" strokeWidth={base} />
      <rect x="2.5" y="11.5" width="6.5" height="6" rx="1.5" stroke="currentColor" strokeWidth={base} />
    </svg>
  );
}

export function OutletsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M10 17.5s6-5.2 6-9.8a6 6 0 1 0-12 0c0 4.6 6 9.8 6 9.8Z"
        stroke="currentColor"
        strokeWidth={base}
        strokeLinejoin="round"
      />
      <circle cx="10" cy="7.5" r="2.2" stroke="currentColor" strokeWidth={base} />
    </svg>
  );
}

export function ActivityIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth={base} />
      <path d="M10 5.75V10l3 2" stroke="currentColor" strokeWidth={base} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StaffIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <circle cx="7.25" cy="6.5" r="2.75" stroke="currentColor" strokeWidth={base} />
      <path d="M2.5 17c0-3 2.2-5 4.75-5s4.75 2 4.75 5" stroke="currentColor" strokeWidth={base} strokeLinecap="round" />
      <circle cx="14" cy="7" r="2.1" stroke="currentColor" strokeWidth={base} />
      <path d="M12.6 12.3c2.1.1 3.9 1.9 3.9 4.7" stroke="currentColor" strokeWidth={base} strokeLinecap="round" />
    </svg>
  );
}

export function ServicesIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <circle cx="5.5" cy="5.5" r="2" stroke="currentColor" strokeWidth={base} />
      <circle cx="5.5" cy="14.5" r="2" stroke="currentColor" strokeWidth={base} />
      <path d="M16.5 4.5 7 14M7 6l9.5 9.5" stroke="currentColor" strokeWidth={base} strokeLinecap="round" />
    </svg>
  );
}

export function ProductsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M3 6.5 10 3l7 3.5-7 3.5-7-3.5Z" stroke="currentColor" strokeWidth={base} strokeLinejoin="round" />
      <path d="M3 6.5V14l7 3.5 7-3.5V6.5" stroke="currentColor" strokeWidth={base} strokeLinejoin="round" />
      <path d="M10 10v7.5" stroke="currentColor" strokeWidth={base} />
    </svg>
  );
}

export function SuppliesIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <rect x="3" y="6" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth={base} />
      <path d="M6.5 6V4.5a3.5 3.5 0 0 1 7 0V6" stroke="currentColor" strokeWidth={base} />
    </svg>
  );
}

export function RevenueIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M3 15.5 8 10l3.5 3L17 6" stroke="currentColor" strokeWidth={base} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.5 6H17v4.5" stroke="currentColor" strokeWidth={base} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ExpensesIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M5 2.5h10v15l-2.5-1.5L10 17.5 7.5 16 5 17.5v-15Z" stroke="currentColor" strokeWidth={base} strokeLinejoin="round" />
      <path d="M7.5 7h5M7.5 10h5" stroke="currentColor" strokeWidth={base} strokeLinecap="round" />
    </svg>
  );
}

export function ReportsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth={base} />
      <path d="M6.5 13V9M10 13V6.5M13.5 13v-4" stroke="currentColor" strokeWidth={base} strokeLinecap="round" />
    </svg>
  );
}

export function AskIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M3 5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5v6A2.5 2.5 0 0 1 14.5 14H8l-4 3.2V14a2.5 2.5 0 0 1-1-2.5v-6Z"
        stroke="currentColor"
        strokeWidth={base}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path d="m5.5 8 4.5 4.5L14.5 8" stroke="currentColor" strokeWidth={base} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth={base} strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth={base} strokeLinecap="round" />
    </svg>
  );
}

export function LogoutIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M8 17.5H4.5A1.5 1.5 0 0 1 3 16V4a1.5 1.5 0 0 1 1.5-1.5H8" stroke="currentColor" strokeWidth={base} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 14l4-4-4-4M17 10H7.5" stroke="currentColor" strokeWidth={base} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
