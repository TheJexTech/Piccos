// One-off verification script for M7 (expenses).
//
// Proves against the live Supabase project that:
//   1. Owner/secretary can create expense categories and expenses.
//   2. A barber has NO access to expenses or categories at all (unlike
//      services/stations, which barbers can at least read).
//   3. Only the owner can delete a category.
//   4. Expenses are append-only — no update/delete, even for the owner.
//   5. Cross-tenant reads/writes are rejected.
//
// Usage: node scripts/verify-m7-expenses.mjs

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
const credsOwner = { email: `piccos.m7.owner.${suffix}@example.com`, password: "TestPassword123!" };
const credsSecretary = { email: `piccos.m7.secretary.${suffix}@example.com`, password: "TestPassword123!" };
const credsBarber = { email: `piccos.m7.barber.${suffix}@example.com`, password: "TestPassword123!" };
const credsOther = { email: `piccos.m7.other.${suffix}@example.com`, password: "TestPassword123!" };

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
    { p_name: `M7 Test Shop ${suffix}` },
  );
  if (createError) throw new Error(createError.message);

  const secretary = await newSignedInClient(credsSecretary);
  await addMember(owner.client, business.id, secretary.userId, "secretary");
  const barber = await newSignedInClient(credsBarber);
  await addMember(owner.client, business.id, barber.userId, "barber");

  console.log("\nSecretary creates a category and an expense...");
  const { data: category, error: categoryError } = await secretary.client
    .from("expense_categories")
    .insert({ business_id: business.id, name: "Rent" })
    .select()
    .single();
  check("Secretary can create a category", !categoryError && category);

  const { data: expense, error: expenseError } = await secretary.client
    .from("expenses")
    .insert({ business_id: business.id, category_id: category.id, amount: 50000, description: "Rent" })
    .select()
    .single();
  check("Secretary can create an expense", !expenseError && expense);
  check("created_by defaults to secretary", expense?.created_by === secretary.userId);

  console.log("\nBarber attempts to read categories and expenses (should see nothing)...");
  const { data: barberCategories } = await barber.client.from("expense_categories").select("id").eq("business_id", business.id);
  check("Barber sees 0 categories", (barberCategories ?? []).length === 0);
  const { data: barberExpenses } = await barber.client.from("expenses").select("id").eq("business_id", business.id);
  check("Barber sees 0 expenses", (barberExpenses ?? []).length === 0);

  console.log("Barber attempts to create an expense (should fail)...");
  const { error: barberCreateError } = await barber.client
    .from("expenses")
    .insert({ business_id: business.id, amount: 1, description: "Rogue expense" });
  check("Barber CANNOT create an expense", !!barberCreateError);

  console.log("\nSecretary attempts to delete the category (should fail — owner only)...");
  await secretary.client.from("expense_categories").delete().eq("id", category.id);
  const { data: categoryStillThere } = await owner.client.from("expense_categories").select("id").eq("id", category.id).maybeSingle();
  check("Secretary's delete did NOT remove the category", categoryStillThere?.id === category.id);

  console.log("Owner deletes the category (should succeed)...");
  const { error: ownerDeleteError } = await owner.client.from("expense_categories").delete().eq("id", category.id);
  check("Owner CAN delete the category", !ownerDeleteError);

  console.log("\nChecking expenses are append-only (owner cannot update or delete)...");
  await owner.client.from("expenses").update({ amount: 1 }).eq("id", expense.id);
  const { data: afterUpdate } = await owner.client.from("expenses").select("amount").eq("id", expense.id).single();
  check("Owner's update did NOT change the amount", Number(afterUpdate?.amount) === 50000);

  await owner.client.from("expenses").delete().eq("id", expense.id);
  const { data: afterDelete } = await owner.client.from("expenses").select("id").eq("id", expense.id).maybeSingle();
  check("Owner's delete did NOT remove the expense", afterDelete?.id === expense.id);

  console.log("\nCross-tenant check...");
  const other = await newSignedInClient(credsOther);
  await other.client.rpc("create_business_with_owner", { p_name: `M7 Other Shop ${suffix}` });
  const { data: crossRead } = await other.client.from("expenses").select("id").eq("business_id", business.id);
  check("Cross-tenant expense read returns 0 rows", (crossRead ?? []).length === 0);
  const { error: crossInsertError } = await other.client
    .from("expenses")
    .insert({ business_id: business.id, amount: 1, description: "Intruder expense" });
  check("Cross-tenant expense insert is rejected", !!crossInsertError);

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\nScript error:", err.message);
  process.exit(1);
});
