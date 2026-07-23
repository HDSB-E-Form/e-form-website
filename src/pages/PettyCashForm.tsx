import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { useUsers, type AppUser } from "@/contexts/UsersContext";
import { useFormLanguage } from "@/contexts/FormLanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, User, Receipt, Upload, PlusCircle, Trash2, Wallet, FileText, Send, ShieldCheck } from "lucide-react";
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
  const location = useLocation();
  const { language } = useFormLanguage();
  const text = useCallback((english: string, malay: string) => language === "ms" ? malay : english, [language]);
  const { user } = useAuth();
  const { addSubmission, updateSubmission, submissions, isLoading: areSubmissionsLoading } = useSubmissions();
  const { users, isLoading: areUsersLoading } = useUsers();
  const hosUsers: AppUser[] = useMemo(() => [...users.filter(u => u.role === 'hos' || u.secondary_roles?.includes('hos'))].sort((a, b) => (a.name || "").localeCompare(b.name || "")), [users]);
  const hodUsers: AppUser[] = useMemo(() => [...users.filter(u => u.role === 'hod' || u.secondary_roles?.includes('hod'))].sort((a, b) => (a.name || "").localeCompare(b.name || "")), [users]);
  // A HOP can have the primary role or a secondary role of 'head_of_purchasing'
  const purchasingHeads: AppUser[] = useMemo(() => [...users.filter(u => u.role === 'head_of_purchasing' || u.secondary_roles?.includes('head_of_purchasing'))].sort((a, b) => (a.name || "").localeCompare(b.name || "")), [users]);
  // A HOF can have the primary role or a secondary role of 'head_of_finance'
  const financeHeads: AppUser[] = useMemo(() => [...users.filter(u => u.role === 'head_of_finance' || u.secondary_roles?.includes('head_of_finance'))].sort((a, b) => (a.name || "").localeCompare(b.name || "")), [users]);
  const getLocalDate = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const [employeeInfo, setEmployeeInfo] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    employeeNumber: user?.employeeId || "",
    department: user?.department || "",
    position: user?.position || "",
    departmentCode: "",
    avatar: user?.avatar || "",
    date: getLocalDate(),
  });

  useEffect(() => {
    if (user) {
      setEmployeeInfo(prev => ({
        ...prev,
        name: user.name || "",
        phone: user.phone || "",
        employeeNumber: user.employeeId || "",
        department: user.department || "",
        position: user.position || "",
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
  const [existingAttachmentUrls, setExistingAttachmentUrls] = useState<string[]>([]);
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

  const addValidatedFiles = (files: File[]) => {
    const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
    const invalidType = files.find(file => !allowedTypes.has(file.type));
    if (invalidType) return toast.error(`${invalidType.name} ${text("is not a PDF, JPG, or PNG file.", "bukan fail PDF, JPG atau PNG.")}`);
    const oversized = files.find(file => file.size > 10 * 1024 * 1024);
    if (oversized) return toast.error(`${oversized.name} ${text("exceeds the 10 MB file limit.", "melebihi had fail 10 MB.")}`);
    setAttachedFiles(current => {
      const unique = files.filter(file => !current.some(existing => existing.name === file.name && existing.size === file.size));
      if (unique.length !== files.length) toast.info(text("Duplicate attachments were ignored.", "Lampiran pendua telah diabaikan."));
      return [...current, ...unique];
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addValidatedFiles(Array.from(e.dataTransfer.files!));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addValidatedFiles(Array.from(e.target.files!));
    }
  };

  const editSubmissionId = useMemo(() => new URLSearchParams(location.search).get("editId"), [location.search]);
  const editSubmission = useMemo(
    () => editSubmissionId ? submissions.find(sub => sub.id === editSubmissionId) : null,
    [editSubmissionId, submissions]
  );
  const isEditMode = Boolean(editSubmission);

  useEffect(() => {
    if (!editSubmissionId) return;
    if (areSubmissionsLoading) return;
    if (!editSubmission) {
      toast.error(text("The claim selected for editing could not be found.", "Tuntutan yang dipilih untuk disunting tidak ditemui."));
      navigate("/submissions");
      return;
    }

    if (editSubmission.formType !== "claim") {
      toast.error(text("Only petty cash claims can be edited here.", "Hanya tuntutan wang runcit boleh disunting di sini."));
      navigate("/submissions");
      return;
    }

    if (editSubmission.submittedBy !== user?.id) {
      toast.error(text("You can only edit your own submissions.", "Anda hanya boleh menyunting penyerahan anda sendiri."));
      navigate("/submissions");
      return;
    }

    if (!["pending", "approved_hos"].includes(editSubmission.status)) {
      toast.error(text("This claim cannot be edited after HOD approval.", "Tuntutan ini tidak boleh disunting selepas kelulusan HOD."));
      navigate("/submissions");
      return;
    }

    const employeeInfoData = editSubmission.data.employeeInfo || {};
    setEmployeeInfo(prev => ({
      ...prev,
      ...employeeInfoData,
      departmentCode: employeeInfoData.departmentCode || prev.departmentCode,
      date: employeeInfoData.date || prev.date,
    }));
    setClaimRows(editSubmission.data.claimRows || [{ description: "", receiptNo: "", amount: "" }] );
    setHosName(editSubmission.data.hosName || "");
    setHodName(editSubmission.data.hodName || "");
    setHopName(editSubmission.data.hopName || "");
    setHofName(editSubmission.data.hofName || "");
    setExistingAttachmentUrls(Array.isArray(editSubmission.data.attachments) ? editSubmission.data.attachments : []);
  }, [editSubmissionId, editSubmission, user?.id, navigate, areSubmissionsLoading, text]);

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingAttachment = (index: number) => {
    setExistingAttachmentUrls(current => current.filter((_, attachmentIndex) => attachmentIndex !== index));
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

  if (editSubmissionId && areSubmissionsLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center p-6 text-sm font-medium text-muted-foreground">{text("Loading claim details…", "Memuatkan butiran tuntutan…")}</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!hosName || !hodName || !hopName || !hofName) {
      toast.error(text("Please select all approvers: HOS, HOD, Head of Purchasing, and Head of Finance.", "Sila pilih semua pelulus: HOS, HOD, Ketua Pembelian dan Ketua Kewangan."));
      return;
    }

    const populatedRows = claimRows.filter(row => row.description.trim() || row.receiptNo.trim() || row.amount.trim());
    if (populatedRows.length === 0) {
      toast.error(text("Please enter at least one claim item.", "Sila masukkan sekurang-kurangnya satu item tuntutan."));
      return;
    }
    if (populatedRows.some(row => !row.description.trim() || !row.receiptNo.trim() || !row.amount.trim())) {
      toast.error(text("Each claim item must include a description, receipt number, and amount.", "Setiap item tuntutan mesti mempunyai butiran, nombor resit dan jumlah."));
      return;
    }
    if (populatedRows.some(row => !Number.isFinite(Number(row.amount)) || Number(row.amount) <= 0)) {
      toast.error(text("Every claim amount must be greater than RM 0.00.", "Setiap jumlah tuntutan mestilah melebihi RM 0.00."));
      return;
    }
    const validatedTotalAmount = populatedRows.reduce((sum, row) => sum + Number(row.amount), 0);

    if (validatedTotalAmount > 5000) {
      toast.error(text("The total claim amount cannot exceed RM 5000.", "Jumlah keseluruhan tuntutan tidak boleh melebihi RM 5000."));
      return;
    }
    if (existingAttachmentUrls.length === 0 && attachedFiles.length === 0) {
      toast.error(text("Please attach at least one receipt or supporting document.", "Sila lampirkan sekurang-kurangnya satu resit atau dokumen sokongan."));
      return;
    }

    setIsSubmitting(true);

    const finalAttachmentUrls = [...existingAttachmentUrls];
    const newlyUploadedPaths: string[] = [];
    if (attachedFiles.length > 0) {
      for (const file of attachedFiles) {
        const filePath = `public/${user?.id || 'unknown_user'}/${crypto.randomUUID()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        
        const { data, error } = await supabase.storage
          .from('form-attachments')
          .upload(filePath, file);

        if (error) {
          if (newlyUploadedPaths.length > 0) await supabase.storage.from('form-attachments').remove(newlyUploadedPaths);
          toast.error(`${text("Attachment upload failed", "Muat naik lampiran gagal")}: ${error.message}`);
          setIsSubmitting(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from('form-attachments')
          .getPublicUrl(data.path);
        
        finalAttachmentUrls.push(urlData.publicUrl);
        newlyUploadedPaths.push(data.path);
      }
    }

    const submissionData = {
      employeeInfo,
      claimRows: populatedRows.map(row => ({ ...row, description: row.description.trim(), receiptNo: row.receiptNo.trim(), amount: Number(row.amount).toFixed(2) })),
      hosName,
      hodName,
      hopName,
      hofName,
      totalAmount: Number(validatedTotalAmount.toFixed(2)),
      hosUserId: hosName === "N/A" ? null : hosUsers.find(approver => approver.name === hosName)?.id || null,
      hodUserId: hodName === "N/A" ? null : hodUsers.find(approver => approver.name === hodName)?.id || null,
      hopUserId: purchasingHeads.find(approver => approver.name === hopName)?.id || null,
      hofUserId: financeHeads.find(approver => approver.name === hofName)?.id || null,
      attachment: finalAttachmentUrls.length > 0 ? finalAttachmentUrls[0] : null,
      attachments: finalAttachmentUrls,
      ...(isEditMode ? {
        rejectedStage: undefined,
        remarks: undefined,
        lastEditedAt: new Date().toISOString(),
        lastEditedBy: user?.id || "",
        approvalRestartedAfterEdit: true,
      } : {}),
    };

    if (isEditMode && editSubmissionId && editSubmission) {
      let restartedStatus: "pending" | "approved_hos" | "approved_hod" = "pending";
      if (hosName === "N/A") {
        restartedStatus = hodName === "N/A" ? "approved_hod" : "approved_hos";
      }
      const success = await updateSubmission(editSubmissionId, submissionData, restartedStatus);
      if (success) {
        toast.success(text("Petty cash claim updated. The approval process has restarted.", "Tuntutan wang runcit telah dikemas kini. Proses kelulusan telah dimulakan semula."));
        navigate("/submissions");
      } else {
        if (newlyUploadedPaths.length > 0) await supabase.storage.from('form-attachments').remove(newlyUploadedPaths);
        setIsSubmitting(false);
      }
      return;
    }

    let initialStatus: "pending" | "approved_hos" | "approved_hod" = "pending";
    if (hosName === "N/A") {
      initialStatus = "approved_hos";
      if (hodName === "N/A") {
        initialStatus = "approved_hod";
      }
    }

    const success = await addSubmission({
      formType: "claim",
      status: initialStatus,
      submittedBy: user?.id || "",
      employeeName: employeeInfo.name,
      department: employeeInfo.department,
      data: submissionData,
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

      toast.success(text("Petty cash claim submitted successfully!", "Tuntutan wang runcit berjaya dihantar!"));
      navigate("/submissions");
    } else {
      if (newlyUploadedPaths.length > 0) await supabase.storage.from('form-attachments').remove(newlyUploadedPaths);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <button type="button" onClick={() => navigate(isEditMode ? "/submissions" : "/finance")} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all mb-6 group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> {isEditMode ? text("Back to My Submissions", "Kembali ke Penyerahan Saya") : text("Back to Finance Forms", "Kembali ke Borang Kewangan")}
      </button>

      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          {isEditMode ? text("Edit Petty Cash Claim", "Sunting Tuntutan Wang Runcit") : text("Petty Cash Claim Form", "Borang Tuntutan Wang Runcit")}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee Information */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">01</span>
            <User className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-base">
              {text("Employee Information", "Maklumat Pekerja")}
            </h2>
          </div>

          {/* Pre-filled Details (Do not require filling) */}
          <div className="bg-muted/10 p-4 rounded-xl border border-border/50">
            <div className="py-2 sm:py-2.5 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">{text("Name", "Nama")}</span>
              <div className="text-sm font-bold text-foreground sm:col-span-2">{employeeInfo.name || "—"}</div>
            </div>
            <div className="py-2 sm:py-2.5 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">{text("Position", "Jawatan")}</span>
              <div className="text-sm font-bold text-foreground sm:col-span-2">{employeeInfo.position || "—"}</div>
            </div>
            <div className="py-2 sm:py-2.5 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">{text("Staff ID", "No. Pekerja")}</span>
              <div className="text-sm font-bold text-foreground sm:col-span-2">{employeeInfo.employeeNumber || "—"}</div>
            </div>
            <div className="py-2 sm:py-2.5 border-b-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">{text("Department", "Jabatan")}</span>
              <div className="text-sm font-bold text-foreground sm:col-span-2">{employeeInfo.department || "—"}</div>
            </div>
          </div>

          {/* Input Fields (Require filling) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">{text("Department Code", "Kod Jabatan")} <span className="text-destructive">*</span></Label>
              <Select
                value={employeeInfo.departmentCode}
                onValueChange={value => setEmployeeInfo(p => ({ ...p, departmentCode: value }))}
                required
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={text("Select Department Code", "Pilih Kod Jabatan")} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {DEPARTMENT_CODES.map(dept => (
                    <SelectItem key={dept.code} value={dept.code}>{dept.code} | {dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">{text("Date", "Tarikh")} <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                max={getLocalDate()}
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
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">02</span>
            <Receipt className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-base">
              {text("Claim Details", "Butiran Tuntutan")}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-center text-xs font-semibold text-primary p-3 border border-border w-12">
                    No.
                  </th>
                  <th className="text-left text-xs font-semibold text-primary p-3 border border-border">
                    {text("Claim Details", "Butiran Tuntutan")}
                  </th>
                  <th className="text-left text-xs font-semibold text-primary p-3 border border-border">
                    {text("Receipt No.", "No. Resit")}
                  </th>
                  <th className="text-right text-xs font-semibold text-primary p-3 border border-border">
                    {text("Total Amount", "Jumlah Keseluruhan")}
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
                        placeholder={text("Write the details", "Tulis butiran")}
                        className="h-10 border-0 shadow-none"
                      />
                    </td>
                    <td className="p-1.5 border border-border">
                      <Input
                        value={row.receiptNo}
                        onChange={e => updateRow(i, "receiptNo", e.target.value)}
                        placeholder={text("Enter No.", "Masukkan No.")}
                        className="h-10 border-0 shadow-none"
                      />
                    </td>
                    <td className="p-1.5 border border-border">
                      <Input
                        type="number"
                        min="0.01"
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
                    {text("Total", "Jumlah")} (RM) <span className="text-[10px] text-destructive ml-2 font-bold">{text("(Max RM 5000)", "(Maksimum RM 5000)")}</span>
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
            {text("Add Row", "Tambah Baris")}
          </button>
        </div>

        {/* Approvals */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">03</span>
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-base">
              {text("Digital Approvals", "Kelulusan Digital")}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">
                {text("Head of Section", "Ketua Seksyen")} <span className="text-destructive">*</span>
              </Label>
              <Select value={hosName || undefined} onValueChange={setHosName} disabled={areUsersLoading}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={areUsersLoading ? text("Loading users...", "Memuatkan pengguna...") : text("Choose Head of Section", "Pilih Ketua Seksyen")} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="N/A">{text("N/A", "Tidak Berkenaan")}</SelectItem>
                  {hosUsers.map(u => (
                    <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
          {!areUsersLoading && hosUsers.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1.5">{text("Refresh if HOS list is not available.", "Muat semula jika senarai HOS tidak tersedia.")}</p>
          )}
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">
                {text("Head of Department", "Ketua Jabatan")} <span className="text-destructive">*</span>
              </Label>
              <Select value={hodName || undefined} onValueChange={setHodName} disabled={areUsersLoading}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={areUsersLoading ? text("Loading users...", "Memuatkan pengguna...") : text("Choose Head of Department", "Pilih Ketua Jabatan")} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="N/A">{text("N/A", "Tidak Berkenaan")}</SelectItem>
                  {hodUsers.map(u => (
                    <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
          {!areUsersLoading && hodUsers.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1.5">{text("Refresh if HOD list is not available.", "Muat semula jika senarai HOD tidak tersedia.")}</p>
          )}
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">
                {text("Head of Purchasing", "Ketua Pembelian")} <span className="text-destructive">*</span>
              </Label>
              <Select value={hopName || undefined} onValueChange={setHopName} disabled={areUsersLoading || purchasingHeads.length === 0}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={areUsersLoading ? text("Loading users...", "Memuatkan pengguna...") : text("Choose Head of Purchasing", "Pilih Ketua Pembelian")} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {purchasingHeads.map(u => (
                    <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!areUsersLoading && purchasingHeads.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">{text("Approver list not available. Please refresh the page.", "Senarai pelulus tidak tersedia. Sila muat semula halaman.")}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">
                {text("Head of Finance", "Ketua Kewangan")} <span className="text-destructive">*</span>
              </Label>
              <Select value={hofName || undefined} onValueChange={setHofName} disabled={areUsersLoading || financeHeads.length === 0}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={areUsersLoading ? text("Loading users...", "Memuatkan pengguna...") : text("Choose Head of Finance", "Pilih Ketua Kewangan")} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {financeHeads.map(u => (
                    <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!areUsersLoading && financeHeads.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">{text("Approver list not available. Please refresh the page.", "Senarai pelulus tidak tersedia. Sila muat semula halaman.")}</p>
              )}
            </div>
          </div>
        </div>

        {/* Upload Document */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">04</span>
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-base">
              {text("Supporting Documents", "Dokumen Sokongan")}
            </h2>
          </div>
          
          {(existingAttachmentUrls.length > 0 || attachedFiles.length > 0) && (
            <div className="space-y-3 mb-4">
              {existingAttachmentUrls.map((url, i) => (
                <div key={url} className="border border-border rounded-xl p-4 flex items-center justify-between bg-muted/10">
                   <a href={url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-4 text-sm font-medium text-primary hover:underline"><div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><FileText className="h-5 w-5 text-primary" /></div><span className="truncate">{text("Existing attachment", "Lampiran sedia ada")} {i + 1}</span></a>
                   <button type="button" onClick={() => removeExistingAttachment(i)} className="ml-4 flex-shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive" title={text("Remove existing attachment", "Buang lampiran sedia ada")}><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
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
                    title={text("Remove file", "Buang fail")}
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
              className={`border-2 border-dashed rounded-xl p-6 sm:p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer block w-full ${
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
              {text("Drag and drop or tap to upload receipt(s)", "Seret dan lepaskan atau ketik untuk memuat naik resit")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">(PDF, JPG, PNG)</p>
            </label>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row-reverse justify-center gap-3 sm:gap-4 pt-4 pb-8">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-gold w-full sm:w-auto sm:min-w-64 px-6 py-3.5 sm:py-4 rounded-full text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
          >
            <Send className="h-4 w-4" />
            {isSubmitting
              ? (isEditMode ? text("Updating...", "Sedang dikemas kini...") : text("Submitting...", "Sedang dihantar..."))
              : (isEditMode ? text("Update Claim", "Kemas Kini Tuntutan") : text("Submit", "Hantar"))}
          </button>
          <button
            type="button"
            onClick={() => navigate("/finance")}
            className="w-full sm:w-auto px-6 py-3.5 sm:px-12 sm:py-4 rounded-full border-2 border-border text-foreground font-bold text-sm hover:bg-muted transition-colors text-center"
          >
            {text("Cancel", "Batal")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PettyCashForm;
