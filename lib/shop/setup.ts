// Shared "how far along is this shop's setup" logic — used by the guided
// checklist on the Shop overview page, the "next step" hints on the
// stations/staff/services pages, and Activity's staged setup messages.
// One priority order, defined once: stations -> staff -> services -> ready.

export type SetupStepKey = "stations" | "staff" | "services";

export type SetupCounts = {
  stations: number;
  staff: number;
  services: number;
};

export function getNextSetupStep(counts: SetupCounts): SetupStepKey | "ready" {
  if (counts.stations === 0) return "stations";
  if (counts.staff === 0) return "staff";
  if (counts.services === 0) return "services";
  return "ready";
}

export const SETUP_STEP_INFO: Record<SetupStepKey, { label: string; href: string }> = {
  stations: { label: "Add outlets", href: "/shop/outlets" },
  staff: { label: "Add staff", href: "/shop/staff" },
  services: { label: "Add services", href: "/shop/services" },
};
