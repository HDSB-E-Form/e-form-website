import { useState, useMemo, useEffect } from "react";
import { useSubmissions, type Submission } from "@/contexts/SubmissionsContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer } from "lucide-react";
import logo from "@/assets/logo.png";
import HRModuleSkeleton from "@/components/HRModuleSkeleton";

const getInitials = (name?: string) => (name || " ").split(" ").map(n => n ? n[0] : "").join("").toUpperCase().slice(0, 2);
const getInitialColor = (name: string) => {
  const colors = ["bg-violet-500/15 text-violet-700 dark:text-violet-400", "bg-sky-500/15 text-sky-700 dark:text-sky-400", "bg-amber-500/15 text-amber-700 dark:text-amber-400", "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", "bg-rose-500/15 text-rose-700 dark:text-rose-400"];
  let hash = 0;
  const safeName = name || " ";
  for (let i = 0; i < safeName.length; i++) {
    hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const PurchasesDashboard = () => {
  const { submissions, refreshSubmissions, isLoading } = useSubmissions();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  useEffect(() => { void refreshSubmissions(); }, [refreshSubmissions]);

  const purchaseSubmissions = submissions.filter(s => s.formType === "ppe_purchase");

  const refNoMap = useMemo(() => {
    const map = new Map<string, string>();
    const excludedForms = ["inventory_addition", "ppe_request", "waste_inventory", "mixing_chemical_stages", "final_discharge", "daily_operation_monitoring"];
    const standardForms = submissions
      .filter(s => !excludedForms.includes(s.formType))
      .sort((a, b) => {
        const timeDiff = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
        return timeDiff !== 0 ? timeDiff : a.id.localeCompare(b.id);
      });
    standardForms.forEach((s, idx) => {
      map.set(s.id, `HDSB-${String(idx + 1).padStart(4, "0")}`);
    });
    return map;
  }, [submissions]);

  const generateRefNo = (sub: Submission) => {
    return refNoMap.get(sub.id) || `HDSB-${sub.id.replace(/\D/g, "").slice(0, 4).padStart(4, "0")}`;
  };

  const handlePrint = (sub: Submission) => {
    setSelectedSubmission(sub);
    setTimeout(() => {
      const originalTitle = document.title;
      document.title = `Purchase_${generateRefNo(sub)}`;
      
      const isDark = document.documentElement.classList.contains('dark');
      if (isDark) document.documentElement.classList.remove('dark');

      window.onafterprint = () => {
        document.title = originalTitle;
        if (isDark) document.documentElement.classList.add('dark');
        setSelectedSubmission(null);
        window.onafterprint = null;
      };
      window.print();
      setTimeout(() => { document.title = originalTitle; setSelectedSubmission(null); }, 2000);
    }, 100);
  };

  if (isLoading) return <HRModuleSkeleton cards={3} />;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Purchases</h1>
        <p className="text-muted-foreground text-sm mt-1">Review submitted PPE & Uniform purchase forms.</p>
      </div>

      <div className="card-elevated p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Equipment Purchases</h2>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary">{purchaseSubmissions.length}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Submissions</p>
          </div>
        </div>

        <div className="border border-border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Employee</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Category</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Date</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseSubmissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No purchase submissions yet.
                  </TableCell>
                </TableRow>
              ) : (
                purchaseSubmissions.map(sub => (
                  <TableRow key={sub.id} className="hover:bg-muted/5 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden ${!sub.data.employeeInfo?.avatar ? getInitialColor(sub.employeeName) : 'bg-transparent'}`}>
                          {sub.data.employeeInfo?.avatar ? (
                            <img src={sub.data.employeeInfo.avatar} alt={sub.employeeName} className="w-full h-full object-cover" />
                          ) : (
                            getInitials(sub.employeeName)
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{sub.employeeName}</p>
                          <p className="text-xs text-muted-foreground">{sub.data.employeeInfo?.position || sub.department}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{sub.data.requestCategory?.toUpperCase() || "PPE"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{new Date(sub.submittedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-center">
                      <button onClick={() => handlePrint(sub)} className="text-xs sm:text-sm font-bold text-foreground hover:text-primary transition-colors flex items-center gap-2 mx-auto">
                        <Printer className="h-4 w-4" /> Print
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default PurchasesDashboard;
