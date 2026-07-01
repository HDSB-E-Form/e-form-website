import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { useUsers } from "@/contexts/UsersContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Users, UserCheck, MapPin, ShieldCheck, FileText, Send, PlusCircle, CalendarClock, CalendarDays, XCircle, ChevronLeft, ChevronRight, Upload, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/supabase";

const CarBookingForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addSubmission, submissions, cars } = useSubmissions();
  const { getUsersByRole } = useUsers();
  const hosUsers = [...(getUsersByRole("HOS") || [])].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const hodUsers = [...(getUsersByRole("HOD") || [])].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const hrAdmins = getUsersByRole("hr_admin") || [];
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [timelineStart, setTimelineStart] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [form, setForm] = useState({
    journeyType: "business",
    fromDate: "",
    toDate: "",
    destination: "",
    purpose: "",
    name: user?.name || "",
    staffId: user?.employeeId || "",
    icNo: "",
    avatar: user?.avatar || "",
    department: user?.department || "",
    position: (user as any)?.position || "",
    mobileNumber: user?.phone || "",
    drivingLicenseNo: "",
    drivingLicenseExpiry: "",
    hos: "",
    hod: "",
  });

  const [passengers, setPassengers] = useState(
    Array.from({ length: 2 }, () => ({ name: "", staffId: "", position: "", department: "" }))
  );

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
      }));
    }
  }, [user]);

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

  // Setup 7-day timeline logic
  const shiftTimeline = (days: number) => {
    setTimelineStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + days);
      return d;
    });
  };

  const timelineDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(timelineStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Combine physical cars into rows for the calendar
  const unassignedBookings = activeBookings.filter(b => !b.car);

  const timelineRows = [
    ...cars.map(car => {
      const currentBooking = activeBookings.find(b => b.car === `${car.model} (${car.plateNumber})`);
      return { type: 'car', id: car.id, title: car.model, subtitle: car.plateNumber, isAvailable: car.status === 'available', booking: currentBooking || null };
    }),
    ...unassignedBookings.map(b => ({
      type: 'unassigned',
      id: b.id,
      title: 'Upcoming Booking',
      subtitle: `Req: ${b.name.split(' ')[0]}`,
      isAvailable: false,
      booking: b
    }))
  ];

  const handleChange = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handlePassengerChange = (index: number, field: string, value: string) => {
    setPassengers(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const handleAddPassenger = () => {
    setPassengers(prev => [...prev, { name: "", staffId: "", position: "", department: "" }]);
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
    if (!licenseFile) {
      toast.error("Please upload a copy of your driving license.");
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);

    let initialStatus: "pending" | "approved_hos" | "approved_hod" = "pending";
    if (form.hos === "N/A") {
      initialStatus = "approved_hos";
      if (form.hod === "N/A") {
        initialStatus = "approved_hod";
      }
    }
    let licenseAttachmentUrl = null;
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
      
      licenseAttachmentUrl = urlData.publicUrl;
    }

    const success = await addSubmission({
      formType: "car_rental",
      status: initialStatus,
      submittedBy: user?.id || "",
      employeeName: form.name || user?.name || "",
      department: form.department || user?.department || "",
      data: { ...form, passengers, hosName: form.hos, hodName: form.hod, licenseAttachment: licenseAttachmentUrl },
    });
    if (success) {
      // --- 🔔 SEND EMAIL NOTIFICATION ---
      try {
        const selectedHos = hosUsers.find(u => u.name === form.hos);
        const selectedHod = hodUsers.find(u => u.name === form.hod);
        
        // Gather all recipient emails
        const recipientEmails = [
          selectedHos?.email,
          selectedHod?.email,
          ...hrAdmins.map(admin => admin.email)
        ].filter(Boolean); // Filter out empty/undefined values

        if (recipientEmails.length > 0) {
          const { error: invokeError } = await supabase.functions.invoke('send-notification', {
            body: {
              to: recipientEmails,
              subject: `New Company Car Request from ${form.name}`,
              employeeName: form.name,
              formType: "Company Car Request / Permohonan Kereta Syarikat",
              url: window.location.origin
            }
          });

          if (invokeError) {
            console.error("Edge Function Error:", invokeError);
          }
        }
      } catch (err) {
        console.error("Failed to prepare email notification", err);
      }

      toast.success("Company car request submitted successfully!");
      navigate("/home");
    } else {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Availability Modal - Calendar Timeline */}
      {isAvailabilityModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setIsAvailabilityModalOpen(false)}>
          <div className="card-elevated p-0 w-full max-w-6xl relative animate-in fade-in-90 slide-in-from-bottom-10 max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 md:p-6 border-b border-border shrink-0 bg-muted/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <CalendarDays className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Vehicle Availability Calendar</h3>
                  <p className="text-sm text-muted-foreground">View all vehicles and timeline of upcoming bookings</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => shiftTimeline(-7)} className="p-2 border border-border bg-background rounded-lg hover:bg-muted transition-colors text-foreground">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-bold w-32 text-center text-foreground">
                  {timelineDays[0].toLocaleDateString("en-GB", {day:'numeric', month:'short'})} - {timelineDays[6].toLocaleDateString("en-GB", {day:'numeric', month:'short'})}
                </span>
                <button onClick={() => shiftTimeline(7)} className="p-2 border border-border bg-background rounded-lg hover:bg-muted transition-colors text-foreground">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button onClick={() => setIsAvailabilityModalOpen(false)} className="ml-2 sm:ml-4 text-muted-foreground hover:text-destructive p-2 border border-transparent hover:border-destructive/30 hover:bg-destructive/10 rounded-xl transition-colors">
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Timeline Grid */}
            <div className="overflow-x-auto overflow-y-auto flex-1 bg-background relative">
              <div className="min-w-[700px]">
                {/* Days Header */}
                <div className="flex border-b border-border bg-muted/40 sticky top-0 z-20 shadow-sm">
                  <div className="w-[180px] shrink-0 p-3 text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center border-r border-border">
                    Vehicle / Status
                  </div>
                  <div className="flex-1 flex">
                    {timelineDays.map((day, i) => (
                       <div key={i} className={`flex-1 p-3 text-center border-r border-border last:border-r-0 ${day.toDateString() === new Date().toDateString() ? 'bg-primary/5' : ''}`}>
                         <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">{day.toLocaleDateString("en-GB", { weekday: 'short' })}</div>
                         <div className={`text-sm font-bold mt-0.5 ${day.toDateString() === new Date().toDateString() ? 'text-primary' : 'text-foreground'}`}>
                           {day.getDate()} {day.toLocaleDateString("en-GB", { month: 'short' })}
                         </div>
                       </div>
                    ))}
                  </div>
                </div>

                {/* Rows */}
                <div className="flex flex-col pb-4">
                  {timelineRows.length === 0 ? (
                     <p className="text-center text-sm text-muted-foreground py-8">No vehicles or bookings found.</p>
                  ) : (
                    timelineRows.map((row, idx) => (
                      <div key={idx} className="flex border-b border-border last:border-0 hover:bg-muted/10 transition-colors group relative">
                        <div className="w-[180px] shrink-0 p-2.5 border-r border-border bg-background group-hover:bg-muted/5 transition-colors flex flex-col justify-center z-10 relative">
                          <div className="flex items-center justify-between gap-2">
                             <span className="font-bold text-sm text-foreground truncate" title={row.title}>{row.title}</span>
                           {row.type === 'car' ? (
                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${row.isAvailable ? 'bg-emerald-500' : 'bg-amber-500'}`} title={row.isAvailable ? 'Available' : 'In Use'} />
                           ) : (
                              <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm bg-blue-500" title="Pending Car Assignment" />
                             )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate mt-0.5" title={row.subtitle}>{row.subtitle}</div>
                        </div>

                        <div className="flex-1 flex relative">
                          {timelineDays.map((day, i) => (
                             <div key={i} className="flex-1 border-r border-border last:border-r-0 py-1 min-h-[46px] relative pointer-events-none">
                               {/* Subtle 12 PM (Noon) indicator line */}
                               <div className="absolute top-0 bottom-0 left-1/2 border-l border-border/40 border-dashed"></div>
                             </div>
                          ))}
                          
                          {row.booking && (() => {
                             const timelineStartMs = timelineDays[0].getTime();
                             const totalMs = 7 * 24 * 60 * 60 * 1000;
                             const timelineEndMs = timelineStartMs + totalMs;
                             const bStart = row.booking.fromDate.getTime();
                             const bEnd = row.booking.toDate.getTime();

                             if (bEnd < timelineStartMs || bStart > timelineEndMs) return null;

                             const visibleStart = Math.max(bStart, timelineStartMs);
                             const visibleEnd = Math.min(bEnd, timelineEndMs);
                             
                             const startPercent = ((visibleStart - timelineStartMs) / totalMs) * 100;
                             const widthPercent = Math.max(((visibleEnd - visibleStart) / totalMs) * 100, 0.5);

                             const isStartVisible = bStart >= timelineStartMs;
                             const isEndVisible = bEnd <= timelineEndMs;

                             return (
                               <div 
                                 className={`absolute top-1 bottom-1 flex flex-col justify-center px-2 overflow-hidden shadow-sm z-10
                                   ${row.type === 'car' ? 'bg-amber-500/10 border-amber-500/30 text-amber-700' : 'bg-primary/10 border-primary/30 text-primary'}
                                   border-y
                                   ${isStartVisible ? 'rounded-l-lg border-l-2' : 'border-l-0'}
                                   ${isEndVisible ? 'rounded-r-lg border-r-2' : 'border-r-0'}
                                 `}
                                 style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}
                               >
                                 <div className="text-[10px] font-bold truncate flex items-center gap-1.5">
                                   {!isStartVisible && <ChevronLeft className="h-3 w-3 shrink-0" />}
                                   {row.booking.fromDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} {row.booking.fromDate.toLocaleTimeString("en-GB", {hour: '2-digit', minute:'2-digit'})}
                                   {' - '}
                                   {row.booking.toDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} {row.booking.toDate.toLocaleTimeString("en-GB", {hour: '2-digit', minute:'2-digit'})}
                                   {!isEndVisible && <ChevronRight className="h-3 w-3 shrink-0" />}
                                 </div>
                                 <div className="text-[11px] font-medium truncate opacity-90 mt-0.5" title={`${row.booking.name} • ${row.booking.destination}`}>
                                   <span className="font-bold">{row.booking.name}</span> • {row.booking.destination}
                                 </div>
                               </div>
                             );
                          })()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => navigate("/hr")} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all mb-6 group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to HR Forms
      </button>

      <div className="mb-8">
        <h1 className="text-2xl lg:text-2xl font-bold text-foreground uppercase tracking-wide">
          Company Car Request / Permohonan Kereta Syarikat
        </h1>
        <p className="text-muted-foreground text-sm mt-1 uppercase tracking-wide">HICOM Diecastings Sdn Bhd</p>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* Section 1: Requester Details */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-2 mb-5">
            <UserCheck className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-sm">
              Requester & Driver Details / <span className="font-normal">Butiran Pemohon & Pemandu</span>
            </h2>
          </div>

          {/* Pre-filled Details (Do not require filling) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-muted/10 p-4 rounded-xl border border-border/50">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Name / Nama</Label>
              <div className="font-medium text-foreground text-sm">{form.name}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Position / Jawatan</Label>
              <div className="font-medium text-foreground text-sm">{form.position || "—"}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Staff ID / ID Kakitangan</Label>
              <div className="font-medium text-foreground text-sm">{form.staffId}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Department / Jabatan</Label>
              <div className="font-medium text-foreground text-sm">{form.department}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Mobile Number / No. HP</Label>
              <div className="font-medium text-foreground text-sm">{form.mobileNumber || "—"}</div>
            </div>
          </div>

          {/* Input Fields (Require filling) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">IC Number / No. K/P <span className="text-destructive">*</span></Label>
              <Input value={form.icNo} onChange={e => handleChange("icNo", e.target.value)} placeholder="e.g. 900101-01-1111" className="h-11 bg-muted/20 hover:bg-muted/50 focus:bg-background transition-colors" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Driving License No. / Lesen <span className="text-destructive">*</span></Label>
              <Input value={form.drivingLicenseNo} onChange={e => handleChange("drivingLicenseNo", e.target.value)} placeholder="License No." className="h-11 bg-muted/20 hover:bg-muted/50 focus:bg-background transition-colors" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">License Expiry / Tamat Lesen <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.drivingLicenseExpiry} onChange={e => handleChange("drivingLicenseExpiry", e.target.value)} className="h-11 w-full bg-muted/20 hover:bg-muted/50 focus:bg-background text-foreground font-medium shadow-sm transition-colors dark:[color-scheme:dark]" required />
            </div>
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
          </div>
        </div>

        {/* Section 2: Journey Details */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-foreground text-sm">
                Journey Details / <span className="font-normal">Butiran Perjalanan</span>
              </h2>
            </div>
            <button 
              type="button" 
              onClick={() => setIsAvailabilityModalOpen(true)} 
              className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-md"
            >
              <CalendarDays className="h-4 w-4" /> View Availability
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Journey Type / Jenis Perjalanan <span className="text-destructive">*</span></Label>
              <div className="flex gap-3 sm:gap-4 mt-1.5">
                <div
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
                </div>
                <div
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
                </div>
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
              <Input
                value={form.purpose}
                onChange={e => handleChange("purpose", e.target.value)}
                placeholder="State the reason for your request..."
                className="h-11"
                required
              />
              <p className="text-xs text-muted-foreground">Be as detailed as possible, include meeting details, client names etc.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Destination / Destinasi <span className="text-destructive">*</span></Label>
              <Input value={form.destination} onChange={e => handleChange("destination", e.target.value)} placeholder="e.g., Kuala Lumpur, Selangor" className="h-11" required />
              <div className="h-72 bg-muted rounded-lg overflow-hidden border border-border relative shadow-inner mt-2">
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(form.destination || "Kuala Lumpur, Selangor, Malaysia")}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Passenger Details */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-2 mb-5">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-sm">
              Passenger Details / <span className="font-normal">Butiran Penumpang</span>
            </h2>
          </div>
          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                    <th className="text-xs font-semibold text-muted-foreground px-4 py-3 text-left w-12">No.</th>
                    <th className="text-xs font-semibold text-muted-foreground px-4 py-3 text-left">Name / Nama</th>
                    <th className="text-xs font-semibold text-muted-foreground px-4 py-3 text-left">Staff ID</th>
                    <th className="text-xs font-semibold text-muted-foreground px-4 py-3 text-left">Position / Jawatan</th>
                    <th className="text-xs font-semibold text-muted-foreground px-4 py-3 text-left">Department / Jabatan</th>
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
          <div className="flex items-center gap-2 mb-5">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-sm">
              Digital Approvals / <span className="font-normal">Kelulusan Digital</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Head of Section / Ketua Bahagian <span className="text-destructive">*</span></Label>
              <Select value={form.hos} onValueChange={val => handleChange("hos", val)}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Choose Head of Section" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="N/A">N/A</SelectItem>
                  {hosUsers.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Head of Department / Ketua Jabatan <span className="text-destructive">*</span></Label>
              <Select value={form.hod} onValueChange={val => handleChange("hod", val)}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Choose Head of Department" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="N/A">N/A</SelectItem>
                  {hodUsers.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Section 5: Company Vehicles Policy */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-2 mb-5">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground text-sm">
              Company Vehicles Policy / <span className="font-normal">Polisi Kenderaan Syarikat</span>
            </h2>
          </div>

          <div className="bg-muted/50 rounded-xl p-6 space-y-4 border border-border h-32 overflow-y-auto mb-4">
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
            <div>
              <label htmlFor="policy-agree" className="text-sm font-semibold text-foreground cursor-pointer">
                I have read and agree to the above / Saya telah membaca dan bersetuju <span className="text-destructive">*</span>
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Compliance with these terms is mandatory for all employees requesting vehicle use.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row-reverse justify-center gap-3 sm:gap-4 pt-4 pb-8">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-gold w-full sm:w-auto px-6 py-3.5 sm:px-32 sm:py-4 rounded-full text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
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
