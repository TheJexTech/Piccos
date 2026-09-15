import { Container, PrimaryCta, SecondaryCta } from "./landing-shell";
import { DashboardShowcase } from "./dashboard-showcase";
import { Reveal } from "./reveal";

function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M3.5 8h9m0 0L8.5 4m4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 5.5v5l4-2.5-4-2.5Z" fill="currentColor" />
    </svg>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-16 sm:pb-28 sm:pt-24">
      {/* Soft warm atmosphere on the black background — restrained on
          purpose: one wide wash behind the headline plus two faint offset
          blooms, never a loud gradient. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[radial-gradient(ellipse_at_top,var(--color-landing-accent)_0%,transparent_60%)] opacity-[0.14]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-16 -z-10 size-[28rem] rounded-full bg-[radial-gradient(circle,var(--color-landing-accent)_0%,transparent_70%)] opacity-[0.08] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-64 -z-10 size-[24rem] rounded-full bg-[radial-gradient(circle,var(--color-landing-accent-strong)_0%,transparent_70%)] opacity-[0.08] blur-3xl"
      />
      <Container>
        <Reveal className="mx-auto max-w-3xl text-center">
          <h1 className="text-5xl font-semibold tracking-tight text-landing-ink sm:text-6xl lg:text-7xl">
            Run your Salon with
            <br />
            <span className="text-landing-accent">Intelligence.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-landing-ink-secondary sm:text-xl">
            Piccos gives you one simple place to manage your salon, understand your numbers and
            make better business decisions.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PrimaryCta href="/signup" className="gap-2">
              Get Started
              <ArrowIcon className="size-4" />
            </PrimaryCta>
            <SecondaryCta href="#platform" className="gap-2">
              <PlayIcon className="size-4" />
              See How Piccos Works
            </SecondaryCta>
          </div>
        </Reveal>

        <Reveal delay={150} className="mt-16 sm:mt-20">
          <DashboardShowcase />
        </Reveal>
      </Container>
    </section>
  );
}
