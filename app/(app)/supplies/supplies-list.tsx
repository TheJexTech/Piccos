"use client";

import { useState } from "react";
import Link from "next/link";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { selectClasses } from "@/components/ui/select-field";
import type { Material } from "@/lib/materials/types";

// Client-side filtering over the already-fetched list — instant for the
// hundreds-of-items scale a shop's supply cabinet actually reaches, no
// search backend needed for V1.
export function SuppliesList({ materials }: { materials: Material[] }) {
  const [query, setQuery] = useState("");

  if (materials.length === 0) {
    return (
      <SectionCard>
        <EmptyState message="No supplies yet." />
      </SectionCard>
    );
  }

  const filtered = materials.filter((m) => m.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <SectionCard>
      <input
        type="text"
        placeholder="Search supplies..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={`w-full ${selectClasses()}`}
      />

      {filtered.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No supplies match &quot;{query}&quot;.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-1">
          {filtered.map((m) => (
            <li key={m.id}>
              <Link
                href={`/supplies/${m.id}`}
                className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm text-ink hover:border-brown-700"
              >
                <span>{m.name}</span>
                <span className="text-muted">{m.current_quantity}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
