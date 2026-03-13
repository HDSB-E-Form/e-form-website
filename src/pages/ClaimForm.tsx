import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const ClaimForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addSubmission } = useSubmissions();
  const [form, setForm] = useState({
    claimType: "Travel", amount: "", description: "",
    receiptDate: "", receiptNumber: "", remarks: "",
    hodName: "", hodEmail: "",
  });

  const handleChange = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSubmission({
      formType: "claim",
      status: "pending",
      submittedBy: user?.id || "",
      employeeName: user?.name || "",
      department: user?.department || "",
      data: { ...form, amount: parseFloat(form.amount) },
    });
    toast.success("Expense claim submitted successfully!");
    navigate("/home");
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <button onClick={() => navigate("/finance")} className="flex items-center text-muted-foreground hover:text-foreground mb-6 text-sm">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Finance Forms
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Expense Claim</h1>
        <p className="text-muted-foreground text-sm mt-1">Fill in the claim details</p>
      </div>

      <form onSubmit={handleSubmit} className="card-elevated p-6 space-y-4">
        <div className="space-y-2">
          <Label>Claim Type *</Label>
          <select
            value={form.claimType}
            onChange={e => handleChange("claimType", e.target.value)}
            className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option>Travel</option>
            <option>Accommodation</option>
            <option>Meals</option>
            <option>Transportation</option>
            <option>Office Supplies</option>
            <option>Training</option>
            <option>Others</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Amount (RM) *</Label>
            <Input type="number" step="0.01" value={form.amount} onChange={e => handleChange("amount", e.target.value)} placeholder="0.00" required className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>Receipt Date *</Label>
            <Input type="date" value={form.receiptDate} onChange={e => handleChange("receiptDate", e.target.value)} required className="h-11" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Receipt/Invoice Number</Label>
          <Input value={form.receiptNumber} onChange={e => handleChange("receiptNumber", e.target.value)} placeholder="e.g. INV-12345" className="h-11" />
        </div>

        <div className="space-y-2">
          <Label>Description *</Label>
          <Textarea value={form.description} onChange={e => handleChange("description", e.target.value)} placeholder="Describe the expense..." rows={3} required />
        </div>

        <div className="space-y-2">
          <Label>Additional Remarks</Label>
          <Textarea value={form.remarks} onChange={e => handleChange("remarks", e.target.value)} placeholder="Any additional notes..." rows={2} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>HOD/HOS Name *</Label>
            <Input value={form.hodName} onChange={e => handleChange("hodName", e.target.value)} placeholder="Approver name" required className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>HOD/HOS Email *</Label>
            <Input type="email" value={form.hodEmail} onChange={e => handleChange("hodEmail", e.target.value)} placeholder="approver@drb-hicom.com" required className="h-11" />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button type="submit" className="btn-gold text-sm">Submit Claim</button>
        </div>
      </form>
    </div>
  );
};

export default ClaimForm;
