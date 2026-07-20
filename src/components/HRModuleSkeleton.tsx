import { Skeleton } from "@/components/ui/skeleton";

const HRModuleSkeleton = ({ cards = 3 }: { cards?: number }) => (
  <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in-5 duration-300" aria-busy="true" aria-live="polite">
    <div className="mb-6 flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <div className="space-y-2"><Skeleton className="h-6 w-52" /><Skeleton className="h-4 w-72 max-w-full" /></div>
    </div>
    <div className={`mb-6 grid gap-4 ${cards === 4 ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-3"}`}>
      {Array.from({ length: cards }).map((_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}
    </div>
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between"><Skeleton className="h-6 w-44" /><Skeleton className="h-9 w-28" /></div>
      <div className="space-y-3">
        <Skeleton className="h-11 w-full" />
        {[0, 1, 2, 3, 4].map(item => <Skeleton key={item} className="h-14 w-full" />)}
      </div>
    </div>
  </div>
);

export default HRModuleSkeleton;
