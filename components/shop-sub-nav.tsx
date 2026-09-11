import Link from "next/link";

const TABS = [
  { href: "/shop", label: "Overview" },
  { href: "/shop/stations", label: "Stations" },
  { href: "/shop/staff", label: "Staff" },
];

export function ShopSubNav({ active }: { active: string }) {
  return (
    <nav className="mb-8 flex gap-4 border-b border-zinc-200 pb-3 text-sm dark:border-zinc-800">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={
            tab.href === active
              ? "font-medium text-black dark:text-zinc-50"
              : "text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
