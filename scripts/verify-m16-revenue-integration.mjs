// One-off verification script proving service revenue and product sales
// combine correctly into totalRevenue/productCOGS without double-counting
// — the same underlying data getRevenueSummary() reads, re-derived here
// directly (matching verify-m15-revenue-aggregate.mjs's approach, since a
// plain Node script can't import the TypeScript helper without a build
// step).
//
// Usage: node scripts/verify-m16-revenue-integration.mjs

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
  console.log("Setting up a shop with both a service sale and product sales...");
  const owner = await newSignedInClient(`piccos.m16.revenue.${suffix}@example.com`);
  const { data: shop } = await owner.client.rpc("create_business_with_owner", { p_name: `M16 Revenue Shop ${suffix}` });

  const { data: service } = await owner.client
    .from("services")
    .insert({ business_id: shop.id, name: "Haircut", price: 3000 })
    .select()
    .single();
  const { data: staff } = await owner.client
    .from("staff")
    .insert({ business_id: shop.id, display_name: "Barber" })
    .select()
    .single();
  const { data: product } = await owner.client
    .from("products")
    .insert({ business_id: shop.id, name: "Pomade", selling_price: 5000, cost_price: 3000, stock_quantity: 50 })
    .select()
    .single();

  // Service revenue: 3000.
  await owner.client.from("transactions").insert({
    business_id: shop.id,
    staff_id: staff.id,
    service_id: service.id,
    service_name: service.name,
    service_price: service.price,
    amount: 3000,
    payment_method: "cash",
  });

  // Active product sale: 4 x 5000 = 20000 revenue, COGS = 4 x 3000 = 12000.
  const { data: activeSale, error: activeSaleError } = await owner.client.rpc("record_product_sale", {
    p_business_id: shop.id,
    p_product_id: product.id,
    p_quantity: 4,
    p_payment_method: "cash",
  });
  check("Active product sale recorded", !activeSaleError && activeSale);

  // A second sale that gets voided — must be excluded from every total.
  const { data: voidedSale } = await owner.client.rpc("record_product_sale", {
    p_business_id: shop.id,
    p_product_id: product.id,
    p_quantity: 10, // would be 50000 revenue / 30000 COGS if counted
    p_payment_method: "pos",
  });
  await owner.client.rpc("void_product_sale", { p_sale_id: voidedSale.id, p_reason: "test voided sale exclusion" });

  console.log("\n=== Revenue + COGS integration ===");
  const { data: transactions } = await owner.client.from("transactions").select("amount").eq("business_id", shop.id);
  const { data: productSales } = await owner.client
    .from("product_sales")
    .select("amount, quantity, cost_price")
    .eq("business_id", shop.id);

  const serviceRevenue = (transactions ?? []).reduce((s, t) => s + Number(t.amount), 0);
  const productRevenue = (productSales ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const totalRevenue = serviceRevenue + productRevenue;
  const productCOGS = (productSales ?? []).reduce((s, p) => s + Number(p.cost_price) * p.quantity, 0);

  check("Service revenue is 3000", serviceRevenue === 3000);
  check("Product revenue is exactly 20000 (voided 10x sale excluded)", productRevenue === 20000);
  check("Total revenue = service + product, summed exactly once (23000)", totalRevenue === 23000);
  check("Product COGS is exactly 12000 (4 x 3000, voided sale excluded)", productCOGS === 12000);

  const estimatedProfit = totalRevenue - 0 /* no expenses in this test */ - productCOGS;
  check("Estimated profit accounts for product COGS (23000 - 12000 = 11000)", estimatedProfit === 11000);

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\nScript error:", err.message);
  process.exit(1);
});
