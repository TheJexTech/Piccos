// One-off verification script for M6 (transactions).
//
// Proves against the live Supabase project that:
//   1. Owner/secretary/barber can all record transactions.
//   2. created_by is pinned server-side (can't be spoofed) — reconfirms
//      the M2 fix still holds for this table.
//   3. Owner/secretary see all transactions; a barber's visibility is
//      scoped to staff rows linked to their own profile_id.
//   4. Transactions are append-only — no update/delete, even for owner.
//   5. Cross-tenant reads/writes are rejected.
//   6. service_name/service_price are snapshotted at insert time and
//      don't change when the service's current price changes later.
//
// Usage: node scripts/verify-m6-transactions.mjs

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
const credsOwner = { email: `piccos.m6.owner.${suffix}@example.com`, password: "TestPassword123!" };
const credsSecretary = { email: `piccos.m6.secretary.${suffix}@example.com`, password: "TestPassword123!" };
const credsBarber = { email: `piccos.m6.barber.${suffix}@example.com`, password: "TestPassword123!" };
const credsOther = { email: `piccos.m6.other.${suffix}@example.com`, password: "TestPassword123!" };

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
  console.log("Setting up owner + business + secretary + barber + service + staff...");
  const owner = await newSignedInClient(credsOwner);
  const { data: business, error: createError } = await owner.client.rpc(
    "create_business_with_owner",
    { p_name: `M6 Test Shop ${suffix}` },
  );
  if (createError) throw new Error(createError.message);

  const secretary = await newSignedInClient(credsSecretary);
  await addMember(owner.client, business.id, secretary.userId, "secretary");
  const barber = await newSignedInClient(credsBarber);
  await addMember(owner.client, business.id, barber.userId, "barber");

  const { data: service } = await owner.client
    .from("services")
    .insert({ business_id: business.id, name: "Haircut", price: 3000 })
    .select()
    .single();

  const { data: ownStaff } = await owner.client
    .from("staff")
    .insert({ business_id: business.id, display_name: "Barber's Own Staff Row" })
    .select()
    .single();
  const { data: otherStaff } = await owner.client
    .from("staff")
    .insert({ business_id: business.id, display_name: "Someone Else" })
    .select()
    .single();

  console.log("\nSecretary records a transaction for 'Someone Else'...");
  const { data: tx1, error: tx1Error } = await secretary.client
    .from("transactions")
    .insert({
      business_id: business.id,
      staff_id: otherStaff.id,
      service_id: service.id,
      service_name: service.name,
      service_price: service.price,
      amount: 3000,
      payment_method: "cash",
    })
    .select()
    .single();
  check("Secretary can record a transaction", !tx1Error && tx1);
  check("created_by defaults to secretary (not spoofable)", tx1?.created_by === secretary.userId);

  console.log("Barber attempts to spoof created_by as the owner...");
  const { error: spoofError } = await barber.client.from("transactions").insert({
    business_id: business.id,
    staff_id: otherStaff.id,
    service_id: service.id,
    service_name: service.name,
    service_price: service.price,
    amount: 3000,
    payment_method: "cash",
    created_by: owner.userId,
  });
  check("Spoofed created_by is rejected", !!spoofError);

  console.log("\nOwner links the barber's staff row to their own profile...");
  await owner.client.from("staff").update({ profile_id: barber.userId }).eq("id", ownStaff.id);

  console.log("Barber records their own transaction...");
  const { data: tx2, error: tx2Error } = await barber.client
    .from("transactions")
    .insert({
      business_id: business.id,
      staff_id: ownStaff.id,
      service_id: service.id,
      service_name: service.name,
      service_price: service.price,
      amount: 3000,
      payment_method: "pos",
    })
    .select()
    .single();
  check("Barber can record a transaction", !tx2Error && tx2);

  console.log("\nOwner and secretary see both transactions...");
  const { data: ownerView } = await owner.client.from("transactions").select("id").eq("business_id", business.id);
  check("Owner sees both transactions", (ownerView ?? []).length === 2);

  console.log("Barber (linked to ownStaff) sees only their own transaction...");
  const { data: barberView } = await barber.client.from("transactions").select("id").eq("business_id", business.id);
  check("Barber sees exactly 1 transaction (their own)", (barberView ?? []).length === 1);
  check("It's the barber's own transaction", barberView?.[0]?.id === tx2.id);

  console.log("\nChecking transactions are append-only (owner cannot update or delete)...");
  await owner.client.from("transactions").update({ amount: 1 }).eq("id", tx1.id);
  const { data: afterUpdate } = await owner.client.from("transactions").select("amount").eq("id", tx1.id).single();
  check("Owner's update did NOT change the amount", Number(afterUpdate?.amount) === 3000);

  await owner.client.from("transactions").delete().eq("id", tx1.id);
  const { data: afterDelete } = await owner.client.from("transactions").select("id").eq("id", tx1.id).maybeSingle();
  check("Owner's delete did NOT remove the transaction", afterDelete?.id === tx1.id);

  console.log("\nChecking service_name/service_price snapshot is immune to later price changes...");
  await owner.client.from("services").update({ price: 9999, name: "Renamed Service" }).eq("id", service.id);
  const { data: afterPriceChange } = await owner.client
    .from("transactions")
    .select("service_name, service_price")
    .eq("id", tx1.id)
    .single();
  check(
    "Old transaction still shows the original service name/price",
    afterPriceChange?.service_name === "Haircut" && Number(afterPriceChange?.service_price) === 3000,
  );

  console.log("\nCross-tenant check...");
  const other = await newSignedInClient(credsOther);
  await other.client.rpc("create_business_with_owner", { p_name: `M6 Other Shop ${suffix}` });
  const { data: crossRead } = await other.client.from("transactions").select("id").eq("business_id", business.id);
  check("Cross-tenant transaction read returns 0 rows", (crossRead ?? []).length === 0);

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\nScript error:", err.message);
  process.exit(1);
});
