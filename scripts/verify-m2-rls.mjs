// One-off verification script for M2 (database + security).
//
// Proves — against the live Supabase project, using the public anon key
// exactly like the app does, never the service role key — that:
//   1. A user can create a business and becomes its owner.
//   2. A second, unrelated user cannot see that business or its data.
//   3. Each user only ever sees their own business.
//
// Usage: node scripts/verify-m2-rls.mjs
// Reads NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY from
// .env.local. Creates two throwaway test users + businesses; safe to
// re-run (uses a random suffix each time).

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

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const suffix = Date.now();
const credsA = { email: `piccos.rls.a.${suffix}@example.com`, password: "TestPassword123!" };
const credsB = { email: `piccos.rls.b.${suffix}@example.com`, password: "TestPassword123!" };

let failures = 0;

function check(label, condition) {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    console.log(`  ✗ ${label}`);
    failures++;
  }
}

async function newSignedInClient(user) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { error: signUpError } = await client.auth.signUp(user);
  if (signUpError) throw new Error(`signUp(${user.email}) failed: ${signUpError.message}`);
  const { error: signInError } = await client.auth.signInWithPassword(user);
  if (signInError) throw new Error(`signIn(${user.email}) failed: ${signInError.message}`);
  return client;
}

async function main() {
  console.log("Creating two isolated test users...");
  const clientA = await newSignedInClient(credsA);
  const clientB = await newSignedInClient(credsB);

  console.log("\nUser A creates a business...");
  const { data: businessA, error: createAError } = await clientA.rpc("create_business_with_owner", {
    p_name: `RLS Test Shop A ${suffix}`,
  });
  check("create_business_with_owner succeeded for A", !createAError && businessA);
  if (createAError) console.error("  ", createAError.message);

  console.log("User B creates a business...");
  const { data: businessB, error: createBError } = await clientB.rpc("create_business_with_owner", {
    p_name: `RLS Test Shop B ${suffix}`,
  });
  check("create_business_with_owner succeeded for B", !createBError && businessB);
  if (createBError) console.error("  ", createBError.message);

  if (!businessA || !businessB) {
    console.error("\nCannot continue isolation checks without both businesses. Exiting.");
    process.exit(1);
  }

  console.log("\nChecking A can see only their own business...");
  const { data: aVisible } = await clientA.from("businesses").select("id, name");
  check("A sees exactly 1 business", aVisible?.length === 1);
  check("A's visible business is Shop A", aVisible?.[0]?.id === businessA.id);

  console.log("Checking B can see only their own business...");
  const { data: bVisible } = await clientB.from("businesses").select("id, name");
  check("B sees exactly 1 business", bVisible?.length === 1);
  check("B's visible business is Shop B", bVisible?.[0]?.id === businessB.id);

  console.log("\nChecking A cannot fetch Shop B directly by id...");
  const { data: aFetchB } = await clientA.from("businesses").select("id").eq("id", businessB.id);
  check("A gets 0 rows querying Shop B's id", (aFetchB ?? []).length === 0);

  console.log("Checking B cannot fetch Shop A directly by id...");
  const { data: bFetchA } = await clientB.from("businesses").select("id").eq("id", businessA.id);
  check("B gets 0 rows querying Shop A's id", (bFetchA ?? []).length === 0);

  console.log("\nChecking A's business_members role is 'owner'...");
  const { data: aMembership } = await clientA
    .from("business_members")
    .select("role")
    .eq("business_id", businessA.id)
    .single();
  check("A is owner of Shop A", aMembership?.role === "owner");

  console.log("Checking A cannot see Shop B's membership roster...");
  const { data: aMembersOfB } = await clientA
    .from("business_members")
    .select("id")
    .eq("business_id", businessB.id);
  check("A gets 0 rows for Shop B's members", (aMembersOfB ?? []).length === 0);

  console.log("\nChecking A cannot insert a station into Shop B...");
  const { error: crossInsertError } = await clientA
    .from("stations")
    .insert({ business_id: businessB.id, name: "Hacked Station" });
  check("Cross-tenant station insert is rejected by RLS", !!crossInsertError);

  console.log("\nChecking expenses are append-only even for the owner...");
  const { data: expense, error: expenseInsertError } = await clientA
    .from("expenses")
    .insert({ business_id: businessA.id, amount: 100, description: "RLS test expense" })
    .select()
    .single();
  check("Owner can insert an expense (created_by defaults server-side)", !expenseInsertError && expense);
  if (expenseInsertError) console.error("  ", expenseInsertError.message);
  if (expense) {
    // RLS with no matching policy makes UPDATE/DELETE match 0 rows rather
    // than raise an error via PostgREST — so the real check is whether
    // the row actually changed, not whether an `error` came back.
    await clientA.from("expenses").update({ amount: 1 }).eq("id", expense.id);
    const { data: afterUpdate } = await clientA
      .from("expenses")
      .select("amount")
      .eq("id", expense.id)
      .single();
    check("Owner CANNOT update an existing expense (no update policy)", afterUpdate?.amount == 100);

    await clientA.from("expenses").delete().eq("id", expense.id);
    const { data: afterDelete } = await clientA
      .from("expenses")
      .select("id")
      .eq("id", expense.id)
      .maybeSingle();
    check("Owner CANNOT delete an existing expense (no delete policy)", afterDelete?.id === expense.id);
  }

  console.log("\nChecking A cannot spoof created_by as user B...");
  const { data: userB } = await clientB.auth.getUser();
  const { error: spoofError } = await clientA.from("expenses").insert({
    business_id: businessA.id,
    amount: 50,
    description: "Spoof attempt",
    created_by: userB.user.id,
  });
  check("Spoofed created_by is rejected by RLS", !!spoofError);

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\nScript error:", err.message);
  process.exit(1);
});
