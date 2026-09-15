import { Skeleton } from "@/components/ui/skeleton";

export default function ServicesLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="mt-4 h-9 w-64 rounded-full" />
      <Skeleton className="mt-6 h-16 w-full rounded-2xl" />
      <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
    </div>
  );
}
