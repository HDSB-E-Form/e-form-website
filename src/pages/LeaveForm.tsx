import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const LeaveForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addSubmission } = useSubmissions();
  const [form, setForm] = useState({
    leaveType: "Annual Leave", startDate: "", endDate: "",
    reason: "", days: "", hodName: "", hodEmail: "", contactDuring: "",
  });

  const handleChange = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSubmission({
      formType: "leave",
      status: "pending",
      submittedBy: user?.id || "",
      employeeName: user?.name || "",
      department: user?.department || "",
      data: form,
    });
    toast.success("Leave application submitted successfully!");
    navigate("/home");
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <button onClick={() => navigate("/hr")} className="flex items-center text-muted-foreground hover:text-foreground mb-6 text-sm">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to HR Forms
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Leave Application</h1>
        <p className="text-muted-foreground text-sm mt-1">Fill in the details below</p>
      </div>

      <form onSubmit={handleSubmit} className="card-elevated p-6 space-y-4">
        <div className="space-y-2">
          <Label>Leave Type *</Label>
          <select
            value={form.leaveType}
            onChange={e => handleChange("leaveType", e.target.value)}
            className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option>Annual Leave</option>
            <option>Sick Leave</option>
            <option>Emergency Leave</option>
            <option>Maternity/Paternity Leave</option>
            <option>Unpaid Leave</option>
            <option>Replacement Leave</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Date *</Label>
            <Input type="date" value={form.startDate} onChange={e => handleChange("startDate", e.target.value)} required className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>End Date *</Label>
            <Input type="date" value={form.endDate} onChange={e => handleChange("endDate", e.target.value)} required className="h-11" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Number of Days *</Label>
          <Input type="number" value={form.days} onChange={e => handleChange("days", e.target.value)} placeholder="e.g. 3" required className="h-11" />
        </div>

        <div className="space-y-2">
          <Label>Reason *</Label>
          <Textarea value={form.reason} onChange={e => handleChange("reason", e.target.value)} placeholder="Reason for leave..." rows={3} required />
        </div>

        <div className="space-y-2">
          <Label>Contact Number During Leave</Label>
          <Input value={form.contactDuring} onChange={e => handleChange("contactDuring", e.target.value)} placeholder="+60..." className="h-11" />
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
          <button type="submit" className="btn-gold text-sm">Submit Application</button>
        </div>
      </form>
    </div>
  );
};

export default LeaveForm;
