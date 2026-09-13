// One-off verification script for M13 (testing + security hardening).
//
// This is a dedicated, cross-cutting pass — unlike the per-feature scripts
// (m2, m6, m7, m8, m11), it doesn't test one milestone's happy path. It
// systematically re-checks the FULL role permission matrix (owner /
// secretary / barber x every table x select/insert/update/delete), full
// tenant isolation (Shop A vs Shop B) across every table, and financial
// edge cases not already covered by earlier scripts.
//
// Usage: node scripts/verify-m13-security.mjs

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
const findings = [];

function check(label, condition, note) {
  console.log(`  ${condition ? "✓" : "✗"} ${label}`);
  if (!condition) {
    failures++;
    if (note) findings.push(`${label} — ${note}`);
  }
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
  const { error } = await ownerClient
    .from("business_members")
    .insert({ business_id: businessId, user_id: userId, role, status: "active" });
  if (error) throw new Error(`addMember(${role}) failed: ${error.message}`);
}

async function main() {
  console.log("Setting up two isolated businesses with a full role roster...");

  const ownerA = await newSignedInClient(`piccos.m13.ownerA.${suffix}@example.com`);
  const secA = await newSignedInClient(`piccos.m13.secA.${suffix}@example.com`);
  const barberA1 = await newSignedInClient(`piccos.m13.barberA1.${suffix}@example.com`);
  const barberA2 = await newSignedInClient(`piccos.m13.barberA2.${suffix}@example.com`);
  const ownerB = await newSignedInClient(`piccos.m13.ownerB.${suffix}@example.com`);

  const { data: shopA } = await ownerA.client.rpc("create_business_with_owner", {
    p_name: `M13 Shop A ${suffix}`,
  });
  const { data: shopB } = await ownerB.client.rpc("create_business_with_owner", {
    p_name: `M13 Shop B ${suffix}`,
  });

  await addMember(ownerA.client, shopA.id, secA.userId, "secretary");
  await addMember(ownerA.client, shopA.id, barberA1.userId, "barber");
  await addMember(ownerA.client, shopA.id, barberA2.userId, "barber");

  const { data: station } = await ownerA.client
    .from("stations")
    .insert({ business_id: shopA.id, name: "Chair 1" })
    .select()
    .single();
  const { data: service } = await ownerA.client
    .from("services")
    .insert({ business_id: shopA.id, name: "Haircut", price: 3000 })
    .select()
    .single();
  const { data: staff1 } = await ownerA.client
    .from("staff")
    .insert({ business_id: shopA.id, profile_id: barberA1.userId, display_name: "Barber One" })
    .select()
    .single();
  const { data: staff2 } = await ownerA.client
    .from("staff")
    .insert({ business_id: shopA.id, profile_id: barberA2.userId, display_name: "Barber Two" })
    .select()
    .single();
  const { data: category } = await ownerA.client
    .from("expense_categories")
    .insert({ business_id: shopA.id, name: "Rent" })
    .select()
    .single();
  const { data: material } = await ownerA.client
    .from("materials")
    .insert({ business_id: shopA.id, name: "Shampoo", unit: "bottle" })
    .select()
    .single();

  // ---------------------------------------------------------------------
  console.log("\n=== Permission matrix: stations (owner-only writes) ===");
  check(
    "Secretary CANNOT insert a station",
    !!(await secA.client.from("stations").insert({ business_id: shopA.id, name: "Sec Station" })).error,
    "secretary should not manage stations per spec",
  );
  check(
    "Barber CANNOT insert a station",
    !!(await barberA1.client.from("stations").insert({ business_id: shopA.id, name: "Barber Station" })).error,
  );
  check(
    "Secretary CANNOT update a station",
    (
      await secA.client.from("stations").update({ name: "Renamed" }).eq("id", station.id).select()
    ).data?.length === 0,
  );
  check("All roles CAN see the station", (await barberA1.client.from("stations").select("id").eq("id", station.id)).data?.length === 1);

  console.log("\n=== Permission matrix: staff (owner+secretary writes) ===");
  check(
    "Barber CANNOT insert a staff row",
    !!(await barberA1.client.from("staff").insert({ business_id: shopA.id, display_name: "Ghost" })).error,
  );
  check(
    "Secretary CAN insert a staff row",
    !(await secA.client.from("staff").insert({ business_id: shopA.id, display_name: "Sec Hire" })).error,
  );
  check(
    "Secretary CANNOT delete a staff row",
    (await secA.client.from("staff").delete().eq("id", staff1.id).select()).data?.length === 0,
  );

  console.log("\n=== Permission matrix: services (owner+secretary writes) ===");
  check(
    "Barber CANNOT insert a service",
    !!(await barberA1.client.from("services").insert({ business_id: shopA.id, name: "Shave", price: 1000 })).error,
  );
  check(
    "Secretary CAN update a service",
    !(await secA.client.from("services").update({ price: 3500 }).eq("id", service.id)).error,
  );
  check(
    "Secretary CANNOT delete a service",
    (await secA.client.from("services").delete().eq("id", service.id).select()).data?.length === 0,
  );

  console.log("\n=== Permission matrix: expenses / expense_categories (owner+secretary only, all ops) ===");
  check(
    "Barber CANNOT see expense categories",
    (await barberA1.client.from("expense_categories").select("id")).data?.length === 0,
  );
  check(
    "Barber CANNOT insert an expense",
    !!(await barberA1.client.from("expenses").insert({ business_id: shopA.id, amount: 500 })).error,
  );
  check(
    "Barber CANNOT see any expenses",
    (await barberA1.client.from("expenses").select("id").eq("business_id", shopA.id)).data?.length === 0,
  );
  check(
    "Secretary CAN insert an expense",
    !(await secA.client.from("expenses").insert({ business_id: shopA.id, category_id: category.id, amount: 500 }))
      .error,
  );

  console.log("\n=== Permission matrix: materials (members read, owner+secretary write) ===");
  check(
    "Barber CAN see materials (member read)",
    (await barberA1.client.from("materials").select("id").eq("id", material.id)).data?.length === 1,
  );
  check(
    "Barber CANNOT insert a material",
    !!(await barberA1.client.from("materials").insert({ business_id: shopA.id, name: "Gel", unit: "tub" })).error,
  );
  console.log("\n=== Permission matrix: material_purchases (RPC, owner+secretary only) ===");
  const { error: barberPurchaseError } = await barberA1.client.rpc("record_material_purchase", {
    p_material_id: material.id,
    p_quantity: 5,
    p_unit_cost: 100,
  });
  check("Barber CANNOT call record_material_purchase", !!barberPurchaseError);
  check(
    "Barber CANNOT see material_purchases",
    (await barberA1.client.from("material_purchases").select("id")).data?.length === 0,
  );
  const { error: secPurchaseError } = await secA.client.rpc("record_material_purchase", {
    p_material_id: material.id,
    p_quantity: 5,
    p_unit_cost: 100,
  });
  check("Secretary CAN call record_material_purchase", !secPurchaseError);

  console.log("\n=== Permission matrix: business_members privilege escalation ===");
  const { error: secSelfPromoteInsert } = await secA.client
    .from("business_members")
    .insert({ business_id: shopA.id, user_id: secA.userId, role: "owner", status: "active" });
  check("Secretary CANNOT insert a duplicate/self-promoted membership row", !!secSelfPromoteInsert);
  const { data: secUpdateResult } = await secA.client
    .from("business_members")
    .update({ role: "owner" })
    .eq("user_id", secA.userId)
    .eq("business_id", shopA.id)
    .select();
  check("Secretary CANNOT update their own role to owner", (secUpdateResult ?? []).length === 0);
  const { data: secRoleAfter } = await ownerA.client
    .from("business_members")
    .select("role")
    .eq("user_id", secA.userId)
    .eq("business_id", shopA.id)
    .single();
  check("Secretary's role is still 'secretary' after the attempt", secRoleAfter?.role === "secretary");

  console.log("\n=== Permission matrix: audit_logs / profiles direct writes ===");
  check(
    "Owner CANNOT directly insert an audit_logs row (writes are function-only)",
    !!(
      await ownerA.client
        .from("audit_logs")
        .insert({ business_id: shopA.id, action: "manual", entity_type: "transactions" })
    ).error,
  );
  const { data: barber2ProfileAsBarber1 } = await barberA1.client
    .from("profiles")
    .update({ full_name: "Hacked Name" })
    .eq("id", barberA2.userId)
    .select();
  check("Barber CANNOT update a colleague's profile", (barber2ProfileAsBarber1 ?? []).length === 0);

  // ---------------------------------------------------------------------
  console.log("\n=== Transaction attribution: can a barber log a sale under someone else's name? ===");
  const { data: ownAttributionTx, error: ownAttributionError } = await barberA1.client
    .from("transactions")
    .insert({
      business_id: shopA.id,
      staff_id: staff1.id,
      service_id: service.id,
      service_name: service.name,
      service_price: service.price,
      amount: service.price,
      payment_method: "cash",
    })
    .select()
    .single();
  check("Barber CAN log a sale under their own staff_id", !ownAttributionError && ownAttributionTx);

  const { error: crossAttributionError } = await barberA1.client.from("transactions").insert({
    business_id: shopA.id,
    staff_id: staff2.id, // barberA1 attributing a sale to barberA2
    service_id: service.id,
    service_name: service.name,
    service_price: service.price,
    amount: service.price,
    payment_method: "cash",
  });
  check(
    "Barber CANNOT log a sale under a DIFFERENT staff member's name",
    !!crossAttributionError,
    "transactions_insert_members should restrict barbers to their own staff_id (fixed in 20260913100001)",
  );

  const { error: secAttributionError } = await secA.client.from("transactions").insert({
    business_id: shopA.id,
    staff_id: staff2.id, // secretary attributing a sale to barberA2 — must still work
    service_id: service.id,
    service_name: service.name,
    service_price: service.price,
    amount: service.price,
    payment_method: "cash",
  });
  check("Secretary CAN still attribute a sale to any staff member (checkout flow)", !secAttributionError);

  console.log("\n=== Financial edge cases ===");
  check(
    "Negative-amount transaction is rejected (check constraint)",
    !!(
      await ownerA.client.from("transactions").insert({
        business_id: shopA.id,
        staff_id: staff1.id,
        service_id: service.id,
        service_name: service.name,
        service_price: service.price,
        amount: -100,
        payment_method: "cash",
      })
    ).error,
  );
  check(
    "Negative-amount expense is rejected (check constraint)",
    !!(await ownerA.client.from("expenses").insert({ business_id: shopA.id, amount: -100 })).error,
  );
  const { error: negQtyError } = await ownerA.client.rpc("record_material_purchase", {
    p_material_id: material.id,
    p_quantity: -1,
    p_unit_cost: 100,
  });
  check("Negative-quantity material purchase is rejected (check constraint)", !!negQtyError);

  check(
    "Spoofed created_by on a transaction insert is rejected",
    !!(
      await barberA1.client.from("transactions").insert({
        business_id: shopA.id,
        staff_id: staff1.id,
        service_id: service.id,
        service_name: service.name,
        service_price: service.price,
        amount: service.price,
        payment_method: "cash",
        created_by: barberA2.userId,
      })
    ).error,
  );

  // ---------------------------------------------------------------------
  console.log("\n=== Full tenant isolation: Shop B owner reading/writing Shop A ===");
  const tenantTables = [
    "stations",
    "staff",
    "services",
    "transactions",
    "expenses",
    "expense_categories",
    "materials",
    "material_purchases",
    "business_members",
    "audit_logs",
  ];
  for (const table of tenantTables) {
    const { data } = await ownerB.client.from(table).select("id").eq("business_id", shopA.id);
    check(`Shop B owner sees 0 rows in Shop A's ${table}`, (data ?? []).length === 0);
  }
  check(
    "Shop B owner CANNOT insert a station into Shop A",
    !!(await ownerB.client.from("stations").insert({ business_id: shopA.id, name: "Intruder Station" })).error,
  );
  check(
    "Shop B owner CANNOT void a Shop A transaction",
    !!(
      await ownerB.client.rpc("void_transaction", {
        p_transaction_id: ownAttributionTx.id,
        p_reason: "cross-tenant attempt",
      })
    ).error,
  );

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  if (findings.length > 0) {
    console.log("\nFindings for review:");
    for (const f of findings) console.log(`  - ${f}`);
  }
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\nScript error:", err.message);
  process.exit(1);
});
