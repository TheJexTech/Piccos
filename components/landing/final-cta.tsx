import { Container, PrimaryCta, SecondaryCta } from "./landing-shell";
import { Reveal } from "./reveal";

export function FinalCta() {
  return (
    <section className="bg-landing-bg py-24 sm:py-32">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-semibold tracking-tight text-landing-ink sm:text-5xl">
            Your shop is more than a salon. It&apos;s a business.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-landing-ink-secondary">
            Run it with clarity. Understand your numbers. Grow with confidence.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PrimaryCta href="/signup">Get Started</PrimaryCta>
            <SecondaryCta href="#platform">See How Piccos Works</SecondaryCta>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
