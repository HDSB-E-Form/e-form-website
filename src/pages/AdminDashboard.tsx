import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions, type Submission, type SubmissionStatus } from "@/contexts/SubmissionsContext";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Search, ArrowLeft, FileText, Package, Box, AlertTriangle, Plus, XCircle, ShoppingCart, Settings, DollarSign, Save, Printer } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import logo from "@/assets/logo.png";

const formTypeLabels: Record<string, string> = {
  car_rental: "Vehicle Request",
  claim: "Petty Cash Claim",
  leave: "Gate Pass",
  ppe_request: "PPE / Uniform / Office",
  ppe_purchase: "PPE | Uniform Purchase",
};

const statusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-xs font-medium px-3 py-1">Fully Approved</Badge>;
    case "approved_hof":
      return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-0 text-xs font-medium px-3 py-1">HOF Approved</Badge>;
    case "approved_hop":
      return <Badge className="bg-teal-500/15 text-teal-700 dark:text-teal-400 border-0 text-xs font-medium px-3 py-1">HOP Approved</Badge>;
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

const SAFETY_STOCK_LEVELS: Record<string, number> = {
  // Default for items without specific levels
  "default": 5,

  // PPE
  "Crane Vest": 5,
  "Earplug": 20,
  "Forklift Vest": 5,
  "Safety Goggles": 20,
  "Safety Helmet": 20,
  "Safety Insert": 15,

  // Uniforms
  'Cargo Pants - 26"': 10, 'Cargo Pants - 28"': 10, 'Cargo Pants - 30"': 20, 'Cargo Pants - 32"': 20,
  'Cargo Pants - 34"': 20, 'Cargo Pants - 36"': 20, 'Cargo Pants - 38"': 10, 'Cargo Pants - 40"': 10,
  'Cargo Pants - 42"': 8, 'Cargo Pants - 44"': 6, 'Cargo Pants - 46"': 6, 'Cargo Pants - 48"': 4, 'Cargo Pants - 50"': 4,

  'Company Shirt - XS': 6, 'Company Shirt - S': 10, 'Company Shirt - M': 20, 'Company Shirt - L': 20,
  'Company Shirt - XL': 20, 'Company Shirt - 2XL': 20, 'Company Shirt - 3XL': 8, 'Company Shirt - 4XL': 6, 'Company Shirt - 5XL': 6,

  'Company Shirt (Long Sleeve) - XS': 6, 'Company Shirt (Long Sleeve) - S': 10, 'Company Shirt (Long Sleeve) - M': 20, 'Company Shirt (Long Sleeve) - L': 20,
  'Company Shirt (Long Sleeve) - XL': 20, 'Company Shirt (Long Sleeve) - 2XL': 20, 'Company Shirt (Long Sleeve) - 3XL': 8, 'Company Shirt (Long Sleeve) - 4XL': 6, 'Company Shirt (Long Sleeve) - 5XL': 6,

  'Company T-Shirt (Long Sleeve) - XS': 6, 'Company T-Shirt (Long Sleeve) - S': 10, 'Company T-Shirt (Long Sleeve) - M': 20, 'Company T-Shirt (Long Sleeve) - L': 20,
  'Company T-Shirt (Long Sleeve) - XL': 20, 'Company T-Shirt (Long Sleeve) - 2XL': 20, 'Company T-Shirt (Long Sleeve) - 3XL': 8, 'Company T-Shirt (Long Sleeve) - 4XL': 6, 'Company T-Shirt (Long Sleeve) - 5XL': 6,

  'Company T-Shirt (Short Sleeve) - XS': 6, 'Company T-Shirt (Short Sleeve) - S': 10, 'Company T-Shirt (Short Sleeve) - M': 20, 'Company T-Shirt (Short Sleeve) - L': 20,
  'Company T-Shirt (Short Sleeve) - XL': 20, 'Company T-Shirt (Short Sleeve) - 2XL': 20, 'Company T-Shirt (Short Sleeve) - 3XL': 10, 'Company T-Shirt (Short Sleeve) - 4XL': 6, 'Company T-Shirt (Short Sleeve) - 5XL': 6,

  'Safety Shoe - Size 3': 3, 'Safety Shoe - Size 4': 3, 'Safety Shoe - Size 5': 5, 'Safety Shoe - Size 6': 5,
  'Safety Shoe - Size 7': 10, 'Safety Shoe - Size 8': 10, 'Safety Shoe - Size 9': 10, 'Safety Shoe - Size 10': 10,
  'Safety Shoe - Size 11': 5, 'Safety Shoe - Size 12': 3, 'Safety Shoe - Size 13': 3,
};

const getSafetyStockLevel = (itemKey: string) => {
  return SAFETY_STOCK_LEVELS[itemKey] ?? SAFETY_STOCK_LEVELS["default"];
};

