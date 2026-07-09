import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { useUsers, type AppUser } from "@/contexts/UsersContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, User, Receipt, Upload, PlusCircle, Trash2, Wallet, FileText, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/supabase";

interface ClaimRow {
  description: string;
  receiptNo: string;
  amount: string;
}

const DEPARTMENT_CODES = [
  { code: "COF001", name: "CEO OFFICE" },
  { code: "MEN001", name: "MACHINING ENGINEERING" },
  { code: "CEN001", name: "CASTING ENGINEERING" },
  { code: "CTR001", name: "CASTING TROUBLESHOOTING" },
  { code: "MAS001", name: "MANUFACTURING AUTOMATION SERVICE" },
  { code: "IEN001", name: "INDUSTRIAL ENGINEERING" },
  { code: "TCD001", name: "MOULD & DESIGN DEVELOPMENT" },
  { code: "TCD002", name: "IN-HOUSE FABRICATION/TOOLROOM" },
  { code: "EDV001", name: "CASTING AND QUALITY DEV & DESIGN SIM" },
  { code: "EDV003", name: "TECHNICAL BIDDING/ INNOVATION" },
  { code: "EDV002", name: "MACHINING DEVELOPMENT" },
  { code: "MTC001", name: "CASTING MAINTENANCE" },
  { code: "MTC002", name: "MACHINING MAINTENANCE" },
  { code: "MTC003", name: "MOULD MAINTENANCE" },
  { code: "PVD001", name: "DIRECT PROCUREMENT" },
  { code: "PVD003", name: "NEW VENDOR DEVELOPMENT" },
  { code: "PVD002", name: "INDIRECT PROCUREMENT" },
  { code: "SHE001", name: "SAFETY, HEALTH & ENVIRONMENT" },
  { code: "FMT001", name: "BUILDING MAINTENANCE" },
  { code: "FMT002", name: "WATER TREATMENT PLANT" },
  { code: "FMT003", name: "KAIZEN" },
  { code: "EQT001", name: "CUSTOMER SERVICE OPERATION" },
  { code: "EQT002", name: "SUPPLIER QUALITY ENGINEERING" },
  { code: "IQT001", name: "QUALITY INSPECTION" },
  { code: "IQT003", name: "QMS & DOCUMENT CONTROL" },
  { code: "IQT002", name: "CMM & FA" },
  { code: "FUR001", name: "FURNACE" },
  { code: "CAS001", name: "CASTING" },
  { code: "SEC001", name: "SECONDARY" },
  { code: "DRM001", name: "DORMAN ROOM" },
  { code: "MAC001", name: "MACHINING" },
  { code: "DST001", name: "DIE SETTER" },
  { code: "HMS001", name: "5S & HMS" },
  { code: "SCM001", name: "PRODUCTION PLANNING & CONTROL" },
  { code: "SCM003", name: "MATERIAL MANAGEMENT" },
  { code: "SCM002", name: "WAREHOUSE & LOGISTIC" },
  { code: "LOM001", name: "LOMA" },
  { code: "FIN001", name: "MANAGEMENT ACCOUNTING" },
  { code: "FIN002", name: "FINANCIAL ACCOUNTING" },
  { code: "HCM001", name: "HUMAN RESOURCE & LEGAL" },
  { code: "HCM002", name: "ADMINISTRATION & SECURITY" },
  { code: "MKT001", name: "MARKETING" },
  { code: "BDV001", name: "BUSINESS OPERATION" },
  { code: "PMO001", name: "PROJECT MANAGEMENT OFFICE" },
  { code: "ITC002", name: "IT INFRASTRUCTURE" },
  { code: "ITC001", name: "IT APPLICATION" },
].sort((a, b) => a.code.localeCompare(b.code));

const PettyCashForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addSubmission } = useSubmissions();
  const { users, getUsersByRole, isLoading: areUsersLoading } = useUsers();
  const hosUsers: AppUser[] = useMemo(() => [...(getUsersByRole("HOS") || [])].sort((a, b) => (a.name || "").localeCompare(b.name || "")), [getUsersByRole]);
  const hodUsers: AppUser[] = useMemo(() => [...(getUsersByRole("HOD") || [])].sort((a, b) => (a.name || "").localeCompare(b.name || "")), [getUsersByRole]);
  // A HOP can have the primary role or a secondary role of 'head_of_purchasing'
  const purchasingHeads: AppUser[] = useMemo(() => [...users.filter(u => u.role === 'head_of_purchasing' || u.secondary_roles?.includes('head_of_purchasing'))].sort((a, b) => (a.name || "").localeCompare(b.name || "")), [users]);
  // A HOF can have the primary role or a secondary role of 'head_of_finance'
  const financeHeads: AppUser[] = useMemo(() => [...users.filter(u => u.role === 'head_of_finance' || u.secondary_roles?.includes('head_of_finance'))].sort((a, b) => (a.name || "").localeCompare(b.name || "")), [users]);
  const financeAdmins = getUsersByRole("finance_admin") || [];

  const [employeeInfo, setEmployeeInfo] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    employeeNumber: user?.employeeId || "",
    department: user?.department || "",
    position: (user as any)?.position || "",
    departmentCode: "",
    avatar: user?.avatar || "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (user) {
      setEmployeeInfo(prev => ({
        ...prev,
        name: user.name || "",
        phone: user.phone || "",
        employeeNumber: user.employeeId || "",
        department: user.department || "",
        position: (user as any)?.position || "",
        avatar: user.avatar || "",
      }));
    }
  }, [user]);

  const [claimRows, setClaimRows] = useState<ClaimRow[]>([
    { description: "", receiptNo: "", amount: "" },
    { description: "", receiptNo: "", amount: "" },
  ]);

  const [hosName, setHosName] = useState("");
  const [hodName, setHodName] = useState("");
  const [hopName, setHopName] = useState(""); // Head of Purchasing
  const [hofName, setHofName] = useState(""); // Head of Finance
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setAttachedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files!)]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addRow = () => {
    setClaimRows([...claimRows, { description: "", receiptNo: "", amount: "" }]);
  };

  const removeRow = (index: number) => {
    if (claimRows.length > 1) {
      setClaimRows(claimRows.filter((_, i) => i !== index));
    }
  };

  const updateRow = (index: number, field: keyof ClaimRow, value: string) => {
    const updated = [...claimRows];
    updated[index] = { ...updated[index], [field]: value };
    
    setClaimRows(updated);
  };

  const totalAmount = claimRows.reduce((sum, row) => {
    const amountVal = parseFloat(row.amount) || 0;
    return sum + amountVal;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!hosName || !hodName || !hopName || !hofName) {
      toast.error("Please select all approvers: HOS, HOD, Head of Purchasing, and Head of Finance.");
      return;
    }

    if (totalAmount > 5000) {
      toast.error("The total claim amount cannot exceed RM 5000.");
      return;
    }

    let initialStatus: "pending" | "approved_hos" | "approved_hod" = "pending";
    if (hosName === "N/A") {
      initialStatus = "approved_hos";
      if (hodName === "N/A") {
        initialStatus = "approved_hod";
      }
    }

    setIsSubmitting(true);

    let attachmentUrls: string[] = [];
    if (attachedFiles.length > 0) {
      for (const file of attachedFiles) {
        const filePath = `public/${user?.id || 'unknown_user'}/${Date.now()}_${file.name}`;
        
        const { data, error } = await supabase.storage
          .from('form-attachments')
          .upload(filePath, file);

        if (error) {
          toast.error(`Attachment upload failed: ${error.message}`);
          setIsSubmitting(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from('form-attachments')
          .getPublicUrl(data.path);
        
        attachmentUrls.push(urlData.publicUrl);
      }
    }

    const success = await addSubmission({
      formType: "claim",
      status: initialStatus,
      submittedBy: user?.id || "",
      employeeName: employeeInfo.name,
      department: employeeInfo.department,
      data: { 
        employeeInfo, 
        claimRows, 
        hosName, 
        hodName,
        hopName,
        hofName,
        totalAmount, 
        attachment: attachmentUrls.length > 0 ? attachmentUrls[0] : null,
        attachments: attachmentUrls,
      },
    });
    if (success) {
      // // --- 🔔 SEND EMAIL NOTIFICATION (DEACTIVATED) ---
      // try {
      //   const selectedHos = hosUsers.find(u => u.name === hosName);
      //   const selectedHod = hodUsers.find(u => u.name === hodName);
      //   const selectedHop = purchasingHeads.find(u => u.name === hopName);
      //   const selectedHof = financeHeads.find(u => u.name === hofName);
      //   
      //   // Gather all recipient emails
      //   const recipientEmails = [
      //     selectedHos?.email,
      //     selectedHod?.email,
      //     selectedHop?.email,
      //     selectedHof?.email,
      //     ...financeAdmins.map(admin => admin.email)
      //   ].filter(Boolean); // Filter out empty/undefined values

      //   if (recipientEmails.length > 0) {
      //     const { error: invokeError } = await supabase.functions.invoke('send-notification', {
      //       body: {
      //         to: recipientEmails,
      //         subject: `New Claim Submission from ${employeeInfo.name}`,
      //         employeeName: employeeInfo.name,
      //         formType: "Petty Cash Claim",
      //         amount: totalAmount.toString(),
      //         url: window.location.origin
      //       }
      //     });

      //     if (invokeError) {
      //       console.error("Edge Function Error:", invokeError);
      //     }
      //   }
      // } catch (err) {
      //   console.error("Failed to prepare email notification", err);
      // }

      toast.success("Petty cash claim submitted successfully!");
      navigate("/home");
    } else {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <button onClick={() => navigate("/finance")} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all mb-6 group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Finance Forms
      </button>

      <div className="mb-8">
        <h1 className="text-2xl lg:text-2xl font-bold text-foreground uppercase tracking-wide">
          Petty Cash Claim Form / Permohonan Wang Pendahuluan
        </h1>
        <p className="text-muted-foreground text-sm mt-1 uppercase tracking-wide">HICOM Diecastings Sdn Bhd</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee Information */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-2 mb-5">
            <User className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-sm">
              Employee Information / <span className="font-normal">Maklumat Pekerja</span>
            </h2>
          </div>

          {/* Pre-filled Details (Do not require filling) */}
          <div className="bg-muted/10 p-4 rounded-xl border border-border/50">
            <div className="py-2 sm:py-2.5 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">Name / Nama</span>
              <div className="text-xs font-bold text-foreground sm:col-span-2">{employeeInfo.name || "—"}</div>
            </div>
            <div className="py-2 sm:py-2.5 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">Position / Jawatan</span>
              <div className="text-xs font-bold text-foreground sm:col-span-2">{employeeInfo.position || "—"}</div>
            </div>
            <div className="py-2 sm:py-2.5 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">Staff ID / No. Pekerja</span>
              <div className="text-xs font-bold text-foreground sm:col-span-2">{employeeInfo.employeeNumber || "—"}</div>
            </div>
            <div className="py-2 sm:py-2.5 border-b-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">Department / Jabatan</span>
              <div className="text-xs font-bold text-foreground sm:col-span-2">{employeeInfo.department || "—"}</div>
            </div>
          </div>

          {/* Input Fields (Require filling) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Department Code / Kod Jabatan <span className="text-destructive">*</span></Label>
              <Select
                value={employeeInfo.departmentCode}
                onValueChange={value => setEmployeeInfo(p => ({ ...p, departmentCode: value }))}
                required
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select Department Code" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {DEPARTMENT_CODES.map(dept => (
                    <SelectItem key={dept.code} value={dept.code}>{dept.code} | {dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Date / Tarikh <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={employeeInfo.date}
                onChange={e => setEmployeeInfo(p => ({ ...p, date: e.target.value }))}
                className="h-11 dark:[color-scheme:dark]"
                required
              />
            </div>
          </div>
        </div>

        {/* Claim Details Table */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-2 mb-5">
            <Receipt className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-sm">
              Claim Details / <span className="font-normal">Butiran Tuntutan</span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-center text-xs font-semibold text-primary p-3 border border-border w-12">
                    No.
                  </th>
                  <th className="text-left text-xs font-semibold text-primary p-3 border border-border">
                    Claim Details
                  </th>
                  <th className="text-left text-xs font-semibold text-primary p-3 border border-border">
                    Receipt No.
                  </th>
                  <th className="text-right text-xs font-semibold text-primary p-3 border border-border">
                    Total Amount
                  </th>
                  <th className="w-10 border border-border"></th>
                </tr>
              </thead>
              <tbody>
                {claimRows.map((row, i) => (
                  <tr key={i}>
                    <td className="p-1.5 border border-border text-center font-medium text-sm text-muted-foreground">
                      {i + 1}.
                    </td>
                    <td className="p-1.5 border border-border">
                      <Input
                        value={row.description}
                        onChange={e => updateRow(i, "description", e.target.value)}
                        placeholder="Write the details"
                        className="h-10 border-0 shadow-none"
                      />
                    </td>
                    <td className="p-1.5 border border-border">
                      <Input
                        value={row.receiptNo}
                        onChange={e => updateRow(i, "receiptNo", e.target.value)}
                        placeholder="Enter No."
                        className="h-10 border-0 shadow-none"
                      />
                    </td>
                    <td className="p-1.5 border border-border">
                      <Input
                        type="number"
                        step="0.01"
                        value={row.amount}
                        onChange={e => updateRow(i, "amount", e.target.value)}
                        placeholder="0.00"
                        className="h-10 border-0 shadow-none text-right no-spinner"
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                      />
                    </td>
                    <td className="p-1.5 border border-border text-center">
                      {claimRows.length > 1 && (
                        <button type="button" onClick={() => removeRow(i)} className="text-destructive hover:text-destructive/80">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/30">
                  <td colSpan={3} className="p-3 border border-border text-right font-semibold text-sm text-muted-foreground">
                    Total (RM) <span className="text-[10px] text-destructive ml-2 font-bold">(Max RM 5000)</span>
                  </td>
                  <td className="p-3 border border-border text-right font-bold text-foreground text-lg">
                    RM {totalAmount.toFixed(2)}
                  </td>
                  <td className="border border-border"></td>
                </tr>
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-2 text-primary font-semibold text-sm mt-4 hover:text-primary/80 transition-colors"
          >
            <PlusCircle className="h-5 w-5" />
            Add Row / Tambah Baris
          </button>
        </div>

        {/* Approvals */}
        <div className="card-elevated p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">
                Head of Section / Ketua Bahagian <span className="text-destructive">*</span>
              </Label>
              <Select value={hosName || undefined} onValueChange={setHosName} disabled={areUsersLoading || hosUsers.length === 0}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={areUsersLoading ? "Loading users..." : "Choose Head of Section"} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="N/A">N/A</SelectItem>
                  {hosUsers.map(u => (
                    <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
          {!areUsersLoading && hosUsers.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1.5">Refresh if HOS list not available.</p>
          )}
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">
                Head of Department / Ketua Jabatan <span className="text-destructive">*</span>
              </Label>
              <Select value={hodName || undefined} onValueChange={setHodName} disabled={areUsersLoading || hodUsers.length === 0}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={areUsersLoading ? "Loading users..." : "Choose Head of Department"} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="N/A">N/A</SelectItem>
                  {hodUsers.map(u => (
                    <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
          {!areUsersLoading && hodUsers.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1.5">Refresh if HOD list not available.</p>
          )}
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">
                Head of Purchasing / Ketua Pembelian <span className="text-destructive">*</span>
              </Label>
              <Select value={hopName || undefined} onValueChange={setHopName} disabled={areUsersLoading || purchasingHeads.length === 0}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={areUsersLoading ? "Loading users..." : "Choose Head of Purchasing"} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {purchasingHeads.map(u => (
                    <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!areUsersLoading && purchasingHeads.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">Approver list not available. Please refresh the page.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">
                Head of Finance / Ketua Kewangan <span className="text-destructive">*</span>
              </Label>
              <Select value={hofName || undefined} onValueChange={setHofName} disabled={areUsersLoading || financeHeads.length === 0}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={areUsersLoading ? "Loading users..." : "Choose Head of Finance"} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {financeHeads.map(u => (
                    <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!areUsersLoading && financeHeads.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">Approver list not available. Please refresh the page.</p>
              )}
            </div>
          </div>
        </div>

        {/* Upload Document */}
        <div className="card-elevated p-6">
          <Label className="font-semibold text-sm mb-3 block">
            Upload Document / <span className="text-primary">Muat Naik Dokumen</span>
          </Label>
          
          {attachedFiles.length > 0 && (
            <div className="space-y-3 mb-4">
              {attachedFiles.map((file, i) => (
                <div key={i} className="border border-border rounded-xl p-4 flex items-center justify-between bg-muted/10">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0 ml-4"
                    title="Remove file"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

            <label
              htmlFor="file-upload"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer block w-full ${
                isDragging ? "border-primary bg-primary/10" : "border-border bg-muted/20 hover:bg-muted/30"
              }`}
            >
              <input
                id="file-upload"
                type="file"
                className="hidden"
              multiple={true}
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
              />
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
              Drag and drop or tap to upload receipt(s)
              </p>
              <p className="text-xs text-muted-foreground mt-1">(PDF, JPG, PNG)</p>
            </label>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row-reverse justify-center gap-3 sm:gap-4 pt-4 pb-8">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-gold w-full sm:w-auto px-6 py-3.5 sm:px-32 sm:py-4 rounded-full text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/finance")}
            className="w-full sm:w-auto px-6 py-3.5 sm:px-12 sm:py-4 rounded-full border-2 border-border text-foreground font-bold text-sm hover:bg-muted transition-colors text-center"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default PettyCashForm;
