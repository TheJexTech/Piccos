import { Skeleton } from "@/components/ui/skeleton";
import { SectionCard } from "@/components/ui/section-card";

export default function DashboardLoading() {
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-full sm:w-56" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard title="Revenue">
            <Skeleton className="h-24 w-full" />
          </SectionCard>
        </div>
        <SectionCard title="Estimated Profit">
          <Skeleton className="h-24 w-full" />
        </SectionCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard title="Revenue trend" description="This month, by day">
            <Skeleton className="h-48 w-full" />
          </SectionCard>
        </div>
        <SectionCard title="Best Performing Staff" description="This month">
          <Skeleton className="h-48 w-full" />
        </SectionCard>
      </div>
    </div>
  );
}
