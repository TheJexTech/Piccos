import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, requireCurrentMembership } from "@/lib/business/current";
import { LAST_STAFF_COOKIE } from "@/lib/activity/constants";
import { SectionCard } from "@/components/ui/section-card";
import { RecordingTabs } from "./recording-tabs";
import { ActivityList } from "./activity-list";
import { BatchList } from "./batch-list";
import type { Transaction } from "@/lib/transactions/types";
import type { Batch } from "@/lib/batches/types";

type StaffRow = { id: string; display_name: string; station_id: string | null; stations: { name: string } | null };

export default async function ActivityPage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) redirect("/login");

  const membership = await requireCurrentMembership(supabase, user.id);
  const businessId = membership.businessId;
  const isOwner = membership.role === "owner";

  const cookieStore = await cookies();
  const lastStaffId = cookieStore.get(LAST_STAFF_COOKIE)?.value ?? "";

  const [{ data: staff }, { data: stations }, { data: services }, { data: transactions }, { data: batches }] =
    await Promise.all([
      supabase
        .from("staff")
        .select("id, display_name, station_id, stations:station_id(name)")
        .eq("business_id", businessId)
        .eq("status", "active")
        .order("display_name", { ascending: true })
        .returns<StaffRow[]>(),
      supabase
        .from("stations")
        .select("id, name")
        .eq("business_id", businessId)
        .eq("status", "active")
        .order("name", { ascending: true }),
      supabase
        .from("services")
        .select("id, name, price")
        .eq("business_id", businessId)
        .eq("status", "active")
        .order("name", { ascending: true }),
      supabase
        .from("transactions")
        .select(
          "id, transaction_date, amount, payment_method, service_name, correction_of_id, tip_amount, tip_payment_method, staff:staff_id(display_name), stations:station_id(name)",
        )
        .eq("business_id", businessId)
        .order("transaction_date", { ascending: false })
        .limit(50)
        .returns<Transaction[]>(),
      supabase
        .from("batches")
        .select("id, batch_date, tip_amount, status, staff:staff_id(display_name), batch_services(service_name, quantity, line_total)")
        .eq("business_id", businessId)
        .order("batch_date", { ascending: false })
        .limit(50)
        .returns<Batch[]>(),
    ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Activity</h1>
      <p className="mt-1 text-sm text-muted">Record a single sale, or a staff member&apos;s whole day at once.</p>

      <div className="mt-6">
        {(stations ?? []).length === 0 ? (
          <p className="text-sm text-muted">
            <Link href="/shop/outlets" className="font-medium text-brown-700 underline">
              Set up your first outlet
            </Link>{" "}
            before recording activity.
          </p>
        ) : (staff ?? []).length === 0 ? (
          <p className="text-sm text-muted">
            <Link href="/shop/staff" className="font-medium text-brown-700 underline">
              Add your staff
            </Link>{" "}
            before recording activity.
          </p>
        ) : (services ?? []).length === 0 ? (
          <p className="text-sm text-muted">
            <Link href="/shop/services" className="font-medium text-brown-700 underline">
              Add your services
            </Link>{" "}
            before recording activity.
          </p>
        ) : (
          <RecordingTabs
            businessId={businessId}
            staff={staff ?? []}
            services={services ?? []}
            defaultStaffId={lastStaffId}
          />
        )}
      </div>

      <div className="mt-8">
        <SectionCard title="Individual transactions">
          <ActivityList transactions={transactions ?? []} isOwner={isOwner} />
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title="Batch entries">
          <BatchList batches={batches ?? []} isOwner={isOwner} />
        </SectionCard>
      </div>
    </div>
  );
}
