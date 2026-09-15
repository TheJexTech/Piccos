import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, requireCurrentMembership } from "@/lib/business/current";
import type { AuditLogEntry } from "@/lib/audit/types";

function summarizeOldValues(entry: AuditLogEntry): string | null {
  const values = entry.old_values;
  if (!values) return null;
  if (entry.entity_type === "transactions" || entry.entity_type === "expenses") {
    const amount = values.amount;
    if (typeof amount === "number" || typeof amount === "string") {
      return `Original amount: ${Number(amount).toFixed(2)}`;
    }
  }
  return null;
}

export default async function AuditLogPage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) redirect("/login");

  const membership = await requireCurrentMembership(supabase, user.id);

  if (membership.role !== "owner") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Audit log</h1>
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          Only the owner can view the audit log.
        </p>
      </div>
    );
  }

  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, old_values, reason, created_at")
    .eq("business_id", membership.businessId)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<AuditLogEntry[]>();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Audit log</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Every correction made to a financial record, with who, when, and why.
      </p>

      {(logs ?? []).length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">No corrections recorded yet.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-2">
          {(logs ?? []).map((entry) => (
            <li
              key={entry.id}
              className="rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800"
            >
              <p className="text-black dark:text-zinc-50">
                {entry.action} · {entry.entity_type}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {new Date(entry.created_at).toLocaleString("en-US")}
              </p>
              {summarizeOldValues(entry) && (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {summarizeOldValues(entry)}
                </p>
              )}
              {entry.reason && (
                <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                  Reason: {entry.reason}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
