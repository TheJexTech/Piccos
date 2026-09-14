// One-off verification script for batch/daily activity recording
// (Correction 2), tips (Correction 7), and the Correction-1 staff-identity
// regression case.
//
// Usage: node scripts/verify-m15-batch-activity.mjs

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

async function addMember(ownerClient, businessId, userId, role) {
  await ownerClient.from("business_members").insert({ business_id: businessId, user_id: userId, role, status: "active" });
}

async function main() {
  console.log("Setting up a shop with an owner and two barbers (Adam, Goodness)...");
  const owner = await newSignedInClient(`piccos.m15.owner.${suffix}@example.com`);
  const adam = await newSignedInClient(`piccos.m15.adam.${suffix}@example.com`);
  const goodness = await newSignedInClient(`piccos.m15.goodness.${suffix}@example.com`);

  const { data: shop } = await owner.client.rpc("create_business_with_owner", { p_name: `M15 Batch Shop ${suffix}` });
  await addMember(owner.client, shop.id, adam.userId, "barber");
  await addMember(owner.client, shop.id, goodness.userId, "barber");

  const { data: haircut } = await owner.client
    .from("services")
    .insert({ business_id: shop.id, name: "Haircut", price: 4500 })
    .select()
    .single();
  const { data: dreadlocks } = await owner.client
    .from("services")
    .insert({ business_id: shop.id, name: "Dreadlocks", price: 15000 })
    .select()
    .single();
  const { data: staffAdam } = await owner.client
    .from("staff")
    .insert({ business_id: shop.id, profile_id: adam.userId, display_name: "Adam" })
    .select()
    .single();
  const { data: staffGoodness } = await owner.client
    .from("staff")
    .insert({ business_id: shop.id, profile_id: goodness.userId, display_name: "Goodness" })
    .select()
    .single();

  // --- Correction 1 regression: staff identity must resolve via the real
  // FK join, never array position / stale state / another staff record. ---
  console.log("\n=== Correction 1 regression: staff identity ===");
  const { data: adamTx } = await owner.client
    .from("transactions")
    .insert({
      business_id: shop.id,
      staff_id: staffAdam.id,
      service_id: haircut.id,
      service_name: haircut.name,
      service_price: haircut.price,
      amount: haircut.price,
      payment_method: "cash",
    })
    .select("id, staff:staff_id(display_name)")
    .single();
  check("Transaction recorded for Adam resolves to Adam (not Goodness)", adamTx?.staff?.display_name === "Adam");

  // --- Batch activity: 35 haircuts + 3 dreadlocks for Adam ---
  console.log("\n=== Batch activity: quantities and line totals ===");
  const { data: batch, error: batchError } = await owner.client.rpc("record_batch_activity", {
    p_business_id: shop.id,
    p_staff_id: staffAdam.id,
    p_batch_date: null,
    p_services: [
      { service_id: haircut.id, quantity: 35 },
      { service_id: dreadlocks.id, quantity: 3 },
    ],
    p_tip_amount: 12000,
    p_payments: [
      { payment_method: "cash", amount: 100000 },
      { payment_method: "pos", amount: 52500 },
      { payment_method: "bank_transfer", amount: 50000 },
    ],
    p_tip_payments: [
      { payment_method: "cash", amount: 4000 },
      { payment_method: "pos", amount: 3000 },
      { payment_method: "bank_transfer", amount: 5000 },
    ],
  });
  check("Batch with a reconciling payment breakdown is accepted", !batchError && batch);

  const { data: lines } = await owner.client
    .from("batch_services")
    .select("service_name, quantity, line_total")
    .eq("batch_id", batch.id)
    .order("service_name");
  const haircutLine = lines?.find((l) => l.service_name === "Haircut");
  const dreadlocksLine = lines?.find((l) => l.service_name === "Dreadlocks");
  check("Haircut line: quantity 35, line_total 157500 (not 35 separate rows)", haircutLine?.quantity === 35 && Number(haircutLine?.line_total) === 157500);
  check("Dreadlocks line: quantity 3, line_total 45000", dreadlocksLine?.quantity === 3 && Number(dreadlocksLine?.line_total) === 45000);
  check("Exactly 2 batch_services rows exist for this batch (not 38)", (lines ?? []).length === 2);

  const { data: payments } = await owner.client.from("batch_payments").select("kind, amount").eq("batch_id", batch.id);
  const servicePaymentTotal = (payments ?? []).filter((p) => p.kind === "service").reduce((s, p) => s + Number(p.amount), 0);
  const tipPaymentTotal = (payments ?? []).filter((p) => p.kind === "tip").reduce((s, p) => s + Number(p.amount), 0);
  check("Service payment breakdown sums to 202500", servicePaymentTotal === 202500);
  check("Tip payment breakdown sums to 12000", tipPaymentTotal === 12000);

  // --- Empty breakdown is allowed through with no reconciliation ---
  console.log("\n=== Optional payment breakdown ===");
  const { error: noBreakdownError } = await owner.client.rpc("record_batch_activity", {
    p_business_id: shop.id,
    p_staff_id: staffAdam.id,
    p_batch_date: null,
    p_services: [{ service_id: haircut.id, quantity: 2 }],
  });
  check("Batch with NO payment breakdown is accepted (optional)", !noBreakdownError);

  // --- A provided-but-mismatched breakdown is rejected ---
  const { error: mismatchError } = await owner.client.rpc("record_batch_activity", {
    p_business_id: shop.id,
    p_staff_id: staffAdam.id,
    p_batch_date: null,
    p_services: [{ service_id: haircut.id, quantity: 2 }], // total = 9000
    p_payments: [{ payment_method: "cash", amount: 5000 }], // doesn't match
  });
  check("Batch with a MISMATCHED complete payment breakdown is rejected", !!mismatchError);

  const { error: tipMismatchError } = await owner.client.rpc("record_batch_activity", {
    p_business_id: shop.id,
    p_staff_id: staffAdam.id,
    p_batch_date: null,
    p_services: [{ service_id: haircut.id, quantity: 1 }],
    p_tip_amount: 1000,
    p_tip_payments: [{ payment_method: "cash", amount: 500 }], // doesn't match tip
  });
  check("Batch with a mismatched TIP payment breakdown is rejected", !!tipMismatchError);

  // --- Barber attribution restriction mirrors M13's transactions fix ---
  console.log("\n=== Barber attribution ===");
  const { error: crossBarberError } = await adam.client.rpc("record_batch_activity", {
    p_business_id: shop.id,
    p_staff_id: staffGoodness.id, // Adam recording under Goodness's name
    p_batch_date: null,
    p_services: [{ service_id: haircut.id, quantity: 1 }],
  });
  check("A barber CANNOT record batch activity under a different staff member", !!crossBarberError);

  const { error: ownBarberError } = await adam.client.rpc("record_batch_activity", {
    p_business_id: shop.id,
    p_staff_id: staffAdam.id,
    p_batch_date: null,
    p_services: [{ service_id: haircut.id, quantity: 1 }],
  });
  check("A barber CAN record batch activity under their own name", !ownBarberError);

  // --- Void ---
  console.log("\n=== Voiding a batch ===");
  const { error: barberVoidError } = await adam.client.rpc("void_batch", { p_batch_id: batch.id, p_reason: "trying" });
  check("A barber CANNOT void a batch", !!barberVoidError);

  const { data: voided, error: voidError } = await owner.client.rpc("void_batch", {
    p_batch_id: batch.id,
    p_reason: "Miscounted services",
  });
  check("Owner can void a batch", !voidError && voided?.status === "voided");

  const { error: doubleVoidError } = await owner.client.rpc("void_batch", { p_batch_id: batch.id, p_reason: "again" });
  check("Double-void is rejected", !!doubleVoidError);

  const { data: auditEntry } = await owner.client
    .from("audit_logs")
    .select("action, entity_type, entity_id, reason")
    .eq("business_id", shop.id)
    .eq("entity_type", "batches")
    .eq("entity_id", batch.id)
    .maybeSingle();
  check("Voiding a batch writes an audit_logs entry", auditEntry?.action === "void" && auditEntry?.reason === "Miscounted services");

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\nScript error:", err.message);
  process.exit(1);
});
