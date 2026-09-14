import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentMembership } from "@/lib/business/current";
import { getBusinessOutlets } from "@/lib/business/outlets";
import { NewProductForm } from "./new-product-form";
import { ProductsList } from "./products-list";
import { RecordProductSaleForm } from "./record-product-sale-form";
import { ProductSalesList } from "./product-sales-list";
import type { Product, ProductSale } from "@/lib/products/types";

export default async function ProductsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await requireCurrentMembership(supabase, user.id);
  const businessId = membership.businessId;
  const isOwner = membership.role === "owner";
  const canAccess = isOwner || membership.role === "secretary";

  // Products have no barber-attribution path (retail checkout, same trust
  // level as expenses/material purchases) — unlike Services/Supplies,
  // there's nothing useful for a barber to do here, so the whole page is
  // gated rather than showing a confusing empty catalog.
  if (!canAccess) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-ink">Products</h1>
        <p className="mt-4 text-sm text-muted">Only the owner and secretary can view products.</p>
      </div>
    );
  }

  const [outlets, { data: products }, { data: sales }] = await Promise.all([
    getBusinessOutlets(supabase, businessId),
    supabase
      .from("products")
      .select("id, name, selling_price, cost_price, stock_quantity, status, station_id")
      .eq("business_id", businessId)
      .order("name", { ascending: true })
      .returns<Product[]>(),
    supabase
      .from("product_sales")
      .select(
        "id, product_name, selling_price, cost_price, quantity, amount, payment_method, sale_date, correction_of_id",
      )
      .eq("business_id", businessId)
      .order("sale_date", { ascending: false })
      .limit(50)
      .returns<ProductSale[]>(),
  ]);

  const activeProducts = (products ?? []).filter((p) => p.status === "active");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Products</h1>
      <p className="mt-1 text-sm text-muted">Physical products sold at the shop — kept separate from services.</p>

      <div className="mt-6 flex flex-col gap-4">
        <NewProductForm businessId={businessId} outlets={outlets} />
        <ProductsList products={products ?? []} outlets={outlets} />
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <RecordProductSaleForm businessId={businessId} products={activeProducts} />
        <ProductSalesList sales={sales ?? []} isOwner={isOwner} />
      </div>
    </div>
  );
}
