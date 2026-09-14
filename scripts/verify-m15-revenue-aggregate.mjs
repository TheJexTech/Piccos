// One-off verification script for revenue aggregation across individual
// transactions AND batch activity (Correction 8: must not double-count,
// tips must stay separate from revenue).
//
// This re-derives the same totals getRevenueSummary() computes (transactions
// sum + active batch_services line_total sum) directly against the live
// data, since that's the actual risk surface — a plain Node script can't
// import the TypeScript helper directly without a build step, matching how
// every other verify-*.mjs script in this repo checks the underlying data
// model rather than importing application code.
//
// Usage: node scripts/verify-m15-revenue-aggregate.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnvLocal() {
  const content = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

const env = loadEnvLocal();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const suffix = Date.now();
let failures = 0;
function check(label, condition) {
  console.log(`  ${condition ? "✓" : "✗"} ${label}`);
  if (!condition) failures++;
}

async function newSignedInClient(email) {
  const creds = { email, password: "TestPassword123!" };
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await client.auth.signUp(creds);
  const { error, data } = await client.auth.signInWithPassword(creds);
  if (error) throw new Error(`signIn(${email}) failed: ${error.message}`);
  return { client, userId: data.user.id };
}

async function main() {
  console.log("Setting up a shop with a mix of individual + batch activity...");
  const owner = await newSignedInClient(`piccos.m15.revenue.${suffix}@example.com`);
  const { data: shop } = await owner.client.rpc("create_business_with_owner", { p_name: `M15 Revenue Shop ${suffix}` });

  const { data: service } = await owner.client
    .from("services")
    .insert({ business_id: shop.id, name: "Haircut", price: 3000 })
    .select()
    .single();
  const { data: staff } = await owner.client
    .from("staff")
    .insert({ business_id: shop.id, display_name: "Barber" })
    .select()
    .single();

  // Individual transaction: 3000 revenue + 500 tip.
  await owner.client.from("transactions").insert({
    business_id: shop.id,
    staff_id: staff.id,
    service_id: service.id,
    service_name: service.name,
    service_price: service.price,
    amount: 3000,
    payment_method: "cash",
    tip_amount: 500,
    tip_payment_method: "cash",
  });

  // Active batch: 10 haircuts = 30000 revenue + 1000 tip.
  const { data: activeBatch, error: activeBatchError } = await owner.client.rpc("record_batch_activity", {
    p_business_id: shop.id,
    p_staff_id: staff.id,
    p_batch_date: null,
    p_services: [{ service_id: service.id, quantity: 10 }],
    p_tip_amount: 1000,
  });
  check("Active batch recorded successfully", !activeBatchError && activeBatch);

  // A second batch that gets voided — must be excluded from every total.
  const { data: voidedBatch } = await owner.client.rpc("record_batch_activity", {
    p_business_id: shop.id,
    p_staff_id: staff.id,
    p_batch_date: null,
    p_services: [{ service_id: service.id, quantity: 100 }], // would be 300000 if counted
    p_tip_amount: 9999,
  });
  await owner.client.rpc("void_batch", { p_batch_id: voidedBatch.id, p_reason: "test voided batch exclusion" });

  console.log("\n=== Revenue aggregation ===");
  const { data: transactions } = await owner.client.from("transactions").select("amount, tip_amount").eq("business_id", shop.id);
  const { data: activeBatches } = await owner.client
    .from("batches")
    .select("id, tip_amount")
    .eq("business_id", shop.id)
    .eq("status", "active");
  const { data: batchLines } = await owner.client
    .from("batch_services")
    .select("quantity, line_total, batches!inner(status)")
    .eq("business_id", shop.id)
    .eq("batches.status", "active");

  const txRevenue = (transactions ?? []).reduce((s, t) => s + Number(t.amount), 0);
  const batchRevenue = (batchLines ?? []).reduce((s, l) => s + Number(l.line_total), 0);
  const totalRevenue = txRevenue + batchRevenue;

  const txTips = (transactions ?? []).reduce((s, t) => s + Number(t.tip_amount), 0);
  const batchTips = (activeBatches ?? []).reduce((s, b) => s + Number(b.tip_amount), 0);
  const totalTips = txTips + batchTips;

  const servicesPerformed = (transactions ?? []).length + (batchLines ?? []).reduce((s, l) => s + l.quantity, 0);

  check("Individual transaction revenue is 3000", txRevenue === 3000);
  check("Active batch revenue is exactly 30000 (10 x 3000, one row — not double-counted)", batchRevenue === 30000);
  check("Voided batch's 100 haircuts (300000) are excluded entirely", totalRevenue === 33000);
  check("Total revenue = transactions + active batches, summed exactly once", totalRevenue === 33000);

  check("Tips (500 + 1000) never appear inside the revenue total", totalTips === 1500 && totalRevenue === 33000);
  check("Voided batch's tip (9999) is excluded from the tip total", totalTips === 1500);

  check("Services performed = 1 individual + 10 batch quantity = 11 (not 2 rows)", servicesPerformed === 11);

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\nScript error:", err.message);
  process.exit(1);
});
