import Link from "next/link";
import { getNextSetupStep, SETUP_STEP_INFO, type SetupCounts } from "@/lib/shop/setup";

// Shown under the Shop sub-nav on outlets/staff/services so a new owner
// always has a clear next action, without removing the tabs used to
// manage things once the shop is already set up.
export function NextStepHint({ counts }: { counts: SetupCounts }) {
  const nextStep = getNextSetupStep(counts);

  if (nextStep === "ready") {
    return (
      <p className="mb-6 text-sm text-muted">
        Your shop is set up — head to{" "}
        <Link href="/activity" className="font-medium text-brown-700 underline">
          Activity
        </Link>{" "}
        to start recording sales.
      </p>
    );
  }

  const step = SETUP_STEP_INFO[nextStep];
  return (
    <p className="mb-6 text-sm text-muted">
      Next step:{" "}
      <Link href={step.href} className="font-medium text-brown-700 underline">
        {step.label}
      </Link>
    </p>
  );
}
