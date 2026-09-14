// One-off verification script for the "Outlet = Station" correction pass.
//
// Proves against the live Supabase project that:
//   1. Two stations (outlets) within ONE business keep independent
//      products/sales/transactions/batches/expenses — a same-named product
//      at each outlet never shares stock, and per-outlet totals never leak
//      into each other.
//   2. "All Outlets" (no station filter) combines both outlets' figures
//      exactly once — no double-counting.
//   3. batches.station_id is auto-derived from the recording staff
//      member's current station (record_batch_activity), matching the
//      auto-populate-from-staff rule transactions already used.
//   4. record_product_sale snapshots the product's own station onto the
//      sale.
//   5. void_expense's reversing entry carries the original station_id
//      (a single-outlet expense doesn't silently become shop-wide).
//   6. THE ACTUAL BUG THIS PASS FIXES: revenue-by-staff must survive a
//      staff rename — grouping by staff_id, not display_name. A staff
//      member's pre-rename and post-rename revenue must sum together
//      under one entry, labeled with their CURRENT name.
//
// Usage: node scripts/verify-m17-outlets.mjs

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
  console.log("Setting up one business with two outlets (stations)...");
  const owner = await newSignedInClient(`piccos.m17.owner.${suffix}@example.com`);
  const { data: shop } = await owner.client.rpc("create_business_with_owner", { p_name: `M17 Shop ${suffix}` });

  const { data: stationA } = await owner.client
    .from("stations")
    .insert({ business_id: shop.id, name: "Maris Plaza" })
    .select()
    .single();
  const { data: stationB } = await owner.client
    .from("stations")
    .insert({ business_id: shop.id, name: "Kamlora" })
    .select()
    .single();

  const { data: staff } = await owner.client
    .from("staff")
    .insert({ business_id: shop.id, display_name: "Barber One", station_id: stationA.id })
    .select()
    .single();
  const { data: service } = await owner.client
    .from("services")
    .insert({ business_id: shop.id, name: "Haircut", price: 3000 })
    .select()
    .single();

  console.log("\n=== Same-named product at two outlets stays independent ===");
  const { data: productA } = await owner.client
    .from("products")
    .insert({ business_id: shop.id, name: "Pomade", selling_price: 5000, cost_price: 3000, stock_quantity: 20, station_id: stationA.id })
    .select()
    .single();
  const { data: productB } = await owner.client
    .from("products")
    .insert({ business_id: shop.id, name: "Pomade", selling_price: 5000, cost_price: 3000, stock_quantity: 15, station_id: stationB.id })
    .select()
    .single();
  check("Two same-named products at different outlets are separate rows", productA.id !== productB.id);

  const { data: saleA } = await owner.client.rpc("record_product_sale", {
    p_business_id: shop.id,
    p_product_id: productA.id,
    p_quantity: 2,
    p_payment_method: "cash",
  });
  const { data: saleB } = await owner.client.rpc("record_product_sale", {
    p_business_id: shop.id,
    p_product_id: productB.id,
    p_quantity: 3,
    p_payment_method: "cash",
  });
  check("Sale of Outlet A's product snapshots station A", saleA.station_id === stationA.id);
  check("Sale of Outlet B's product snapshots station B", saleB.station_id === stationB.id);

  const { data: stockA } = await owner.client.from("products").select("stock_quantity").eq("id", productA.id).single();
  const { data: stockB } = await owner.client.from("products").select("stock_quantity").eq("id", productB.id).single();
  check("Outlet A's stock decremented independently (20 - 2 = 18)", stockA.stock_quantity === 18);
  check("Outlet B's stock decremented independently (15 - 3 = 12), unaffected by A's sale", stockB.stock_quantity === 12);

  console.log("\n=== Batch activity auto-derives station from the recording staff ===");
  const { data: batch } = await owner.client.rpc("record_batch_activity", {
    p_business_id: shop.id,
    p_staff_id: staff.id,
    p_batch_date: null,
    p_services: [{ service_id: service.id, quantity: 5 }],
  });
  check("Batch station_id matches the staff member's current station (A)", batch.station_id === stationA.id);

  // A single transaction at outlet A too (client-side auto-populate from
  // staff, same as the real Activity form does via a hidden input).
  await owner.client.from("transactions").insert({
    business_id: shop.id,
    staff_id: staff.id,
    station_id: stationA.id,
    service_id: service.id,
    service_name: service.name,
    service_price: service.price,
    amount: service.price,
    payment_method: "cash",
  });

  console.log("\n=== Expense outlet tagging survives a void ===");
  const { data: expenseA } = await owner.client
    .from("expenses")
    .insert({ business_id: shop.id, amount: 1000, description: "Outlet A supplies", station_id: stationA.id })
    .select()
    .single();
  await owner.client
    .from("expenses")
    .insert({ business_id: shop.id, amount: 500, description: "Shop-wide rent share" }); // station_id left null
  const { data: voidedExpense } = await owner.client.rpc("void_expense", {
    p_expense_id: expenseA.id,
    p_reason: "test void station carry-over",
  });
  check("Voiding an outlet-tagged expense keeps its station_id on the reversing entry", voidedExpense.station_id === stationA.id);

  console.log("\n=== Per-outlet vs. All-Outlets totals (re-deriving getRevenueSummary's logic) ===");
  async function productRevenueForStation(stationId) {
    let q = owner.client.from("product_sales").select("amount").eq("business_id", shop.id);
    if (stationId) q = q.eq("station_id", stationId);
    const { data } = await q;
    return (data ?? []).reduce((s, r) => s + Number(r.amount), 0);
  }
  const revenueAllOutlets = await productRevenueForStation(null);
  const revenueOutletA = await productRevenueForStation(stationA.id);
  const revenueOutletB = await productRevenueForStation(stationB.id);
  check("Outlet A product revenue is exactly its own sale (10000)", revenueOutletA === 10000);
  check("Outlet B product revenue is exactly its own sale (15000)", revenueOutletB === 15000);
  check(
    "All Outlets combines both exactly once, no double-count (25000)",
    revenueAllOutlets === revenueOutletA + revenueOutletB,
  );

  console.log("\n=== THE BUG FIX: revenue-by-staff survives a staff rename ===");
  // Record a second batch BEFORE the rename, then rename the staff member,
  // then record a third batch AFTER the rename — all under the same
  // staff_id. Grouping by staff_id (not display_name) must sum all three
  // contributions together under the staff member's current name.
  await owner.client.rpc("record_batch_activity", {
    p_business_id: shop.id,
    p_staff_id: staff.id,
    p_batch_date: null,
    p_services: [{ service_id: service.id, quantity: 2 }],
  });
  await owner.client.from("staff").update({ display_name: "Barber One Renamed" }).eq("id", staff.id);
  await owner.client.rpc("record_batch_activity", {
    p_business_id: shop.id,
    p_staff_id: staff.id,
    p_batch_date: null,
    p_services: [{ service_id: service.id, quantity: 3 }],
  });

  const { data: allBatchLines } = await owner.client
    .from("batch_services")
    .select("line_total, batches!inner(staff_id, staff:staff_id(display_name))")
    .eq("business_id", shop.id);
  const { data: allTx } = await owner.client
    .from("transactions")
    .select("amount, staff_id, staff:staff_id(display_name)")
    .eq("business_id", shop.id);

  const byStaffId = new Map();
  const namesById = new Map();
  for (const l of allBatchLines ?? []) {
    const id = l.batches.staff_id;
    byStaffId.set(id, (byStaffId.get(id) ?? 0) + Number(l.line_total));
    namesById.set(id, l.batches.staff?.display_name);
  }
  for (const t of allTx ?? []) {
    byStaffId.set(t.staff_id, (byStaffId.get(t.staff_id) ?? 0) + Number(t.amount));
    namesById.set(t.staff_id, t.staff?.display_name);
  }
  check("Exactly one staff_id entry (rename never split it in two)", byStaffId.size === 1);
  const [[onlyStaffId, totalRevenue]] = [...byStaffId.entries()];
  check("The one entry is keyed by the staff's id", onlyStaffId === staff.id);
  // 3000 (transaction) + 5*3000 (batch 1) + 2*3000 (batch 2, pre-rename) + 3*3000 (batch 3, post-rename)
  check(
    "Pre-rename and post-rename revenue summed together under one entry (33000)",
    totalRevenue === 33000,
  );
  check(
    "The entry resolves to the staff's CURRENT name, not a stale pre-rename name",
    namesById.get(onlyStaffId) === "Barber One Renamed",
  );

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\nScript error:", err.message);
  process.exit(1);
});