const { PPE_ITEMS: ppeList, UNIFORM_ITEMS: uniformList, OFFICE_ITEMS: officeList } = (() => { // Re-importing from PpeRequestForm to avoid duplication
  const SHOE_SIZES_UK = [
    { size: "Size 3" }, { size: "Size 4" }, { size: "Size 5" }, { size: "Size 6" }, { size: "Size 7" }, { size: "Size 8" },
    { size: "Size 9" }, { size: "Size 10" }, { size: "Size 11" }, { size: "Size 12" }, { size: "Size 13" },
  ];
  const CLOTHING_SIZES_EXTENDED = [
    { size: "XS" }, { size: "S" }, { size: "M" }, { size: "L" }, { size: "XL" }, { size: "2XL" }, { size: "3XL" }, { size: "4XL" }, { size: "5XL" },
  ];
  const PANTS_SIZES = [
    { size: '26"' }, { size: '28"' }, { size: '30"' }, { size: '32"' }, { size: '34"' }, { size: '36"' }, { size: '38"' }, { size: '40"' },
    { size: '42"' }, { size: '44"' }, { size: '46"' }, { size: '48"' }, { size: '50"' },
  ];
  const HELMET_SIZES = [{ size: "M" }, { size: "L" }];
  return {
    PPE_ITEMS: [{ name: "3-ply Mask", sizes: [{ size: "Free Size" }] }, { name: "Medical Apron", sizes: [{ size: "Free Size" }] }, { name: "Crane Vest", sizes: [{ size: "Free Size" }] }, { name: "Earplug", sizes: [{ size: "Free Size" }] }, { name: "Forklift Vest", sizes: [{ size: "Free Size" }] }, { name: "Safety Goggles", sizes: [{ size: "Free Size" }] }, { name: "Safety Helmet", sizes: HELMET_SIZES }, { name: "N-95 Mask", sizes: [{ size: "Free Size" }] }, { name: "Safety Boot", sizes: SHOE_SIZES_UK }, { name: "Safety Insert", sizes: [{ size: "Free Size" }] }, { name: "Safety Shoe", sizes: SHOE_SIZES_UK }].sort((a, b) => a.name.localeCompare(b.name)),
    UNIFORM_ITEMS: [{ name: "Cargo Pants", sizes: PANTS_SIZES }, { name: "Company Shirt", sizes: CLOTHING_SIZES_EXTENDED }, { name: "Company Shirt (Long Sleeve)", sizes: CLOTHING_SIZES_EXTENDED }, { name: "Company T-Shirt (Long Sleeve)", sizes: CLOTHING_SIZES_EXTENDED }, { name: "Company T-Shirt (Short Sleeve)", sizes: CLOTHING_SIZES_EXTENDED }].sort((a, b) => a.name.localeCompare(b.name)),
    OFFICE_ITEMS: [{ name: "A3 Paper", sizes: [{ size: "80 gsm" }] }, { name: "A4 Paper", sizes: [{ size: "70 gsm" }, { size: "80 gsm" }] }, { name: "Ball Pen", sizes: [{ size: "Black" }, { size: "Blue" }, { size: "Red" }] }, { name: "Binder Clip", sizes: [{ size: "Small" }, { size: "Medium" }, { size: "Large" }] }, { name: "Cellophane Tape", sizes: [{ size: "18 mm" }] }, { name: "Correction Fluid", sizes: [{ size: "White" }] }, { name: "Correction Tape", sizes: [{ size: "5 mm" }] }, { name: "Cutter Blade", sizes: [{ size: "Large" }] }, { name: "Cutter Knife", sizes: [{ size: "Large" }] }, { name: "Document Tray", sizes: [{ size: "Plastic" }] }, { name: "Double-Sided Tape", sizes: [{ size: "24 mm" }] }, { name: "Envelope", sizes: [{ size: "C4" }, { size: "DL" }] }, { name: "Eraser", sizes: [{ size: "Standard" }] }, { name: "Glue Stick", sizes: [{ size: "21 g" }] }, { name: "Highlighter", sizes: [{ size: "Yellow" }, { size: "Green" }, { size: "Pink" }, { size: "Orange" }] }, { name: "Lever Arch File", sizes: [{ size: "2 inch" }, { size: "3 inch" }] }, { name: "Liquid Glue", sizes: [{ size: "50 ml" }] }, { name: "Masking Tape", sizes: [{ size: "24 mm" }] }, { name: "Mechanical Pencil", sizes: [{ size: "0.5 mm" }] }, { name: "Notebook", sizes: [{ size: "A4" }, { size: "A5" }] }, { name: "Paper Clip", sizes: [{ size: "28 mm" }] }, { name: "Pencil", sizes: [{ size: "2B" }] }, { name: "Pencil Lead", sizes: [{ size: "0.5 mm" }] }, { name: "Permanent Marker", sizes: [{ size: "Black" }, { size: "Blue" }, { size: "Red" }] }, { name: "Ring File", sizes: [{ size: "A4" }] }, { name: "Rubber Band", sizes: [{ size: "Small" }, { size: "Large" }] }, { name: "Scissors", sizes: [{ size: "Medium" }] }, { name: "Sharpener", sizes: [{ size: "Standard" }] }, { name: "Stapler", sizes: [{ size: "No.10" }] }, { name: "Stapler Pin", sizes: [{ size: "No.10" }, { size: "3-1M" }] }, { name: "Sticky Notes", sizes: [{ size: '3" x 3"' }] }, { name: "Whiteboard Marker", sizes: [{ size: "Black" }, { size: "Blue" }, { size: "Red" }, { size: "Green" }] }].sort((a, b) => a.name.localeCompare(b.name)),
  };
})();

const ALL_ITEMS = [...ppeList, ...uniformList, ...officeList];

