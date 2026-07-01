import { useState, useEffect, useMemo } from "react";
import { useSubmissions, type Submission, type SubmissionStatus } from "@/contexts/SubmissionsContext";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Search, ArrowLeft, LogOut, LogIn, Settings } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const formTypeLabels: Record<string, string> = {
  leave: "Gate Pass",
};

const statusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-xs font-medium px-3 py-1">Approved</Badge>;
    case "on_leave":
      return <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-0 text-xs font-medium px-3 py-1">On Leave</Badge>;
    case "approved_hod":
      return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-0 text-xs font-medium px-3 py-1">HOD Approved</Badge>;
    case "approved_hos":
      return <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-400 border-0 text-xs font-medium px-3 py-1">HOS Approved</Badge>;
    case "rejected":
      return <Badge className="bg-destructive/15 text-destructive dark:text-red-400 border-0 text-xs font-medium px-3 py-1">Rejected</Badge>;
    case "pending":
    default:
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-xs font-medium px-3 py-1">Pending HOS</Badge>;
  }
};

const getInitials = (name?: string) =>
  (name || " ").split(" ").map(n => n ? n[0] : "").join("").toUpperCase().slice(0, 2);

const getInitialColor = (name: string) => {
  const colors = ["bg-violet-500/15 text-violet-700 dark:text-violet-400", "bg-sky-500/15 text-sky-700 dark:text-sky-400", "bg-amber-500/15 text-amber-700 dark:text-amber-400", "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", "bg-rose-500/15 text-rose-700 dark:text-rose-400"];
  let hash = 0;
  const safeName = name || " ";
  for (let i = 0; i < safeName.length; i++) {
    hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const SecurityDashboard = () => {
  const { submissions, updateSubmissionStatus } = useSubmissions();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"action_required" | "on_leave" | "in_progress" | "history">("action_required");
  const [isViewAll, setIsViewAll] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [securityLog, setSecurityLog] = useState({
    actualTimeOut: "",
    actualTimeIn: "",
    vehicleNo: "",
    remarks: "",
  });

  useEffect(() => {
    if (selectedSubmission) {
      setSecurityLog({
        actualTimeOut: selectedSubmission.data.securityLog?.actualTimeOut || new Date().toTimeString().slice(0, 5),
        actualTimeIn: selectedSubmission.data.securityLog?.actualTimeIn || '',
        vehicleNo: selectedSubmission.data.securityLog?.vehicleNo || '',
        remarks: selectedSubmission.data.remarks || '',
      });
    }
  }, [selectedSubmission]);
  // Security guard only sees leave forms
  const filtered = submissions
    .filter(s => s.formType === "leave")
    .filter(s => {
      if (!search) return true;
      const q = search.toLowerCase();
      const dateStr1 = new Date(s.submittedAt).toLocaleDateString("en-CA");
      const dateStr2 = new Date(s.submittedAt).toLocaleDateString("en-GB");
      const typeStr = (formTypeLabels[s.formType] || s.formType).toLowerCase();
      return (s.employeeName || '').toLowerCase().includes(q) || 
             (s.id || '').toLowerCase().includes(q) ||
             (s.department || '').toLowerCase().includes(q) ||
             (typeStr || '').toLowerCase().includes(q) ||
             (dateStr1 || '').includes(q) ||
             (dateStr2 || '').includes(q);
    });

  const isRecent = (dateStr: string) => {
    const hours = (new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
    return hours < 48; // Checks if submitted within the last 48 hours
  };

  const tabFiltered = filtered.filter(s => {
    if (activeTab === "action_required") return s.status === "approved_hod";
    if (activeTab === "on_leave") return s.status === "on_leave";
    if (activeTab === "in_progress") return s.status === "pending" || s.status === "approved_hos";
    if (activeTab === "history") return s.status === "approved" || s.status === "rejected";
    return true;
  });

  const stats = {
    total: filtered.length,
    actionRequired: filtered.filter(s => s.status === "approved_hod").length,
    onLeave: filtered.filter(s => s.status === "on_leave").length,
    inProgress: filtered.filter(s => s.status === "pending" || s.status === "approved_hos").length,
    approvalRate: filtered.length > 0 ? Math.round((filtered.filter(s => s.status === "approved").length / filtered.length) * 100) : 0,
  };

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

  const handleAction = (id: string, newStatus: SubmissionStatus, logData: any) => {
    const currentData = selectedSubmission?.data || {};
    const updatedSecurityLog = { ...(currentData.securityLog || {}), ...logData };
    
    updateSubmissionStatus(id, newStatus, { 
      securityLog: updatedSecurityLog,
      remarks: logData?.remarks || securityLog.remarks,
      rejectedStage: newStatus === "rejected" ? "admin" : undefined
    });
    toast.success(`Submission status updated to "${newStatus.replace('_', ' ')}".`);
    setSelectedSubmission(null);
  };

  const renderLeaveDetail = (sub: Submission) => {
    const refNo = generateRefNo(sub);
    const passType = sub.data.purposeType === 'company' ? 'Company Business' : 'Personal Matter';

    return (
      <>
        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">MAKLUMAT PEKERJA / EMPLOYEE SUMMARY</p>
        <div className="bg-muted/30 rounded-xl p-5 mb-8">
          <p className="text-lg font-bold text-foreground">{sub.employeeName}</p>
          <p className="text-sm text-muted-foreground mb-1">Staff ID: {sub.data.employeeInfo?.staffNo || sub.submittedBy}</p>
          <p className="text-sm text-muted-foreground mb-1">Department: {sub.department}</p>
          <p className="text-sm text-muted-foreground mb-3">Position: {sub.data.employeeInfo?.position || sub.data.position || "—"}</p>
        </div>

        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">RINGKASAN PERMOHONAN / SUBMISSION SUMMARY</p>
        <div className="bg-muted/30 rounded-xl divide-y divide-border mb-8">
          <div className="flex justify-between items-center px-5 py-3">
            <span className="text-sm text-primary">Ref No</span>
            <span className="text-sm font-bold text-foreground">{refNo}</span>
          </div>
          <div className="flex justify-between items-center px-5 py-3">
            <span className="text-sm text-primary">Form Type</span>
            <Badge className="bg-emerald-100 text-emerald-800 border-0 text-xs font-bold">Gate Pass</Badge>
          </div>
          <div className="flex justify-between items-center px-5 py-3">
            <span className="text-sm text-primary">Pass Type</span>
            <span className="text-sm font-bold text-foreground">{passType}</span>
          </div>
          <div className="flex justify-between items-start px-5 py-3">
            <span className="text-sm text-primary shrink-0 mr-4">Reason</span>
            <span className="text-sm font-bold text-foreground text-right">{sub.data.companyDetails?.purpose || sub.data.personalDetails?.purpose || "No reason provided"}</span>
          </div>
          {sub.data.securityLog && (sub.data.securityLog.actualTimeOut || sub.data.securityLog.actualTimeIn) && (
            <>
              <div className="flex justify-between items-center px-5 py-3">
                <span className="text-sm text-primary">Actual Time Out</span>
                <span className="text-sm font-bold text-foreground">{sub.data.securityLog.actualTimeOut || '—'}</span>
              </div>
              <div className="flex justify-between items-center px-5 py-3">
                <span className="text-sm text-primary">Actual Time In</span>
                <span className="text-sm font-bold text-foreground">{sub.data.securityLog.actualTimeIn || '—'}</span>
              </div>
              <div className="flex justify-between items-center px-5 py-3">
                <span className="text-sm text-primary">Vehicle No.</span>
                <span className="text-sm font-bold text-foreground">{sub.data.securityLog.vehicleNo || '—'}</span>
              </div>
            </>
          )}
        </div>
      </>
    );
  };

  // Review detail view
  if (selectedSubmission) {
    const canApprove = selectedSubmission.status === "approved_hod";
    const isOnLeave = selectedSubmission.status === "on_leave";

    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <button onClick={() => setSelectedSubmission(null)} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all mb-6 group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to list
        </button>

        {renderLeaveDetail(selectedSubmission)}

        {selectedSubmission.data.remarks && (
          <div className={`p-4 rounded-xl border mb-6 ${selectedSubmission.status === 'rejected' ? 'bg-destructive/10 border-destructive/20 text-destructive dark:text-red-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-300'}`}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">Approver Remarks / Ulasan Pelulus</p>
            <p className="text-sm font-medium">"{selectedSubmission.data.remarks}"</p>
          </div>
        )}

        {!(canApprove || isOnLeave) && (
          <div className="p-4 bg-muted/30 rounded-xl text-center">
            <p className="text-sm text-muted-foreground font-medium">
              {selectedSubmission.status === "pending" ? "Waiting for Head of Section (HOS) approval." :
               selectedSubmission.status === "approved_hos" ? "Waiting for Head of Department (HOD) approval." :
               "No action required at this time."}
            </p>
          </div>
        )}

        {canApprove && (
          <div className="card-elevated p-6 mt-6">
            <h3 className="font-bold text-foreground text-lg mb-4">Log Employee Exit</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-primary">Actual Time Out</Label>
                  <Input type="time" value={securityLog.actualTimeOut} onChange={e => setSecurityLog(p => ({...p, actualTimeOut: e.target.value}))} className="h-11 mt-1 dark:[color-scheme:dark]" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-primary">Vehicle No.</Label>
                  <Input value={securityLog.vehicleNo} onChange={e => setSecurityLog(p => ({...p, vehicleNo: e.target.value}))} placeholder="e.g. WXY 1234" className="h-11 mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-primary">Remarks / Ulasan</Label>
                <Input value={securityLog.remarks} onChange={e => setSecurityLog(p => ({...p, remarks: e.target.value}))} placeholder="Please enter remarks if any / Sila masukkan ulasan jika ada..." className="h-11 mt-1" />
              </div>
              <div className="flex gap-4 pt-4 border-t border-border">
                <button onClick={() => handleAction(selectedSubmission.id, "rejected", { remarks: securityLog.remarks })} className="flex-1 px-6 py-3 rounded-xl bg-destructive text-white font-bold text-center hover:bg-destructive/90 transition-colors">REJECT</button>
                <button onClick={() => handleAction(selectedSubmission.id, "on_leave", { actualTimeOut: securityLog.actualTimeOut, vehicleNo: securityLog.vehicleNo })} className="flex-1 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-center hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"><LogOut className="h-4 w-4" /> CONFIRM EXIT</button>
              </div>
            </div>
          </div>
        )}

        {isOnLeave && (
          <div className="card-elevated p-6 mt-6">
            <h3 className="font-bold text-foreground text-lg mb-4">Log Employee Entry</h3>
            <div className="space-y-4">
              <div className="bg-muted/20 p-3 sm:p-4 rounded-lg border border-border/50 flex mb-2">
                <div className="flex-1 border-r border-border/50 pr-3 sm:pr-4">
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-wider">LOGGED OUT AT</p>
                  <p className="text-xs sm:text-sm font-semibold text-foreground mt-0.5">{selectedSubmission.data.securityLog?.actualTimeOut || 'N/A'}</p>
                </div>
                <div className="flex-1 pl-3 sm:pl-4">
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-wider">VEHICLE NO.</p>
                  <p className="text-xs sm:text-sm font-semibold text-foreground mt-0.5">{selectedSubmission.data.securityLog?.vehicleNo || 'N/A'}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-primary">Actual Time In</Label>
                <Input type="time" value={securityLog.actualTimeIn || new Date().toTimeString().slice(0, 5)} onChange={e => setSecurityLog(p => ({...p, actualTimeIn: e.target.value}))} className="h-11 mt-1 dark:[color-scheme:dark]" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-primary">Remarks / Ulasan</Label>
                <Input value={securityLog.remarks} onChange={e => setSecurityLog(p => ({...p, remarks: e.target.value}))} placeholder="Please enter remarks if any / Sila masukkan ulasan jika ada..." className="h-11 mt-1" />
              </div>
              <div className="pt-4 border-t border-border">
                <button 
                  onClick={() => handleAction(selectedSubmission.id, "approved", { actualTimeIn: securityLog.actualTimeIn || new Date().toTimeString().slice(0, 5) })} 
                  className="w-full px-6 py-3 rounded-xl bg-emerald-500 text-white font-bold text-center hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                >
                  <LogIn className="h-4 w-4" /> CONFIRM ENTRY & COMPLETE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Security Dashboard / Papan Pemuka Keselamatan</h1>
        <p className="text-muted-foreground text-sm mt-1">Review and approve all incoming Gate Pass requests.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Total Submissions</p>
          <p className="text-4xl font-bold text-foreground">{stats.total > 0 ? `${stats.total}` : "0"}</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Action Required</p>
          <p className="text-4xl font-bold text-foreground">{stats.actionRequired}</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Currently On Leave</p>
          <p className="text-4xl font-bold text-foreground">{stats.onLeave}</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Approval Rate</p>
          <p className="text-4xl font-bold text-foreground">{stats.approvalRate}%</p>
        </div>
      </div>

      {/* Action Tabs */}
      <div className="flex w-full overflow-x-auto no-scrollbar gap-2 mb-6">
        <button onClick={() => { setActiveTab("action_required"); setIsViewAll(false); }} className={`flex-1 sm:flex-none flex items-center justify-center whitespace-nowrap px-3 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-colors border ${activeTab === "action_required" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:text-foreground"}`}>
          Action Required
          {stats.actionRequired > 0 && (
            <Badge className="ml-1.5 border-0 text-[10px] sm:text-xs px-1.5 sm:px-2 bg-red-500 text-white hover:bg-red-600">{stats.actionRequired}</Badge>
          )}
        </button>
        <button onClick={() => { setActiveTab("on_leave"); setIsViewAll(false); }} className={`flex-1 sm:flex-none flex items-center justify-center whitespace-nowrap px-3 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-colors border ${activeTab === "on_leave" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:text-foreground"}`}>
          On Leave
          {stats.onLeave > 0 && (
            <Badge className="ml-1.5 border-0 text-[10px] sm:text-xs px-1.5 sm:px-2 bg-indigo-500 text-white hover:bg-indigo-600">{stats.onLeave}</Badge>
          )}
        </button>
        <button onClick={() => { setActiveTab("in_progress"); setIsViewAll(false); }} className={`flex-1 sm:flex-none flex items-center justify-center whitespace-nowrap px-3 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-colors border ${activeTab === "in_progress" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:text-foreground"}`}>
          In Progress
          {stats.inProgress > 0 && (
            <Badge className="ml-1.5 border-0 text-[10px] sm:text-xs px-1.5 sm:px-2 bg-amber-500 text-white hover:bg-amber-600">{stats.inProgress}</Badge>
          )}
        </button>
        <button onClick={() => { setActiveTab("history"); setIsViewAll(false); }} className={`flex-1 sm:flex-none flex items-center justify-center whitespace-nowrap px-3 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-colors border ${activeTab === "history" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:text-foreground"}`}>
          History
        </button>
      </div>

      {/* Submissions Table */}
      <div className="card-elevated overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Recent Submissions / Penyerahan Terkini</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, date, or type..." 
              value={search} 
              onChange={e => { setSearch(e.target.value); setIsViewAll(false); }} 
              className="pl-9 w-full sm:w-72 h-9 text-sm" 
            />
          </div>
        </div>

        {tabFiltered.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No submissions found in this tab</h3>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-bold uppercase tracking-wider">ID</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Employee / Pekerja</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Type</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Status / Status</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
            {(isViewAll ? tabFiltered : tabFiltered.slice(0, 10)).map((sub) => {
              const avatarUrl = (sub as any).avatar || sub.data?.employeeInfo?.avatar || sub.data?.avatar;
              return (
                <TableRow key={sub.id} className={`${activeTab === "action_required" && isRecent(sub.submittedAt) ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/20"}`}>
                    <TableCell className="text-sm font-medium text-muted-foreground">{generateRefNo(sub)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden ${!avatarUrl ? getInitialColor(sub.employeeName) : 'bg-transparent'}`}>
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={sub.employeeName} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(sub.employeeName)
                      )}
                        </div>
                        <span className="text-sm font-medium text-foreground">{sub.employeeName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">{formTypeLabels[sub.formType] || sub.formType}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-sm text-muted-foreground">{new Date(sub.submittedAt).toLocaleDateString("en-CA")}</span>
                        {activeTab === "action_required" && isRecent(sub.submittedAt) && (
                          <Badge className="bg-blue-500 text-white border-0 text-[9px] px-1.5 py-0 uppercase tracking-wider font-bold">NEW</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{statusBadge(sub.status)}</TableCell>
                    <TableCell className="text-center">
                      <button onClick={() => setSelectedSubmission(sub)} className="text-xs sm:text-sm font-bold text-foreground hover:text-primary transition-colors">
                        {sub.status === "approved_hod" ? "Review Exit" : sub.status === "on_leave" ? "Review Entry" : "Details"}
                      </button>
                    </TableCell>
                  </TableRow>
              );
            })}
              </TableBody>
            </Table>
            </div>
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-sm text-muted-foreground">Showing {Math.min(tabFiltered.length, isViewAll ? tabFiltered.length : 10)} of {tabFiltered.length} results</p>
              {tabFiltered.length > 10 && (
                <button 
                  onClick={() => setIsViewAll(!isViewAll)}
                  className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm"
                >
                  {isViewAll ? "View Less" : "View More"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SecurityDashboard;