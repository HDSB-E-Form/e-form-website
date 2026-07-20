import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions, type Submission } from "@/contexts/SubmissionsContext";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Package, Box, AlertTriangle, Plus, Settings, DollarSign, Save } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import HRModuleSkeleton from "@/components/HRModuleSkeleton";

const SAFETY_STOCK_LEVELS: Record<string, number> = {
  "default": 5, "Crane Vest": 5, "Earplug": 20, "Forklift Vest": 5, "Safety Goggles": 20, "Safety Helmet": 20, "Safety Insert": 15,
  'Cargo Pants - 26"': 10, 'Cargo Pants - 28"': 10, 'Cargo Pants - 30"': 20, 'Cargo Pants - 32"': 20, 'Cargo Pants - 34"': 20, 'Cargo Pants - 36"': 20, 'Cargo Pants - 38"': 10, 'Cargo Pants - 40"': 10, 'Cargo Pants - 42"': 8, 'Cargo Pants - 44"': 6, 'Cargo Pants - 46"': 6, 'Cargo Pants - 48"': 4, 'Cargo Pants - 50"': 4,
  'Company Shirt - XS': 6, 'Company Shirt - S': 10, 'Company Shirt - M': 20, 'Company Shirt - L': 20, 'Company Shirt - XL': 20, 'Company Shirt - 2XL': 20, 'Company Shirt - 3XL': 8, 'Company Shirt - 4XL': 6, 'Company Shirt - 5XL': 6,
  'Company Shirt (Long Sleeve) - XS': 6, 'Company Shirt (Long Sleeve) - S': 10, 'Company Shirt (Long Sleeve) - M': 20, 'Company Shirt (Long Sleeve) - L': 20, 'Company Shirt (Long Sleeve) - XL': 20, 'Company Shirt (Long Sleeve) - 2XL': 20, 'Company Shirt (Long Sleeve) - 3XL': 8, 'Company Shirt (Long Sleeve) - 4XL': 6, 'Company Shirt (Long Sleeve) - 5XL': 6,
  'Company T-Shirt (Long Sleeve) - XS': 6, 'Company T-Shirt (Long Sleeve) - S': 10, 'Company T-Shirt (Long Sleeve) - M': 20, 'Company T-Shirt (Long Sleeve) - L': 20, 'Company T-Shirt (Long Sleeve) - XL': 20, 'Company T-Shirt (Long Sleeve) - 2XL': 20, 'Company T-Shirt (Long Sleeve) - 3XL': 8, 'Company T-Shirt (Long Sleeve) - 4XL': 6, 'Company T-Shirt (Long Sleeve) - 5XL': 6,
  'Company T-Shirt (Short Sleeve) - XS': 6, 'Company T-Shirt (Short Sleeve) - S': 10, 'Company T-Shirt (Short Sleeve) - M': 20, 'Company T-Shirt (Short Sleeve) - L': 20, 'Company T-Shirt (Short Sleeve) - XL': 20, 'Company T-Shirt (Short Sleeve) - 2XL': 20, 'Company T-Shirt (Short Sleeve) - 3XL': 10, 'Company T-Shirt (Short Sleeve) - 4XL': 6, 'Company T-Shirt (Short Sleeve) - 5XL': 6,
  'Safety Shoe - Size 3': 3, 'Safety Shoe - Size 4': 3, 'Safety Shoe - Size 5': 5, 'Safety Shoe - Size 6': 5, 'Safety Shoe - Size 7': 10, 'Safety Shoe - Size 8': 10, 'Safety Shoe - Size 9': 10, 'Safety Shoe - Size 10': 10, 'Safety Shoe - Size 11': 5, 'Safety Shoe - Size 12': 3, 'Safety Shoe - Size 13': 3,
};

const getSafetyStockLevel = (itemKey: string) => SAFETY_STOCK_LEVELS[itemKey] ?? SAFETY_STOCK_LEVELS["default"];

