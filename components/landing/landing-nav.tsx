"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ComponentType } from "react";
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
  ChevronDownIcon,
  MenuIcon,
  CloseIcon,
} from "@/components/ui/icons";

type PlatformItem = {
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

const RUN_YOUR_SHOP: PlatformItem[] = [
  { label: "Outlets", description: "Manage every location from one place.", icon: OutletsIcon },
  { label: "Staff", description: "Understand team performance and sales.", icon: StaffIcon },
  { label: "Services", description: "Keep your service list and pricing current.", icon: ServicesIcon },
  { label: "Products", description: "Sell retail products alongside your services.", icon: ProductsIcon },
  { label: "Supplies", description: "Track what keeps your salon running.", icon: SuppliesIcon },
];

const UNDERSTAND_YOUR_BUSINESS: PlatformItem[] = [
  { label: "Revenue", description: "See what your salon is earning, by outlet and by period.", icon: RevenueIcon },
  { label: "Expenses", description: "Record what it costs to run your salon.", icon: ExpensesIcon },
  { label: "Reports", description: "A clear breakdown of how your business is performing.", icon: ReportsIcon },
  { label: "Activity", description: "See every sale as it happens.", icon: ActivityIcon },
];

const WORK_SMARTER: PlatformItem[] = [
  { label: "Ask Piccos", description: "Ask a plain-language question about your business.", icon: AskIcon },
  { label: "Dashboard", description: "Your business, at a glance.", icon: DashboardIcon },
];

const SOLUTIONS = [
  { label: "Independent Salons", description: "Everything you need to understand and manage your salon." },
  { label: "Growing Salons", description: "Keep your team, finances and operations organized as you grow." },
  { label: "Multi-Outlet Salons", description: "Manage multiple outlets while staying connected as one business." },
];

const RESOURCES = ["How Piccos Works", "Guides", "Blog", "Help Center"];

function PlatformColumn({ heading, items }: { heading: string; items: PlatformItem[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-landing-muted">{heading}</p>
      <ul className="mt-3 flex flex-col gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.label}>
              <a href="#platform" className="group flex items-start gap-3 rounded-xl p-2 -m-2 hover:bg-landing-bg-alt">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-landing-accent/10 text-landing-accent">
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-landing-ink group-hover:text-landing-accent">
                    {item.label}
                  </span>
                  <span className="block text-xs text-landing-muted">{item.description}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type MenuKey = "platform" | "solutions" | "resources" | null;

export function LandingNav() {
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  // outerRef spans the logo + pill + dropdowns (click-outside boundary);
  // navRef and logoRef each get the same scroll fade/blur/transform below,
  // so the logo flows away together with the pill rather than staying
  // pinned on screen by itself.
  const outerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (outerRef.current && !outerRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Liquid scroll transition: as the dashboard showcase approaches the top
  // of the viewport, the pill AND the logo fade/blur/flatten upward
  // together as if flowing away, then reverse smoothly on scroll-up.
  // Driven entirely off a rAF-throttled scroll listener writing directly
  // to the DOM (no React state) for the fade itself, so scrolling never
  // triggers a re-render for it — the showcase itself is never touched,
  // only read via getBoundingClientRect. The back-to-top button's
  // visibility is the one piece of actual React state here, and it's
  // guarded so it only re-renders on the rare frame that crosses the
  // show/hide threshold, not on every scroll tick.
  useEffect(() => {
    const showcase = document.getElementById("dashboard-showcase");
    if (!showcase) return;

    let ticking = false;

    function apply() {
      ticking = false;
      const pill = navRef.current;
      const logo = logoRef.current;
      if (!pill || !logo || !showcase) return;

      const rect = showcase.getBoundingClientRect();
      const vh = window.innerHeight;
      // The showcase's top edge is already partway up the viewport on first
      // paint (it sits right below the hero copy, not at the bottom of a
      // full screen), so these thresholds are deliberately tight — a wide
      // window (like the previous 0.95vh start) considered the page "mid
      // transition" before the user had scrolled at all. Fully visible
      // until the showcase is within ~55% of viewport height away, fully
      // flowed away only once its top edge nears the pill itself.
      const start = vh * 0.55;
      const end = vh * 0.12;
      const progress = Math.min(1, Math.max(0, (start - rect.top) / (start - end)));

      for (const el of [pill, logo]) {
        el.style.opacity = String(1 - progress);
        el.style.filter = progress > 0.01 ? `blur(${(progress * 6).toFixed(2)}px)` : "";
        el.style.transform =
          progress > 0.01
            ? `translateY(${(-progress * 34).toFixed(1)}px) scale(${(1 - progress * 0.05).toFixed(3)}, ${(1 - progress * 0.16).toFixed(3)})`
            : "";
        el.style.pointerEvents = progress > 0.85 ? "none" : "auto";
      }

      setShowBackToTop((prev) => {
        const next = window.scrollY > vh * 0.6;
        return prev === next ? prev : next;
      });
    }

    function onScrollOrResize() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(apply);
      }
    }

    apply();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggle(menu: MenuKey) {
    setOpenMenu((current) => (current === menu ? null : menu));
  }

  return (
    <>
      <header className="sticky top-4 z-50 px-4 sm:top-6 sm:px-6">
        <div ref={outerRef} className="relative mx-auto flex max-w-6xl items-center justify-between gap-4">
          {/* Standalone brand mark — deliberately outside the pill below so
              it isn't visually merged into the nav-links pill, but still
              picks up the same scroll-driven "liquid" fade/blur/transform
              as the pill (applied to both refs in the effect below). */}
          <Link
            ref={logoRef}
            href="/"
            className="shrink-0 text-xl font-semibold tracking-tight text-landing-ink transition-[opacity,filter,transform] duration-100 ease-out will-change-transform"
          >
            Piccos
          </Link>

          <div
            ref={navRef}
            className="flex items-center gap-1 rounded-2xl border border-landing-border bg-landing-surface/70 px-5 py-3 shadow-lg shadow-black/40 ring-1 ring-white/5 backdrop-blur-xl transition-[opacity,filter,transform] duration-100 ease-out will-change-transform sm:px-7"
          >
            <nav className="hidden items-center gap-1 lg:flex">
              <button
                type="button"
                onClick={() => toggle("platform")}
                className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium text-landing-ink-secondary hover:text-landing-ink"
              >
                Platform
                <ChevronDownIcon className={`size-3.5 transition-transform ${openMenu === "platform" ? "rotate-180" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => toggle("solutions")}
                className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium text-landing-ink-secondary hover:text-landing-ink"
              >
                Solutions
                <ChevronDownIcon className={`size-3.5 transition-transform ${openMenu === "solutions" ? "rotate-180" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => toggle("resources")}
                className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium text-landing-ink-secondary hover:text-landing-ink"
              >
                Resources
                <ChevronDownIcon className={`size-3.5 transition-transform ${openMenu === "resources" ? "rotate-180" : ""}`} />
              </button>
              <span className="cursor-default rounded-full px-4 py-2 text-sm font-medium text-landing-ink-secondary">
                Pricing
              </span>
            </nav>

            <div className="hidden items-center gap-2 lg:flex">
              <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium text-landing-ink-secondary hover:text-landing-ink">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-landing-ink px-5 py-2.5 text-sm font-medium text-landing-bg transition-colors hover:bg-landing-accent-strong"
              >
                Get Started
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="rounded-lg p-1.5 text-landing-ink lg:hidden"
            >
              <MenuIcon className="size-6" />
            </button>
          </div>

          {/* Platform mega menu */}
          {openMenu === "platform" && (
            <div className="absolute left-1/2 top-full mt-3 hidden w-[min(90vw,56rem)] -translate-x-1/2 rounded-2xl border border-landing-border bg-landing-surface shadow-lg lg:block">
              <div className="mx-auto grid grid-cols-3 gap-10 px-10 py-10">
                <PlatformColumn heading="Run Your Salon" items={RUN_YOUR_SHOP} />
                <PlatformColumn heading="Understand Your Business" items={UNDERSTAND_YOUR_BUSINESS} />
                <PlatformColumn heading="Work Smarter" items={WORK_SMARTER} />
              </div>
            </div>
          )}

          {/* Solutions dropdown */}
          {openMenu === "solutions" && (
            <div className="absolute left-1/2 top-full mt-3 hidden w-[26rem] -translate-x-1/2 rounded-2xl border border-landing-border bg-landing-surface p-4 shadow-lg lg:block">
              <ul className="flex flex-col gap-1">
                {SOLUTIONS.map((s) => (
                  <li key={s.label}>
                    <a href="#platform" className="block rounded-xl p-3 hover:bg-landing-bg-alt">
                      <span className="block text-sm font-medium text-landing-ink">{s.label}</span>
                      <span className="block text-xs text-landing-muted">{s.description}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Resources dropdown */}
          {openMenu === "resources" && (
            <div className="absolute left-1/2 top-full mt-3 hidden w-64 -translate-x-1/2 rounded-2xl border border-landing-border bg-landing-surface p-2 shadow-lg lg:block">
              <ul className="flex flex-col">
                {RESOURCES.map((r) => (
                  <li key={r}>
                    <span className="flex cursor-default items-center justify-between rounded-xl px-3 py-2.5 text-sm text-landing-ink-secondary">
                      {r}
                      <span className="text-[10px] uppercase tracking-wide text-landing-muted">Soon</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </header>

      {/* Mobile drawer — rendered outside <header> since backdrop-blur on
          an ancestor creates a new containing block for position:fixed
          descendants, which would otherwise trap this overlay inside the
          header's own (short) height instead of the full viewport. */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-80 max-w-[88vw] flex-col overflow-y-auto bg-landing-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-landing-border px-5 py-4">
              <span className="text-lg font-semibold text-landing-ink">Piccos</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-1.5 text-landing-ink-secondary hover:bg-landing-bg-alt"
              >
                <CloseIcon className="size-5" />
              </button>
            </div>

            <div className="flex flex-col gap-6 px-5 py-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-landing-muted">Platform</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {[...RUN_YOUR_SHOP, ...UNDERSTAND_YOUR_BUSINESS, ...WORK_SMARTER].map((item) => (
                    <li key={item.label}>
                      <a
                        href="#platform"
                        onClick={() => setMobileOpen(false)}
                        className="block py-1 text-sm text-landing-ink-secondary hover:text-landing-ink"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-landing-muted">Solutions</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {SOLUTIONS.map((s) => (
                    <li key={s.label}>
                      <a
                        href="#platform"
                        onClick={() => setMobileOpen(false)}
                        className="block py-1 text-sm text-landing-ink-secondary hover:text-landing-ink"
                      >
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-landing-muted">Resources</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {RESOURCES.map((r) => (
                    <li key={r} className="py-1 text-sm text-landing-muted">
                      {r} <span className="text-[10px] uppercase tracking-wide">Soon</span>
                    </li>
                  ))}
                </ul>
              </div>

              <span className="text-sm font-medium text-landing-ink-secondary">Pricing</span>
            </div>

            <div className="mt-auto flex flex-col gap-2 border-t border-landing-border px-5 py-5">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="w-full rounded-full border border-landing-border-strong px-5 py-3 text-center text-sm font-medium text-landing-ink"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="w-full rounded-full bg-landing-ink px-5 py-3 text-center text-sm font-medium text-landing-bg"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Back-to-top — always mounted so its own opacity/translate
          transition can run smoothly; pointer-events follows visibility so
          it's never an invisible click target while hidden. */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Back to top"
        aria-hidden={!showBackToTop}
        tabIndex={showBackToTop ? 0 : -1}
        className={`fixed bottom-6 right-6 z-40 flex size-11 items-center justify-center rounded-full border border-landing-border bg-landing-surface/80 text-landing-ink shadow-lg shadow-black/40 ring-1 ring-white/5 backdrop-blur-xl transition-[opacity,transform] duration-200 ease-out hover:text-landing-accent sm:bottom-8 sm:right-8 ${
          showBackToTop ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
        }`}
      >
        <ChevronDownIcon className="size-5 rotate-180" />
      </button>
    </>
  );
}
