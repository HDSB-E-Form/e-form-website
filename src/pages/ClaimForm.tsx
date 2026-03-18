import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { useUsers } from "@/contexts/UsersContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, Receipt, Upload, PlusCircle, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

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

  const [employeeInfo, setEmployeeInfo] = useState({
    name: user?.name || "",
    phone: "",
    employeeNumber: user?.employeeId || "",
    department: user?.department || "",
    departmentCode: "",
    date: new Date().toISOString().split("T")[0],
  });

  const [claimRows, setClaimRows] = useState<ClaimRow[]>([
    { date: "", description: "", gst: "0.00", receiptNo: "", amount: "0.00" },
    { date: "", description: "", gst: "", receiptNo: "", amount: "" },
  ]);

  const [hosName, setHosName] = useState("");
  const [hodName, setHodName] = useState("");
  const [financeCode, setFinanceCode] = useState("");
  const [amtReceived, setAmtReceived] = useState("");

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
    setClaimRows(updated);
  };

  const totalAmount = claimRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSubmission({
      formType: "claim",
      status: "pending",
      submittedBy: user?.id || "",
      employeeName: employeeInfo.name,
      department: employeeInfo.department,
      data: { employeeInfo, claimRows, hosName, hodName, financeCode, amtReceived, totalAmount },
    });
    toast.success("Expense claim submitted successfully!");
    navigate("/home");
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <button onClick={() => navigate("/finance")} className="flex items-center text-muted-foreground hover:text-foreground mb-6 text-sm">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Finance Forms
      </button>

      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground uppercase tracking-wide">
          Miscellaneous Advance Form /
        </h1>
        <p className="text-muted-foreground text-sm mt-1 uppercase tracking-wide">Borang Tuntutan Pelbagai</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee Information */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-2 mb-5">
            <User className="h-5 w-5 text-accent" />
            <h2 className="font-bold text-foreground uppercase text-sm tracking-wide">
              Employee Information / <span className="font-normal">Maklumat Pekerja</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-accent uppercase tracking-wider">Name / Nama</Label>
              <Input
                value={employeeInfo.name}
                onChange={e => setEmployeeInfo(p => ({ ...p, name: e.target.value }))}
                placeholder="Enter full name"
                className="h-11"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-accent uppercase tracking-wider">Phone Number / No. Telefon</Label>
              <Input
                value={employeeInfo.phone}
                onChange={e => setEmployeeInfo(p => ({ ...p, phone: e.target.value }))}
                placeholder="01X-XXXXXXX"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-accent uppercase tracking-wider">Employee Number / No. Pekerja</Label>
              <Input
                value={employeeInfo.employeeNumber}
                onChange={e => setEmployeeInfo(p => ({ ...p, employeeNumber: e.target.value }))}
                placeholder="e.g. HICOM-1234"
                className="h-11"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-accent uppercase tracking-wider">Department / Jabatan Atau Bahagian</Label>
              <Input
                value={employeeInfo.department}
                onChange={e => setEmployeeInfo(p => ({ ...p, department: e.target.value }))}
                placeholder="Production / Finance / etc."
                className="h-11"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-accent uppercase tracking-wider">Department Code / Kod Jabatan</Label>
              <Input
                value={employeeInfo.departmentCode}
                onChange={e => setEmployeeInfo(p => ({ ...p, departmentCode: e.target.value }))}
                placeholder="e.g. DEPT-01"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-accent uppercase tracking-wider">Date / Tarikh</Label>
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
            <Receipt className="h-5 w-5 text-accent" />
            <h2 className="font-bold text-foreground uppercase text-sm tracking-wide">
              Claim Details / <span className="font-normal">Butiran Tuntutan</span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left text-xs font-semibold text-accent uppercase tracking-wider p-3 border border-border">
                    Date / Tarikh
                  </th>
                  <th className="text-left text-xs font-semibold text-accent uppercase tracking-wider p-3 border border-border">
                    Claim Details or Description / Butiran Tuntutan
                  </th>
                  <th className="text-left text-xs font-semibold text-accent uppercase tracking-wider p-3 border border-border w-24">
                    GST 6%
                  </th>
                  <th className="text-left text-xs font-semibold text-accent uppercase tracking-wider p-3 border border-border">
                    Receipt No / No. Resit
                  </th>
                  <th className="text-right text-xs font-semibold text-accent uppercase tracking-wider p-3 border border-border">
                    Total Amount / Jumlah (RM)
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
                        placeholder="e.g. Fuel for company visit"
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
                        className="h-10 border-0 shadow-none"
                      />
                    </td>
                    <td className="p-1.5 border border-border">
                      <Input
                        value={row.receiptNo}
                        onChange={e => updateRow(i, "receiptNo", e.target.value)}
                        placeholder="R-12345"
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
                  <td colSpan={4} className="p-3 border border-border text-right font-semibold text-sm text-muted-foreground uppercase">
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
            className="flex items-center gap-2 text-accent font-semibold text-sm mt-4 hover:text-accent/80 transition-colors"
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
                Head of Section/ ketua bahagian <span className="text-destructive">*</span>
              </Label>
              <select
                value={hosName}
                onChange={e => setHosName(e.target.value)}
                className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="">Choose Head of Section</option>
                {hosUsers.map(u => (
                  <option key={u.id} value={u.name}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">
                Head of Department / Ketua Jabatan <span className="text-destructive">*</span>
              </Label>
              <select
                value={hodName}
                onChange={e => setHodName(e.target.value)}
                className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="">Choose Head of Department</option>
                <option>Dato' Ibrahim</option>
                <option>Encik Rashid</option>
                <option>Puan Nora</option>
              </select>
            </div>
          </div>
        </div>

        {/* Upload Document */}
        <div className="card-elevated p-6">
          <Label className="font-semibold text-sm mb-3 block">
            Muat Naik Dokumen / <span className="text-accent">Upload Document</span>
          </Label>
          <div className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center text-center bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer">
            <Upload className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Tap to upload receipt or supporting docs
            </p>
            <p className="text-xs text-muted-foreground mt-1">(PDF, JPG, PNG)</p>
          </div>
        </div>

        {/* Finance Department */}
        <div className="card-elevated p-6 bg-muted/30">
          <div className="flex items-center gap-2 mb-5">
            <Wallet className="h-5 w-5 text-accent" />
            <h2 className="font-bold text-foreground uppercase text-sm tracking-wide">
              Finance Department / <span className="font-normal">Kegunaan Kewangan</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-accent uppercase tracking-wider">Code / Kod</Label>
              <Input
                value={financeCode}
                onChange={e => setFinanceCode(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-accent uppercase tracking-wider">Amt Received / J.Diterima</Label>
              <Input
                value={amtReceived}
                onChange={e => setAmtReceived(e.target.value)}
                className="h-11"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4 pt-4 pb-8">
          <button
            type="button"
            onClick={() => navigate("/finance")}
            className="px-10 py-3 rounded-full border-2 border-foreground text-foreground font-bold text-sm uppercase tracking-wider hover:bg-muted transition-colors"
          >
            Cancel / Batal
          </button>
          <button
            type="submit"
            className="btn-gold px-10 py-3 rounded-full text-sm uppercase tracking-wider font-bold"
          >
            Submit / Hantar
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClaimForm;