const { PPE_ITEMS: ppeList, UNIFORM_ITEMS: uniformList, OFFICE_ITEMS: officeList } = (() => {
  const SHOE_SIZES_UK = [{ size: "Size 3" }, { size: "Size 4" }, { size: "Size 5" }, { size: "Size 6" }, { size: "Size 7" }, { size: "Size 8" }, { size: "Size 9" }, { size: "Size 10" }, { size: "Size 11" }, { size: "Size 12" }, { size: "Size 13" }];
  const CLOTHING_SIZES_EXTENDED = [{ size: "XS" }, { size: "S" }, { size: "M" }, { size: "L" }, { size: "XL" }, { size: "2XL" }, { size: "3XL" }, { size: "4XL" }, { size: "5XL" }];
  const PANTS_SIZES = [{ size: '26"' }, { size: '28"' }, { size: '30"' }, { size: '32"' }, { size: '34"' }, { size: '36"' }, { size: '38"' }, { size: '40"' }, { size: '42"' }, { size: '44"' }, { size: '46"' }, { size: '48"' }, { size: '50"' }];
  const HELMET_SIZES = [{ size: "M" }, { size: "L" }];
  return {
    PPE_ITEMS: [{ name: "3-ply Mask", sizes: [{ size: "Free Size" }] }, { name: "Medical Apron", sizes: [{ size: "Free Size" }] }, { name: "Crane Vest", sizes: [{ size: "Free Size" }] }, { name: "Earplug", sizes: [{ size: "Free Size" }] }, { name: "Forklift Vest", sizes: [{ size: "Free Size" }] }, { name: "Safety Goggles", sizes: [{ size: "Free Size" }] }, { name: "Safety Helmet", sizes: HELMET_SIZES }, { name: "N-95 Mask", sizes: [{ size: "Free Size" }] }, { name: "Safety Boot", sizes: SHOE_SIZES_UK }, { name: "Safety Insert", sizes: [{ size: "Free Size" }] }, { name: "Safety Shoe", sizes: SHOE_SIZES_UK }].sort((a, b) => a.name.localeCompare(b.name)),
    UNIFORM_ITEMS: [{ name: "Cargo Pants", sizes: PANTS_SIZES }, { name: "Company Shirt", sizes: CLOTHING_SIZES_EXTENDED }, { name: "Company Shirt (Long Sleeve)", sizes: CLOTHING_SIZES_EXTENDED }, { name: "Company T-Shirt (Long Sleeve)", sizes: CLOTHING_SIZES_EXTENDED }, { name: "Company T-Shirt (Short Sleeve)", sizes: CLOTHING_SIZES_EXTENDED }].sort((a, b) => a.name.localeCompare(b.name)),
    OFFICE_ITEMS: [{ name: "A3 Paper", sizes: [{ size: "80 gsm" }] }, { name: "A4 Paper", sizes: [{ size: "70 gsm" }, { size: "80 gsm" }] }, { name: "Ball Pen", sizes: [{ size: "Black" }, { size: "Blue" }, { size: "Red" }] }, { name: "Binder Clip", sizes: [{ size: "Small" }, { size: "Medium" }, { size: "Large" }] }, { name: "Cellophane Tape", sizes: [{ size: "18 mm" }] }, { name: "Correction Fluid", sizes: [{ size: "White" }] }, { name: "Correction Tape", sizes: [{ size: "5 mm" }] }, { name: "Cutter Blade", sizes: [{ size: "Large" }] }, { name: "Cutter Knife", sizes: [{ size: "Large" }] }, { name: "Document Tray", sizes: [{ size: "Plastic" }] }, { name: "Double-Sided Tape", sizes: [{ size: "24 mm" }] }, { name: "Envelope", sizes: [{ size: "C4" }, { size: "DL" }] }, { name: "Eraser", sizes: [{ size: "Standard" }] }, { name: "Glue Stick", sizes: [{ size: "21 g" }] }, { name: "Highlighter", sizes: [{ size: "Yellow" }, { size: "Green" }, { size: "Pink" }, { size: "Orange" }] }, { name: "Lever Arch File", sizes: [{ size: "2 inch" }, { size: "3 inch" }] }, { name: "Liquid Glue", sizes: [{ size: "50 ml" }] }, { name: "Masking Tape", sizes: [{ size: "24 mm" }] }, { name: "Mechanical Pencil", sizes: [{ size: "0.5 mm" }] }, { name: "Notebook", sizes: [{ size: "A4" }, { size: "A5" }] }, { name: "Paper Clip", sizes: [{ size: "28 mm" }] }, { name: "Pencil", sizes: [{ size: "2B" }] }, { name: "Pencil Lead", sizes: [{ size: "0.5 mm" }] }, { name: "Permanent Marker", sizes: [{ size: "Black" }, { size: "Blue" }, { size: "Red" }] }, { name: "Ring File", sizes: [{ size: "A4" }] }, { name: "Rubber Band", sizes: [{ size: "Small" }, { size: "Large" }] }, { name: "Scissors", sizes: [{ size: "Medium" }] }, { name: "Sharpener", sizes: [{ size: "Standard" }] }, { name: "Stapler", sizes: [{ size: "No.10" }] }, { name: "Stapler Pin", sizes: [{ size: "No.10" }, { size: "3-1M" }] }, { name: "Sticky Notes", sizes: [{ size: '3" x 3"' }] }, { name: "Whiteboard Marker", sizes: [{ size: "Black" }, { size: "Blue" }, { size: "Red" }, { size: "Green" }] }].sort((a, b) => a.name.localeCompare(b.name)),
  };
})();

