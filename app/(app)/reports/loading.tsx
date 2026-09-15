import { Skeleton } from "@/components/ui/skeleton";
import { SectionCard } from "@/components/ui/section-card";

export default function ReportsLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="mt-2 h-4 w-48" />

      <div className="mt-6">
        <Skeleton className="h-[76px] w-full rounded-2xl" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>

      <div className="mt-6">
        <SectionCard title="Revenue trend">
          <Skeleton className="h-48 w-full" />
        </SectionCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Revenue by barber">
          <Skeleton className="h-40 w-full" />
        </SectionCard>
        <SectionCard title="Revenue by service">
          <Skeleton className="h-40 w-full" />
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title="Historical activity">
          <Skeleton className="h-40 w-full" />
        </SectionCard>
      </div>
    </div>
  );
}
