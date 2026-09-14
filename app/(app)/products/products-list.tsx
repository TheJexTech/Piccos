"use client";

import { useState } from "react";
import { ProductRow } from "./product-row";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronDownIcon } from "@/components/ui/icons";
import type { Product } from "@/lib/products/types";
import type { Outlet } from "@/lib/business/outlets";

// Same collapsed-by-default pattern as Services — a shop with many
// products shouldn't turn the page into a long scroll of editable cards.
export function ProductsList({ products, outlets }: { products: Product[]; outlets: Outlet[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-sm shadow-ink/[0.02]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-ink">Products</span>
        <span className="flex items-center gap-3 text-sm text-muted">
          {products.length} product{products.length === 1 ? "" : "s"}
          <ChevronDownIcon className={`size-4 text-ink transition-transform ${expanded ? "rotate-180" : ""}`} />
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border p-5">
          {products.length === 0 ? (
            <EmptyState message="No products yet." />
          ) : (
            <ul className="flex flex-col gap-4">
              {products.map((product) => (
                <ProductRow key={product.id} product={product} outlets={outlets} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
