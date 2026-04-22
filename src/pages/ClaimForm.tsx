import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { useUsers } from "@/contexts/UsersContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, User, Receipt, Upload, PlusCircle, Trash2, Wallet, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/supabase";

interface ClaimRow {
  date: string;
  description: string;
  gst: string;
  receiptNo: string;
  amount: string;
}

const ClaimForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addSubmission } = useSubmissions();
  const { getUsersByRole } = useUsers();
  const hosUsers = getUsersByRole("HOS");
  const hodUsers = getUsersByRole("HOD");
  const financeAdmins = getUsersByRole("finance_admin");

  const [employeeInfo, setEmployeeInfo] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    employeeNumber: user?.employeeId || "",
    department: user?.department || "",
    designation: (user as any)?.position || "",
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
        designation: (user as any)?.position || "",
        avatar: user.avatar || "",
      }));
    }
  }, [user]);

  const [claimRows, setClaimRows] = useState<ClaimRow[]>([
    { date: "", description: "", gst: "0.00", receiptNo: "", amount: "0.00" },
    { date: "", description: "", gst: "", receiptNo: "", amount: "" },
  ]);

  const [hosName, setHosName] = useState("");
  const [hodName, setHodName] = useState("");
  const [financeCode, setFinanceCode] = useState("");
  const [amtReceived, setAmtReceived] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
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
      setAttachedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachedFile(e.target.files[0]);
    }
  };

  const addRow = () => {
    setClaimRows([...claimRows, { date: "", description: "", gst: "", receiptNo: "", amount: "" }]);
  };

  const removeRow = (index: number) => {
    if (claimRows.length > 1) {
      setClaimRows(claimRows.filter((_, i) => i !== index));
    }
  };

  const updateRow = (index: number, field: keyof ClaimRow, value: string) => {
    const updated = [...claimRows];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === "amount") {
      const amountVal = parseFloat(value) || 0;
      updated[index].gst = (amountVal * 0.06).toFixed(2);
    }

    setClaimRows(updated);
  };

  const totalAmount = claimRows.reduce((sum, row) => {
    const amountVal = parseFloat(row.amount) || 0;
    const gstVal = parseFloat(row.gst) || 0;
    return sum + (amountVal - gstVal);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!hosName || !hodName) {
      toast.error("Please select both Head of Section and Head of Department.");
      return;
    }

    setIsSubmitting(true);

    let attachmentUrl = null;
    if (attachedFile) {
      const filePath = `public/${user?.id || 'unknown_user'}/${Date.now()}_${attachedFile.name}`;
      
      const { data, error } = await supabase.storage
        .from('form-attachments')
        .upload(filePath, attachedFile);

      if (error) {
        toast.error(`Attachment upload failed: ${error.message}`);
        setIsSubmitting(false);
        return; // Stop if upload fails
      }

      // Get the public URL of the uploaded file
      const { data: urlData } = supabase.storage
        .from('form-attachments')
        .getPublicUrl(data.path);
      
      attachmentUrl = urlData.publicUrl;
    }

    const success = await addSubmission({
      formType: "claim",
      status: "pending",
      submittedBy: user?.id || "",
      employeeName: employeeInfo.name,
      department: employeeInfo.department,
      data: { 
        employeeInfo, 
        claimRows, 
        hosName, 
        hodName, 
        financeCode, 
        amtReceived, 
        totalAmount, 
        attachment: attachmentUrl,
      },
    });
    if (success) {
      // --- 🔔 SEND EMAIL NOTIFICATION ---
      try {
        const selectedHos = hosUsers.find(u => u.name === hosName);
        const selectedHod = hodUsers.find(u => u.name === hodName);
        
        // Gather all recipient emails
        const recipientEmails = [
          selectedHos?.email,
          selectedHod?.email,
          ...financeAdmins.map(admin => admin.email)
        ].filter(Boolean); // Filter out empty/undefined values

        if (recipientEmails.length > 0) {
          const { error: invokeError } = await supabase.functions.invoke('send-notification', {
            body: {
              to: recipientEmails,
              subject: `New Claim Submission from ${employeeInfo.name}`,
              employeeName: employeeInfo.name,
              formType: "Expense Claim / Miscellaneous Advance",
              amount: totalAmount.toFixed(2),
              url: window.location.origin
            }
          });

          if (invokeError) {
            console.error("Edge Function Error:", invokeError);
            toast.error("Form saved, but failed to send email notification. Check browser console.");
          }
        }
      } catch (err) {
        console.error("Failed to prepare email notification", err);
      }

      toast.success("Expense claim submitted successfully!");
      navigate("/home");
    } else {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <button onClick={() => navigate("/finance")} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all mb-6 group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Finance Forms
      </button>

      <div className="mb-8">
        <h1 className="text-2xl lg:text-2xl font-bold text-foreground uppercase tracking-wide">
          Miscellaneous Advance Form / Borang Tuntutan Pelbagai
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-muted/10 p-4 rounded-xl border border-border/50">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Name / Nama</Label>
              <div className="font-medium text-foreground text-sm">{employeeInfo.name || "—"}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Designation / Jawatan</Label>
              <div className="font-medium text-foreground text-sm">{employeeInfo.designation || "—"}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Staff ID / No. Pekerja</Label>
              <div className="font-medium text-foreground text-sm">{employeeInfo.employeeNumber || "—"}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Department / Jabatan</Label>
              <div className="font-medium text-foreground text-sm">{employeeInfo.department || "—"}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Mobile Number / No. Telefon</Label>
              <div className="font-medium text-foreground text-sm">{employeeInfo.phone || "—"}</div>
            </div>
          </div>

          {/* Input Fields (Require filling) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Department Code / Kod Jabatan <span className="text-destructive">*</span></Label>
              <Input
                value={employeeInfo.departmentCode}
                onChange={e => setEmployeeInfo(p => ({ ...p, departmentCode: e.target.value }))}
                placeholder="e.g. 123"
                className="h-11"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Date / Tarikh <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={employeeInfo.date}
                onChange={e => setEmployeeInfo(p => ({ ...p, date: e.target.value }))}
                className="h-11"
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
                  <th className="text-left text-xs font-semibold text-primary p-3 border border-border">
                    Date
                  </th>
                  <th className="text-left text-xs font-semibold text-primary p-3 border border-border">
                    Claim Details
                  </th>
                  <th className="text-left text-xs font-semibold text-primary p-3 border border-border w-24">
                    GST 6%
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
                    <td className="p-1.5 border border-border">
                      <Input
                        type="date"
                        value={row.date}
                        onChange={e => updateRow(i, "date", e.target.value)}
                        className="h-10 border-0 shadow-none"
                      />
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
                        type="number"
                        step="0.01"
                        value={row.gst}
                        onChange={e => updateRow(i, "gst", e.target.value)}
                        placeholder="0.00"
                        className="h-10 border-0 shadow-none text-right no-spinner"
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
                        className="h-10 border-0 shadow-none text-right"
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
                  <td colSpan={4} className="p-3 border border-border text-right font-semibold text-sm text-muted-foreground">
                    Total / Jumlah Besar (RM)
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">
                Head of Section / Ketua Bahagian <span className="text-destructive">*</span>
              </Label>
              <Select value={hosName} onValueChange={setHosName}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Choose Head of Section" />
                </SelectTrigger>
                <SelectContent>
                  {hosUsers.map(u => (
                    <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">
                Head of Department / Ketua Jabatan <span className="text-destructive">*</span>
              </Label>
              <Select value={hodName} onValueChange={setHodName}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Choose Head of Department" />
                </SelectTrigger>
                <SelectContent>
                  {hodUsers.map(u => (
                    <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Upload Document */}
        <div className="card-elevated p-6">
          <Label className="font-semibold text-sm mb-3 block">
            Upload Document / <span className="text-primary">Muat Naik Dokumen</span>
          </Label>
          
          {attachedFile ? (
            <div className="border border-border rounded-xl p-6 flex items-center justify-between bg-muted/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-foreground truncate">{attachedFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(attachedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0 ml-4"
                title="Remove file"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ) : (
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
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
              />
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Drag and drop or tap to upload receipt
              </p>
              <p className="text-xs text-muted-foreground mt-1">(PDF, JPG, PNG)</p>
            </label>
          )}
        </div>

        {/* Finance Department */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-2 mb-5">
            <Wallet className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-sm">
              Finance Department / <span className="font-normal">Kegunaan Kewangan</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Code / Kod <span className="text-destructive">*</span></Label>
              <Input
                value={financeCode}
                onChange={e => setFinanceCode(e.target.value)}
                className="h-11"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Amt Received / J.Diterima <span className="text-destructive">*</span></Label>
              <Input
                value={amtReceived}
                onChange={e => setAmtReceived(e.target.value)}
                className="h-11"
                required
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4 pt-4 pb-8">
          <button
            type="button"
            onClick={() => navigate("/finance")}
            className="px-10 py-3 rounded-full border-2 border-foreground text-foreground font-bold text-sm hover:bg-muted transition-colors"
          >
            Cancel / Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-gold px-10 py-3 rounded-full text-sm font-bold disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Submit / Hantar"}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground pb-4">
          HICOM DIECASTINGS GATE SYSTEM V2.4 &nbsp;•&nbsp; ISO 9001:2015 CERTIFIED
        </p>
      </form>
    </div>
  );
};

export default ClaimForm;
