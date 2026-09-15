import { Container } from "./landing-shell";
import { Reveal } from "./reveal";
import { AskIcon } from "@/components/ui/icons";

const SAMPLE_QUESTIONS = [
  "How much did we make this month?",
  "Which staff member sold the most this week?",
  "What are our biggest expenses right now?",
];

export function AskPiccosSection() {
  return (
    <section className="bg-landing-surface py-20 sm:py-28">
      <Container>
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-landing-accent">Ask Piccos</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-landing-ink sm:text-5xl">
              Your business has questions. Ask Piccos.
            </h2>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-landing-ink-secondary">
              Ask a question about your business in plain language and get an answer built only
              from your own recorded data — no digging through reports to find it yourself.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <div className="rounded-3xl border border-landing-border bg-landing-bg/60 p-6 backdrop-blur">
              <div className="flex flex-col gap-3">
                {SAMPLE_QUESTIONS.map((q) => (
                  <div
                    key={q}
                    className="flex items-center gap-3 rounded-2xl border border-landing-border bg-landing-bg/60 px-4 py-3.5"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-landing-accent/10 text-landing-accent">
                      <AskIcon className="size-4" />
                    </span>
                    <span className="text-sm text-landing-ink-secondary">{q}</span>
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
