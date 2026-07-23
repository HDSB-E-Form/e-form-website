import { Skeleton } from "@/components/ui/skeleton";

type SafetyDashboardSkeletonProps = {
  variant?: "dashboard" | "records";
};

const SafetyDashboardSkeleton = ({ variant = "dashboard" }: SafetyDashboardSkeletonProps) => (
  <div className="mx-auto max-w-7xl animate-in fade-in-5 p-6 duration-300 lg:p-8" aria-busy="true" aria-live="polite">
    <div className="mb-6 flex items-center justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56 max-w-[70vw]" />
        <Skeleton className="h-4 w-80 max-w-[80vw]" />
      </div>
      <Skeleton className="h-10 w-28 shrink-0" />
    </div>

    {variant === "dashboard" ? (
      <>
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map(card => (
            <div key={card} className="card-elevated space-y-3 p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
        <div className="card-elevated mb-6 p-5">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row">
            <div className="space-y-2"><Skeleton className="h-5 w-44" /><Skeleton className="h-3 w-64" /></div>
            <div className="flex gap-2"><Skeleton className="h-9 w-32" /><Skeleton className="h-9 w-32" /></div>
          </div>
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </>
    ) : (
      <div className="card-elevated overflow-hidden">
        <div className="border-b border-border p-5"><Skeleton className="h-9 w-full max-w-sm" /></div>
        <div className="space-y-5 p-5">
          {[0, 1, 2, 3, 4, 5].map(row => (
            <div key={row} className="grid grid-cols-2 items-center gap-4 sm:grid-cols-4 lg:grid-cols-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="hidden h-4 w-24 sm:block" />
              <Skeleton className="hidden h-4 w-20 sm:block" />
              <Skeleton className="hidden h-5 w-20 rounded-full lg:block" />
              <Skeleton className="hidden h-8 w-16 justify-self-end lg:block" />
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

export default SafetyDashboardSkeleton;
