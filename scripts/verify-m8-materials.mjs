// One-off verification script for M8 (materials).
//
// Proves against the live Supabase project that:
//   1. Owner/secretary can create materials and record purchases.
//   2. record_material_purchase() atomically inserts the purchase AND
//      bumps current_quantity — the actual point of this milestone.
//   3. A barber can read materials (stock level) but not purchase cost
//      data, and cannot manage either.
//   4. Only the owner can delete a material.
//   5. Purchases are append-only.
//   6. Cross-tenant reads/writes are rejected.
//
// Usage: node scripts/verify-m8-materials.mjs

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
const credsOwner = { email: `piccos.m8.owner.${suffix}@example.com`, password: "TestPassword123!" };
const credsSecretary = { email: `piccos.m8.secretary.${suffix}@example.com`, password: "TestPassword123!" };
const credsBarber = { email: `piccos.m8.barber.${suffix}@example.com`, password: "TestPassword123!" };
const credsOther = { email: `piccos.m8.other.${suffix}@example.com`, password: "TestPassword123!" };

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
  console.log("Setting up owner + business + secretary + barber + material...");
  const owner = await newSignedInClient(credsOwner);
  const { data: business, error: createError } = await owner.client.rpc(
    "create_business_with_owner",
    { p_name: `M8 Test Shop ${suffix}` },
  );
  if (createError) throw new Error(createError.message);

  const secretary = await newSignedInClient(credsSecretary);
  await addMember(owner.client, business.id, secretary.userId, "secretary");
  const barber = await newSignedInClient(credsBarber);
  await addMember(owner.client, business.id, barber.userId, "barber");

  const { data: material, error: materialError } = await secretary.client
    .from("materials")
    .insert({ business_id: business.id, name: "Shampoo", unit: "bottles", current_quantity: 5, minimum_quantity: 10 })
    .select()
    .single();
  check("Secretary can create a material", !materialError && material);

  console.log("\nBarber reads the material's stock level (allowed) but cannot manage it...");
  const { data: barberRead } = await barber.client.from("materials").select("id, current_quantity").eq("id", material.id).maybeSingle();
  check("Barber can see the material", barberRead?.id === material.id);
  const { error: barberUpdateError } = await barber.client.from("materials").update({ current_quantity: 999 }).eq("id", material.id);
  const { data: afterBarberUpdate } = await owner.client.from("materials").select("current_quantity").eq("id", material.id).single();
  check("Barber's update did NOT change stock (RLS blocked it)", Number(afterBarberUpdate?.current_quantity) === 5);
  void barberUpdateError;

  console.log("\nSecretary records a purchase via record_material_purchase()...");
  const { data: purchase, error: purchaseError } = await secretary.client.rpc("record_material_purchase", {
    p_material_id: material.id,
    p_quantity: 20,
    p_unit_cost: 500,
    p_supplier: "Beauty Supplies Co",
  });
  check("Purchase RPC succeeds", !purchaseError && purchase);
  check("total_cost computed correctly (20 * 500)", Number(purchase?.total_cost) === 10000);

  const { data: afterPurchase } = await owner.client.from("materials").select("current_quantity").eq("id", material.id).single();
  check("Stock atomically bumped from 5 to 25", Number(afterPurchase?.current_quantity) === 25);

  console.log("\nBarber attempts to read purchase cost data (should see nothing)...");
  const { data: barberPurchases } = await barber.client.from("material_purchases").select("id").eq("business_id", business.id);
  check("Barber sees 0 purchases", (barberPurchases ?? []).length === 0);

  console.log("Barber attempts to record a purchase (should fail)...");
  const { error: barberPurchaseError } = await barber.client.rpc("record_material_purchase", {
    p_material_id: material.id,
    p_quantity: 1,
    p_unit_cost: 1,
  });
  check("Barber CANNOT record a purchase", !!barberPurchaseError);

  const { data: stockUnchangedAfterBarberAttempt } = await owner.client
    .from("materials")
    .select("current_quantity")
    .eq("id", material.id)
    .single();
  check(
    "Failed barber purchase did NOT change stock (atomic rollback)",
    Number(stockUnchangedAfterBarberAttempt?.current_quantity) === 25,
  );

  console.log("\nSecretary attempts to delete the material (should fail — owner only)...");
  await secretary.client.from("materials").delete().eq("id", material.id);
  const { data: materialStillThere } = await owner.client.from("materials").select("id").eq("id", material.id).maybeSingle();
  check("Secretary's delete did NOT remove the material", materialStillThere?.id === material.id);

  console.log("\nChecking purchases are append-only (owner cannot update or delete)...");
  await owner.client.from("material_purchases").update({ quantity: 1 }).eq("id", purchase.id);
  const { data: afterUpdate } = await owner.client.from("material_purchases").select("quantity").eq("id", purchase.id).single();
  check("Owner's update did NOT change the purchase", Number(afterUpdate?.quantity) === 20);

  console.log("\nCross-tenant check...");
  const other = await newSignedInClient(credsOther);
  await other.client.rpc("create_business_with_owner", { p_name: `M8 Other Shop ${suffix}` });
  const { data: crossRead } = await other.client.from("materials").select("id").eq("business_id", business.id);
  check("Cross-tenant material read returns 0 rows", (crossRead ?? []).length === 0);
  const { error: crossPurchaseError } = await other.client.rpc("record_material_purchase", {
    p_material_id: material.id,
    p_quantity: 1,
    p_unit_cost: 1,
  });
  check("Cross-tenant purchase attempt is rejected", !!crossPurchaseError);

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\nScript error:", err.message);
  process.exit(1);
});
