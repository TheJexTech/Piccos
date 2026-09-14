import Link from "next/link";
import { getNextSetupStep, SETUP_STEP_INFO, type SetupCounts } from "@/lib/shop/setup";

export function SetupChecklist({ counts }: { counts: SetupCounts }) {
  const nextStep = getNextSetupStep(counts);

  const steps = [
    { key: "details" as const, label: "Shop details", href: "/shop/details", done: true },
    { key: "stations" as const, label: SETUP_STEP_INFO.stations.label, href: SETUP_STEP_INFO.stations.href, done: counts.stations > 0 },
    { key: "staff" as const, label: SETUP_STEP_INFO.staff.label, href: SETUP_STEP_INFO.staff.href, done: counts.staff > 0 },
    { key: "services" as const, label: SETUP_STEP_INFO.services.label, href: SETUP_STEP_INFO.services.href, done: counts.services > 0 },
    // Whether a sale has actually been recorded isn't tracked here — this
    // step is "done" in the sense of "unlocked," and becomes the
    // highlighted next action once the three steps above it are complete.
    { key: "activity" as const, label: "Start recording activity", href: "/activity", done: false },
  ];

  return (
    <div className="mb-8 rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-sm font-medium text-black dark:text-zinc-50">Get your shop ready</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {steps.map((step) => {
          const isNext =
            step.key === nextStep || (nextStep === "ready" && step.key === "activity");
          return (
            <li key={step.key}>
              <Link
                href={step.href}
                className={
                  "flex items-center gap-2 text-sm " +
                  (isNext
                    ? "font-medium text-black dark:text-zinc-50"
                    : step.done
                      ? "text-zinc-500 dark:text-zinc-400"
                      : "text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50")
                }
              >
                <span aria-hidden>{step.done ? "✓" : "○"}</span>
                <span>{step.label}</span>
                {isNext && <span className="text-xs text-zinc-500 dark:text-zinc-400">← next</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
