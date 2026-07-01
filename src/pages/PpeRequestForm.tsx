import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { useUsers } from "@/contexts/UsersContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, UserCheck, Package, Send, ShoppingCart, Upload, FileText, Printer, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/supabase";
import logo from "@/assets/logo.png";

const getStoredPrices = () => {
  try {
    return JSON.parse(localStorage.getItem("hdsb_item_prices") || "{}");
  } catch {
    return {};
  }
};
const SHOE_SIZES_UK = [
  { size: "Size 3", price: 62.00 }, { size: "Size 4", price: 62.00 }, { size: "Size 5", price: 62.00 },
  { size: "Size 6", price: 62.00 }, { size: "Size 7", price: 62.00 }, { size: "Size 8", price: 62.00 },
  { size: "Size 9", price: 62.00 }, { size: "Size 10", price: 62.00 }, { size: "Size 11", price: 62.00 },
  { size: "Size 12", price: 62.00 }, { size: "Size 13", price: 62.00 },
];
const CLOTHING_SIZES_EXTENDED = [
  { size: "XS", price: 0.00 }, { size: "S", price: 0.00 }, { size: "M", price: 0.00 }, { size: "L", price: 0.00 },
  { size: "XL", price: 0.00 }, { size: "2XL", price: 0.00 }, { size: "3XL", price: 0.00 }, { size: "4XL", price: 0.00 }, { size: "5XL", price: 0.00 },
];
const PANTS_SIZES = [
  { size: '26"', price: 40.00 }, { size: '28"', price: 40.00 }, { size: '30"', price: 40.00 }, { size: '32"', price: 40.00 },
  { size: '34"', price: 40.00 }, { size: '36"', price: 40.00 }, { size: '38"', price: 40.00 }, { size: '40"', price: 40.00 },
  { size: '42"', price: 40.00 }, { size: '44"', price: 40.00 }, { size: '46"', price: 40.00 }, { size: '48"', price: 40.00 }, { size: '50"', price: 40.00 },
];
const HELMET_SIZES = [{ size: "M", price: 11.00 }, { size: "L", price: 11.00 }];

const PPE_ITEMS = [
  { name: "3-ply Mask", sizes: [{ size: "Free Size", price: 15.00 }], unit: "Box" },
  { name: "Medical Apron", sizes: [{ size: "Free Size", price: 25.00 }], unit: "pcs" },
  { name: "Crane Vest", sizes: [{ size: "Free Size", price: 0.00 }], unit: "pcs" },
  { name: "Earplug", sizes: [{ size: "Free Size", price: 1.10 }], unit: "pair" },
  { name: "Forklift Vest", sizes: [{ size: "Free Size", price: 0.00 }], unit: "pcs" },
  { name: "Safety Goggles", sizes: [{ size: "Free Size", price: 10.30 }], unit: "pcs" },
  { name: "Safety Helmet", sizes: HELMET_SIZES, unit: "pcs" },
  { name: "N-95 Mask", sizes: [{ size: "Free Size", price: 20.00 }], unit: "pcs" },
  { name: "Safety Boot", sizes: SHOE_SIZES_UK.map(s => ({ ...s, price: 62.00 })), unit: "pair" },
  { name: "Safety Insert", sizes: [{ size: "Free Size", price: 15.00 }], unit: "pair" },
  { name: "Safety Shoe", sizes: SHOE_SIZES_UK, unit: "pair" },
].sort((a, b) => a.name.localeCompare(b.name));

const UNIFORM_ITEMS = [
  { name: "Cargo Pants", sizes: PANTS_SIZES, unit: "pcs" },
  { name: "Company Shirt", sizes: CLOTHING_SIZES_EXTENDED.map(s => ({ ...s, price: 16.00 })), unit: "pcs" },
  { name: "Company Shirt (Long Sleeve)", sizes: CLOTHING_SIZES_EXTENDED.map(s => ({ ...s, price: 17.00 })), unit: "pcs" },
  { name: "Company T-Shirt (Long Sleeve)", sizes: CLOTHING_SIZES_EXTENDED.map(s => ({ ...s, price: 23.00 })), unit: "pcs" },
  { name: "Company T-Shirt (Short Sleeve)", sizes: CLOTHING_SIZES_EXTENDED.map(s => ({ ...s, price: 20.00 })), unit: "pcs" },
].sort((a, b) => a.name.localeCompare(b.name));

