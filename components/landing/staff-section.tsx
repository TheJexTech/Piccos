import { Container, SectionHeading } from "./landing-shell";
import { Reveal } from "./reveal";
import { SectionCard } from "@/components/ui/section-card";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { sampleStaff } from "./sample-data";

const STAFF_STATUS = ["active", "active", "active", "inactive"] as const;

export function StaffSection() {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <Reveal className="order-2 lg:order-1">
            <SectionCard title="Staff" description="Team performance this month">
              <ul className="flex flex-col divide-y divide-border">
                {sampleStaff.map((s, i) => (
                  <li key={s.name} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <Avatar name={s.name} size="sm" />
                    <span className="flex-1 truncate text-sm font-medium text-ink">{s.name}</span>
                    <span className="text-sm text-ink">₦{s.total.toLocaleString()}</span>
                    <StatusBadge status={STAFF_STATUS[i] ?? "active"} />
                  </li>
                ))}
              </ul>
            </SectionCard>
          </Reveal>

          <Reveal delay={120} className="order-1 lg:order-2">
            <SectionHeading
              kicker="Staff"
              title="Know who's driving your business."
              description="See performance, sales and outlet assignment for every team member — not just totals for the whole salon."
            />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
