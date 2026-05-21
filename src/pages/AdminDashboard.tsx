import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions, type Submission, type SubmissionStatus } from "@/contexts/SubmissionsContext";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Search, ArrowLeft, FileText, Package, Box, AlertTriangle, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formTypeLabels: Record<string, string> = {
  car_rental: "Vehicle Request",
  claim: "Expense",
  leave: "Gate Pass",
  ppe_request: "PPE / Uniform / Office",
};

const statusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-xs font-medium px-3 py-1">Fully Approved</Badge>;
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

const INITIAL_STOCK = {
  "Goggle": 100,
  "Helmet": 50,
  "Safety Boot": 50,
  "Safety Shoe": 50,
  "Safety Insert": 50,
  "Earplug": 200,
  "Apron": 30,
  "Crane Vest": 30,
  "3-ply Mask": 500,
  "N-95 Mask": 100,
  "Forklift Vest": 30,
};

const PPE_ITEMS = ["Goggle", "Helmet", "Safety Boot", "Safety Shoe", "Safety Insert", "Earplug", "Apron", "Crane Vest", "3-ply Mask", "N-95 Mask", "Forklift Vest"];
const UNIFORM_ITEMS = ["Company T-Shirt (Short Sleeve)", "Company T-Shirt (Long Sleeve)", "Company Shirt", "Company Shirt (Long Sleeve)", "Cargo Pants"];
const OFFICE_ITEMS = ["Ball Pen", "Permanent Marker", "Highlighter", "Pencil", "Eraser", "Correction Tape", "A4 Paper", "Notebook", "Stapler", "Staple Pin", "Paper Clip", "Binder Clip", "File Folder", "Ring File", "Sticky Notes", "Scissors", "Glue Stick", "Clear Tape", "Calculator", "Whiteboard Marker", "A3 Paper", "A5 Paper"];

const getItemCategory = (name: string) => {
  if (PPE_ITEMS.includes(name)) return "ppe";
  if (UNIFORM_ITEMS.includes(name)) return "uniform";
  if (OFFICE_ITEMS.includes(name)) return "office";
  return "other";
};

