import { Container, SectionHeading } from "./landing-shell";
import { Reveal } from "./reveal";
import { sampleMetrics, sampleExpenseBreakdown } from "./sample-data";

const FLOW = [
  { label: "Revenue", value: sampleMetrics.totalRevenue },
  { label: "Expenses", value: `₦${sampleExpenseBreakdown.reduce((s, e) => s + e.total, 0).toLocaleString()}` },
  { label: "Estimated Profit", value: sampleMetrics.estimatedProfit },
];

export function FinancialSection() {
  return (
    <section className="bg-landing-bg-alt py-20 sm:py-28">
      <Container>
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <SectionHeading
              kicker="Financial Visibility"
              title="Know where your money is going."
              description="Piccos gives you a clear financial picture of your business — what came in, what went out, and what's left."
            />
            <p className="mt-6 max-w-md text-base leading-relaxed text-landing-ink-secondary">
              Record how your customers paid — cash, POS or bank transfer — while keeping your
              existing payment system exactly as it is. Piccos doesn&apos;t process payments; it
              keeps the record straight so you always know where you stand.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <div className="rounded-3xl border border-landing-border bg-landing-surface p-8 shadow-sm shadow-black/20">
              <div className="flex flex-col gap-6">
                {FLOW.map((step, i) => (
                  <div key={step.label}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-landing-ink-secondary">{step.label}</p>
                      <p className="text-2xl font-semibold text-landing-ink">{step.value}</p>
                    </div>
                    {i < FLOW.length - 1 && (
                      <div className="mt-6 flex justify-center text-landing-accent">
                        <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                          <path d="M8 0v16M2 12l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
