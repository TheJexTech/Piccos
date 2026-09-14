"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import { signOut } from "@/lib/auth/actions";
import { Avatar } from "./ui/avatar";
import {
  DashboardIcon,
  OutletsIcon,
  ActivityIcon,
  StaffIcon,
  ServicesIcon,
  ProductsIcon,
  SuppliesIcon,
  RevenueIcon,
  ExpensesIcon,
  ReportsIcon,
  AskIcon,
  MenuIcon,
  CloseIcon,
  LogoutIcon,
} from "./ui/icons";

type NavItem = { href: string; label: string; icon: ComponentType<{ className?: string }> };

const OPERATIONS_ITEMS: NavItem[] = [
  { href: "/shop/outlets", label: "Outlets", icon: OutletsIcon },
  { href: "/activity", label: "Activity", icon: ActivityIcon },
  { href: "/shop/staff", label: "Staff", icon: StaffIcon },
  { href: "/shop/services", label: "Services", icon: ServicesIcon },
  { href: "/products", label: "Products", icon: ProductsIcon },
  { href: "/supplies", label: "Supplies", icon: SuppliesIcon },
];

const FINANCE_ITEMS: NavItem[] = [
  { href: "/revenue", label: "Revenue", icon: RevenueIcon },
  { href: "/expenses", label: "Expenses", icon: ExpensesIcon },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-sidebar-active text-sidebar-foreground"
          : "text-sidebar-muted hover:bg-sidebar-active/60 hover:text-sidebar-foreground"
      }`}
    >
      <Icon className="size-[18px] shrink-0" />
      {item.label}
    </Link>
  );
}

function NavContent({
  pathname,
  role,
  email,
  onNavigate,
}: {
  pathname: string;
  role: string;
  email: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-6 pt-6">
        <Link href="/dashboard" className="text-lg font-semibold text-sidebar-foreground">
          Piccos
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 pb-4">
        <div className="flex flex-col gap-1">
          <NavLink
            item={{ href: "/dashboard", label: "Dashboard", icon: DashboardIcon }}
            active={isActive(pathname, "/dashboard")}
            onNavigate={onNavigate}
          />
        </div>

        <div>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted/70">
            Operations
          </p>
          <div className="flex flex-col gap-1">
            {OPERATIONS_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(pathname, item.href)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted/70">
            Finance
          </p>
          <div className="flex flex-col gap-1">
            {FINANCE_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(pathname, item.href)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <NavLink
            item={{ href: "/reports", label: "Reports", icon: ReportsIcon }}
            active={isActive(pathname, "/reports")}
            onNavigate={onNavigate}
          />
          <NavLink
            item={{ href: "/ask", label: "Ask Piccos", icon: AskIcon }}
            active={isActive(pathname, "/ask")}
            onNavigate={onNavigate}
          />
        </div>
      </nav>

      <div className="border-t border-sidebar-border px-3 py-4">
        <div className="flex items-center gap-3 px-2">
          <Avatar name={email} size="sm" className="!bg-sidebar-muted/20 !text-sidebar-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">{email}</p>
            <p className="text-xs capitalize text-sidebar-muted">{role}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Log out"
              className="rounded-lg p-1.5 text-sidebar-muted hover:bg-sidebar-active hover:text-sidebar-foreground"
            >
              <LogoutIcon className="size-[18px]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ role, email }: { role: string; email: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar — the sidebar itself is hidden below lg, reachable
          via this hamburger drawer instead. */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="text-base font-semibold text-ink">
          Piccos
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-1.5 text-ink hover:bg-app-bg"
        >
          <MenuIcon className="size-5" />
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-sidebar shadow-xl">
            <div className="flex justify-end px-3 pt-3">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-1.5 text-sidebar-muted hover:bg-sidebar-active hover:text-sidebar-foreground"
              >
                <CloseIcon className="size-5" />
              </button>
            </div>
            <NavContent
              pathname={pathname}
              role={role}
              email={email}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar — fixed width, full height. */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col lg:bg-sidebar">
        <NavContent pathname={pathname} role={role} email={email} />
      </div>
    </>
  );
}