const renderValue = (val: any): React.ReactNode => {
  if (val === null || val === undefined || val === "") return "—";
  
  if (Array.isArray(val)) {
    if (val.length === 0) return "—";
    if (typeof val[0] === 'string' && val[0].startsWith('http')) {
      return (
        <div className="flex flex-col gap-2 mt-1">
          {val.map((url, idx) => (
            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm text-primary font-bold hover:underline inline-flex items-center gap-1.5 w-fit">
              <FileText className="h-4 w-4" /> View Attachment {idx + 1}
            </a>
          ))}
        </div>
      );
    }
    if (typeof val[0] === 'object' && val[0] !== null) {
      const validRows = val.filter(row => row && typeof row === 'object' && Object.values(row).some(v => v !== "" && v !== null));
      if (validRows.length === 0) return "—";

      let keys = Object.keys(validRows[0]).filter(k => k !== 'avatar');

      // Specifically for claim forms, enforce the column order.
      if (keys.includes('description') && keys.includes('receiptNo') && keys.includes('amount')) {
        keys = ['description', 'receiptNo', 'amount'];
      }

      return (
        <div className="mt-3 w-full border border-border rounded-lg overflow-x-auto">
          <Table className="w-full text-left border-collapse bg-background/50">
            <TableHeader className="bg-muted/50">
              <TableRow>
                {keys.map(k => (
                  <TableHead key={k} className="text-[10px] sm:text-xs uppercase font-bold p-2 sm:p-3 text-muted-foreground whitespace-nowrap">
                    {k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, " $1")}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {validRows.map((row, i) => (
                <TableRow key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
                  {keys.map((k, j) => (
                    <TableCell key={j} className="text-xs sm:text-sm p-2 sm:p-3 whitespace-nowrap">
                      {row[k] !== undefined && row[k] !== null && row[k] !== "" ? String(row[k]) : "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }
    return val.join(", ");
  }
  
  if (typeof val === 'object' && val !== null) {
    const entries = Object.entries(val).filter(([k, v]) => v !== "" && v !== null && k !== 'avatar');
    if (entries.length === 0) return "—";
    return (
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mt-2 sm:mt-3 bg-background/50 p-3 sm:p-4 rounded-lg border border-border">
        {entries.map(([k, v]) => (
          <div key={k} className="flex flex-col border-b border-border/50 pb-1.5 last:border-0 last:pb-0 sm:last:pb-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-0.5 sm:mb-1">
              {k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, " $1")}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-foreground">
              {typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  
  if (typeof val === 'string' && val.startsWith('http')) {
    return (
      <a href={val} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm text-primary font-bold hover:underline inline-flex items-center gap-1.5 w-fit">
         <FileText className="h-4 w-4" /> View Attachment
      </a>
    );
  }

  return String(val);
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const { submissions, updateSubmissionStatus, addSubmission } = useSubmissions();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");
  const [remarks, setRemarks] = useState("");
  const [viewMode, setViewMode] = useState<"approvals" | "inventory" | "purchases">("approvals");
  const [activeTab, setActiveTab] = useState<"action_required" | "in_progress" | "history">("action_required");
  const [isViewAll, setIsViewAll] = useState(false);
  
  const inventoryStock = useMemo(() => {
    const stock: Record<string, number> = {};
    submissions.filter(s => s.formType === "inventory_addition").forEach(sub => {
      const { itemName, quantity, size } = sub.data;
      if (itemName && quantity) {
        let finalSize = size;
        if (!finalSize) {
          const itemInfo = ALL_ITEMS.find(i => i.name === itemName);
          if (itemInfo && itemInfo.sizes.length === 1) {
            finalSize = itemInfo.sizes[0].size;
          }
        }
        const key = `${itemName} - ${finalSize || 'default'}`;
        stock[key] = (stock[key] || 0) + parseInt(quantity);
      }
    });
    return stock;
  }, [submissions]);

  const [isStockSheetOpen, setIsStockSheetOpen] = useState(false);
  const [stockForm, setStockForm] = useState({ itemName: "", size: "", quantity: "", poNumber: "" });
  const [customItem, setCustomItem] = useState("");
  const [inventoryTab, setInventoryTab] = useState<"ppe" | "uniform" | "office">("ppe");
  const [inventorySearch, setInventorySearch] = useState("");
  const [stockSheetCategory, setStockSheetCategory] = useState<"ppe" | "uniform" | "office">("ppe");

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPriceSheetOpen, setIsPriceSheetOpen] = useState(false);

  const itemCategoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    ppeList.forEach(item => map[item.name] = "ppe");
    uniformList.forEach(item => map[item.name] = "uniform");
    officeList.forEach(item => map[item.name] = "office");
    
    submissions.filter(s => s.formType === "inventory_addition").forEach(sub => {
      const { itemName, category } = sub.data;
      if (itemName && category && category !== "other") {
        map[itemName] = category;
      }
    });
    return map;
  }, [submissions]);

  const getItemCategory = (name: string) => itemCategoryMap[name] || "ppe";

  const approvalSubmissions = submissions.filter(s => s.formType === "car_rental" || s.formType === "leave");
  const inventorySubmissions = submissions.filter(s => s.formType === "ppe_request");
  const purchaseSubmissions = submissions.filter(s => s.formType === "ppe_purchase");

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
    return hours < 48;
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
    const originalTitle = document.title;
    document.title = `Purchase_${generateRefNo(sub)}`;
    
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) document.documentElement.classList.remove('dark');

    setTimeout(() => {
      window.onafterprint = () => {
        document.title = originalTitle;
        if (isDark) document.documentElement.classList.add('dark');
        window.onafterprint = null;
      };
      window.print();
      setTimeout(() => { document.title = originalTitle; }, 2000);
    }, 50);
  };

  const handleAction = (id: string, status: SubmissionStatus) => {
    updateSubmissionStatus(id, status, { remarks, rejectedStage: status === "rejected" ? "admin" : undefined });
    toast.success(`Submission ${status === "approved" ? "accepted" : "rejected"} successfully`);
    setSelectedSubmission(null);
    setRemarks("");
  };

  const handleUpdateStock = async () => {
    const nameToUpdate = stockForm.itemName === "other" ? customItem : stockForm.itemName;
    const selectedItemInfo = ALL_ITEMS.find(i => i.name === nameToUpdate);
    if (!nameToUpdate || !stockForm.quantity || (selectedItemInfo && selectedItemInfo.sizes.length > 1 && !stockForm.size)) {
      toast.error("Please provide an item name, size (if applicable), and quantity.");
      return;
    }

    const qty = parseInt(stockForm.quantity);
    const success = await addSubmission({
      formType: "inventory_addition",
      status: "approved",
      submittedBy: user?.id || "",
      employeeName: user?.name || "System Admin",
      department: user?.department || "HR",
      data: { itemName: nameToUpdate, size: stockForm.size, quantity: qty, category: stockSheetCategory, poNumber: stockForm.poNumber }
    });

    if (success) {
      toast.success(`${qty} unit(s) added to ${nameToUpdate} stock`);
      setIsStockSheetOpen(false);
      setStockForm({ itemName: "", size: "", quantity: "", poNumber: "" });
      setCustomItem("");
    } else {
      toast.error("Failed to add stock to the database.");
    }
  };

  const distributedItems: Record<string, number> = {};
  [...inventorySubmissions, ...purchaseSubmissions].forEach(sub => {
    if (sub.status === "approved" && sub.data?.items && Array.isArray(sub.data.items)) {
      sub.data.items.forEach((item: any) => {
        const name = item["Item Name"];
        let size = item.Size;
        if (!size) {
          const itemInfo = ALL_ITEMS.find(i => i.name === name);
          if (itemInfo && itemInfo.sizes.length === 1) {
            size = itemInfo.sizes[0].size;
          }
        }
        const qty = parseInt(item.Quantity) || 0;
        if (name) {
          const key = `${name} - ${size || 'default'}`;
          distributedItems[key] = (distributedItems[key] || 0) + qty;
        }
      });
    }
  });

  const allInventoryKeys = Array.from(new Set([
    ...ALL_ITEMS.flatMap(item => item.sizes.map(s => `${item.name} - ${s.size}`)),
    ...Object.keys(inventoryStock),
    ...Object.keys(distributedItems),
  ])).sort();

  const filteredInventoryKeys = allInventoryKeys.filter(item => {
    const [itemName] = item.split(' - ');
    const matchesTab = getItemCategory(itemName) === inventoryTab;
    const matchesSearch = itemName.toLowerCase().includes(inventorySearch.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const lowStockItems = allInventoryKeys.filter(k => (inventoryStock[k] || 0) - (distributedItems[k] || 0) <= getSafetyStockLevel(k));

  const recentActivity = useMemo(() => {
    return submissions
      .filter(s => (s.formType === "ppe_request" && s.status === "approved") || s.formType === "inventory_addition")
      .sort((a,b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, 30);
  }, [submissions]);

  const renderFormDetails = (sub: Submission) => {
    const refNo = generateRefNo(sub);

    return (
      <>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setSelectedSubmission(null); setRemarks(""); }} className="inline-flex items-center justify-center w-10 sm:w-12 h-10 sm:h-12 text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all group">
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <h2 className="text-xl font-bold text-foreground">Review Submission / Semakan Permohonan</h2>
        </div>

        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">EMPLOYEE SUMMARY / MAKLUMAT PEKERJA</p>
        <div className="bg-muted/30 rounded-xl p-5 mb-8 border border-border/50">
          <p className="text-base sm:text-lg font-bold text-foreground">{sub.employeeName}</p>
          <p className="text-xs sm:text-sm text-muted-foreground mb-1 mt-3">
            Staff ID: {sub.data.staffId || sub.data.employeeInfo?.staffNo || sub.data.employeeInfo?.employeeNumber || sub.submittedBy || "—"}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Department: {sub.department || "—"}</p>
          <p className="text-xs sm:text-sm text-muted-foreground mb-3">
            Position: {sub.data.position || sub.data.employeeInfo?.position || "—"}
          </p>
        </div>

        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">SUBMISSION SUMMARY / RINGKASAN PERMOHONAN</p>
        <div className="bg-muted/30 rounded-xl p-5 mb-8 border border-border/50 space-y-0">
          <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start first:pt-0">
            <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Ref No</span>
            <div className="text-xs sm:text-sm font-bold text-foreground sm:col-span-2 text-left">{refNo}</div>
          </div>
          <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
            <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Form Type</span>
            <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left">
              <Badge className="bg-sky-100 text-sky-800 border-0 text-xs font-bold">{formTypeLabels[sub.formType] || sub.formType}</Badge>
            </div>
          </div>

          {sub.formType === 'car_rental' ? (
            <>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">IC No.</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">{sub.data.icNo || "—"}</div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Mobile Number</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">{sub.data.mobileNumber || "—"}</div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Driving License No.</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">{sub.data.drivingLicenseNo || "—"}</div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">License Expiry</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">
                  {sub.data.drivingLicenseExpiry ? new Date(sub.data.drivingLicenseExpiry).toLocaleDateString("en-GB") : "—"}
                </div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Destination</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">{sub.data.destination || "—"}</div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Journey Type</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words uppercase">{sub.data.journeyType || "—"}</div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Purpose</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">{sub.data.purpose || "—"}</div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Journey Dates</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">
                  {sub.data.fromDate ? new Date(sub.data.fromDate).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"} - {sub.data.toDate ? new Date(sub.data.toDate).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                </div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Head of Section</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">{sub.data.hos || sub.data.hosName || "—"}</div>
              </div>
              <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Head of Department</span>
                <div className="text-xs sm:text-sm font-medium text-foreground sm:col-span-2 text-left break-words">{sub.data.hod || sub.data.hodName || "—"}</div>
              </div>
              
              {sub.data.passengers && sub.data.passengers.some((p: any) => p.name) && (
                <div className="py-2 sm:py-4 border-b border-border/50 flex flex-col items-start gap-2">
                  <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold">Passengers</span>
                  <div className="w-full text-xs sm:text-sm font-medium text-foreground">
                    {renderValue(sub.data.passengers.filter((p: any) => p.name))}
                  </div>
                </div>
              )}

              {sub.data.licenseAttachment && (
                <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Driving License</span>
                  <a href={sub.data.licenseAttachment} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm font-bold text-primary hover:underline flex items-center gap-1.5 text-left sm:col-span-2">
                    <FileText className="h-4 w-4" /> View Document
                  </a>
                </div>
              )}
            </>
          ) : (
            Object.entries(sub.data)
              .filter(([key]) => !['name', 'hos', 'hod', 'remarks', 'avatar', 'securityLog', 'position', 'staffId', 'employeeInfo', 'hosName', 'hodName'].includes(key) && !/^\d+$/.test(key))
              .map(([key, value]) => {
                let formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1");
                if (key === 'companyDetails') formattedKey = 'Company Details';
                if (key === 'personalDetails') formattedKey = 'Personal Details';
                if (key === 'purposeType') formattedKey = 'Purpose Type';
                if (key === 'licenseAttachment') formattedKey = 'Driving License Attachment';

                if (value === null || value === undefined || value === "") return null;
                if (Array.isArray(value) && value.length === 0) return null;
                if (Array.isArray(value) && typeof value[0] === 'object' && value.filter(row => row && typeof row === 'object' && Object.values(row).some(v => v !== "" && v !== null)).length === 0) return null;
                if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return null;

                return (
                  <div key={key} className={`py-2 sm:py-4 border-b border-border/50 last:border-0 ${typeof value === 'object' && value !== null && !Array.isArray(value) ? 'flex flex-col items-start gap-2' : Array.isArray(value) && typeof value[0] === 'object' ? 'flex flex-col items-start gap-2' : 'grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start'}`}>
                    <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">{formattedKey}</span>
                    <div className={`text-xs sm:text-sm font-medium text-foreground ${typeof value === 'object' && value !== null && !Array.isArray(value) ? 'w-full' : Array.isArray(value) && typeof value[0] === 'object' ? 'w-full' : 'sm:col-span-2 text-left break-words'}`}>
                      {renderValue(value)}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </>
    );
  };

  const renderPurchaseDetail = (sub: Submission) => {
    // For now, this can reuse the PPE detail renderer as the data structure is similar
    // In the future, it can be customized for purchase-specific details
    return renderPpeDetail(sub);
  };

  const renderPpeDetail = (sub: Submission) => {
    const isOffice = sub.data.requestCategory === "office";
    return (
      <>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setSelectedSubmission(null)} className="inline-flex items-center justify-center w-10 sm:w-12 h-10 sm:h-12 text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all group">
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <h2 className="text-xl font-bold text-foreground">Collection Record / Rekod Kutipan</h2>
        </div>
        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">EMPLOYEE SUMMARY / MAKLUMAT PEKERJA</p>
        <div className="bg-muted/30 rounded-xl p-5 mb-8 border border-border/50">
          <p className="text-base sm:text-lg font-bold text-foreground">{sub.employeeName}</p>
          <p className="text-xs sm:text-sm text-muted-foreground mb-1 mt-3">Staff ID: {sub.data.employeeInfo?.staffNo || sub.submittedBy}</p>
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Department: {sub.department || "—"}</p>
          <p className="text-xs sm:text-sm text-muted-foreground mb-3">Position: {sub.data.employeeInfo?.position || sub.data.position || "—"}</p>
          <Badge className="bg-emerald-100 text-emerald-800 border-0 text-xs font-bold uppercase w-fit mt-1">
            {sub.data.requestCategory || "PPE"} Collection
          </Badge>
        </div>
        {sub.data.invoiceUrl && (
          <div className="py-2 sm:py-4 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
            <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold mt-0.5">Invoice</span>
            <a href={sub.data.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm font-bold text-primary hover:underline flex items-center gap-1.5 text-left sm:col-span-2">
              <FileText className="h-4 w-4" /> View Document
            </a>
          </div>
        )}
        <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">ITEMS COLLECTED / BARANG DIAMBIL</p>
        <div className="border border-border rounded-lg overflow-hidden mb-6">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-xs font-bold text-muted-foreground">Item Name</TableHead>
                {!isOffice && <TableHead className="text-xs font-bold text-muted-foreground">Size</TableHead>}
                {sub.formType === 'ppe_purchase' && <TableHead className="text-xs font-bold text-muted-foreground text-right">Price (RM)</TableHead>}
                <TableHead className="text-xs font-bold text-muted-foreground text-right">Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(sub.data.items || []).map((item: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="font-semibold text-xs sm:text-sm">{item["Item Name"]}</TableCell>
                  {!isOffice && <TableCell className="text-xs sm:text-sm text-muted-foreground">{item.Size || "—"}</TableCell>}
                  {sub.formType === 'ppe_purchase' && (
                    <TableCell className="text-right font-medium text-xs sm:text-sm">
                      {(() => {
                        const priceKey = `${item["Item Name"]}::${item.Size}`;
                        const storedPrices = JSON.parse(localStorage.getItem("hdsb_item_prices") || "{}");
                        const price = storedPrices[priceKey] !== undefined ? storedPrices[priceKey] : 0;
                        return price.toFixed(2);
                      })()}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-bold text-xs sm:text-sm">{item.Quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {sub.formType === 'ppe_purchase' && sub.data.totalCost && (
          <div className="text-right">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Cost</p>
            <p className="text-3xl font-bold text-primary mt-1">RM {sub.data.totalCost.toFixed(2)}</p>
          </div>
        )}
      </>
    );
  };

  if (selectedSubmission) {
    const isApprovalForm = selectedSubmission.formType === "car_rental" || selectedSubmission.formType === "leave";
    const isPpe = selectedSubmission.formType === "ppe_request";
    const canApprove = selectedSubmission.status === "approved_hod";
    const isPending = selectedSubmission.status === "pending" || selectedSubmission.status === "approved_hos";

    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        {isApprovalForm && renderFormDetails(selectedSubmission)}
        {(isPpe || selectedSubmission.formType === 'ppe_purchase') && renderPpeDetail(selectedSubmission)}

        {selectedSubmission.data.remarks && (
          <div className={`p-4 rounded-xl border mb-6 ${selectedSubmission.status === 'rejected' ? 'bg-destructive/10 border-destructive/20 text-destructive dark:text-red-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-300'}`}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">Previous Remarks / Ulasan Terdahulu</p>
            <p className="text-xs sm:text-sm font-medium">"{selectedSubmission.data.remarks}"</p>
          </div>
        )}

        {isPending && !canApprove && isApprovalForm && (
          <div className="p-4 bg-muted/30 rounded-xl text-center">
            <p className="text-sm text-muted-foreground font-medium">
              {selectedSubmission.status === "pending" ? "Waiting for Head of Section (HOS) approval." :
               selectedSubmission.status === "approved_hos" ? "Waiting for Head of Department (HOD) approval." :
               "No action required at this time."}
            </p>
          </div>
        )}

        {canApprove && isApprovalForm && viewMode === 'approvals' && (
          <>
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">REMARKS / ULASAN</p>
            <Input
              placeholder="Please enter remarks if any / Sila masukkan ulasan jika ada..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="mb-8 h-12 bg-muted/20 text-base sm:text-sm"
            />
            <div className="flex flex-row gap-3 sm:gap-4">
              <button
                onClick={() => handleAction(selectedSubmission.id, "rejected")}
                className="w-1/3 px-2 sm:px-6 py-3 sm:py-4 rounded-xl bg-destructive text-white font-bold text-center hover:bg-destructive/90 transition-colors text-xs sm:text-base"
              >
                REJECT<br className="sm:hidden" /><span className="hidden sm:inline"> / </span>TOLAK
              </button>
              <button
                onClick={() => handleAction(selectedSubmission.id, "approved")}
                className="w-2/3 px-2 sm:px-6 py-3 sm:py-4 rounded-xl bg-emerald-500 text-white font-bold text-center hover:bg-emerald-600 transition-colors text-xs sm:text-base"
              >
                APPROVE<br className="sm:hidden" /><span className="hidden sm:inline"> / </span>LULUS
              </button>
            </div>
          </>
        )}

        {selectedSubmission.formType === 'ppe_purchase' && (
          <div className="flex justify-center mt-8">
            <button onClick={() => handlePrint(selectedSubmission)} className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
              <Printer className="h-4 w-4" /> Print Record
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
          <button onClick={() => setViewMode("purchases")} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === "purchases" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <ShoppingCart className="h-4 w-4" /> Purchases
          </button>
        </div>
      </div>

      {viewMode === "purchases" ? (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-700">
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
                      <TableRow key={sub.id} className="hover:bg-muted/5 transition-colors print:hidden">
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
                          <button onClick={() => setSelectedSubmission(sub)} className="text-xs sm:text-sm font-bold text-foreground hover:text-primary transition-colors">
                            View
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Print-only section for the selected purchase */}
          {selectedSubmission && viewMode === "purchases" && (
            <div className="hidden print:block print:bg-white print:text-black">
              <div className="flex items-center justify-between mb-8 border-b-2 border-black pb-6">
                <img src={logo} alt="HICOM Diecasting" className="h-16 w-auto object-contain" />
                <div className="text-right">
                  <h1 className="text-2xl font-bold uppercase tracking-widest text-black">Purchase Record</h1>
                  <p className="text-sm text-gray-600 mt-1">Ref: {generateRefNo(selectedSubmission)}</p>
                </div>
              </div>
              {renderPurchaseDetail(selectedSubmission)}
            </div>
          )}
        </div>
      ) : viewMode === "approvals" ? (
        <div className="animate-in slide-in-from-bottom-2 duration-700">
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

          <div className="flex w-full overflow-x-auto no-scrollbar gap-2 mb-6">
            <button onClick={() => { setActiveTab("action_required"); setIsViewAll(false); }} className={`flex-1 sm:flex-none flex items-center justify-center whitespace-nowrap px-3 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-colors border ${activeTab === "action_required" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:text-foreground"}`}>
              Action Required
              {stats.actionRequired > 0 && (
                <Badge className="ml-1.5 border-0 text-[10px] sm:text-xs px-1.5 sm:px-2 bg-red-500 text-white hover:bg-red-600">{stats.actionRequired}</Badge>
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

          <div className="card-elevated overflow-hidden">
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Recent Submissions / Penyerahan Terkini</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name, date, or type..." 
                  value={search} 
                  onChange={e => { setSearch(e.target.value); setIsViewAll(false); }} 
                  className="pl-9 w-full sm:w-72 h-9 text-base sm:text-sm" 
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
                      <TableRow className="bg-muted/30 hover:bg-muted/40">
                        <TableHead className="text-xs font-bold uppercase tracking-wider">Employee / Pekerja</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider">Date</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider">Type</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Status</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(isViewAll ? tabFiltered : tabFiltered.slice(0, 10)).map((sub) => {
                        const avatarUrl = (sub as any).avatar || sub.data?.employeeInfo?.avatar || sub.data?.avatar;
                        return (
                          <TableRow key={sub.id} className={`${activeTab === "action_required" && isRecent(sub.submittedAt) ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/20"}`}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {activeTab === "action_required" && <div className="w-1 h-10 rounded-full bg-primary" />}
                                <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden ${!avatarUrl ? getInitialColor(sub.employeeName) : 'bg-transparent'}`}>
                                  {avatarUrl ? (
                                    <img src={avatarUrl} alt={sub.employeeName} className="w-full h-full object-cover" />
                                  ) : (
                                    getInitials(sub.employeeName)
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-foreground">{sub.employeeName}</p>
                                  <p className="text-xs text-muted-foreground">{sub.data.position || sub.department}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col items-start gap-1">
                                <span className="text-sm text-muted-foreground">{new Date(sub.submittedAt).toLocaleDateString("en-CA")}</span>
                                {activeTab === "action_required" && isRecent(sub.submittedAt) && (
                                  <Badge className="bg-blue-500 text-white border-0 text-[9px] px-1.5 py-0 uppercase tracking-wider font-bold">NEW</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">{formTypeLabels[sub.formType] || sub.formType}</Badge>
                            </TableCell>
                            <TableCell className="text-center">{statusBadge(sub.status)}</TableCell>
                            <TableCell className="text-center">
                              <button onClick={() => setSelectedSubmission(sub)} className="text-xs sm:text-sm font-bold text-foreground hover:text-primary transition-colors">
                                {sub.status === "pending" || sub.status === "approved_hos" || sub.status === "approved_hod" ? "Review" : "Details"}
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
      ) : (
        /* INVENTORY TRACKER VIEW */
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card-elevated p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Box className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Item Types</p>
                <p className="text-3xl font-bold text-foreground">{filteredInventoryKeys.length}</p>
              </div>
            </div>
            <div className="card-elevated p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Package className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Items Distributed</p>
                <p className="text-3xl font-bold text-foreground">{Object.values(distributedItems).reduce((a, b) => a + b, 0)}</p>
              </div>
            </div>
            <div className="card-elevated p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-destructive dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Low Stock Alerts</p>
                <p className="text-3xl font-bold text-foreground">{lowStockItems.length}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="xl:col-span-2 card-elevated overflow-hidden flex flex-col h-[600px]">
              <div className="p-5 border-b border-border bg-muted/10 shrink-0 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Stock Levels</h2>
                    <p className="text-xs text-muted-foreground">Monitor remaining inventory across all categories</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsStockSheetOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap">
                      <Plus className="h-4 w-4" /> Add / Update Stock
                    </button>
                    <div className="relative">
                      <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="h-9 w-9 flex items-center justify-center bg-muted hover:bg-muted/80 border border-border text-foreground rounded-lg transition-colors text-sm font-bold shadow-sm">
                        <Settings className="h-4 w-4" />
                      </button>
                      {isMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                          <div className="absolute right-0 top-full mt-2 w-56 bg-background border border-border rounded-xl shadow-xl z-50 flex flex-col p-1.5 animate-in fade-in slide-in-from-top-2">
                            <button onClick={() => { setIsPriceSheetOpen(true); setIsMenuOpen(false); }} className="w-full flex items-center justify-start gap-2.5 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium transition-colors text-foreground">
                              <DollarSign className="h-4 w-4 text-muted-foreground" /> Manage Item Prices
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-between">
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {[
                      { id: "ppe", label: "PPE" },
                      { id: "uniform", label: "Uniform" },
                      { id: "office", label: "Office Supply" },
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
                      className="h-8 pl-8 text-base sm:text-xs bg-background"
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-auto flex-1">
                <Table>
                  <TableHeader className="bg-muted/30 sticky top-0 backdrop-blur-md z-10">
                    <TableRow>
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Item Name</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Total Stock</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Distributed</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Remaining</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventoryKeys.map(item => {
                      const [itemName, itemSize] = item.split(' - ');
                      const total = inventoryStock[item] || 0;
                      const dist = distributedItems[item] || 0;
                      const left = total - dist;
                      const safetyStock = getSafetyStockLevel(item);
                      const percent = total > 0 ? Math.min((dist / total) * 100, 100) : 100;
                      return (
                        <TableRow key={item} className="hover:bg-muted/10">
                          <TableCell className="font-semibold text-sm">
                            {itemName} <span className="text-muted-foreground text-xs">({itemSize})</span>
                          </TableCell>
                          <TableCell className="text-center text-sm font-medium bg-blue-500/5">{total}</TableCell>
                          <TableCell className="text-center text-sm font-medium text-muted-foreground bg-blue-500/5">{dist}</TableCell>
                          <TableCell className={`text-center text-sm font-bold ${left <= safetyStock ? 'text-destructive' : 'text-foreground'} bg-blue-500/5`}>{left}</TableCell>
                          <TableCell className="bg-muted/20">
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
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {isRestock
                                ? `+${sub.data.quantity}x ${sub.data.itemName} (${sub.data.size})`
                                : (sub.data.items || []).map((i: any) => `${i.Quantity}x ${i["Item Name"]} (${i.Size})`).join(", ")
                              }
                            </p>
                            {isRestock && sub.data.poNumber && (
                              <p className="text-[10px] text-muted-foreground">
                                PO Number: {sub.data.poNumber}
                              </p>
                            )}
                          </div>
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
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => { setStockSheetCategory("ppe"); setStockForm({ itemName: "", size: "", quantity: stockForm.quantity, poNumber: stockForm.poNumber }); setCustomItem(""); }} className={`py-2 rounded-lg text-xs font-bold border transition-colors ${stockSheetCategory === 'ppe' ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-transparent border-border text-muted-foreground hover:bg-muted'}`}>PPE</button>
                <button type="button" onClick={() => { setStockSheetCategory("uniform"); setStockForm({ itemName: "", size: "", quantity: stockForm.quantity, poNumber: stockForm.poNumber }); setCustomItem(""); }} className={`py-2 rounded-lg text-xs font-bold border transition-colors ${stockSheetCategory === 'uniform' ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-transparent border-border text-muted-foreground hover:bg-muted'}`}>Uniforms</button>
                <button type="button" onClick={() => { setStockSheetCategory("office"); setStockForm({ itemName: "", size: "", quantity: stockForm.quantity, poNumber: stockForm.poNumber }); setCustomItem(""); }} className={`py-2 rounded-lg text-xs font-bold border transition-colors ${stockSheetCategory === 'office' ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-transparent border-border text-muted-foreground hover:bg-muted'}`}>Office</button>
              </div>
            </div>

            <div className="space-y-2 animate-in fade-in slide-in-from-right-2 duration-300">
              <Label className="text-xs font-bold text-primary uppercase tracking-wider">2. Select Item</Label>
              <Select value={stockForm.itemName} onValueChange={val => setStockForm(p => ({...p, itemName: val}))}>
                <SelectTrigger className="h-11 text-base sm:text-sm">
                  <SelectValue placeholder={
                    stockSheetCategory === "ppe" ? "Choose a PPE item..." :
                    stockSheetCategory === "uniform" ? "Choose a Uniform..." :
                    "Choose an Office Supply..."
                  } />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {(stockSheetCategory === "ppe" ? ppeList : stockSheetCategory === "uniform" ? uniformList : officeList).map(item => (
                    <SelectItem key={item.name} value={item.name}>{item.name}</SelectItem>
                  ))}
                  <SelectItem value="other" className="font-bold text-primary italic">+ Add New Item to {stockSheetCategory.toUpperCase()}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {stockForm.itemName && stockForm.itemName !== "other" && ALL_ITEMS.find(i => i.name === stockForm.itemName)?.sizes.length > 1 && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label className="text-xs font-bold text-primary uppercase tracking-wider">Size / Type</Label>
                <Select value={stockForm.size} onValueChange={val => setStockForm(p => ({...p, size: val}))}>
                  <SelectTrigger className="h-11 text-base sm:text-sm">
                    <SelectValue placeholder="Choose a size/type..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {ALL_ITEMS.find(i => i.name === stockForm.itemName)?.sizes.map(s => (
                      <SelectItem key={s.size} value={s.size}>{s.size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {stockForm.itemName === "other" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label className="text-xs font-bold text-primary uppercase tracking-wider">New Item Name</Label>
                <Input value={customItem} onChange={e => setCustomItem(e.target.value)} placeholder="e.g. Safety Glasses" className="h-11 text-base sm:text-sm" />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-bold text-primary uppercase tracking-wider">3. Quantity to Add</Label>
              <Input type="number" min="1" value={stockForm.quantity} onChange={e => setStockForm(p => ({...p, quantity: e.target.value}))} placeholder="Enter quantity" className="h-11 no-spinner text-base sm:text-sm" onWheel={(e) => (e.target as HTMLElement).blur()} />
              <p className="text-[10px] text-muted-foreground">This amount will be added to the total historical stock.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-primary uppercase tracking-wider">4. PO Number</Label>
              <Input value={stockForm.poNumber} onChange={e => setStockForm(p => ({...p, poNumber: e.target.value}))} placeholder="Enter PO Number" className="h-11 text-base sm:text-sm" />
              <p className="text-[10px] text-muted-foreground">Optional reference number for this restock entry.</p>
            </div>
            
            <div className="pt-4 flex gap-3">
              <button onClick={() => setIsStockSheetOpen(false)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/50">Cancel</button>
              <button onClick={handleUpdateStock} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90">Update Stock</button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Manage Prices Sheet */}
      {isPriceSheetOpen && <PriceManagementSheet isOpen={isPriceSheetOpen} onOpenChange={setIsPriceSheetOpen} />}
    </div>
  );
};

const PriceManagementSheet = ({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void; }) => {
  const [prices, setPrices] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem("hdsb_item_prices") || "{}");
    } catch {
      return {};
    }
  });
  const [activeTab, setActiveTab] = useState<'ppe' | 'uniform' | 'office'>('ppe');
  const [isSaving, setIsSaving] = useState(false);

  const handlePriceChange = (key: string, value: string) => {
    const newPrice = parseFloat(value);
    if (!isNaN(newPrice) && newPrice >= 0) {
      setPrices(prev => ({ ...prev, [key]: newPrice }));
    } else if (value === "") {
      setPrices(prev => {
        const newPrices = { ...prev };
        delete newPrices[key];
        return newPrices;
      });
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    localStorage.setItem("hdsb_item_prices", JSON.stringify(prices));
    setTimeout(() => {
      toast.success("Prices saved successfully!");
      setIsSaving(false);
      onOpenChange(false);
      // Optional: force a refresh if other components need to see the new prices immediately
      // window.location.reload();
    }, 500);
  };

  const renderCategory = (title: string, items: any[]) => (
    <div key={title}>
      {/* <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3 sticky top-0 bg-background py-2">{title}</h3> */}
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.name} className="p-3 border border-border rounded-lg bg-muted/20">
            <p className="text-sm font-semibold text-foreground mb-2">{item.name}</p>
            <div className="space-y-2">
              {item.sizes.map((size: any) => {
                const priceKey = `${item.name}::${size.size}`;
                return (
                  <div key={size.size} className="flex items-center gap-2">
                    <Label htmlFor={priceKey} className="text-xs text-muted-foreground flex-1">{size.size}</Label>
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">RM</span>
                      <Input
                        id={priceKey}
                        type="number"
                        step="0.01"
                        min="0"
                        value={prices[priceKey] !== undefined ? prices[priceKey] : ""}
                        onChange={e => handlePriceChange(priceKey, e.target.value)}
                        placeholder="0.00"
                        className="h-8 pl-8 text-right no-spinner"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="text-xl font-bold">Manage Item Prices</SheetTitle>
          <p className="text-sm text-muted-foreground">Set the purchase price for each item and size.</p>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto pr-4 -mr-4 space-y-6">
          <div className="flex w-full overflow-x-auto no-scrollbar gap-2 mb-4 border-b border-border">
            {[
              { id: "ppe", label: "PPE" },
              { id: "uniform", label: "Uniform" },
              { id: "office", label: "Office Supply" },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 sm:flex-none whitespace-nowrap px-5 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="animate-in fade-in-50">
            {activeTab === 'ppe' ? renderCategory("PPE", ppeList) : activeTab === 'uniform' ? renderCategory("Uniforms", uniformList) : renderCategory("Office Supplies", officeList)}
          </div>
        </div>
        <div className="border-t border-border pt-4 flex gap-3">
          <button onClick={() => onOpenChange(false)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/50">Cancel</button>
          <button onClick={handleSave} disabled={isSaving} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 flex items-center justify-center gap-2 disabled:opacity-70">
            {isSaving ? <Save className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? "Saving..." : "Save Prices"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AdminDashboard;