// HR Admin Dashboard - sees leave and car_rental forms only
const AdminDashboard = () => {
  const { user } = useAuth();
  const { submissions, updateSubmissionStatus, addSubmission } = useSubmissions();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");
  const [remarks, setRemarks] = useState("");
  const [viewMode, setViewMode] = useState<"approvals" | "inventory">("approvals");
  const [activeTab, setActiveTab] = useState<"action_required" | "in_progress" | "history">("action_required");
  const [isViewAll, setIsViewAll] = useState(false);
  
  // Inventory State (Calculated from database history)
  const inventoryStock = useMemo(() => {
    const stock: Record<string, number> = { ...INITIAL_STOCK };
    submissions.filter(s => s.formType === "inventory_addition").forEach(sub => {
      const { itemName, quantity } = sub.data;
      if (itemName && quantity) {
        stock[itemName] = (stock[itemName] || 0) + parseInt(quantity);
      }
    });
    return stock;
  }, [submissions]);
  const [isStockSheetOpen, setIsStockSheetOpen] = useState(false);
  const [stockForm, setStockForm] = useState({ itemName: "", quantity: "" });
  const [customItem, setCustomItem] = useState("");
  const [inventoryTab, setInventoryTab] = useState<"all" | "ppe" | "uniform" | "office">("all");
  const [inventorySearch, setInventorySearch] = useState("");
  const [stockSheetCategory, setStockSheetCategory] = useState<"ppe" | "uniform" | "office" | "other">("ppe");

  // Separate standard approvals from instant-record inventory forms
  const approvalSubmissions = submissions.filter(s => ["car_rental", "leave"].includes(s.formType));
  const inventorySubmissions = submissions.filter(s => s.formType === "ppe_request");

  const filtered = approvalSubmissions
    .filter(s => {
      if (!search) return true;
      const q = search.toLowerCase();
      const dateStr1 = new Date(s.submittedAt).toLocaleDateString("en-CA");
      const dateStr2 = new Date(s.submittedAt).toLocaleDateString("en-GB");
      const typeStr = (formTypeLabels[s.formType] || s.formType).toLowerCase();
      return s.employeeName.toLowerCase().includes(q) || 
             s.id.toLowerCase().includes(q) ||
             s.department.toLowerCase().includes(q) ||
             typeStr.includes(q) ||
             dateStr1.includes(q) ||
             dateStr2.includes(q);
    });

  const isRecent = (dateStr: string) => {
    const hours = (new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
    return hours < 48; // Checks if submitted within the last 48 hours
  };

  const tabFiltered = filtered.filter(s => {
    if (activeTab === "action_required") return s.status === "approved_hod";
    if (activeTab === "in_progress") return s.status === "pending" || s.status === "approved_hos";
    if (activeTab === "history") return s.status === "approved" || s.status === "rejected";
    return true;
  });

  const stats = {
    total: filtered.length,
    actionRequired: filtered.filter(s => s.status === "approved_hod").length,
    inProgress: filtered.filter(s => s.status === "pending" || s.status === "approved_hos").length,
    approvalRate: filtered.length > 0 ? Math.round((filtered.filter(s => s.status === "approved").length / filtered.length) * 100) : 0,
  };

  const generateRefNo = (sub: Submission) => {
    const num = sub.id.replace(/\D/g, "").slice(0, 4).padStart(4, "0");
    return `HDSB-${num}`;
  };

  const handleAction = (id: string, status: SubmissionStatus) => {
    updateSubmissionStatus(id, status, remarks);
    toast.success(`Submission ${status === "approved" ? "accepted" : "rejected"} successfully`);
    setSelectedSubmission(null);
    setRemarks("");
  };

  const handleUpdateStock = async () => {
    const nameToUpdate = stockForm.itemName === "other" ? customItem : stockForm.itemName;
    if (!nameToUpdate || !stockForm.quantity) {
      toast.error("Please provide an item name and quantity");
      return;
    }

    const qty = parseInt(stockForm.quantity);
    const success = await addSubmission({
      formType: "inventory_addition",
      status: "approved",
      submittedBy: user?.id || "",
      employeeName: user?.name || "System Admin",
      department: user?.department || "HR",
      data: { itemName: nameToUpdate, quantity: qty, category: stockSheetCategory }
    });

    if (success) {
      toast.success(`${qty} unit(s) added to ${nameToUpdate} stock`);
      setIsStockSheetOpen(false);
      setStockForm({ itemName: "", quantity: "" });
      setCustomItem("");
    } else {
      toast.error("Failed to add stock to the database.");
    }
  };

  // Calculate Distributed Inventory
  const distributedItems: Record<string, number> = {};
  inventorySubmissions.forEach(sub => {
    if (sub.status === "approved" && sub.data?.items && Array.isArray(sub.data.items)) {
      sub.data.items.forEach((item: any) => {
        const name = item["Item Name"];
        const qty = parseInt(item.Quantity) || 0;
        if (name) distributedItems[name] = (distributedItems[name] || 0) + qty;
      });
    }
  });

  // Combine all known inventory items
  const allInventoryKeys = Array.from(new Set([...Object.keys(inventoryStock), ...Object.keys(distributedItems)])).sort();

  const filteredInventoryKeys = allInventoryKeys.filter(item => {
    const matchesTab = inventoryTab === "all" || getItemCategory(item) === inventoryTab;
    const matchesSearch = item.toLowerCase().includes(inventorySearch.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const recentActivity = useMemo(() => {
    return submissions
      .filter(s => (s.formType === "ppe_request" && s.status === "approved") || s.formType === "inventory_addition")
      .sort((a,b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, 30);
  }, [submissions]);

  const renderCarRentalDetail = (sub: Submission) => {
    const refNo = generateRefNo(sub);
    const startDate = sub.data.fromDate ? new Date(sub.data.fromDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
    const endDate = sub.data.toDate ? new Date(sub.data.toDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

    return (
      <>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setSelectedSubmission(null); setRemarks(""); }} className="inline-flex items-center justify-center w-12 h-12 text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all group print:hidden">
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <h2 className="text-xl font-bold text-foreground">Semakan Permohonan / Review Submission</h2>
        </div>

        <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">MAKLUMAT PEKERJA / EMPLOYEE SUMMARY</p>
        <div className="bg-muted/30 rounded-xl p-5 mb-8">
          <p className="text-lg font-bold text-foreground">{sub.employeeName}</p>
          <p className="text-sm text-muted-foreground mb-1">Staff ID: {sub.data.staffId || sub.submittedBy}</p>
          <p className="text-sm text-muted-foreground mb-3">Position: {sub.data.position || sub.data.employeeInfo?.position || "—"}</p>
          <p className="text-sm font-medium text-primary">{sub.department}</p>
        </div>

        <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">RINGKASAN PERMOHONAN / SUBMISSION SUMMARY</p>
        <div className="bg-muted/30 rounded-xl divide-y divide-border mb-8">
          <div className="flex justify-between items-center px-5 py-3">
            <span className="text-sm text-primary">Ref No</span>
            <span className="text-sm font-bold text-foreground">{refNo}</span>
          </div>
          <div className="flex justify-between items-center px-5 py-3">
            <span className="text-sm text-primary">Form Type</span>
            <Badge className="bg-sky-100 text-sky-800 border-0 text-xs font-bold">RENT CAR FORM</Badge>
          </div>
          <div className="flex justify-between items-center px-5 py-3">
            <span className="text-sm text-primary">Journey Dates</span>
            <span className="text-sm font-bold text-foreground">{startDate} - {endDate}</span>
          </div>
          <div className="flex justify-between items-center px-5 py-3">
            <span className="text-sm text-primary">Destination</span>
            <span className="text-sm font-bold text-foreground">{sub.data.destination || "—"}</span>
          </div>
          <div className="flex justify-between items-start px-5 py-3">
            <span className="text-sm text-primary shrink-0 mr-4">Purpose</span>
            <span className="text-sm font-bold text-foreground text-right">{sub.data.purpose || "No purpose provided"}</span>
          </div>
          {sub.data.licenseAttachment && (
            <div className="flex justify-between items-center px-5 py-3">
              <span className="text-sm text-primary shrink-0 mr-4">Attachment</span>
              <a href={sub.data.licenseAttachment} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-primary hover:underline flex items-center gap-1.5 text-right">
                <FileText className="h-4 w-4" /> View Driving License
              </a>
            </div>
          )}
          {sub.data.passengers && sub.data.passengers.some((p: any) => p.name) && (
            <div className="px-5 py-4 border-t border-border/50 bg-background/30">
              <span className="text-sm text-primary font-bold block mb-3">Passengers / Penumpang</span>
              <div className="space-y-2">
                {sub.data.passengers.filter((p: any) => p.name).map((p: any, i: number) => (
                  <div key={i} className="flex justify-between items-center bg-background/50 p-2.5 rounded-lg border border-border/50">
                    <div>
                      <p className="text-sm font-bold text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.department} {p.position ? `• ${p.position}` : ''}</p>
                    </div>
                    <span className="text-xs font-bold text-foreground bg-muted px-2 py-1 rounded">{p.staffId}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderPpeDetail = (sub: Submission) => {
    return (
      <>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setSelectedSubmission(null)} className="inline-flex items-center justify-center w-12 h-12 text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all group">
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <h2 className="text-xl font-bold text-foreground">Collection Record / Rekod Kutipan</h2>
        </div>
        <div className="bg-muted/30 rounded-xl p-5 mb-8 border border-border/50">
          <p className="text-lg font-bold text-foreground">{sub.employeeName}</p>
          <p className="text-sm text-muted-foreground mb-1">Position: {sub.data.employeeInfo?.position || sub.data.position || "—"}</p>
          <p className="text-sm font-medium text-primary mb-3">{sub.department}</p>
          <Badge className="bg-emerald-100 text-emerald-800 border-0 text-xs font-bold uppercase w-fit">
            {sub.data.requestCategory || "PPE"} Collection
          </Badge>
        </div>
        <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">ITEMS COLLECTED / BARANG DIAMBIL</p>
        <div className="border border-border rounded-lg overflow-hidden mb-6">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-xs font-bold text-muted-foreground">Item Name</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground">Size</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-right">Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(sub.data.items || []).map((item: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="font-semibold text-sm">{item["Item Name"]}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.Size || "—"}</TableCell>
                  <TableCell className="text-right font-bold">{item.Quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </>
    );
  };

  // Review detail view
  if (selectedSubmission) {
    const isCarRental = selectedSubmission.formType === "car_rental";
    const isPpe = selectedSubmission.formType === "ppe_request";
    // Enforce strict 3-step approval: HOS -> HOD -> HR
    const canApprove = selectedSubmission.status === "approved_hod";
    const isPending = selectedSubmission.status === "pending" || selectedSubmission.status === "approved_hos" || selectedSubmission.status === "approved_hod";

    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        {isCarRental && renderCarRentalDetail(selectedSubmission)}
        {isPpe && renderPpeDetail(selectedSubmission)}

        {selectedSubmission.data.remarks && (
          <div className={`p-4 rounded-xl border mb-6 ${selectedSubmission.status === 'rejected' ? 'bg-destructive/10 border-destructive/20 text-destructive dark:text-red-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-300'}`}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">Approver Remarks</p>
            <p className="text-sm font-medium">"{selectedSubmission.data.remarks}"</p>
          </div>
        )}

        {isPending && !canApprove && !isPpe && (
          <div className="p-4 bg-muted/30 rounded-xl text-center">
            <p className="text-sm text-muted-foreground font-medium">
              {selectedSubmission.status === "pending" ? "Waiting for Head of Section (HOS) approval." :
               selectedSubmission.status === "approved_hos" ? "Waiting for Head of Department (HOD) approval." :
               "No action required at this time."}
            </p>
          </div>
        )}

        {canApprove && (
          <>
            <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">ULASAN / REMARKS (OPTIONAL)</p>
            <Input
              placeholder={isCarRental ? "Enter any additional comments or reasons here..." : "Sila masukkan ulasan jika ada / Please enter remarks if any..."}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="mb-8 h-12 bg-muted/20"
            />
            <div className="flex gap-4">
              <button
                onClick={() => handleAction(selectedSubmission.id, "rejected")}
                className="flex-1 px-6 py-4 rounded-xl bg-destructive text-white font-bold text-center hover:bg-destructive/90 transition-colors"
              >
                TOLAK / REJECT
              </button>
              <button
                onClick={() => handleAction(selectedSubmission.id, "approved")}
                className="flex-1 px-6 py-4 rounded-xl bg-emerald-500 text-white font-bold text-center hover:bg-emerald-600 transition-colors"
              >
                TERIMA / ACCEPT
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">HR Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage approvals and track department inventory.</p>
        </div>
        <div className="flex bg-muted/50 p-1 rounded-xl border border-border/50 w-fit">
          <button onClick={() => setViewMode("approvals")} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === "approvals" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            Form Approvals
          </button>
          <button onClick={() => setViewMode("inventory")} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === "inventory" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <Package className="h-4 w-4" /> Inventory Tracker
          </button>
        </div>
      </div>

      {viewMode === "approvals" ? (
        <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Submissions</p>
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-[10px] font-semibold px-2">+12%</Badge>
          </div>
          <p className="text-4xl font-bold text-foreground">{stats.total > 0 ? `${stats.total}` : "0"}</p>
          <p className="text-xs text-muted-foreground mt-1">Current fiscal year / Tahun kewangan semasa</p>
        </div>
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Action Required</p>
            {stats.actionRequired > 0 ? (
              <Badge className="bg-destructive/15 text-destructive dark:text-red-400 border-0 text-[10px] font-semibold px-2 animate-pulse">Needs Review</Badge>
            ) : (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-[10px] font-semibold px-2">All Cleared</Badge>
            )}
          </div>
          <p className="text-4xl font-bold text-foreground">{stats.actionRequired}</p>
          <p className="text-xs text-muted-foreground mt-1">Forms waiting for your final approval</p>
        </div>
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Approval Rate</p>
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-[10px] font-semibold px-2">+2%</Badge>
          </div>
          <p className="text-4xl font-bold text-foreground">{stats.approvalRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">Compliance target: 90% / Sasaran pematuhan: 90%</p>
        </div>
      </div>

      {/* Action Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => { setActiveTab("action_required"); setIsViewAll(false); }} className={`px-5 py-2.5 rounded-full text-sm font-bold transition-colors border ${activeTab === "action_required" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:text-foreground"}`}>
          Action Required (Inbox)
          {stats.actionRequired > 0 && (
            <Badge className="ml-2 border-0 text-xs px-2 bg-red-500 text-white hover:bg-red-600">{stats.actionRequired}</Badge>
          )}
        </button>
        <button onClick={() => { setActiveTab("in_progress"); setIsViewAll(false); }} className={`px-5 py-2.5 rounded-full text-sm font-bold transition-colors border ${activeTab === "in_progress" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:text-foreground"}`}>
          In Progress (Waiting)
          {stats.inProgress > 0 && (
            <Badge className="ml-2 border-0 text-xs px-2 bg-amber-500 text-white hover:bg-amber-600">{stats.inProgress}</Badge>
          )}
        </button>
        <button onClick={() => { setActiveTab("history"); setIsViewAll(false); }} className={`px-5 py-2.5 rounded-full text-sm font-bold transition-colors border ${activeTab === "history" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:text-foreground"}`}>
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
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden ${!avatarUrl ? getInitialColor(sub.employeeName) : 'bg-transparent'}`}>
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
                      <button onClick={() => setSelectedSubmission(sub)} className="text-sm font-bold text-foreground hover:text-primary">
                        {sub.status === "pending" || sub.status === "approved_hos" || sub.status === "approved_hod" ? "Review" : "Details"}
                      </button>
                    </TableCell>
                  </TableRow>
              );
            })}
              </TableBody>
            </Table>
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
        </>
      ) : (
        /* INVENTORY TRACKER VIEW */
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Inventory Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card-elevated p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Box className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Item Types</p>
                <p className="text-3xl font-bold text-foreground">{allInventoryKeys.length}</p>
              </div>
            </div>
            <div className="card-elevated p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Items Distributed</p>
                <p className="text-3xl font-bold text-foreground">{Object.values(distributedItems).reduce((a, b) => a + b, 0)}</p>
              </div>
            </div>
            <div className="card-elevated p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Low Stock Alerts</p>
                <p className="text-3xl font-bold text-foreground">
                  {allInventoryKeys.filter(k => (inventoryStock[k] || 0) - (distributedItems[k] || 0) <= 10).length}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Stock Levels */}
            <div className="xl:col-span-2 card-elevated overflow-hidden flex flex-col h-[600px]">
              <div className="p-5 border-b border-border bg-muted/10 shrink-0 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Stock Levels</h2>
                    <p className="text-xs text-muted-foreground">Monitor remaining inventory across all categories</p>
                  </div>
                  <button onClick={() => setIsStockSheetOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap">
                    <Plus className="h-4 w-4" /> Add / Update Stock
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-between">
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {[
                      { id: "all", label: "All Items" },
                      { id: "ppe", label: "PPE" },
                      { id: "uniform", label: "Uniforms" },
                      { id: "office", label: "Office Supplies" },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setInventoryTab(tab.id as any)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors border whitespace-nowrap ${inventoryTab === tab.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:text-foreground'}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="relative w-full sm:w-64 shrink-0">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search inventory..."
                      value={inventorySearch}
                      onChange={e => setInventorySearch(e.target.value)}
                      className="h-8 pl-8 text-xs bg-background"
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                <Table>
                  <TableHeader className="bg-muted/30 sticky top-0 backdrop-blur-md z-10">
                    <TableRow>
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Item Name</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Category</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Total Stock</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Distributed</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Remaining</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventoryKeys.map(item => {
                      const total = inventoryStock[item] || 0;
                      const dist = distributedItems[item] || 0;
                      const left = total - dist;
                      const percent = total > 0 ? Math.min((dist / total) * 100, 100) : 100;
                      return (
                        <TableRow key={item} className="hover:bg-muted/10">
                          <TableCell className="font-semibold text-sm">{item}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-wider">
                              {getItemCategory(item)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-sm font-medium">{total}</TableCell>
                          <TableCell className="text-center text-sm font-medium text-muted-foreground">{dist}</TableCell>
                          <TableCell className={`text-center text-sm font-bold ${left <= 10 ? 'text-destructive' : 'text-foreground'}`}>{left}</TableCell>
                          <TableCell>
                            <div className="w-24 h-2 rounded-full bg-muted overflow-hidden flex items-center">
                              <div className={`h-full rounded-full ${percent >= 90 ? 'bg-destructive' : percent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${percent}%` }} />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredInventoryKeys.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No items match your criteria.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Recent Activity History */}
            <div className="card-elevated overflow-hidden flex flex-col h-[600px]">
              <div className="p-5 border-b border-border bg-muted/10 shrink-0">
                <h2 className="text-lg font-bold text-foreground">Recent Activity</h2>
                <p className="text-xs text-muted-foreground">Latest distributed items and restocks</p>
              </div>
              <div className="overflow-y-auto flex-1 p-0">
                {recentActivity.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-sm text-muted-foreground">No recent inventory activity.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {recentActivity.map(sub => {
                      const isRestock = sub.formType === "inventory_addition";
                      return (
                        <div key={sub.id} className="p-4 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => !isRestock && setSelectedSubmission(sub)}>
                        <div className="flex justify-between items-start mb-1.5">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-foreground">{sub.employeeName}</p>
                              <Badge className={`border-0 text-[9px] uppercase px-1.5 py-0 ${isRestock ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400' : 'bg-primary/10 text-primary'}`}>
                                {isRestock ? "RESTOCK" : (sub.data.requestCategory || "PPE")}
                              </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-medium">{new Date(sub.submittedAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                            {isRestock
                              ? `+${sub.data.quantity}x ${sub.data.itemName}`
                              : (sub.data.items || []).map((i: any) => `${i.Quantity}x ${i["Item Name"]}`).join(", ")
                            }
                        </p>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Stock Sheet */}
      <Sheet open={isStockSheetOpen} onOpenChange={setIsStockSheetOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader className="border-b border-border pb-4 mb-6">
            <SheetTitle className="text-xl font-bold">Add / Update Stock</SheetTitle>
            <p className="text-sm text-muted-foreground">Increase inventory for an existing item or add a new one.</p>
          </SheetHeader>
          <div className="space-y-5">
            <div>
              <Label className="text-xs font-bold text-primary uppercase tracking-wider block mb-2">1. Select Category</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button type="button" onClick={() => { setStockSheetCategory("ppe"); setStockForm({ itemName: "", quantity: stockForm.quantity }); setCustomItem(""); }} className={`py-2 rounded-lg text-xs font-bold border transition-colors ${stockSheetCategory === 'ppe' ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-transparent border-border text-muted-foreground hover:bg-muted'}`}>PPE</button>
                <button type="button" onClick={() => { setStockSheetCategory("uniform"); setStockForm({ itemName: "", quantity: stockForm.quantity }); setCustomItem(""); }} className={`py-2 rounded-lg text-xs font-bold border transition-colors ${stockSheetCategory === 'uniform' ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-transparent border-border text-muted-foreground hover:bg-muted'}`}>Uniforms</button>
                <button type="button" onClick={() => { setStockSheetCategory("office"); setStockForm({ itemName: "", quantity: stockForm.quantity }); setCustomItem(""); }} className={`py-2 rounded-lg text-xs font-bold border transition-colors ${stockSheetCategory === 'office' ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-transparent border-border text-muted-foreground hover:bg-muted'}`}>Office</button>
                <button type="button" onClick={() => { setStockSheetCategory("other"); setStockForm({ itemName: "", quantity: stockForm.quantity }); setCustomItem(""); }} className={`py-2 rounded-lg text-xs font-bold border transition-colors ${stockSheetCategory === 'other' ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-transparent border-border text-muted-foreground hover:bg-muted'}`}>Custom</button>
              </div>
            </div>

            <div className="space-y-2 animate-in fade-in slide-in-from-right-2 duration-300">
              <Label className="text-xs font-bold text-primary uppercase tracking-wider">2. Select Item</Label>
              <Select value={stockForm.itemName} onValueChange={val => setStockForm(p => ({...p, itemName: val}))}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={
                    stockSheetCategory === "ppe" ? "Choose a PPE item..." :
                    stockSheetCategory === "uniform" ? "Choose a Uniform..." :
                    stockSheetCategory === "office" ? "Choose an Office Supply..." :
                    "Choose a Custom Item..."
                  } />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {Array.from(new Set([
                    ...(stockSheetCategory === "ppe" ? PPE_ITEMS : []),
                    ...(stockSheetCategory === "uniform" ? UNIFORM_ITEMS : []),
                    ...(stockSheetCategory === "office" ? OFFICE_ITEMS : []),
                    ...allInventoryKeys.filter(k => getItemCategory(k) === stockSheetCategory)
                  ])).sort().map(k => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                  {stockSheetCategory === "other" && (
                    <SelectItem value="other" className="font-bold text-primary italic">+ Add New Custom Item</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {stockForm.itemName === "other" && stockSheetCategory === "other" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label className="text-xs font-bold text-primary uppercase tracking-wider">New Item Name</Label>
                <Input value={customItem} onChange={e => setCustomItem(e.target.value)} placeholder="e.g. Safety Glasses" className="h-11" />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-bold text-primary uppercase tracking-wider">3. Quantity to Add</Label>
              <Input type="number" min="1" value={stockForm.quantity} onChange={e => setStockForm(p => ({...p, quantity: e.target.value}))} placeholder="e.g. 50" className="h-11 no-spinner" onWheel={(e) => (e.target as HTMLElement).blur()} />
              <p className="text-[10px] text-muted-foreground">This amount will be added to the total historical stock.</p>
            </div>
            
            <div className="pt-4 flex gap-3">
              <button onClick={() => setIsStockSheetOpen(false)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/50">Cancel</button>
              <button onClick={handleUpdateStock} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90">Update Stock</button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminDashboard;
