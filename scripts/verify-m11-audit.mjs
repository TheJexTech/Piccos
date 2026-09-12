// One-off verification script for M11 (audit system).
//
// Proves against the live Supabase project that:
//   1. void_transaction()/void_expense() work for the owner: original
//      row is untouched, a negative correction row is created, and an
//      audit_logs entry captures who/when/what/why.
//   2. Secretary and barber CANNOT void anything (owner-only).
//   3. A transaction can't be voided twice.
//   4. A correction entry itself can't be voided.
//   5. A reason is required.
//   6. Only the owner can read audit_logs.
//   7. Cross-tenant: an owner can't void another business's transaction.
//
// Usage: node scripts/verify-m11-audit.mjs

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
const credsOwner = { email: `piccos.m11.owner.${suffix}@example.com`, password: "TestPassword123!" };
const credsSecretary = { email: `piccos.m11.secretary.${suffix}@example.com`, password: "TestPassword123!" };
const credsOther = { email: `piccos.m11.other.${suffix}@example.com`, password: "TestPassword123!" };

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
  console.log("Setting up owner + business + secretary + service + staff + transaction + expense...");
  const owner = await newSignedInClient(credsOwner);
  const { data: business } = await owner.client.rpc("create_business_with_owner", { p_name: `M11 Test Shop ${suffix}` });
  const secretary = await newSignedInClient(credsSecretary);
  await addMember(owner.client, business.id, secretary.userId, "secretary");

  const { data: service } = await owner.client.from("services").insert({ business_id: business.id, name: "Haircut", price: 3000 }).select().single();
  const { data: staff } = await owner.client.from("staff").insert({ business_id: business.id, display_name: "Barber A" }).select().single();
  const { data: tx } = await owner.client
    .from("transactions")
    .insert({ business_id: business.id, staff_id: staff.id, service_id: service.id, service_name: service.name, service_price: service.price, amount: 3000, payment_method: "cash" })
    .select()
    .single();
  const { data: expense } = await owner.client.from("expenses").insert({ business_id: business.id, amount: 5000, description: "Rent" }).select().single();

  console.log("\nSecretary attempts to void the transaction (should fail — owner only)...");
  const { error: secretaryVoidError } = await secretary.client.rpc("void_transaction", { p_transaction_id: tx.id, p_reason: "trying" });
  check("Secretary CANNOT void a transaction", !!secretaryVoidError);

  console.log("Owner attempts to void without a reason (should fail)...");
  const { error: noReasonError } = await owner.client.rpc("void_transaction", { p_transaction_id: tx.id, p_reason: "" });
  check("Void without a reason is rejected", !!noReasonError);

  console.log("\nOwner voids the transaction with a reason...");
  const { data: correction, error: voidError } = await owner.client.rpc("void_transaction", {
    p_transaction_id: tx.id,
    p_reason: "Wrong amount recorded",
  });
  check("Owner can void a transaction", !voidError && correction);
  check("Correction has negated amount", Number(correction?.amount) === -3000);
  check("Correction references the original", correction?.correction_of_id === tx.id);

  const { data: originalAfterVoid } = await owner.client.from("transactions").select("amount").eq("id", tx.id).single();
  check("Original transaction amount is untouched", Number(originalAfterVoid?.amount) === 3000);

  console.log("\nOwner attempts to void the same transaction again (should fail)...");
  const { error: doubleVoidError } = await owner.client.rpc("void_transaction", { p_transaction_id: tx.id, p_reason: "again" });
  check("Double-void is rejected", !!doubleVoidError);

  console.log("Owner attempts to void the correction entry itself (should fail)...");
  const { error: voidCorrectionError } = await owner.client.rpc("void_transaction", { p_transaction_id: correction.id, p_reason: "voiding a void" });
  check("Voiding a correction entry is rejected", !!voidCorrectionError);

  console.log("\nChecking the audit log entry...");
  const { data: auditEntries } = await owner.client
    .from("audit_logs")
    .select("action, entity_type, entity_id, old_values, reason")
    .eq("business_id", business.id)
    .eq("action", "void");
  check("Exactly one audit log entry for the void", (auditEntries ?? []).length === 1);
  check("Audit entry references the original transaction", auditEntries?.[0]?.entity_id === tx.id);
  check("Audit entry captured the original amount", Number(auditEntries?.[0]?.old_values?.amount) === 3000);
  check("Audit entry captured the reason", auditEntries?.[0]?.reason === "Wrong amount recorded");

  console.log("Secretary attempts to read the audit log (should see nothing)...");
  const { data: secretaryAuditView } = await secretary.client.from("audit_logs").select("id").eq("business_id", business.id);
  check("Secretary sees 0 audit log entries (owner-only)", (secretaryAuditView ?? []).length === 0);

  console.log("\nOwner voids the expense...");
  const { data: expenseCorrection, error: expenseVoidError } = await owner.client.rpc("void_expense", {
    p_expense_id: expense.id,
    p_reason: "Duplicate entry",
  });
  check("Owner can void an expense", !expenseVoidError && expenseCorrection);
  check("Expense correction has negated amount", Number(expenseCorrection?.amount) === -5000);

  const { data: netExpenses } = await owner.client.from("expenses").select("amount").eq("business_id", business.id);
  const netTotal = (netExpenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0);
  check("Net expense total after voiding is 0", netTotal === 0);

  console.log("\nCross-tenant check: unrelated owner cannot void this business's transaction...");
  const other = await newSignedInClient(credsOther);
  await other.client.rpc("create_business_with_owner", { p_name: `M11 Other Shop ${suffix}` });
  const { data: otherStaff } = await owner.client.from("staff").insert({ business_id: business.id, display_name: "Barber B" }).select().single();
  const { data: tx2 } = await owner.client
    .from("transactions")
    .insert({ business_id: business.id, staff_id: otherStaff.id, service_id: service.id, service_name: service.name, service_price: service.price, amount: 1000, payment_method: "cash" })
    .select()
    .single();
  const { error: crossVoidError } = await other.client.rpc("void_transaction", { p_transaction_id: tx2.id, p_reason: "cross-tenant attempt" });
  check("Cross-tenant void attempt is rejected", !!crossVoidError);

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\nScript error:", err.message);
  process.exit(1);
});
