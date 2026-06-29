import React, { useState, useEffect } from "react";
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

const PPE_ITEMS = [
  "Safety Goggle",
  "Safety Helmet",
  "Safety Boot",
  "Safety Shoe",
  "Safety Insert",
  
  "Earplug",
  "Apron",
  "Crane Vest",
  "3-ply Mask",
  "N-95 Mask",
  "Forklift Vest"
];

const UNIFORM_ITEMS = [
  "Company T-Shirt (Short Sleeve)",
  "Company T-Shirt (Long Sleeve)",
  "Company Shirt",
  "Company Shirt (Long Sleeve)",
  "Cargo Pants"
];

const OFFICE_ITEMS = [
  "Ball Pen",
  "Permanent Marker",
  "Highlighter",
  "Pencil",
  "Eraser",
  "Correction Tape",
  "A4 Paper",
  "Notebook",
  "Stapler",
  "Staple Pin",
  "Paper Clip",
  "Binder Clip",
  "File Folder",
  "Ring File",
  "Sticky Notes",
  "Scissors",
  "Glue Stick",
  "Clear Tape",
  "Calculator",
  "Whiteboard Marker",
  "A3 Paper",
  "A5 Paper"
];

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
      setEmployeeInfo(prev => ({
        ...prev,
        name: user.name || "",
        staffNo: user.employeeId || "",
        department: user.department || "",
        phone: user.phone || "",
        position: (user as any)?.position || "",
        avatar: user.avatar || "",
      }));
    }
  }, [user]);

  const [requestCategory, setRequestCategory] = useState<"ppe" | "uniform" | "office">("ppe");
  const [requestType, setRequestType] = useState<"issue" | "buy">("issue");
  const [ppeItems, setPpeItems] = useState(PPE_ITEMS.map(name => ({ name, selected: false, size: "", quantity: "1" })));
  const [uniformItems, setUniformItems] = useState(UNIFORM_ITEMS.map(name => ({ name, selected: false, size: "", quantity: "1" })));
  const [officeItems, setOfficeItems] = useState(OFFICE_ITEMS.map(name => ({ name, selected: false, size: "", quantity: "1" })));
  const [remarks, setRemarks] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);

  const currentItems = requestCategory === "ppe" ? ppeItems : requestCategory === "uniform" ? uniformItems : officeItems;
  const setCurrentItems = requestCategory === "ppe" ? setPpeItems : requestCategory === "uniform" ? setUniformItems : setOfficeItems;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleItemChange = (index: number, field: string, value: string | boolean) => {
    setCurrentItems((prev: any) => prev.map((item: any, i: number) => i === index ? { ...item, [field]: value } : item));
  };

  const toggleItemSelection = (index: number) => {
    setCurrentItems((prev: any) => prev.map((item: any, i: number) => i === index ? { ...item, selected: !item.selected } : item));
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
        items: selectedItems.map(({ name, size, quantity }) => requestCategory === "office" ? { "Item Name": name, Quantity: quantity } : { "Item Name": name, Size: size, Quantity: quantity }),
        remarks,
        ...(requestType === "buy" && { invoiceUrl }),
      },
    });

    if (success) {
      try {
        const recipientEmails = [
          ...hrAdmins.map(admin => admin.email)
        ].filter(Boolean);

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
        console.error("Failed to send email", err);
      }

      toast.success("Collection record saved successfully!");
      navigate("/home");
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
                    {requestCategory !== "office" && (
                      <th className="text-[10px] uppercase font-bold text-muted-foreground px-4 py-3 text-left w-24">Size / Saiz</th>
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
                      {requestCategory !== "office" && (
                        <td className="px-2 py-1 print:px-4 print:py-1 print:w-48">
                          <Select 
                            value={item.size} 
                            onValueChange={(value) => handleItemChange(i, "size", value)}
                            disabled={!item.selected}
                          >
                            <SelectTrigger className="h-10 border-0 bg-background/50 focus:bg-background print:text-xs print:bg-transparent print:border-none print:shadow-none print:p-0 print:h-auto">
                              <SelectValue placeholder="Size" />
                            </SelectTrigger>
                            <SelectContent className="print:hidden max-h-64">
                              {requestCategory === "ppe" ? (
                                item.name === "Safety Shoe" || item.name === "Safety Boot" ? (
                                  <>
                                    <SelectItem value="4">4</SelectItem>
                                    <SelectItem value="5">5</SelectItem>
                                    <SelectItem value="6">6</SelectItem>
                                    <SelectItem value="7">7</SelectItem>
                                    <SelectItem value="8">8</SelectItem>
                                    <SelectItem value="9">9</SelectItem>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="11">11</SelectItem>
                                    <SelectItem value="12">12</SelectItem>
                                    <SelectItem value="13">13</SelectItem>
                                    <SelectItem value="14">14</SelectItem>
                                  </>
                                ) : (
                                  <SelectItem value="Free Size">Free Size</SelectItem>
                                )
                              ) : item.name === "Cargo Pants" ? (
                                <>
                                  <SelectItem value="28">28</SelectItem>
                                  <SelectItem value="30">30</SelectItem>
                                  <SelectItem value="32">32</SelectItem>
                                  <SelectItem value="34">34</SelectItem>
                                  <SelectItem value="36">36</SelectItem>
                                  <SelectItem value="38">38</SelectItem>
                                  <SelectItem value="40">40</SelectItem>
                                  <SelectItem value="42">42</SelectItem>
                                  <SelectItem value="44">44</SelectItem>
                                </>
                              ) : (
                                <>
                                  <SelectItem value="XS">XS</SelectItem>
                                  <SelectItem value="S">S</SelectItem>
                                  <SelectItem value="M">M</SelectItem>
                                  <SelectItem value="L">L</SelectItem>
                                  <SelectItem value="XL">XL</SelectItem>
                                  <SelectItem value="2XL">2XL</SelectItem>
                                  <SelectItem value="3XL">3XL</SelectItem>
                                  <SelectItem value="4XL">4XL</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
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
              <p className="hidden print:block text-black border-b border-gray-400 min-h-[2rem]">{remarks || '—'}</p>
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
                document.title = `PPE_Purchase_Form_${employeeInfo.name.replace(' ', '_')}`;
                
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