const ALL_ITEMS = [...ppeList, ...uniformList, ...officeList];

const InventoryDashboard = () => {
  const { user } = useAuth();
  const { submissions, addSubmission, refreshSubmissions, isLoading } = useSubmissions();

  useEffect(() => { void refreshSubmissions(); }, [refreshSubmissions]);
  
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
  const [activityFilter, setActivityFilter] = useState<"all" | "restock" | "distribution">("all");
  const [isViewAllActivity, setIsViewAllActivity] = useState(false);
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

  const inventorySubmissions = submissions.filter(s => s.formType === "ppe_request");
  const purchaseSubmissions = submissions.filter(s => s.formType === "ppe_purchase");

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
    const activity = submissions
      .filter(s => (["ppe_request", "ppe_purchase"].includes(s.formType) && s.status === "approved") || s.formType === "inventory_addition")
      .filter(s => activityFilter === "all" || (activityFilter === "restock" ? s.formType === "inventory_addition" : s.formType !== "inventory_addition"))
      .sort((a,b) => {
        const dateA = a.data?.lastUpdatedAt || (a as any).updatedAt || a.submittedAt;
        const dateB = b.data?.lastUpdatedAt || (b as any).updatedAt || b.submittedAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
    return isViewAllActivity ? activity : activity.slice(0, 30);
  }, [submissions, activityFilter, isViewAllActivity]);

  const formatItemDescription = (sub: Submission) => {
    if (sub.formType === "inventory_addition") {
      const itemInfo = ALL_ITEMS.find(item => item.name === sub.data.itemName);
      const size = sub.data.size || (itemInfo?.sizes.length === 1 ? itemInfo.sizes[0].size : "Standard");
      return `+${sub.data.quantity}x ${sub.data.itemName} (${size})`;
    }
    return (sub.data.items || []).map((item: any) => {
      const name = item["Item Name"];
      const itemInfo = ALL_ITEMS.find(candidate => candidate.name === name);
      const size = item.Size || (itemInfo?.sizes.length === 1 ? itemInfo.sizes[0].size : "Standard");
      return `${item.Quantity}x ${name} (${size})`;
    }).join(", ");
  };

  if (isLoading) return <HRModuleSkeleton cards={4} />;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory Tracker</h1>
          <p className="text-muted-foreground text-sm mt-1">Monitor PPE, Uniform, and Office Supply stock levels.</p>
        </div>
      </div>

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
          <div className="lg:col-span-2 card-elevated overflow-hidden flex flex-col h-[600px]">
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
              <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar">
                {([['all', 'All'], ['distribution', 'Distributed'], ['restock', 'Restocked']] as const).map(([value, label]) => (
                  <button key={value} onClick={() => { setActivityFilter(value); setIsViewAllActivity(false); }} className={`whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-bold transition-colors ${activityFilter === value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:text-foreground'}`}>{label}</button>
                ))}
              </div>
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
                    const activityDate = sub.data?.lastUpdatedAt || (sub as any).updatedAt || sub.submittedAt;
                    return (
                      <div key={sub.id} className="p-4 hover:bg-muted/20 transition-colors">
                        <div className="flex justify-between items-start mb-1.5">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-foreground">{sub.employeeName}</p>
                            <Badge className={`border-0 text-[9px] uppercase px-1.5 py-0 ${isRestock ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400' : 'bg-primary/10 text-primary'}`}>
                              {isRestock ? "RESTOCK" : (sub.data.requestCategory || "PPE")}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">{new Date(activityDate).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {formatItemDescription(sub)}
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
            {recentActivity.length >= 30 && (
              <div className="shrink-0 border-t border-border bg-muted/10 p-3 text-center">
                <button onClick={() => setIsViewAllActivity(value => !value)} className="text-xs font-bold text-primary hover:underline">{isViewAllActivity ? "Show Recent 30" : "View All Activity"}</button>
              </div>
            )}
          </div>
        </div>
      </div>

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
    }, 500);
  };

  const renderCategory = (title: string, items: any[]) => (
    <div key={title}>
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

export default InventoryDashboard;
