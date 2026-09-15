import { Container, SectionHeading } from "./landing-shell";
import { Reveal } from "./reveal";
import { OutletsIcon } from "@/components/ui/icons";
import { sampleOutlets } from "./sample-data";

const OUTLET_STATS = [
  { staff: 6, revenue: "₦210,000" },
  { staff: 4, revenue: "₦158,000" },
  { staff: 3, revenue: "₦114,500" },
];

export function OutletsSection() {
  return (
    <section className="bg-landing-bg py-20 sm:py-28">
      <Container>
        <SectionHeading
          kicker="Multi-Outlet"
          title="One business. Every outlet."
          align="center"
          className="mx-auto"
          description="See and manage every location your salon operates from — without losing the connection between them."
        />

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {sampleOutlets.map((o, i) => (
            <Reveal key={o.id} delay={i * 100}>
              <div className="rounded-2xl border border-landing-border bg-landing-surface p-7 shadow-sm shadow-black/20">
                <span className="flex size-11 items-center justify-center rounded-xl bg-landing-accent/10 text-landing-accent">
                  <OutletsIcon className="size-5" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-landing-ink">{o.name}</h3>
                <div className="mt-4 flex items-center justify-between border-t border-landing-border pt-4 text-sm">
                  <span className="text-landing-muted">{OUTLET_STATS[i]?.staff} staff</span>
                  <span className="font-medium text-landing-ink">{OUTLET_STATS[i]?.revenue}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
