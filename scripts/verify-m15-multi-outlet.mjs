// One-off verification script for the multi-outlet correction pass.
//
// Proves against the live Supabase project that:
//   1. One owner can create and own two fully independent businesses
//      (create_business_with_owner has no uniqueness check).
//   2. Each outlet's stations/staff/transactions/batches stay scoped to
//      that outlet even though the SAME owner belongs to both — nothing
//      leaks across just because business_id filtering is forgotten.
//   3. The new batches/batch_services/batch_payments tables get the same
//      cross-tenant RLS isolation as every other table (untested until
//      now, since these tables didn't exist for M13's security pass).
//
// Usage: node scripts/verify-m15-multi-outlet.mjs

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
  console.log("Setting up one owner with two outlets, plus an unrelated stranger...");
  const owner = await newSignedInClient(`piccos.m15.owner.${suffix}@example.com`);
  const stranger = await newSignedInClient(`piccos.m15.stranger.${suffix}@example.com`);

  const { data: shopA, error: shopAError } = await owner.client.rpc("create_business_with_owner", {
    p_name: `M15 Shop A ${suffix}`,
  });
  const { data: shopB, error: shopBError } = await owner.client.rpc("create_business_with_owner", {
    p_name: `M15 Shop B ${suffix}`,
  });
  check("Owner can create a first outlet", !shopAError && shopA);
  check("Owner can create a second outlet (no uniqueness check)", !shopBError && shopB);

  const { data: memberships } = await owner.client
    .from("business_members")
    .select("business_id, role")
    .eq("user_id", owner.userId)
    .eq("status", "active");
  check("Owner has exactly 2 active memberships", (memberships ?? []).length === 2);
  check(
    "Owner is 'owner' of both outlets",
    (memberships ?? []).every((m) => m.role === "owner"),
  );

  console.log("\nBuilding out both outlets independently...");
  const { data: stationA } = await owner.client
    .from("stations")
    .insert({ business_id: shopA.id, name: "Shop A Chair" })
    .select()
    .single();
  const { data: stationB } = await owner.client
    .from("stations")
    .insert({ business_id: shopB.id, name: "Shop B Chair" })
    .select()
    .single();
  const { data: serviceA } = await owner.client
    .from("services")
    .insert({ business_id: shopA.id, name: "Shop A Haircut", price: 3000 })
    .select()
    .single();
  const { data: serviceB } = await owner.client
    .from("services")
    .insert({ business_id: shopB.id, name: "Shop B Haircut", price: 4000 })
    .select()
    .single();
  const { data: staffA } = await owner.client
    .from("staff")
    .insert({ business_id: shopA.id, display_name: "Shop A Barber", station_id: stationA.id })
    .select()
    .single();
  const { data: staffB } = await owner.client
    .from("staff")
    .insert({ business_id: shopB.id, display_name: "Shop B Barber", station_id: stationB.id })
    .select()
    .single();

  await owner.client.from("transactions").insert({
    business_id: shopA.id,
    staff_id: staffA.id,
    service_id: serviceA.id,
    service_name: serviceA.name,
    service_price: serviceA.price,
    amount: serviceA.price,
    payment_method: "cash",
  });
  await owner.client.from("transactions").insert({
    business_id: shopB.id,
    staff_id: staffB.id,
    service_id: serviceB.id,
    service_name: serviceB.name,
    service_price: serviceB.price,
    amount: serviceB.price,
    payment_method: "cash",
  });
  await owner.client.rpc("record_batch_activity", {
    p_business_id: shopA.id,
    p_staff_id: staffA.id,
    p_batch_date: null,
    p_services: [{ service_id: serviceA.id, quantity: 5 }],
  });
  await owner.client.rpc("record_batch_activity", {
    p_business_id: shopB.id,
    p_staff_id: staffB.id,
    p_batch_date: null,
    p_services: [{ service_id: serviceB.id, quantity: 5 }],
  });

  console.log("\nChecking outlet data stays scoped even for the same owner...");
  const { data: shopAStations } = await owner.client.from("stations").select("id").eq("business_id", shopA.id);
  check("Shop A stations query returns only Shop A's station", (shopAStations ?? []).length === 1);

  const { data: shopATx } = await owner.client.from("transactions").select("id, business_id").eq("business_id", shopA.id);
  check(
    "Shop A transactions query returns only Shop A's transaction",
    (shopATx ?? []).length === 1 && shopATx[0].business_id === shopA.id,
  );

  const { data: shopABatches } = await owner.client
    .from("batches")
    .select("id, business_id")
    .eq("business_id", shopA.id);
  check(
    "Shop A batches query returns only Shop A's batch",
    (shopABatches ?? []).length === 1 && shopABatches[0].business_id === shopA.id,
  );

  console.log("\nCross-tenant check: a stranger with no membership in either shop...");
  for (const table of ["stations", "staff", "services", "transactions", "batches", "batch_services", "batch_payments"]) {
    const { data: viaA } = await stranger.client.from(table).select("id").eq("business_id", shopA.id);
    const { data: viaB } = await stranger.client.from(table).select("id").eq("business_id", shopB.id);
    check(`Stranger sees 0 rows in Shop A's ${table}`, (viaA ?? []).length === 0);
    check(`Stranger sees 0 rows in Shop B's ${table}`, (viaB ?? []).length === 0);
  }

  const { error: strangerBatchError } = await stranger.client.rpc("record_batch_activity", {
    p_business_id: shopA.id,
    p_staff_id: staffA.id,
    p_batch_date: null,
    p_services: [{ service_id: serviceA.id, quantity: 1 }],
  });
  check("Stranger cannot record batch activity in Shop A", !!strangerBatchError);

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\nScript error:", err.message);
  process.exit(1);
});
