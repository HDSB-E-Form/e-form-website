import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { useUsers, type AppUser } from "@/contexts/UsersContext";
import { useStoreDepartmentAccess } from "@/hooks/useStoreDepartmentAccess";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, UserCheck, ClipboardList, Send } from "lucide-react";
import { toast } from "sonner";

const SUPERIOR_EMAILS = [
  "nuraisyah@hidsb.com",
  "riduan@hidsb.com",
  "ayu@hidsb.com",
  "zawadud@hidsb.com",
  "shafeeq@hidsb.com",
  "firdaus.kholid@hidsb.com",
  "hairulnizam@hidsb.com",
  "fadzil.othman@hidsb.com",
  "zaini@hidsb.com",
];

const STORE_PIC_OPTIONS = ["Abd Haafidz", "Mohd Shafeeq", "Fakaruddin", "Nasri", "Joy"];

const MaterialRequisitionForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addSubmission } = useSubmissions();
  const { users, getUsersByRole, isLoading: areUsersLoading } = useUsers();
  const { hasAccess, isLoaded } = useStoreDepartmentAccess();

  useEffect(() => {
    if (isLoaded && !hasAccess) navigate("/home", { replace: true });
  }, [isLoaded, hasAccess, navigate]);

  const employeeInfo = {
    name: user?.name || "",
    staffNo: user?.employeeId || "",
    department: user?.department || "",
    position: (user as any)?.position || "",
    phone: user?.phone || "",
  };

  const superiorOptions = useMemo(() => SUPERIOR_EMAILS.map(email => {
    const match = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    return { email, name: match?.name || email, id: match?.id || null };
  }), [users]);

  const hodUsers: AppUser[] = useMemo(() => [...(getUsersByRole("hod") || [])].sort((a, b) => (a.name || "").localeCompare(b.name || "")), [getUsersByRole]);

  const [superiorEmail, setSuperiorEmail] = useState("");
  const [hodName, setHodName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [lotNo, setLotNo] = useState("");
  const [storePicName, setStorePicName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoaded || !hasAccess) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!superiorEmail) {
      toast.error("Please select your Superior.");
      return;
    }
    if (!hodName) {
      toast.error("Please select your HOD.");
      return;
    }
    if (!itemDescription.trim()) {
      toast.error("Please describe the item you need.");
      return;
    }
    if (!quantity.trim() || !/^\d+$/.test(quantity.trim()) || Number(quantity.trim()) < 1) {
      toast.error("Please enter a valid order quantity.");
      return;
    }
    if (!lotNo.trim()) {
      toast.error("Please enter the Lot No.");
      return;
    }
    if (!storePicName) {
      toast.error("Please select the Store PIC.");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    const selectedSuperior = superiorOptions.find(option => option.email === superiorEmail);
    const selectedHod = hodUsers.find(u => u.name === hodName);

    const success = await addSubmission({
      formType: "material_requisition_slip",
      status: "pending",
      submittedBy: user?.id || "",
      employeeName: employeeInfo.name,
      department: employeeInfo.department,
      data: {
        employeeInfo,
        superiorUserId: selectedSuperior?.id || null,
        superiorName: selectedSuperior?.name || superiorEmail,
        superiorEmail,
        hodUserId: selectedHod?.id || null,
        hodName,
        itemDescription: itemDescription.trim(),
        quantity,
        lotNo: lotNo.trim(),
        storePicName,
      },
    });

    if (success) {
      toast.success("Material Requisition Slip submitted successfully!");
      navigate("/home");
    } else {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <button type="button" onClick={() => navigate("/store")} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all mb-6 group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Store Department
      </button>

      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Material Requisition Slip (MRS)</h1>
        <p className="mt-1 text-base font-medium text-primary">HICOM Diecastings Sdn Bhd</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee Details */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">01</span>
            <UserCheck className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-base">Employee Details</h2>
          </div>

          <div className="bg-muted/10 p-4 rounded-xl border border-border/50">
            <div className="py-2 sm:py-2.5 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">Name</span>
              <div className="text-xs font-bold text-foreground sm:col-span-2">{employeeInfo.name || "—"}</div>
            </div>
            <div className="py-2 sm:py-2.5 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">Position</span>
              <div className="text-xs font-bold text-foreground sm:col-span-2">{employeeInfo.position || "—"}</div>
            </div>
            <div className="py-2 sm:py-2.5 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">Staff ID</span>
              <div className="text-xs font-bold text-foreground sm:col-span-2">{employeeInfo.staffNo || "—"}</div>
            </div>
            <div className="py-2 sm:py-2.5 border-b-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">Department</span>
              <div className="text-xs font-bold text-foreground sm:col-span-2">{employeeInfo.department || "—"}</div>
            </div>
          </div>
        </div>

        {/* Requisition Details */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">02</span>
            <ClipboardList className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-base">Requisition Details</h2>
          </div>

          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-primary">Select Superior <span className="text-destructive">*</span></Label>
                <Select value={superiorEmail} onValueChange={setSuperiorEmail}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Choose your Superior..." /></SelectTrigger>
                  <SelectContent>
                    {superiorOptions.map(option => (
                      <SelectItem key={option.email} value={option.email}>{option.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-primary">Select HOD <span className="text-destructive">*</span></Label>
                <Select value={hodName} onValueChange={setHodName} disabled={areUsersLoading || hodUsers.length === 0}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={areUsersLoading ? "Loading users..." : "Choose Head of Department"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {hodUsers.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {!areUsersLoading && hodUsers.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1.5">Refresh if the HOD list is unavailable.</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Item Description <span className="text-destructive">*</span></Label>
              <Textarea
                value={itemDescription}
                onChange={e => setItemDescription(e.target.value)}
                placeholder="Describe the item(s) you need..."
                rows={3}
                className="min-h-20 resize-y"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-primary">Order Quantity <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  onWheel={e => (e.target as HTMLElement).blur()}
                  placeholder="Enter quantity..."
                  className="h-11 no-spinner"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-primary">Lot No. <span className="text-destructive">*</span></Label>
                <Input
                  value={lotNo}
                  onChange={e => setLotNo(e.target.value)}
                  placeholder="Enter Lot No..."
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Store PIC <span className="text-destructive">*</span></Label>
              <Select value={storePicName} onValueChange={setStorePicName}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Choose Store PIC..." /></SelectTrigger>
                <SelectContent>
                  {STORE_PIC_OPTIONS.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row-reverse justify-center gap-3 sm:gap-4 pt-4 pb-8">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-gold w-full sm:w-auto sm:min-w-64 px-6 py-3.5 sm:py-4 rounded-full text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/store")}
            className="w-full sm:w-auto px-6 py-3.5 sm:px-12 sm:py-4 rounded-full border-2 border-border text-foreground font-bold text-sm hover:bg-muted transition-colors text-center"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default MaterialRequisitionForm;
