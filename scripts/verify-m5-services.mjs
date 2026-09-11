// One-off verification script for M5 (services).
//
// Proves against the live Supabase project that:
//   1. Owner/secretary can create and edit services (including price).
//   2. A barber can read services (needs to know prices) but not manage them.
//   3. Only the owner can delete a service.
//   4. Cross-tenant reads/writes are rejected.
//
// Usage: node scripts/verify-m5-services.mjs

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
const credsOwner = { email: `piccos.m5.owner.${suffix}@example.com`, password: "TestPassword123!" };
const credsSecretary = { email: `piccos.m5.secretary.${suffix}@example.com`, password: "TestPassword123!" };
const credsBarber = { email: `piccos.m5.barber.${suffix}@example.com`, password: "TestPassword123!" };
const credsOther = { email: `piccos.m5.other.${suffix}@example.com`, password: "TestPassword123!" };

let failures = 0;
function check(label, condition) {
  console.log(`  ${condition ? "✓" : "✗"} ${label}`);
  if (!condition) failures++;
}

async function newSignedInClient(creds) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await client.auth.signUp(creds);
  const { error, data } = await client.auth.signInWithPassword(creds);
  if (error) throw new Error(`signIn(${creds.email}) failed: ${error.message}`);
  return { client, userId: data.user.id };
}

async function addMember(ownerClient, businessId, userId, role) {
  await ownerClient.from("business_members").insert({ business_id: businessId, user_id: userId, role, status: "active" });
}

async function main() {
  console.log("Setting up owner + business + secretary + barber...");
  const owner = await newSignedInClient(credsOwner);
  const { data: business, error: createError } = await owner.client.rpc(
    "create_business_with_owner",
    { p_name: `M5 Test Shop ${suffix}` },
  );
  if (createError) throw new Error(createError.message);

  const secretary = await newSignedInClient(credsSecretary);
  await addMember(owner.client, business.id, secretary.userId, "secretary");
  const barber = await newSignedInClient(credsBarber);
  await addMember(owner.client, business.id, barber.userId, "barber");

  console.log("\nSecretary creates a service...");
  const { data: service, error: createServiceError } = await secretary.client
    .from("services")
    .insert({ business_id: business.id, name: "Haircut", price: 3000 })
    .select()
    .single();
  check("Secretary can create a service", !createServiceError && service);
  if (createServiceError) console.error("  ", createServiceError.message);

  console.log("Secretary updates the price...");
  const { error: priceUpdateError } = await secretary.client
    .from("services")
    .update({ price: 3500 })
    .eq("id", service.id);
  check("Secretary can update the price", !priceUpdateError);

  console.log("\nBarber reads the service (needs to know prices)...");
  const { data: barberRead } = await barber.client
    .from("services")
    .select("id, price")
    .eq("id", service.id)
    .maybeSingle();
  check("Barber can see the service", barberRead?.id === service.id);
  check("Barber sees the updated price", Number(barberRead?.price) === 3500);

  console.log("Barber attempts to create a service (should fail)...");
  const { error: barberCreateError } = await barber.client
    .from("services")
    .insert({ business_id: business.id, name: "Rogue Service", price: 1 });
  check("Barber CANNOT create a service", !!barberCreateError);

  console.log("Secretary attempts to delete the service (should fail — owner only)...");
  await secretary.client.from("services").delete().eq("id", service.id);
  const { data: stillThere } = await owner.client.from("services").select("id").eq("id", service.id).maybeSingle();
  check("Secretary's delete did NOT remove the service (RLS blocked it)", stillThere?.id === service.id);

  console.log("Owner deletes the service (should succeed)...");
  const { error: ownerDeleteError } = await owner.client.from("services").delete().eq("id", service.id);
  check("Owner CAN delete the service", !ownerDeleteError);

  console.log("\nCross-tenant check: unrelated owner cannot see or create in this business...");
  const other = await newSignedInClient(credsOther);
  await other.client.rpc("create_business_with_owner", { p_name: `M5 Other Shop ${suffix}` });
  const { data: crossRead } = await other.client.from("services").select("id").eq("business_id", business.id);
  check("Cross-tenant service read returns 0 rows", (crossRead ?? []).length === 0);
  const { error: crossInsertError } = await other.client
    .from("services")
    .insert({ business_id: business.id, name: "Intruder Service", price: 1 });
  check("Cross-tenant service insert is rejected", !!crossInsertError);

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\nScript error:", err.message);
  process.exit(1);
});
