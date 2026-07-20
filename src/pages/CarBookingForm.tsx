import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { useUsers, type AppUser } from "@/contexts/UsersContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Users, UserCheck, MapPin, ShieldCheck, FileText, Send, PlusCircle, CalendarClock, CalendarDays, XCircle, Upload, Trash2, CarFront } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/supabase";

const CarBookingForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addSubmission, submissions, cars, updateSubmission } = useSubmissions();
  const { getUsersByRole, isLoading: areUsersLoading } = useUsers();
  const hosUsers: AppUser[] = useMemo(() => [...(getUsersByRole("HOS") || [])].sort((a, b) => (a.name || "").localeCompare(b.name || "")), [getUsersByRole]);
  const hodUsers: AppUser[] = useMemo(() => [...(getUsersByRole("HOD") || [])].sort((a, b) => (a.name || "").localeCompare(b.name || "")), [getUsersByRole]);
  const hrAdmins = getUsersByRole("hr_admin") || [];
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [form, setForm] = useState({
    journeyType: "business",
    fromDate: "",
    toDate: "",
    destination: "",
    purpose: "",
    name: user?.name || "",
    staffId: user?.employeeId || "", 
    icNo: (user as any)?.icNo || "",
    avatar: user?.avatar || "",
    department: user?.department || "",
    position: (user as any)?.position || "",
    mobileNumber: user?.phone || "", 
    drivingLicenseNo: (user as any)?.drivingLicenseNo || "",
    hos: "",
    hod: "",
  });

  const [passengers, setPassengers] = useState(
    Array.from({ length: 2 }, () => ({ name: "", staffId: "", position: "", department: "" }))
  );
  const [existingLicenseUrl, setExistingLicenseUrl] = useState<string | null>(null);

  // Edit mode detection
  const location = useLocation();
  const editSubmissionId = useMemo(() => new URLSearchParams(location.search).get("editId"), [location.search]);
  const editSubmission = useMemo(() => editSubmissionId ? submissions.find(s => s.id === editSubmissionId) : null, [editSubmissionId, submissions]);
  const isEditMode = Boolean(editSubmission);

  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        name: user.name || "",
        staffId: user.employeeId || "",
        department: user.department || "",
        mobileNumber: user.phone || "",
        position: (user as any).position || "",
        avatar: user.avatar || "",
        icNo: (user as any)?.ic_no || (user as any)?.icNo || "",
        drivingLicenseNo: (user as any)?.driving_license_no || (user as any)?.drivingLicenseNo || "",
      }));
    }
  }, [user]);

  useEffect(() => {
    if (!editSubmissionId) return;
    if (!editSubmission) return;

    if (editSubmission.formType !== "car_rental") {
      toast.error("Only car booking requests can be edited here.");
      navigate("/submissions");
      return;
    }

    if (editSubmission.submittedBy !== user?.id) {
      toast.error("You can only edit your own submissions.");
      navigate("/submissions");
      return;
    }

    // Employees may edit only until HOD approval. This includes requests where HOS is N/A.
    if (!["pending", "approved_hos"].includes(editSubmission.status)) {
      toast.error("This booking cannot be edited after HOD approval.");
      navigate("/submissions");
      return;
    }

    // Prefill form values
    const data = editSubmission.data || {};
    setForm(prev => ({
      ...prev,
      journeyType: data.journeyType || prev.journeyType,
      fromDate: data.fromDate || prev.fromDate,
      toDate: data.toDate || prev.toDate,
      destination: data.destination || prev.destination,
      purpose: data.purpose || prev.purpose,
      name: editSubmission.employeeName || prev.name,
      staffId: data.employeeInfo?.employeeNumber || prev.staffId,
      icNo: data.employeeInfo?.icNo || prev.icNo,
      department: editSubmission.department || prev.department,
      position: data.position || prev.position,
      mobileNumber: data.mobileNumber || prev.mobileNumber,
      drivingLicenseNo: data.drivingLicenseNo || prev.drivingLicenseNo,
      hos: data.hosName || prev.hos,
      hod: data.hodName || prev.hod,
    }));

    setPassengers(data.passengers || [{ name: "", staffId: "", position: "", department: "" }, { name: "", staffId: "", position: "", department: "" }]);
    setExistingLicenseUrl(data.licenseAttachment || null);
  }, [editSubmissionId, editSubmission, user?.id, navigate]);

  // Get upcoming approved bookings to show in the availability modal
  const activeBookings = submissions
    .filter(s => s.formType === 'car_rental' && s.status === 'approved')
    .map(s => {
      const fromDate = new Date(s.data.fromDate);
      const toDate = new Date(s.data.toDate);
      
      // Check if there is a car currently checked out for this specific booking
      const assignedCar = cars.find(c => {
        if (c.status !== 'checked_out' || c.lastCheckedOutBy !== s.employeeName) return false;
        const now = new Date().getTime();
        const start = fromDate.getTime();
        const end = toDate.getTime();
        // A booking is considered "checked out" if we are currently within its time window (with a 24h buffer)
        return (now >= start - (24 * 60 * 60 * 1000)) && (now <= end + (24 * 60 * 60 * 1000));
      });

      return {
        id: s.id,
        name: s.employeeName,
        fromDate,
        toDate,
        destination: s.data.destination,
        car: assignedCar ? `${assignedCar.model} (${assignedCar.plateNumber})` : null
      };
    })
    .filter(b => b.toDate >= new Date(Date.now() - 24 * 60 * 60 * 1000)) // Keep active and future bookings (hide old past ones)
    .sort((a, b) => a.fromDate.getTime() - b.fromDate.getTime());

  const vehicleAvailability = cars.map(car => ({
    ...car,
    booking: activeBookings.find(b => b.car === `${car.model} (${car.plateNumber})`) || null,
  }));

  const formatBookingDateTime = (date: Date) => date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleChange = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handlePassengerChange = (index: number, field: string, value: string) => {
    setPassengers(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const handleAddPassenger = () => {
    setPassengers(prev => [...prev, { name: "", staffId: "", position: "", department: "" }]);
  };

  const handleRemovePassenger = (index: number) => {
    setPassengers(prev => prev.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyAgreed) {
      toast.error("Please agree to the Company Vehicle Policy before submitting.");
      return;
    }
    if (!form.hos || !form.hod) {
      toast.error("Please select both Head of Section and Head of Department.");
      return;
    }

    let initialStatus: "pending" | "approved_hos";
    if (form.hos === "N/A") {
      initialStatus = "approved_hos";
    } else {
      initialStatus = "pending";
    }

    if (!licenseFile && !existingLicenseUrl) {
      toast.error("Please upload a copy of your driving license.");
      return;
    }
    let licenseAttachmentUrl = existingLicenseUrl || null;
    if (licenseFile) {
      const filePath = `public/${user?.id || 'unknown_user'}/license_${Date.now()}_${licenseFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      const { data: uploadData, error } = await supabase.storage
        .from('form-attachments')
        .upload(filePath, licenseFile);

      if (error) {
        toast.error(`License upload failed: ${error.message}`);
        setIsSubmitting(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('form-attachments')
        .getPublicUrl(uploadData.path);
      
      licenseAttachmentUrl = urlData?.publicUrl;
    }

    const submissionData = {
      ...form,
      passengers,
      hosName: form.hos,
      hodName: form.hod,
      licenseAttachment: licenseAttachmentUrl,
      ...(isEditMode ? {
        rejectedStage: undefined,
        remarks: undefined,
        lastEditedAt: new Date().toISOString(),
        lastEditedBy: user?.id || "",
        approvalRestartedAfterEdit: true,
      } : {}),
    };

    if (isEditMode && editSubmissionId && editSubmission) {
      const success = await updateSubmission(editSubmissionId, submissionData, initialStatus);
      if (success) {
        toast.success("Company car booking updated. The approval process has restarted.");
        navigate("/submissions");
      } else {
        setIsSubmitting(false);
      }
      return;
    }

    const success = await addSubmission({
      formType: "car_rental",
      status: initialStatus,
      submittedBy: user?.id || "",
      employeeName: form.name || user?.name || "",
      department: form.department || user?.department || "",
      data: submissionData,
    });
    if (success) {
      // // --- 🔔 SEND EMAIL NOTIFICATION (DEACTIVATED) ---
      // try {
      //   const selectedHos = hosUsers.find(u => u.name === form.hos);
      //   const selectedHod = hodUsers.find(u => u.name === form.hod);
      //   
      //   // Gather all recipient emails
      //   const recipientEmails = [
      //     selectedHos?.email,
      //     selectedHod?.email,
      //     ...hrAdmins.map(admin => admin.email)
      //   ].filter(Boolean); // Filter out empty/undefined values

      //   if (recipientEmails.length > 0) {
      //     const { error: invokeError } = await supabase.functions.invoke('send-notification', {
      //       body: {
      //         to: recipientEmails,
      //         subject: `New Company Car Request from ${form.name}`,
      //         employeeName: form.name,
      //         formType: "Company Car Request / Permohonan Kereta Syarikat",
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

      toast.success("Company car request submitted successfully!");
      navigate("/home");
    } else {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Current vehicle availability modal */}
      {isAvailabilityModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6" onClick={() => setIsAvailabilityModalOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="vehicle-availability-title" className="card-elevated p-0 w-full max-w-4xl relative animate-in fade-in-90 slide-in-from-bottom-10 max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between gap-4 p-5 md:p-6 border-b border-border shrink-0 bg-muted/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <CalendarDays className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 id="vehicle-availability-title" className="font-bold text-lg text-foreground">Current Vehicle Availability</h3>
                  <p className="text-sm text-muted-foreground">See which company vehicles are currently available or in use</p>
                </div>
              </div>
              <button type="button" aria-label="Close vehicle availability" onClick={() => setIsAvailabilityModalOpen(false)} className="text-muted-foreground hover:text-destructive p-2 border border-transparent hover:border-destructive/30 hover:bg-destructive/10 rounded-xl transition-colors shrink-0">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 bg-background p-4 md:p-6">
              {vehicleAvailability.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">No company vehicles found.</p>
              ) : (
                <div className="space-y-3">
                  {vehicleAvailability.map(vehicle => {
                    const isAvailable = vehicle.status === "available";
                    const isMaintenance = vehicle.status === "maintenance";
                    const statusLabel = isAvailable ? "Available" : isMaintenance ? "Maintenance" : "In Use";
                    const statusStyle = isAvailable
                      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                      : isMaintenance
                        ? "bg-slate-500/10 text-slate-700 border-slate-500/20"
                        : "bg-amber-500/10 text-amber-700 border-amber-500/20";

                    return (
                      <div key={vehicle.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                          <div className="flex h-20 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30 sm:h-20 sm:w-28">
                            {vehicle.imageUrl ? (
                              <img src={vehicle.imageUrl} alt={`${vehicle.model} ${vehicle.plateNumber}`} className="h-full w-full object-cover" />
                            ) : (
                              <CarFront className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                            )}
                          </div>

                          <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-bold text-foreground">{vehicle.model}</h4>
                                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusStyle}`}>{statusLabel}</span>
                              </div>
                              <p className="mt-1 text-sm font-medium text-muted-foreground">{vehicle.plateNumber}</p>
                            </div>

                            {vehicle.booking ? (
                              <div className="grid min-w-0 flex-1 gap-3 text-sm sm:max-w-xl sm:grid-cols-3">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Booked by</p>
                                  <p className="mt-1 font-semibold text-foreground">{vehicle.booking.name}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">From</p>
                                  <p className="mt-1 font-semibold text-foreground">{formatBookingDateTime(vehicle.booking.fromDate)}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Until</p>
                                  <p className="mt-1 font-semibold text-foreground">{formatBookingDateTime(vehicle.booking.toDate)}</p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground sm:self-center">
                                {isAvailable ? "No active booking" : isMaintenance ? "Vehicle is unavailable for booking" : "Booking details unavailable"}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <button type="button" onClick={() => navigate(isEditMode ? "/submissions" : "/hr")} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all mb-6 group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> {isEditMode ? "Back to My Submissions" : "Back to HR Forms"}
      </button>

      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Company Car Request</h1>
        <p className="mt-1 text-base font-medium text-primary">Permohonan Kereta Syarikat</p>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* Section 1: Requester Details */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">01</span>
            <UserCheck className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-base">
              Requester & Driver Details / <span className="font-normal">Butiran Pemohon & Pemandu</span>
            </h2>
          </div>

          {/* Pre-filled Details (Do not require filling) */}
          <div className="bg-muted/10 p-4 rounded-xl border border-border/50">
            <div className="py-2 sm:py-2.5 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">Name / Nama</span>
              <div className="text-sm font-bold text-foreground sm:col-span-2">{form.name || "—"}</div>
            </div>
            <div className="py-2 sm:py-2.5 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">Position / Jawatan</span>
              <div className="text-sm font-bold text-foreground sm:col-span-2">{form.position || "—"}</div>
            </div>
            <div className="py-2 sm:py-2.5 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">Staff ID / No. Pekerja</span>
              <div className="text-sm font-bold text-foreground sm:col-span-2">{form.staffId || "—"}</div>
            </div>
            <div className="py-2 sm:py-2.5 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">Department / Jabatan</span>
              <div className="text-sm font-bold text-foreground sm:col-span-2">{form.department || "—"}</div>
            </div>
            <div className="py-2 sm:py-2.5 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">IC Number / No. K/P</span>
              <div className="text-sm font-bold text-foreground sm:col-span-2">{form.icNo || <span className="italic text-muted-foreground/80">Please update in My Profile</span>}</div>
            </div>
            <div className="py-2 sm:py-2.5 border-b-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">Driving License No. / Lesen</span>
              <div className="text-sm font-bold text-foreground sm:col-span-2">{form.drivingLicenseNo || <span className="italic text-muted-foreground/80">Please update in My Profile</span>}</div>
            </div>
          </div>

        </div>

        {/* Section 2: Journey Details */}
        <div className="card-elevated p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">02</span>
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-foreground text-base">
                Journey Details / <span className="font-normal">Butiran Perjalanan</span>
              </h2>
            </div>
            <button 
              type="button" 
              onClick={() => setIsAvailabilityModalOpen(true)} 
              className="flex w-full sm:w-auto items-center justify-center gap-2 text-sm font-bold text-primary hover:text-primary/90 transition-colors bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-lg shadow-sm border border-primary/20"
            >
              <CalendarDays className="h-4 w-4" /> View Availability
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Journey Type / Jenis Perjalanan <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-1.5">
                <button
                  type="button"
                  className={`flex-1 rounded-xl border-2 p-3 sm:p-4 transition-all cursor-pointer ${
                    form.journeyType === "business"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                  onClick={() => handleChange("journeyType", "business")}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      form.journeyType === "business" ? "border-primary" : "border-muted-foreground"
                    }`}>
                      {form.journeyType === "business" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                    <span className="font-bold text-sm">Business / Perniagaan</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-7">Official company travel</p>
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-xl border-2 p-3 sm:p-4 transition-all cursor-pointer ${
                    form.journeyType === "other"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                  onClick={() => handleChange("journeyType", "other")}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      form.journeyType === "other" ? "border-primary" : "border-muted-foreground"
                    }`}>
                      {form.journeyType === "other" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                    <span className="font-bold text-sm">Other / Lain-lain</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-7">Non-business journey</p>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-primary">From Date & Time / Dari Tarikh & Masa <span className="text-destructive">*</span></Label>
                <Input type="datetime-local" value={form.fromDate} onChange={e => handleChange("fromDate", e.target.value)} className="h-11 w-full bg-muted/20 hover:bg-muted/50 focus:bg-background text-foreground font-medium shadow-sm transition-colors dark:[color-scheme:dark]" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-primary">To Date & Time / Kepada Tarikh & Masa <span className="text-destructive">*</span></Label>
                <Input type="datetime-local" value={form.toDate} onChange={e => handleChange("toDate", e.target.value)} className="h-11 w-full bg-muted/20 hover:bg-muted/50 focus:bg-background text-foreground font-medium shadow-sm transition-colors dark:[color-scheme:dark]" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Purpose of Journey / Tujuan perjalanan <span className="text-destructive">*</span></Label>
              <Input value={form.purpose} onChange={e => handleChange("purpose", e.target.value)} placeholder="State the reason for your request..." className="h-11" required />
              <p className="text-xs text-muted-foreground">Be as detailed as possible, include meeting details, client names etc.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-primary">Upload Driving Licence <span className="text-destructive">*</span></Label>
                {licenseFile ? (
                  <div className="flex items-center justify-between h-11 px-3 border border-border rounded-lg bg-muted/10">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm font-medium text-foreground truncate">{licenseFile.name}</span>
                    </div>
                    <button type="button" onClick={() => setLicenseFile(null)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : existingLicenseUrl ? (
                  <div className="flex items-center justify-between h-11 px-3 border border-border rounded-lg bg-muted/10">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <a href={existingLicenseUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline truncate">View existing license</a>
                    </div>
                    <button type="button" onClick={() => setExistingLicenseUrl(null)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label 
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        setLicenseFile(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`flex items-center justify-center gap-2 h-11 border-2 border-dashed rounded-lg cursor-pointer transition-colors text-sm font-medium ${isDragging ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/20 hover:bg-muted/50 text-muted-foreground'}`}
                  >
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { if (e.target.files && e.target.files.length > 0) { setLicenseFile(e.target.files[0]); } }} />
                    <Upload className="h-4 w-4" />
                    <span>Upload License</span>
                  </label>
                )} 
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-primary">Destination / Destinasi <span className="text-destructive">*</span></Label>
                <Input value={form.destination} onChange={e => handleChange("destination", e.target.value)} placeholder="e.g., Kuala Lumpur, Selangor" className="h-11" required />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Passenger Details */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">03</span>
            <Users className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-base">
              Passenger Details / <span className="font-normal">Butiran Penumpang</span>
            </h2>
          </div>
          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                    <th className="text-xs font-semibold text-muted-foreground px-4 py-3 text-left w-12">No.</th>
                    <th className="text-xs font-semibold text-muted-foreground px-4 py-3 text-left">Name / Nama</th>
                    <th className="text-xs font-semibold text-muted-foreground px-4 py-3 text-left">Staff ID</th>
                    <th className="text-xs font-semibold text-muted-foreground px-4 py-3 text-left">Position / Jawatan</th>
                    <th className="text-xs font-semibold text-muted-foreground px-4 py-3 text-left">Department / Jabatan</th>
                    <th className="text-xs font-semibold text-muted-foreground px-4 py-3 text-center w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {passengers.map((p, i) => (
                  <tr key={i} className="hover:bg-muted/10">
                    <td className="px-4 py-2 text-sm font-semibold text-foreground">{i + 1}</td>
                    <td className="px-2 py-2">
                      <Input value={p.name} onChange={e => handlePassengerChange(i, "name", e.target.value)} placeholder="Enter name" className="h-10 border-0 bg-transparent shadow-none text-sm" />
                    </td>
                    <td className="px-2 py-2">
                      <Input value={p.staffId} onChange={e => handlePassengerChange(i, "staffId", e.target.value)} placeholder="ID" className="h-10 border-0 bg-transparent shadow-none text-sm" />
                    </td>
                    <td className="px-2 py-2">
                      <Input value={p.position} onChange={e => handlePassengerChange(i, "position", e.target.value)} placeholder="Title" className="h-10 border-0 bg-transparent shadow-none text-sm" />
                    </td>
                    <td className="px-2 py-2">
                      <Input value={p.department} onChange={e => handlePassengerChange(i, "department", e.target.value)} placeholder="Dept" className="h-10 border-0 bg-transparent shadow-none text-sm" />
                    </td>
                    <td className="px-2 py-2 text-center">
                      {i > 0 && (
                        <button type="button" onClick={() => handleRemovePassenger(i)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={handleAddPassenger}
            className="flex items-center gap-2 text-primary font-semibold text-sm mt-4 hover:text-primary/80 transition-colors"
          >
            <PlusCircle className="h-5 w-5" />
            Add Passenger / Tambah Penumpang
          </button>
        </div>

        {/* Section 4: Approvals */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">04</span>
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-base">
              Digital Approvals / <span className="font-normal">Kelulusan Digital</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Head of Section / Ketua Bahagian <span className="text-destructive">*</span></Label>
              <Select value={form.hos} onValueChange={val => handleChange("hos", val)} disabled={areUsersLoading || hosUsers.length === 0}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={areUsersLoading ? "Loading users..." : "Choose Head of Section"} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="N/A">N/A</SelectItem>
                  {hosUsers.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {!areUsersLoading && hosUsers.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">Refresh if HOS list not available.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Head of Department / Ketua Jabatan <span className="text-destructive">*</span></Label>
              <Select value={form.hod} onValueChange={val => handleChange("hod", val)} disabled={areUsersLoading || hodUsers.length === 0}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={areUsersLoading ? "Loading users..." : "Choose Head of Department"} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {hodUsers.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {!areUsersLoading && hodUsers.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">Refresh if HOD list not available.</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 5: Company Vehicles Policy */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">05</span>
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-base">
              Company Vehicles Policy / <span className="font-normal">Polisi Kenderaan Syarikat</span>
            </h2>
          </div>

          <div className="bg-muted/50 rounded-xl p-5 sm:p-6 space-y-4 border border-border h-48 overflow-y-auto mb-4">
            <div className="text-sm text-muted-foreground space-y-4">
              <p>The employee is required to report the loss of or damage to the Company vehicle to the police in the first instance and then to Human Capital Department. The employee must drive within the law, including:-</p>
              
              <ul className="list-disc pl-5 space-y-1">
                <li>ensuring that a valid road tax is displayed, as provided by the Company;</li>
                <li>ensuring that traffic signs and statutory speed limits are observed at all times;</li>
                <li>ensuring that prohibited areas of the road are avoided such as; bus or bicycle lanes;</li>
                <li>ensuring that the vehicle is sensibly parked and not in breach of any regulations;</li>
                <li>ensuring that mobile phones are not used whilst driving a company vehicle.</li>
              </ul>
              
              <p>The Company does not condone the use mobile phones or any associated ‘Bluetooth Technology’ whilst driving a Company vehicle. If fees or traffic fines are imposed, these are the responsibility of the employee and, unless otherwise agreed, will be deducted from the employee’s wages.</p>
              
              <p>The Company will not accept responsibility for the payment of any penalty which may be imposed upon the user. Due to that, the Company will provide ‘Vehicle Mileage Log Books’ for all Company vehicles. It is the responsibility of all employees to ensure that these books are updated should an occasion arise where two employees are sharing the use of a vehicle.</p>
              
              <p>Should a traffic fine, fee or police offence come to the attention of the Company, at a later date, the Company will use the Log Book to assess who was driving at the time and consequently who is responsible for the fine. If the Log Book has not been completed it is the responsibility of the employee who has been ultimately assigned to the vehicle in question to pay the fine.</p>
              
              <p>Company vehicles have been fitted with trackers which show all movements of the vehicle, including when it is stationary. If evidence provided by the trackers shows that employees are using the vehicle for private use or not working to agreed hours, disciplinary action will be taken, which could result in dismissal. The vehicle may be used in connection with Company business only. The vehicle may not be used for:-</p>
              
              <ul className="list-disc pl-5 space-y-1">
                <li>any business purposes other than those undertaken on behalf of the Company;</li>
                <li>hire or reward (either goods or passengers);</li>
                <li>driving tuition of any nature; or</li>
                <li>any personal use.</li>
              </ul>
              
              <p>If the vehicle is used in contravention of these conditions any resulting damage will be the absolute responsibility of the employee. Further, such use will render the employee liable to disciplinary proceedings, which may result in banned from using Company vehicle and suspended. In addition, the employee is responsible for the excess which is required to be paid and which is not recoverable from the insurance company should the vehicle be involved in an accident, irrespective of the responsibility of the accident. The employee accepts that the Company shall be entitled to deduct the cost of repair of such damage and/or the cost of the insurance excess from his/her wages, in line with the deductions clause set out in the employee's terms and conditions of employment.</p>
              
              <p>In the event of the vehicle being return, the vehicle must be returned to the Company in a clean and roadworthy condition. If the vehicle requires valet cleaning the Company will deduct this fee from the employee’s wages.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 pl-2">
            <Checkbox
              id="policy-agree"
              checked={policyAgreed}
              onCheckedChange={(checked) => setPolicyAgreed(checked === true)}
              className="mt-1 rounded-none"
            />
            <label htmlFor="policy-agree" className="cursor-pointer">
              <p className="font-semibold text-foreground text-sm">
                I hereby acknowledge that: <span className="text-destructive">*</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">I have read & understand the use of company vehicles & the service & repair policies and agree to be bound by the rules & procedures therein. I will be responsible for all fines, penalties and costs imposed for parking or traffic violations with respect to the Company vehicle assigned to me for the period stated herein, and I will indemnify and hold the Company harmless from all claims and costs arising out of such violations, including expenses in connection with handling of such matters. In the case of HICOM Diecastings Sdn. Bhd. Employees, I agree that all fines, penalties, and costs arising from parking or traffic violations will be deducted from my salary for the month where payment is made for settlement of the associated fines.</p>
            </label>
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
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/hr")}
            className="w-full sm:w-auto px-6 py-3.5 sm:px-12 sm:py-4 rounded-full border-2 border-border text-foreground font-bold text-sm hover:bg-muted transition-colors text-center"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CarBookingForm;
