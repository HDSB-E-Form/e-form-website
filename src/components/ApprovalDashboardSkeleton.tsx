import { FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ApprovalDashboardSkeletonProps {
  title: string;
  description: string;
  statsCount?: number;
}

const ApprovalDashboardSkeleton = ({ title, description, statsCount = 4 }: ApprovalDashboardSkeletonProps) => (
  <div
    className="p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in-5 duration-300"
    aria-busy="true"
    aria-live="polite"
  >
    <div className="mb-6 flex items-center gap-3">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <FileText className="h-5 w-5" />
        <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-primary/60" />
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-primary" />
      </div>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>

    <div className={`grid grid-cols-1 gap-4 mb-6 ${statsCount === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}>
      {Array.from({ length: statsCount }, (_, index) => (
        <div key={index} className="card-elevated p-5">
          <Skeleton className="mb-3 h-3 w-28" />
          <Skeleton className="h-9 w-14" />
        </div>
      ))}
    </div>

    <div className="mb-6 flex gap-2 overflow-hidden">
      {[132, 108, 84].map((width, index) => (
        <Skeleton key={index} className="h-10 flex-shrink-0 rounded-full" style={{ width }} />
      ))}
    </div>

    <div className="card-elevated overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-9 w-full sm:w-72" />
      </div>
      <div className="p-5 space-y-5">
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 items-center">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 flex-shrink-0 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="hidden sm:block h-4 w-28" />
            <Skeleton className="hidden lg:block h-5 w-20 rounded-full justify-self-center" />
            <Skeleton className="hidden lg:block h-4 w-16 justify-self-end" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default ApprovalDashboardSkeleton;
