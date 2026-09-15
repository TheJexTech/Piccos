import { MetricCard } from "@/components/ui/metric-card";
import { SectionCard } from "@/components/ui/section-card";
import { TrendChart, BreakdownBars } from "@/components/ui/chart";
import { Avatar } from "@/components/ui/avatar";
import { OutletsIcon, ChevronDownIcon } from "@/components/ui/icons";
import { sampleMetrics, sampleTrend, sampleStaff, sampleOutlets } from "./sample-data";

function SunIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="8" cy="8" r="3.2" fill="currentColor" />
      <path
        d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.7 3.3l-1.1 1.1M4.4 11.6l-1.1 1.1M12.7 12.7l-1.1-1.1M4.4 4.4 3.3 3.3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M13.5 9.8A5.8 5.8 0 0 1 6.2 2.5a5.8 5.8 0 1 0 7.3 7.3Z"
        fill="currentColor"
      />
    </svg>
  );
}

// Purely decorative — the showcase itself is a static mockup (see below),
// so this doesn't switch anything. It exists so the mockup visually
// communicates that the product supports both, matching how the browser
// chrome above it is also just a picture of a URL bar, not a real one.
function ThemeToggle() {
  return (
    <span className="ml-auto hidden items-center gap-0.5 rounded-full border border-border-strong bg-app-bg p-1 sm:flex">
      <span className="flex size-5 items-center justify-center rounded-full bg-ink text-surface">
        <SunIcon className="size-3" />
      </span>
      <span className="flex size-5 items-center justify-center rounded-full text-muted">
        <MoonIcon className="size-3" />
      </span>
    </span>
  );
}

// A static mockup of the real Piccos dashboard — reuses the exact same
// component library the authenticated app renders with
// (components/ui/metric-card.tsx, section-card.tsx, chart.tsx, avatar.tsx),
// populated with clearly fictional sample data. Not a live query — this
// page is public and unauthenticated.
//
// Deliberately stays in the light app palette even though the landing page
// around it is now black — the contrast is the point (this is literally
// what the real, light-themed dashboard looks like), so only the outer
// shadow/ring are tuned here to make it pop off a dark page.
export function DashboardShowcase() {
  return (
    // id is a scroll-position hook for the nav's liquid transition
    // (components/landing/landing-nav.tsx) — purely a DOM marker, doesn't
    // affect this component's rendering or content.
    <div
      id="dashboard-showcase"
      className="showcase-warm overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl shadow-black/60 ring-1 ring-white/10"
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-app-bg px-5 py-3.5">
        <span className="size-2.5 rounded-full bg-tan" />
        <span className="size-2.5 rounded-full bg-tan" />
        <span className="size-2.5 rounded-full bg-tan" />
        <span className="ml-3 flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs text-muted">
          <OutletsIcon className="size-3" />
          app.piccos.co/dashboard
        </span>
        <ThemeToggle />
      </div>

      <div className="bg-app-bg p-5 sm:p-8">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-ink">Dashboard</p>
          <div className="hidden items-center gap-1.5 rounded-full border border-border-strong bg-surface px-3 py-1.5 text-xs text-ink-secondary sm:flex">
            <OutletsIcon className="size-3.5" />
            All Outlets
            <ChevronDownIcon className="size-3" />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <MetricCard
            label="Total Revenue"
            value={sampleMetrics.totalRevenue}
            trend={{ direction: "up", label: "+12%" }}
          />
          <MetricCard
            label="Service Revenue"
            value={sampleMetrics.serviceRevenue}
            trend={{ direction: "up", label: "+8%" }}
          />
          <MetricCard
            label="Product Sales"
            value={sampleMetrics.productSales}
            trend={{ direction: "up", label: "+24%" }}
          />
          <MetricCard
            label="Estimated Profit"
            value={sampleMetrics.estimatedProfit}
            trend={{ direction: "up", label: "+15%" }}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionCard
              title="Revenue trend"
              description="This month, by day"
              actions={
                <span className="hidden items-center gap-1 rounded-full border border-border-strong bg-surface px-3 py-1.5 text-xs text-ink-secondary sm:flex">
                  This Month
                  <ChevronDownIcon className="size-3" />
                </span>
              }
            >
              <TrendChart data={sampleTrend} formatValue={(n) => `₦${n}k`} />
            </SectionCard>
          </div>
          <SectionCard title="Best Performing Staff" description="This month">
            <ul className="flex flex-col gap-3">
              {sampleStaff.map((s, i) => (
                <li key={s.name} className="flex items-center gap-3">
                  <span className="w-4 text-xs font-medium text-muted">{i + 1}</span>
                  <Avatar name={s.name} size="sm" />
                  <span className="flex-1 truncate text-sm text-ink">{s.name}</span>
                  <span className="text-sm font-medium text-ink">₦{s.total.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <div className="mt-4 hidden sm:block">
          <SectionCard title="Outlets">
            <BreakdownBars
              data={sampleOutlets.map((o, i) => ({ label: o.name, total: [210000, 158000, 114500][i] ?? 90000 }))}
              formatValue={(n) => `₦${n.toLocaleString()}`}
            />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
