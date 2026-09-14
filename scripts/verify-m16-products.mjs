// One-off verification script for Product sales / retail management.
//
// Proves against the live Supabase project that:
//   1. Owner/secretary can create a product and record a sale; stock
//      decrements atomically, amount = selling_price × quantity, and
//      cost_price is snapshotted onto the sale (a later price change on
//      the product must never rewrite a past sale's cost).
//   2. A barber cannot see products or record a sale (owner/secretary
//      only — no staff-attribution path exists for retail).
//   3. Voiding a sale restores stock, writes an audit_logs entry, and a
//      second void attempt is rejected.
//   4. Cross-tenant isolation matches every other financial table.
//
// Usage: node scripts/verify-m16-products.mjs

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
  console.log("Setting up a shop with an owner and a barber...");
  const owner = await newSignedInClient(`piccos.m16.owner.${suffix}@example.com`);
  const barber = await newSignedInClient(`piccos.m16.barber.${suffix}@example.com`);
  const stranger = await newSignedInClient(`piccos.m16.stranger.${suffix}@example.com`);

  const { data: shop } = await owner.client.rpc("create_business_with_owner", { p_name: `M16 Products Shop ${suffix}` });
  await addMember(owner.client, shop.id, barber.userId, "barber");
  await owner.client.rpc("create_business_with_owner", { p_name: `M16 Stranger Shop ${suffix}` });

  console.log("\n=== Product creation ===");
  const { data: clipper, error: createError } = await owner.client
    .from("products")
    .insert({ business_id: shop.id, name: "Clipper", selling_price: 35000, cost_price: 27000, stock_quantity: 8 })
    .select()
    .single();
  check("Owner can create a product", !createError && clipper);

  console.log("\n=== Barber has no access ===");
  const { data: barberProducts } = await barber.client.from("products").select("id").eq("business_id", shop.id);
  check("Barber sees 0 products (owner/secretary only)", (barberProducts ?? []).length === 0);

  const { error: barberSaleError } = await barber.client.rpc("record_product_sale", {
    p_business_id: shop.id,
    p_product_id: clipper.id,
    p_quantity: 1,
    p_payment_method: "cash",
  });
  check("Barber cannot record a product sale", !!barberSaleError);

  console.log("\n=== Recording a sale ===");
  const { data: sale, error: saleError } = await owner.client.rpc("record_product_sale", {
    p_business_id: shop.id,
    p_product_id: clipper.id,
    p_quantity: 3,
    p_payment_method: "pos",
  });
  check("Owner can record a product sale", !saleError && sale);
  check("Sale amount = selling_price × quantity (105000)", Number(sale?.amount) === 105000);
  check("Sale snapshots cost_price (27000)", Number(sale?.cost_price) === 27000);

  const { data: afterSale } = await owner.client.from("products").select("stock_quantity").eq("id", clipper.id).single();
  check("Stock decremented by quantity sold (8 - 3 = 5)", afterSale?.stock_quantity === 5);

  console.log("\nChanging the product's price to confirm the sale snapshot doesn't move...");
  await owner.client.from("products").update({ selling_price: 40000, cost_price: 30000 }).eq("id", clipper.id);
  const { data: saleAfterPriceChange } = await owner.client
    .from("product_sales")
    .select("selling_price, cost_price")
    .eq("id", sale.id)
    .single();
  check(
    "Historical sale keeps its original snapshot after a later price change",
    Number(saleAfterPriceChange?.selling_price) === 35000 && Number(saleAfterPriceChange?.cost_price) === 27000,
  );

  console.log("\n=== Voiding a sale ===");
  const { error: barberVoidError } = await barber.client.rpc("void_product_sale", { p_sale_id: sale.id, p_reason: "trying" });
  check("Barber cannot void a product sale", !!barberVoidError);

  const { data: voided, error: voidError } = await owner.client.rpc("void_product_sale", {
    p_sale_id: sale.id,
    p_reason: "Miscounted stock",
  });
  check("Owner can void a product sale", !voidError && voided);
  check("Void creates a negative reversing entry", Number(voided?.amount) === -105000 && voided?.quantity === -3);

  const { data: afterVoid } = await owner.client.from("products").select("stock_quantity").eq("id", clipper.id).single();
  check("Stock restored after void (5 + 3 = 8)", afterVoid?.stock_quantity === 8);

  const { error: doubleVoidError } = await owner.client.rpc("void_product_sale", { p_sale_id: sale.id, p_reason: "again" });
  check("Double-void is rejected", !!doubleVoidError);

  const { data: auditEntry } = await owner.client
    .from("audit_logs")
    .select("action, entity_type, reason")
    .eq("business_id", shop.id)
    .eq("entity_type", "product_sales")
    .eq("entity_id", sale.id)
    .maybeSingle();
  check(
    "Voiding writes an audit_logs entry",
    auditEntry?.action === "void" && auditEntry?.reason === "Miscounted stock",
  );

  console.log("\n=== Cross-tenant isolation ===");
  for (const table of ["products", "product_sales"]) {
    const { data } = await stranger.client.from(table).select("id").eq("business_id", shop.id);
    check(`Stranger sees 0 rows in this shop's ${table}`, (data ?? []).length === 0);
  }
  const { error: strangerInsertError } = await stranger.client
    .from("products")
    .insert({ business_id: shop.id, name: "Hacked Product", selling_price: 1, cost_price: 1 });
  check("Stranger cannot insert a product into this shop", !!strangerInsertError);

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\nScript error:", err.message);
  process.exit(1);
});
