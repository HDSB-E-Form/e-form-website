import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const CarRentalForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addSubmission } = useSubmissions();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    purpose: "", destination: "", startDate: "", endDate: "",
    carPreference: "", passengers: "", contactNumber: "",
    pickupLocation: "", returnLocation: "", remarks: "",
    hodName: "", hodEmail: "",
  });

  const handleChange = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSubmission({
      formType: "car_rental",
      status: "pending",
      submittedBy: user?.id || "",
      employeeName: user?.name || "",
      department: user?.department || "",
      data: form,
    });
    toast.success("Car rental request submitted successfully!");
    navigate("/home");
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <button onClick={() => navigate("/hr")} className="flex items-center text-muted-foreground hover:text-foreground mb-6 text-sm">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to HR Forms
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Company Car Request</h1>
        <p className="text-muted-foreground text-sm mt-1">Step {step} of 3</p>
        <div className="flex gap-2 mt-3">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-accent" : "bg-muted"}`} />
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card-elevated p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Trip Details</h2>
            <div className="space-y-2">
              <Label>Purpose of Trip *</Label>
              <Input value={form.purpose} onChange={e => handleChange("purpose", e.target.value)} placeholder="e.g. Client meeting" required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Destination *</Label>
              <Input value={form.destination} onChange={e => handleChange("destination", e.target.value)} placeholder="e.g. Kuala Lumpur" required className="h-11" />
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
            <div className="flex justify-end pt-4">
              <button type="button" onClick={() => setStep(2)} className="btn-gold text-sm">Next Step</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Vehicle & Contact</h2>
            <div className="space-y-2">
              <Label>Car Preference</Label>
              <Input value={form.carPreference} onChange={e => handleChange("carPreference", e.target.value)} placeholder="e.g. Sedan, SUV" className="h-11" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Number of Passengers</Label>
                <Input type="number" value={form.passengers} onChange={e => handleChange("passengers", e.target.value)} placeholder="e.g. 3" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Contact Number *</Label>
                <Input value={form.contactNumber} onChange={e => handleChange("contactNumber", e.target.value)} placeholder="+60..." required className="h-11" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pickup Location</Label>
                <Input value={form.pickupLocation} onChange={e => handleChange("pickupLocation", e.target.value)} placeholder="Location" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Return Location</Label>
                <Input value={form.returnLocation} onChange={e => handleChange("returnLocation", e.target.value)} placeholder="Location" className="h-11" />
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <button type="button" onClick={() => setStep(1)} className="px-6 py-3 text-sm text-muted-foreground hover:text-foreground">Previous</button>
              <button type="button" onClick={() => setStep(3)} className="btn-gold text-sm">Next Step</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Approval & Remarks</h2>
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
            <div className="space-y-2">
              <Label>Additional Remarks</Label>
              <Textarea value={form.remarks} onChange={e => handleChange("remarks", e.target.value)} placeholder="Any additional information..." rows={4} />
            </div>
            <div className="flex justify-between pt-4">
              <button type="button" onClick={() => setStep(2)} className="px-6 py-3 text-sm text-muted-foreground hover:text-foreground">Previous</button>
              <button type="submit" className="btn-gold text-sm">Submit Request</button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default CarRentalForm;
