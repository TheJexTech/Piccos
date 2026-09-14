import Link from "next/link";

// Outlets first — it's the natural starting point of shop setup (Outlets
// -> Staff -> Services -> Activity). General business info lives on
// /shop/details, not as a tab here.
const TABS = [
  { href: "/shop/outlets", label: "Outlets" },
  { href: "/shop/staff", label: "Staff" },
  { href: "/shop/services", label: "Services" },
];

export function ShopSubNav({ active }: { active: string }) {
  return (
    <nav className="mb-6 flex gap-1 rounded-full border border-border bg-surface p-1 text-sm w-fit">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={
            tab.href === active
              ? "rounded-full bg-ink px-4 py-1.5 font-medium text-white"
              : "rounded-full px-4 py-1.5 text-ink-secondary hover:bg-app-bg"
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
