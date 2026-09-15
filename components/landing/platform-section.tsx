import { Container, SectionHeading } from "./landing-shell";
import { Reveal } from "./reveal";

const BENEFITS = [
  {
    key: "shop",
    title: "Run your shop",
    description: "Manage your outlets, staff, services, products and supplies from one place.",
  },
  {
    key: "numbers",
    title: "Know your numbers",
    description: "See revenue, expenses and profit with a clear view of how your business is performing.",
  },
  {
    key: "insight",
    title: "Grow with insight",
    description: "Understand your best-performing staff, services and products and make smarter decisions.",
  },
];

export function PlatformSection() {
  return (
    <section id="platform" className="scroll-mt-24 py-20 sm:py-28">
      <Container>
        <SectionHeading
          kicker="The Platform"
          title="Everything your salon needs. Nothing you don't."
          align="center"
          className="mx-auto"
        />

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <Reveal key={b.key} delay={i * 100}>
              <div className="h-full rounded-2xl border border-landing-border bg-landing-surface p-7 shadow-sm shadow-black/20 transition-transform hover:-translate-y-1 sm:p-8">
                <h3 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-landing-ink sm:text-4xl">
                  {b.title}
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-landing-ink-secondary">{b.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
