// One-off verification script for M9's timezone boundary math
// (lib/dashboard/timezone.ts). This is pure-function logic, not a
// database concern, so it's tested directly rather than against
// Supabase — but it's the one genuinely new piece of logic in M9 (the
// dashboard's other correctness — RLS scoping, role gating — is already
// covered by earlier milestones' scripts).
//
// The interesting case: a UTC instant can fall on a different calendar
// day than the business's local time (e.g. 23:30 UTC is already past
// midnight in Africa/Lagos, UTC+1). Naive UTC-based "today" math would
// get this wrong.
//
// Usage: node scripts/verify-m9-timezone.mjs

import { getBusinessDateRanges } from "../lib/dashboard/timezone.ts";

let failures = 0;
function check(label, condition) {
  console.log(`  ${condition ? "✓" : "✗"} ${label}`);
  if (!condition) failures++;
}

console.log("Case 1: Africa/Lagos (UTC+1), instant just before local midnight rollover...");
const r1 = getBusinessDateRanges("Africa/Lagos", new Date("2026-09-12T23:30:00Z"));
// 23:30 UTC + 1h = 00:30 local on the 13th — "today" should be the 13th.
check("todayDateStr is the 13th (local day, not UTC day)", r1.todayDateStr === "2026-09-13");
check("startOfDay is midnight Lagos time (23:00 UTC on the 12th)", r1.startOfDay.toISOString() === "2026-09-12T23:00:00.000Z");
check("startOfNextDay is 24h later", r1.startOfNextDay.getTime() - r1.startOfDay.getTime() === 24 * 60 * 60 * 1000);
check("startOfMonthDateStr is the 1st", r1.startOfMonthDateStr === "2026-09-01");
check(
  "startOfMonth is midnight Sep 1 Lagos time (Aug 31 23:00 UTC)",
  r1.startOfMonth.toISOString() === "2026-08-31T23:00:00.000Z",
);

console.log("\nCase 2: UTC (zero offset) — local day should match UTC day exactly...");
const r2 = getBusinessDateRanges("UTC", new Date("2026-01-15T12:00:00Z"));
check("todayDateStr matches the UTC date", r2.todayDateStr === "2026-01-15");
check("startOfDay is midnight UTC", r2.startOfDay.toISOString() === "2026-01-15T00:00:00.000Z");

console.log("\nCase 3: Africa/Nairobi (UTC+3), month boundary rollover...");
// 2026-03-01 00:30 UTC = 03:30 local on Mar 1 — still March locally,
// but close enough to the boundary to be a good regression check.
const r3 = getBusinessDateRanges("Africa/Nairobi", new Date("2026-03-01T00:30:00Z"));
check("todayDateStr is March 1st", r3.todayDateStr === "2026-03-01");
check("startOfLastMonth is Feb 1st local (Jan 31 21:00 UTC)", r3.startOfLastMonth.toISOString() === "2026-01-31T21:00:00.000Z");
check("startOfMonth is Mar 1st local (Feb 28 21:00 UTC)", r3.startOfMonth.toISOString() === "2026-02-28T21:00:00.000Z");

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
