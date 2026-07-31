interface EmployeeSummaryProps {
  name: string;
  staffId?: string;
  department?: string;
  position?: string;
  additionalDetails?: Array<{ label: string; value?: string }>;
  className?: string;
}

const EmployeeSummary = ({
  name,
  staffId = "—",
  department = "—",
  position = "—",
  additionalDetails = [],
  className = "",
}: EmployeeSummaryProps) => (
  <section className={className}>
    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary print:text-black">Employee Summary</p>
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4 sm:p-5 print:border-gray-300 print:bg-transparent">
      <p className="mb-3 text-lg font-bold leading-tight text-foreground print:text-black">{name}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground print:text-gray-500">Staff ID</p>
          <p className="mt-0.5 text-sm font-medium text-foreground print:text-black">{staffId}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground print:text-gray-500">Department</p>
          <p className="mt-0.5 text-sm font-medium text-foreground print:text-black">{department}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground print:text-gray-500">Position</p>
          <p className="mt-0.5 text-sm font-medium text-foreground print:text-black">{position}</p>
        </div>
        {additionalDetails.map(detail => (
          <div key={detail.label}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground print:text-gray-500">{detail.label}</p>
            <p className="mt-0.5 break-words text-sm font-medium text-foreground print:text-black">{detail.value || "—"}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default EmployeeSummary;
