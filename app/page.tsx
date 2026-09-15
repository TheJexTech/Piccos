import Link from "next/link";
import { LandingNav } from "@/components/landing/landing-nav";
import { Hero } from "@/components/landing/hero";
import { PlatformSection } from "@/components/landing/platform-section";
import { FinancialSection } from "@/components/landing/financial-section";
import { StaffSection } from "@/components/landing/staff-section";
import { OutletsSection } from "@/components/landing/outlets-section";
import { ProductsSection } from "@/components/landing/products-section";
import { AskPiccosSection } from "@/components/landing/ask-piccos-section";
import { FinalCta } from "@/components/landing/final-cta";

// The public marketing home — always renders, regardless of session
// state (same pattern as any SaaS marketing site: the logged-in app
// lives separately under /dashboard, reached via "Log in"). This route
// previously just redirected straight to /dashboard or /login and never
// rendered anything of its own, so nothing else in the app depends on
// that old behavior.
export default function Home() {
  return (
    <div className="bg-landing-bg">
      <LandingNav />
      <main>
        <Hero />
        <PlatformSection />
        <FinancialSection />
        <StaffSection />
        <OutletsSection />
        <ProductsSection />
        <AskPiccosSection />
        <FinalCta />
      </main>
      <footer className="border-t border-landing-border bg-landing-bg-alt py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-landing-muted sm:flex-row sm:px-8 lg:px-10">
          <span className="font-semibold text-landing-ink">Piccos</span>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-landing-ink">
              Log in
            </Link>
            <Link href="/signup" className="hover:text-landing-ink">
              Get Started
            </Link>
          </div>
          <span>© {new Date().getFullYear()} Piccos.</span>
        </div>
      </footer>
    </div>
  );
}