const OFFICE_ITEMS = [
  { name: "A3 Paper", sizes: [{ size: "80 gsm", price: 30.00 }], unit: "ream" },
  { name: "A4 Paper", sizes: [{ size: "70 gsm", price: 12.00 }, { size: "80 gsm", price: 15.00 }], unit: "ream" },
  { name: "Ball Pen", sizes: [{ size: "Black", price: 1.50 }, { size: "Blue", price: 1.50 }, { size: "Red", price: 1.50 }], unit: "pcs" },
  { name: "Binder Clip", sizes: [{ size: "Small", price: 3.00 }, { size: "Medium", price: 5.00 }, { size: "Large", price: 7.00 }], unit: "box" },
  { name: "Cellophane Tape", sizes: [{ size: "18 mm", price: 2.00 }], unit: "roll" },
  { name: "Correction Fluid", sizes: [{ size: "White", price: 4.50 }], unit: "bottle" },
  { name: "Correction Tape", sizes: [{ size: "5 mm", price: 5.00 }], unit: "pcs" },
  { name: "Cutter Blade", sizes: [{ size: "Large", price: 8.00 }], unit: "pack" },
  { name: "Cutter Knife", sizes: [{ size: "Large", price: 6.00 }], unit: "pcs" },
  { name: "Document Tray", sizes: [{ size: "Plastic", price: 15.00 }], unit: "pcs" },
  { name: "Double-Sided Tape", sizes: [{ size: "24 mm", price: 4.00 }], unit: "roll" },
  { name: "Envelope", sizes: [{ size: "C4", price: 0.50 }, { size: "DL", price: 0.30 }], unit: "pcs" },
  { name: "Eraser", sizes: [{ size: "Standard", price: 1.00 }], unit: "pcs" },
  { name: "Glue Stick", sizes: [{ size: "21 g", price: 3.50 }], unit: "pcs" },
  { name: "Highlighter", sizes: [{ size: "Yellow", price: 2.50 }, { size: "Green", price: 2.50 }, { size: "Pink", price: 2.50 }, { size: "Orange", price: 2.50 }], unit: "pcs" },
  { name: "Lever Arch File", sizes: [{ size: "2 inch", price: 8.00 }, { size: "3 inch", price: 10.00 }], unit: "pcs" },
  { name: "Liquid Glue", sizes: [{ size: "50 ml", price: 3.00 }], unit: "bottle" },
  { name: "Masking Tape", sizes: [{ size: "24 mm", price: 3.00 }], unit: "roll" },
  { name: "Mechanical Pencil", sizes: [{ size: "0.5 mm", price: 5.00 }], unit: "pcs" },
  { name: "Notebook", sizes: [{ size: "A4", price: 7.00 }, { size: "A5", price: 5.00 }], unit: "pcs" },
  { name: "Paper Clip", sizes: [{ size: "28 mm", price: 2.00 }], unit: "box" },
  { name: "Pencil", sizes: [{ size: "2B", price: 1.00 }], unit: "pcs" },
  { name: "Pencil Lead", sizes: [{ size: "0.5 mm", price: 2.50 }], unit: "tube" },
  { name: "Permanent Marker", sizes: [{ size: "Black", price: 3.00 }, { size: "Blue", price: 3.00 }, { size: "Red", price: 3.00 }], unit: "pcs" },
  { name: "Ring File", sizes: [{ size: "A4", price: 6.00 }], unit: "pcs" },
  { name: "Rubber Band", sizes: [{ size: "Small", price: 2.00 }, { size: "Large", price: 3.00 }], unit: "pack" },
  { name: "Scissors", sizes: [{ size: "Medium", price: 7.00 }], unit: "pcs" },
  { name: "Sharpener", sizes: [{ size: "Standard", price: 1.50 }], unit: "pcs" },
  { name: "Stapler", sizes: [{ size: "No.10", price: 12.00 }], unit: "pcs" },
  { name: "Stapler Pin", sizes: [{ size: "No.10", price: 2.00 }, { size: "3-1M", price: 3.00 }], unit: "box" },
  { name: "Sticky Notes", sizes: [{ size: '3" x 3"', price: 4.00 }], unit: "pad" },
  { name: "Whiteboard Marker", sizes: [{ size: "Black", price: 3.50 }, { size: "Blue", price: 3.50 }, { size: "Red", price: 3.50 }, { size: "Green", price: 3.50 }], unit: "pcs" },
].sort((a, b) => a.name.localeCompare(b.name));

const PpeRequestForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addSubmission } = useSubmissions();
  const { getUsersByRole } = useUsers();
  
  const hrAdmins = getUsersByRole("hr_admin");

  const [employeeInfo, setEmployeeInfo] = useState({
    name: user?.name || "",
    staffNo: user?.employeeId || "",
    department: user?.department || "",
    position: (user as any)?.position || "",
    avatar: user?.avatar || "",
    phone: user?.phone || "",
  });

  useEffect(() => {
    if (user) {
      setEmployeeInfo({
        name: user.name || "",
        staffNo: user.employeeId || "",
        department: user.department || "",
        phone: user.phone || "",
        position: (user as any)?.position || "",
        avatar: user.avatar || "",
      });
    }
  }, [user]);

  const [requestCategory, setRequestCategory] = useState<"ppe" | "uniform" | "office">("ppe");
  const [requestType, setRequestType] = useState<"issue" | "buy">("issue");
  
  const initializeItems = (items: any[]) => items.map(item => ({
    ...item,
    selected: false,
    size: item.sizes.length === 1 ? item.sizes[0].size : (item.sizes.length === 0 ? "N/A" : ""),
    quantity: "1"
  }));

  const [ppeItems, setPpeItems] = useState(() => initializeItems(PPE_ITEMS));
  const [uniformItems, setUniformItems] = useState(() => initializeItems(UNIFORM_ITEMS));
  const [officeItems, setOfficeItems] = useState(() => initializeItems(OFFICE_ITEMS));
  const [remarks, setRemarks] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentItems = requestCategory === "ppe" ? ppeItems : requestCategory === "uniform" ? uniformItems : officeItems;
  
  const totalCost = useMemo(() => {
    if (requestType !== 'buy') return 0;
    return currentItems.reduce((acc, item) => {
      if (!item.selected) return acc;
      const sizeInfo = item.sizes.find((s: any) => s.size === item.size);
      
      // --- DYNAMIC PRICING ---
      // 1. Check for admin-set price first.
      const storedPrices = getStoredPrices();
      const priceKey = `${item.name}::${item.size}`;
      // 2. Fallback to hardcoded price if not set.
      const price = storedPrices[priceKey] !== undefined ? storedPrices[priceKey] : (sizeInfo?.price || 0);
      const quantity = parseInt(item.quantity) || 0;
      return acc + (price * quantity);
    }, 0);
  }, [currentItems, requestType]);

  const handleItemChange = (index: number, field: string, value: string | boolean) => {
    const updateFn = (prev: any) => prev.map((item: any, i: number) => i === index ? { ...item, [field]: value } : item);
    if (requestCategory === "ppe") setPpeItems(updateFn);
    else if (requestCategory === "uniform") setUniformItems(updateFn);
    else setOfficeItems(updateFn);
  };

  const toggleItemSelection = (index: number) => {
    const updateFn = (prev: any) => prev.map((item: any, i: number) => i === index ? { ...item, selected: !item.selected } : item);
    if (requestCategory === "ppe") setPpeItems(updateFn);
    else if (requestCategory === "uniform") setUniformItems(updateFn);
    else setOfficeItems(updateFn);
  };

  const handleInvoiceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingInvoice(true);
    const fileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const filePath = `ppe-purchase/${user?.id || "unknown"}/${Date.now()}_${fileName}`;

    const { data, error } = await supabase.storage.from("form-attachments").upload(filePath, file);
    if (error || !data) {
      toast.error(`Upload failed: ${error?.message || "Unknown error"}`);
      setIsUploadingInvoice(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("form-attachments").getPublicUrl(data.path);
    if (!urlData) {
      toast.error("Failed to get invoice URL");
      setIsUploadingInvoice(false);
      return;
    }

    setInvoiceFile(file);
    setInvoiceUrl(urlData.publicUrl);
    setIsUploadingInvoice(false);
    toast.success("Invoice uploaded successfully.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedItems = currentItems.filter(item => item.selected);
    
    if (selectedItems.length === 0) {
      toast.error("Please select at least one item to request.");
      return;
    }

    if (selectedItems.some(item => !item.quantity || parseInt(item.quantity) < 1)) {
      toast.error("Please provide a valid quantity for all selected items.");
      return;
    }

    if (requestType === "buy" && !invoiceUrl) {
      toast.error("Please upload an invoice for purchase requests.");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    const success = await addSubmission({
      formType: requestType === "buy" ? "ppe_purchase" : "ppe_request",
      status: "approved",
      submittedBy: user?.id || "",
      employeeName: employeeInfo.name,
      department: employeeInfo.department,
      data: {
        employeeInfo,
        requestCategory,
        requestType,
        items: selectedItems.map(({ name, size, quantity }) => 
          ({ "Item Name": name, Size: size, Quantity: quantity })
        ),
        totalCost: requestType === 'buy' ? totalCost : undefined,
        remarks,
        ...(requestType === "buy" && { invoiceUrl }),
      },
    });

    if (success) {
      toast.success("Collection record saved successfully!");
      navigate("/home");

      // Send email notification as background best-effort action
      try {
        const recipientEmails = hrAdmins.map(admin => admin.email).filter(Boolean);

        if (recipientEmails.length > 0) {
          await supabase.functions.invoke('send-notification', {
            body: {
              to: recipientEmails,
              subject: `New ${requestType === "buy" ? "Purchase" : "Collection"} Record for ${requestCategory.toUpperCase()} from ${employeeInfo.name}`,
              employeeName: employeeInfo.name,
              formType: requestType === "buy" ? "PPE | Uniform Purchase" : "PPE | Uniform | Office Supplies Request",
              url: window.location.origin
            }
          });
        }
      } catch (err) {
        console.error("Ignoring failed email notification:", err);
      }
    } else {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setInvoiceFile(null);
    setInvoiceUrl(null);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto print:p-8 print:max-w-none print:w-full print:bg-white print:text-black">
      {/* Print Header */}
      <div className="hidden print:flex items-center mb-8 border-b-2 border-black pb-6">
        <img src={logo} alt="HICOM Diecasting" className="h-14 w-auto object-contain mr-6" />
        <div className="text-left">
          <h1 className="text-2xl font-bold uppercase tracking-widest text-black">HICOM Diecastings Sdn Bhd</h1>
          <p className="text-sm text-gray-600 mt-1 uppercase tracking-wide">
            {requestType === 'buy' ? 'Purchase Requisition Form' : 'Collection Record'}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-gray-500">Date Printed:</p>
          <p className="text-sm font-semibold text-black">{new Date().toLocaleDateString('en-GB')}</p>
        </div>
      </div>

      <button onClick={() => navigate("/hr")} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all mb-6 group print:hidden">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to HR Forms
      </button>

      <div className="mb-8 print:hidden">
        <h1 className="text-2xl font-bold text-foreground uppercase tracking-wide">
          PPE | Uniform | Office Supplies Request
        </h1>
        <p className="text-muted-foreground text-sm mt-1 uppercase tracking-wide">HICOM Diecastings Sdn Bhd</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee Details */}
        <div className="card-elevated p-6 print:p-0 print:shadow-none print:border-none print:mb-8">
          <div className="flex items-center gap-2 mb-5">
            <UserCheck className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-sm">
              Employee Details / <span className="font-normal">Butiran Pekerja</span>
            </h2>
          </div>

          <div className="bg-muted/10 p-4 rounded-xl border border-border/50 print:bg-transparent print:p-0 print:border-none print:rounded-none">
            <div className="py-2 sm:py-3 border-b border-border/50 print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start print:py-1">
              <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Name / Nama</span>
              <div className="text-xs sm:text-sm font-medium text-foreground print:text-black sm:col-span-2">{employeeInfo.name || "—"}</div>
            </div>
            <div className="py-2 sm:py-3 border-b border-border/50 print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start print:py-1">
              <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Position / Jawatan</span>
              <div className="text-xs sm:text-sm font-medium text-foreground print:text-black sm:col-span-2">{employeeInfo.position || "—"}</div>
            </div>
            <div className="py-2 sm:py-3 border-b border-border/50 print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start print:py-1">
              <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Staff ID / No Pekerja</span>
              <div className="text-xs sm:text-sm font-medium text-foreground print:text-black sm:col-span-2">{employeeInfo.staffNo || "—"}</div>
            </div>
            <div className="py-2 sm:py-3 border-b-0 print:border-b-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start print:py-1">
              <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Department / Jabatan</span>
              <div className="text-xs sm:text-sm font-medium text-foreground print:text-black sm:col-span-2">{employeeInfo.department || "—"}</div>
            </div>
          </div>
        </div>

        {/* Request Category */}
        <div className="card-elevated p-6 print:p-0 print:shadow-none print:border-none">
          <div className="flex items-center justify-between gap-4 mb-5 print:hidden">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-foreground text-sm">
                Request Details / <span className="font-normal">Butiran Permohonan</span>
              </h2>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setRequestType("issue");
                  setRequestCategory("ppe");
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  requestType === "issue"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                Issue
              </button>
              <button
                type="button"
                onClick={() => {
                  setRequestType("buy");
                  setRequestCategory("ppe");
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  requestType === "buy"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                <ShoppingCart className="h-3.5 w-3.5" /> Buy
              </button>
            </div>
          </div>

          {requestType === 'buy' && (
            <div className="mt-6 pt-6 border-t border-border flex justify-end">
              <div className="text-right">
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Estimated Cost</p>
                <p className="text-3xl font-bold text-primary mt-1">RM {totalCost.toFixed(2)}</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary print:hidden">Category / Kategori <span className="text-destructive">*</span></Label>              
              <div className="flex flex-col sm:flex-row gap-3 mt-1.5 print:hidden">
                {[
                  { id: "ppe", label: "PPE" },
                  { id: "uniform", label: "Uniform" },
                  ...(requestType === "issue" ? [{ id: "office", label: "Office Supply" }] : [])
                ].map(cat => (
                  <div
                    key={cat.id}
                    className={`flex-1 rounded-xl border-2 p-3 sm:p-4 transition-all cursor-pointer flex items-center gap-3 ${
                      requestCategory === cat.id
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-muted-foreground/30 text-muted-foreground"
                    }`}
                    onClick={() => setRequestCategory(cat.id as any)}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${requestCategory === cat.id ? "border-primary" : "border-muted-foreground"}`}>
                      {requestCategory === cat.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <span className="font-bold text-sm uppercase tracking-wider">{cat.label}</span>
                  </div>
                ))}
              </div>
              <div className="hidden print:block">
                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Request Category</p>
                <p className="text-base font-bold text-black">{requestCategory.toUpperCase()}</p>
              </div>
              <div className="hidden print:block mt-2">
                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Request Type</p>
                <p className="text-base font-bold text-black">{requestType === 'buy' ? 'Purchase' : 'Issue'}</p>
              </div>
            </div>

            <div className="border border-border rounded-lg overflow-x-auto print:border-2 print:border-black">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border print:bg-gray-100">
                    <th className="text-[10px] uppercase font-bold text-muted-foreground px-4 py-3 text-center w-16 print:hidden">Select</th>
                    <th className="text-[10px] uppercase font-bold text-muted-foreground px-4 py-3 text-left">Item Name / Nama Barang</th>
                    <th className="text-[10px] uppercase font-bold text-muted-foreground px-4 py-3 text-left w-48">Size / Saiz</th>
                    {requestType === 'buy' && (
                      <th className="text-[10px] uppercase font-bold text-muted-foreground px-4 py-3 text-left w-28">Price (RM)</th>
                    )}
                    <th className="text-[10px] uppercase font-bold text-muted-foreground px-4 py-3 text-left w-24">Qty / Kuantiti</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {currentItems.map((item, i) => (
                    <tr key={i} className={`transition-colors ${item.selected ? 'bg-primary/5' : 'hover:bg-muted/5'} ${!item.selected ? 'print:hidden' : ''} print:bg-transparent`}>
                      <td className="px-4 py-1 text-center print:hidden">
                        <div 
                          onClick={() => toggleItemSelection(i)}
                          className={`w-5 h-5 mx-auto rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${item.selected ? 'border-emerald-500 bg-emerald-500' : 'border-muted-foreground/30 hover:border-muted-foreground'}`}
                        >
                          {item.selected && <CheckCircle className="h-5 w-5 text-white" />}
                        </div>
                      </td>
                      <td className="px-4 py-1 text-sm font-semibold text-foreground print:py-1 print:text-xs">
                        {item.name}
                      </td>
                      <td className="px-2 py-1 print:px-4 print:py-1 print:w-48">
                          <Select 
                            value={item.size} 
                            onValueChange={(value) => handleItemChange(i, "size", value)}
                            disabled={!item.selected || item.sizes.length === 0}
                          >
                            <SelectTrigger className="h-10 border-0 bg-background/50 focus:bg-background print:text-xs print:bg-transparent print:border-none print:shadow-none print:p-0 print:h-auto">
                              <SelectValue placeholder="Size" />
                            </SelectTrigger>
                            <SelectContent className="print:hidden max-h-64">
                              {item.sizes.length > 0 ? (
                                item.sizes.map((s: any) => (
                                  <SelectItem key={s.size} value={s.size}>
                                    {s.size}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="N/A" disabled>N/A</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                      </td>
                      {requestType === 'buy' && (
                        <td className="px-4 py-1 text-sm font-bold text-foreground print:py-1 print:text-xs text-right">
                        {(() => {
                          const storedPrices = getStoredPrices();
                          const priceKey = `${item.name}::${item.size}`;
                          const price = storedPrices[priceKey] !== undefined ? storedPrices[priceKey] : (item.sizes.find((s: any) => s.size === item.size)?.price || 0);
                          return price.toFixed(2);
                        })()}
                        </td>
                      )}
                      <td className="px-2 py-1 print:px-4 print:py-1 print:w-24">
                        <Input 
                          type="number" 
                          min="1"
                          value={item.quantity} 
                          onChange={(e) => handleItemChange(i, "quantity", e.target.value)}
                          className="h-10 border-0 bg-background/50 focus:bg-background no-spinner print:bg-transparent print:border-none print:shadow-none print:p-0 print:h-auto print:text-xs"
                          onWheel={(e) => (e.target as HTMLElement).blur()}
                          disabled={!item.selected}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-1.5 pt-4 print:pt-6">
              <Label className="text-xs font-semibold text-primary">Remarks / Ulasan</Label>
              <Input
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Please enter remarks if any / Sila masukkan ulasan jika ada..."
                className="h-11 print:hidden"
              />
              <p className="hidden print:block text-black border-b-2 border-black min-h-[2rem] pb-2">{remarks || ' '}</p>
            </div>

            {requestType === "buy" && (
              <div className="space-y-1.5 pt-4 border-t border-border print:hidden">
                <Label className="text-xs font-semibold text-primary">Upload Invoice / Receipt <span className="text-destructive">*</span></Label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                  {invoiceUrl && invoiceFile ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 text-emerald-600">
                        <FileText className="h-5 w-5" />
                        <span className="text-sm font-medium truncate max-w-xs">{invoiceFile.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setInvoiceFile(null);
                          setInvoiceUrl(null);
                          resetForm();
                        }}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                      >
                        Change File
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="invoice-upload" className="cursor-pointer block">
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-sm font-semibold text-muted-foreground">Click to upload invoice</span>
                        <span className="text-xs text-muted-foreground">PDF, Image, or document</span>
                      </div>
                      <input
                        id="invoice-upload"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        className="hidden"
                        onChange={handleInvoiceChange}
                        disabled={isUploadingInvoice}
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row-reverse justify-center gap-3 sm:gap-4 pt-4 pb-8 print:hidden">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-gold w-full sm:w-auto px-6 py-3.5 sm:px-32 sm:py-4 rounded-full text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? "Submitting..." : "Submit Record"}
          </button>
          {requestType === 'buy' && (
            <button
              type="button"
              onClick={() => {
                const originalTitle = document.title;
                document.title = `PPE_Purchase_Form_${employeeInfo.name.replace(/\s+/g, '_')}`;
                
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
              }}
              className="w-full sm:w-auto px-6 py-3.5 sm:px-12 sm:py-4 rounded-full border-2 border-border text-foreground font-bold text-sm hover:bg-muted transition-colors text-center flex items-center justify-center gap-2"
            ><Printer className="h-4 w-4" /> Print Form</button>
          )}
          <button
            type="button"
            onClick={() => navigate("/hr")}
            className="w-full sm:w-auto px-6 py-3.5 sm:px-12 sm:py-4 rounded-full border-2 border-border text-foreground font-bold text-sm hover:bg-muted transition-colors text-center"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Signature Section - Only visible on print */}
      <div className="hidden print:block mt-12 pt-6">
        <div className="grid grid-cols-2 gap-16">
          <div className="text-left">
            <div className="border-b-2 border-black pb-2"></div>
            <p className="mt-2 text-xs font-bold">Requester's Signature</p>
            <p className="mt-4 text-xs text-gray-600">Name:</p>
            <p className="mt-4 text-xs text-gray-600">Date:</p>
          </div>
          <div className="text-left">
            <div className="border-b-2 border-black pb-2"></div>
            <p className="mt-2 text-xs font-bold">Finance Department</p>
            <p className="mt-4 text-xs text-gray-600">Name:</p>
            <p className="mt-4 text-xs text-gray-600">Date:</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PpeRequestForm;