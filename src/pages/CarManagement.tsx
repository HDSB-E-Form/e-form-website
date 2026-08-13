import { Fragment, useState, useEffect } from "react";
import { useSubmissions, type CarInfo, type Submission } from "@/contexts/SubmissionsContext";
import { useAuth } from "@/contexts/AuthContext";
import { Car, CheckCircle, ArrowRightLeft, Info, History, XCircle, CalendarClock, Plus, Trash2, Pencil, Upload, Image as ImageIcon, Camera, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import HRModuleSkeleton from "@/components/HRModuleSkeleton";

type ViewMode = "overview" | "checkout" | "checkin";

type CarHistoryEntry = {
  submissionId?: string | null;
  submissionRefNo?: string | null;
  employeeName: string;
  checkedOutAt: string;
  checkedInAt: string;
  mileageOut: string;
  mileageIn: string;
  fuelLevelOut?: string;
  fuelLevelIn?: string;
  petrolCardOut?: boolean;
  petrolCardSerialOut?: string;
  petrolCardIn?: boolean;
  petrolCardSerialIn?: string;
  remarksOut?: string;
  remarksIn?: string;
  remarks?: string;
  photosOut?: Record<string, string | null>;
  photosIn?: Record<string, string | null>;
};

type AggregatedHistoryEntry = CarHistoryEntry & {
  model: string;
  plateNumber: string;
};

type ApprovedBookingOption = {
  submissionId: string;
  referenceNumber: string;
  employeeName: string;
  fromDate: string;
  toDate: string;
};

const petrolCardOptions = [
  "708381 530122 65680",
  "708381 530098 38960",
];

const fuelOptions = ["Empty", "1/7", "2/7", "3/7", "4/7", "5/7", "6/7", "Full"];
const fuelBars: Record<string, number> = { Empty: 0, "1/7": 1, "2/7": 2, "3/7": 3, "4/7": 4, "5/7": 5, "6/7": 6, Full: 7 };

const toLocalDateTimeValue = (date: Date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
};

const CarManagement = () => {
  const { submissions, refNoMap, cars, checkInCar, checkOutCar, addCar, deleteCar, updateCar, refreshSubmissions, isLoading } = useSubmissions();
  const { user } = useAuth();
  const [view, setView] = useState<ViewMode>("overview");
  const [selectedCar, setSelectedCar] = useState<CarInfo | null>(null);
  const [isBookingHistoryOpen, setIsBookingHistoryOpen] = useState(false);
  const [isCarModalOpen, setIsCarModalOpen] = useState(false);
  const [carToEdit, setCarToEdit] = useState<CarInfo | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => { void refreshSubmissions(); }, [refreshSubmissions]);
  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (isLoading) return <HRModuleSkeleton cards={3} />;

  const available = cars.filter(c => c.status === "available");
  const checkedOut = cars.filter(c => c.status === "checked_out");
  const maintenance = cars.filter(c => c.status === "maintenance");

  const handleStartCheckout = (car: CarInfo) => {
    setSelectedCar(car);
    setView("checkout");
  };

  const handleStartCheckin = (car: CarInfo) => {
    setSelectedCar(car);
    setView("checkin");
  };

  const handleDeleteCar = (car: CarInfo) => {
    if (window.confirm(`Are you sure you want to delete "${car.model} (${car.plateNumber})"? This action cannot be undone.`)) {
      deleteCar(car.id);
    }
  };

  const checkedOutEmployees = new Set(checkedOut.map(car => car.lastCheckedOutBy).filter(Boolean));
  const activeSubmissionIds = new Set(checkedOut.map(car => car.activeSubmissionId).filter(Boolean));
  const fulfilledSubmissionIds = new Set(
    cars.flatMap(car => car.history || []).map(entry => entry.submissionId).filter(Boolean)
  );
  const now = currentTime;

  const approvedBookings: ApprovedBookingOption[] = submissions
    .filter((sub: Submission) => {
      if (sub.formType !== 'car_rental' || sub.status !== "approved") return false;
      if (!sub.data?.fromDate || !sub.data?.toDate) return false;
      const toDate = new Date(sub.data.toDate).getTime();
      if (!Number.isFinite(toDate) || toDate < now) return false;
      if (checkedOutEmployees.has(sub.employeeName)) return false;
      if (activeSubmissionIds.has(sub.id) || fulfilledSubmissionIds.has(sub.id)) return false;
      if (["checked_out", "returned"].includes(sub.data.carCheckoutStatus)) return false;
      return true;
    })
    .map((sub: Submission) => ({
      submissionId: sub.id,
      referenceNumber: sub.data.refNo || refNoMap.get(sub.id) || `HDSB-${sub.id.slice(-4)}`,
      employeeName: sub.employeeName,
      fromDate: sub.data.fromDate,
      toDate: sub.data.toDate,
    }));
  const availablePetrolCards = petrolCardOptions.filter(serial => !checkedOut.some(car => car.petrolCardOut && car.petrolCardSerialOut === serial));

  if (view === "checkout" && selectedCar) {
    return <CheckOutForm car={selectedCar} bookings={approvedBookings} availablePetrolCards={availablePetrolCards} onCancel={() => setView("overview")} onSubmit={async (car, booking, mileage, fuelLevel, remarks, photosOut, dateTimeOut, petrolCardOut, petrolCardSerialOut) => {
      const success = await checkOutCar(car.id, booking.submissionId, booking.referenceNumber, booking.employeeName, mileage, fuelLevel, remarks, photosOut, dateTimeOut, petrolCardOut, petrolCardSerialOut);
      if (success) {
        toast.success(`Vehicle checked out to ${booking.employeeName} for ${booking.referenceNumber}.`);
        setView("overview");
      }
      return success;
    }} />;
  }

  if (view === "checkin" && selectedCar) {
    return <CheckInForm car={selectedCar} onCancel={() => setView("overview")} onSubmit={async (car, mileageIn, fuelLevel, remarks, photosIn, dateTimeIn) => {
      const success = await checkInCar(car.id, mileageIn, fuelLevel, remarks, photosIn, dateTimeIn);
      if (success) {
        toast.success("Vehicle checked in successfully");
        setView("overview");
      }
      return success;
    }} />;
  }
  
  const pastHistoryEntries = cars.flatMap(car => 
    (car.history || []).map(entry => ({ ...entry, model: car.model, plateNumber: car.plateNumber }))
  );

  const allHistoryEntries = [...pastHistoryEntries]
    .sort((a, b) => {
      const dateA = new Date(a.checkedInAt || a.checkedOutAt).getTime();
      const dateB = new Date(b.checkedInAt || b.checkedOutAt).getTime();
      return dateB - dateA;
    });

  return (
    <div className="mx-auto max-w-7xl animate-in slide-in-from-bottom-2 p-4 duration-700 sm:p-6 lg:p-8">
      {/* Fullscreen Image Preview Modal */}
      {fullscreenImage && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setFullscreenImage(null)}>
          <button onClick={() => setFullscreenImage(null)} className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full bg-black/50 transition-colors">
            <XCircle className="h-8 w-8" />
          </button>
          <img src={fullscreenImage} alt="Car fullscreen preview" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {isBookingHistoryOpen && <BookingHistoryModal history={allHistoryEntries} onClose={() => setIsBookingHistoryOpen(false)} onImageClick={(url) => setFullscreenImage(url)} />}
      {isCarModalOpen && (
        <CarModal 
          initialData={carToEdit}
          onClose={() => setIsCarModalOpen(false)} 
          onSubmit={async (model, plateNumber, type, imageUrl, status) => {
            if (carToEdit) {
              const success = await updateCar(carToEdit.id, { model, plateNumber, type, imageUrl, status: status as any });
              if (success) {
                toast.success(`Vehicle ${model} (${plateNumber}) has been updated.`);
                setIsCarModalOpen(false);
              }
            } else if (addCar) {
              const success = await addCar({ id: Math.random().toString(36).slice(2), model, plateNumber, status: status as any, history: [], type, imageUrl });
              if (success) {
                toast.success(`Vehicle ${model} (${plateNumber}) has been added.`);
                setIsCarModalOpen(false);
              }
            }
          }} 
        />
      )}
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cars Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage and review all incoming department requests.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-muted/40 p-2 sm:flex sm:items-stretch">
          <div className="rounded-lg border border-border/60 border-l-4 border-l-primary bg-background px-4 py-2 shadow-sm">
            <p className="text-[11px] font-semibold text-muted-foreground">Available</p>
            <p className="mt-0.5 text-xl font-bold leading-none text-foreground">{available.length}</p>
          </div>
          <div className="rounded-lg border border-border/60 border-l-4 border-l-primary bg-background px-4 py-2 shadow-sm">
            <p className="text-[11px] font-semibold text-muted-foreground">In Use</p>
            <p className="mt-0.5 text-xl font-bold leading-none text-foreground">{checkedOut.length}</p>
          </div>
        <button onClick={() => { setCarToEdit(null); setIsCarModalOpen(true); }} className="col-span-2 flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow active:scale-[0.98] sm:w-auto">
          <Plus className="h-4 w-4" />
          Add New Car
        </button>
        <button onClick={() => setIsBookingHistoryOpen(true)} className="col-span-2 flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border/60 bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-all hover:border-primary/25 hover:shadow sm:w-auto">
          <History className="h-4 w-4" />
          Vehicle Usage History
        </button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ready for Check-Out */}
        <div className="card-elevated overflow-hidden h-fit">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-bold text-foreground">Available Cars</h2>
              <p className="text-xs text-muted-foreground">Ready for Check-out</p>
            </div>
            <Badge className="border-0 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">{available.length} VEHICLES</Badge>
          </div>
          <div className="divide-y divide-border">
            {available.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">No vehicles available</p>
            )}
            {available.map(car => (
              <div key={car.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4 w-full">
                  <div className="w-14 h-14 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {car.imageUrl ? (
                      <img src={car.imageUrl} alt={car.model} className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setFullscreenImage(car.imageUrl!)} title="Click to enlarge" />
                    ) : (
                      <Car className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-sm">{car.model}</p>
                    <div className="mt-0.5 sm:flex sm:items-center sm:gap-2">
                      <p className="text-xs text-muted-foreground">{car.plateNumber} • {car.type || "Sedan"}</p>
                      {(() => {
                        const fuel = car.currentFuelLevel || car.history?.[0]?.fuelLevelIn;
                        if (!fuel) return null;
                        const activeBars = fuelBars[fuel] || 0;
                        return (
                          <div className="mt-2 flex items-center gap-1.5 sm:ml-2 sm:mt-0 sm:border-l sm:border-border sm:pl-3">
                            <span className="text-[11px] font-bold text-muted-foreground">Fuel: {fuel}</span>
                            <div className="flex gap-0.5 h-2.5">
                              {[1, 2, 3, 4, 5, 6, 7].map(bar => (
                                <div key={bar} className={`w-1 h-full ${bar <= activeBars ? (activeBars === 1 ? 'bg-destructive' : 'bg-primary') : 'bg-muted-foreground/20'}`} />
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <button 
                    onClick={() => { setCarToEdit(car); setIsCarModalOpen(true); }} 
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    title="Edit Car">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteCar(car)} 
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    title="Delete Car">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleStartCheckout(car)} className="ml-auto flex min-h-11 w-[7.5rem] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-4 py-2.5 text-[15px] font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow active:scale-[0.98]">
                    <ArrowRightLeft className="h-3.5 w-3.5" /> Check-Out
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Waiting for Check-In */}
          <div className="card-elevated overflow-hidden h-fit">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-bold text-foreground">Vehicles In-Use</h2>
                <p className="text-xs text-muted-foreground">Pending Returns</p>
              </div>
              <Badge className="border-0 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">{checkedOut.length} VEHICLES</Badge>
            </div>
            <div className="divide-y divide-border">
              {checkedOut.map(car => (
                <div key={car.id} className="flex flex-col gap-4 p-4 2xl:flex-row 2xl:items-center">
                  <div className="flex items-center gap-4 w-full">
                    <div className="w-14 h-14 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {car.imageUrl ? (
                        <img src={car.imageUrl} alt={car.model} className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setFullscreenImage(car.imageUrl!)} title="Click to enlarge" />
                      ) : (
                        <Car className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-0.5">
                        <p className="font-semibold text-foreground text-sm truncate">{car.model}</p>
                        <Badge className="mt-0.5 shrink-0 whitespace-nowrap border-0 bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">IN USE</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{car.plateNumber} • {car.type || "Sedan"}</p>
                      {car.activeSubmissionRefNo && <p className="mt-1 text-[11px] font-semibold text-primary">{car.activeSubmissionRefNo}</p>}
                    </div>
                  </div>
                  <div className="flex w-full items-center justify-between gap-3 2xl:w-auto 2xl:justify-end 2xl:gap-6">
                    <div className="min-w-0 max-w-[9rem] text-left">
                      <p className="text-[11px] font-medium text-muted-foreground">Booked By</p>
                      <p className="truncate text-sm font-bold text-foreground" title={car.lastCheckedOutBy || undefined}>
                        {car.lastCheckedOutBy && car.lastCheckedOutBy.length > 15
                          ? `${car.lastCheckedOutBy.slice(0, 15)}...`
                          : car.lastCheckedOutBy || "—"}
                      </p>
                    </div>
                    <button onClick={() => handleStartCheckin(car)} className="flex min-h-11 w-[7.5rem] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-4 py-2.5 text-[15px] font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow active:scale-[0.98]">
                      <ArrowRightLeft className="h-3.5 w-3.5" /> Check-In
                    </button>
                  </div>
                </div>
              ))}
            {checkedOut.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">No vehicles checked out</p>
            )}
            </div>
          </div>

          {/* Maintenance */}
          {maintenance.length > 0 && (
            <div className="card-elevated overflow-hidden border-orange-500/20 h-fit">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-foreground">Under Maintenance</h2>
                  <p className="text-xs text-muted-foreground">Currently unavailable</p>
                </div>
                <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border-0 text-xs font-bold">{maintenance.length} VEHICLES</Badge>
              </div>
              <div className="divide-y divide-border">
                {maintenance.map(car => (
                  <div key={car.id} className="p-4 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {car.imageUrl ? (
                        <img src={car.imageUrl} alt={car.model} className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setFullscreenImage(car.imageUrl!)} title="Click to enlarge" />
                      ) : (
                        <Car className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-0.5">
                        <p className="font-semibold text-foreground text-sm truncate">{car.model}</p>
                        <Badge className="bg-orange-500 text-white border-0 text-[9px] px-1.5 py-0 uppercase tracking-wider font-bold shrink-0 whitespace-nowrap mt-0.5">MAINTENANCE</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{car.plateNumber} • {car.type || "Sedan"}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => { setCarToEdit(car); setIsCarModalOpen(true); }} 
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Edit Car">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteCar(car)} 
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Delete Car">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
          </div>
          )}
        </div>
        </div>

    </div>
  );
};

/* ─── Check-Out Form ─── */
function CheckOutForm({ car, bookings, availablePetrolCards, onCancel, onSubmit }: { car: CarInfo; bookings: ApprovedBookingOption[]; availablePetrolCards: string[]; onCancel: () => void; onSubmit: (car: CarInfo, booking: ApprovedBookingOption, mileage: string, fuelLevel: string, remarks: string, photosOut: Record<string, string | null>, dateTimeOut: string, petrolCardOut: boolean, petrolCardSerialOut: string) => Promise<boolean> }) {
  const { user } = useAuth();
  const [submissionId, setSubmissionId] = useState<string | undefined>(bookings[0]?.submissionId);
  const [mileage, setMileage] = useState("");
  const [fuelLevel, setFuelLevel] = useState("Full");
  const [petrolCard, setPetrolCard] = useState(false);
  const [petrolSerial, setPetrolSerial] = useState("");
  const [remarks, setRemarks] = useState("");
  const [photos, setPhotos] = useState<{ [key: string]: { file: File | null; url: string | null } }>({
    front: { file: null, url: null }, back: { file: null, url: null }, left: { file: null, url: null }, right: { file: null, url: null }
  });
  const [dateTimeOut] = useState(() => toLocalDateTimeValue(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePhotoUpload = (side: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // 12MB file size limit (12 * 1024 * 1024 bytes)
      if (file.size > 12 * 1024 * 1024) {
        toast.error("File size must be less than 12MB.");
        e.target.value = ""; // Reset input
        return;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        toast.error("Upload JPG, PNG, or WebP photos only.");
        e.target.value = "";
        return;
      }

      const url = URL.createObjectURL(file);
      setPhotos(prev => ({ ...prev, [side]: { file, url } }));
    }
  };

  const renderPhotoUpload = (side: string, label: string) => (
    <div className="relative w-full aspect-square sm:aspect-auto sm:h-24 border-2 border-dashed border-border rounded-xl overflow-hidden bg-background shadow-sm group">
      <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
      {photos[side].url ? (
        <img src={photos[side].url!} alt={label} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
      ) : (
        <>
          <Camera className="h-6 w-6 text-muted-foreground mb-1 sm:mb-2" />
          <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground">{label}</span>
        </>
      )}
      <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={e => handlePhotoUpload(side, e)} />
      </label>
      {photos[side].url && <button type="button" aria-label={`Remove ${label}`} onClick={() => setPhotos(prev => ({ ...prev, [side]: { file: null, url: null } }))} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-destructive"><XCircle className="h-4 w-4" /></button>}
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl animate-in slide-in-from-bottom-2 p-4 duration-700 sm:p-6 lg:p-8">
      <p className="text-sm text-primary mb-1">Cars Overview › <span className="font-bold text-foreground">Check-Out</span></p>
      <h1 className="text-2xl font-bold text-foreground">Vehicle Check-Out Form</h1>

      {/* Car Info */}
      <div className="card-elevated p-5 mt-6">
        <h3 className="font-bold text-foreground flex items-center gap-2 mb-3">
          <Car className="h-4 w-4 text-primary" /> Car Info
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Vehicle Model</p>
            <p className="font-semibold text-foreground">{car.model}</p>
          </div>
          <div>
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Plate Number</p>
            <p className="font-semibold text-foreground">{car.plateNumber}</p>
          </div>
        </div>
      </div>

      {/* Employee Selection */}
      <div className="card-elevated p-5 mt-4">
        <h3 className="font-bold text-foreground flex items-center gap-2 mb-3">👤 Employee Selection</h3>
        <p className="text-xs text-muted-foreground mb-2">Who is taking the car?</p>
        <Select value={submissionId} onValueChange={setSubmissionId} required>
          <SelectTrigger className="h-11 text-base sm:text-sm">
            <SelectValue placeholder="Select Employee" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {bookings.map(booking => (
              <SelectItem key={booking.submissionId} value={booking.submissionId}>
                {booking.employeeName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Booking Details */}
      <div className="card-elevated p-5 mt-4">
        <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">📋 Booking Details</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Current Mileage (km)</label>
            <input type="number" min="0" step="1" inputMode="numeric" placeholder="Enter current mileage" value={mileage} onChange={e => setMileage(e.target.value)} className="w-full h-11 rounded-lg border border-input bg-muted/20 hover:bg-muted/50 focus:bg-background px-3 text-base sm:text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all shadow-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Date & Time Out</label>
            <Input type="datetime-local" value={dateTimeOut} className="h-11 w-full bg-muted/20 text-base sm:text-sm font-medium shadow-sm transition-colors dark:[color-scheme:dark]" readOnly />
          </div> 
        </div>

        {/* Fuel Level */}
        <div className="mb-4">
          <label className="text-sm font-medium text-foreground block mb-2">Fuel Level</label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {fuelOptions.map(opt => {
              const activeBars = fuelBars[opt] || 0;
              const isSelected = fuelLevel === opt;
              return (
                <button type="button" key={opt} onClick={() => setFuelLevel(opt)} className={`flex-1 py-2 flex flex-col items-center justify-center gap-1.5 rounded-lg border transition-all ${isSelected ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                  <span className="text-[11px] sm:text-xs font-bold">{opt}</span>
                  <div className="flex gap-0.5 h-2.5">
                    {[1, 2, 3, 4, 5, 6, 7].map(bar => (
                      <div key={bar} className={`w-1.5 h-full ${bar <= activeBars ? (activeBars === 1 ? 'bg-destructive' : isSelected ? 'bg-primary' : 'bg-primary/60') : (isSelected ? 'bg-primary/20' : 'bg-muted-foreground/20')}`} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Petrol Card */}
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-foreground">Petrol Card</label>
          <div className="flex gap-1">
            <button type="button" onClick={() => { setPetrolCard(false); setPetrolSerial(""); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${!petrolCard ? "bg-primary text-primary-foreground" : "border border-border text-foreground"}`}>NO</button>
            <button type="button" onClick={() => setPetrolCard(true)} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${petrolCard ? "bg-primary text-primary-foreground" : "border border-border text-foreground"}`}>YES</button>
          </div>
        </div>
        {petrolCard && (
          <div className="mt-2">
            <label className="text-xs text-primary font-medium">Select Petrol Card</label>
            <Select value={petrolSerial} onValueChange={setPetrolSerial}>
              <SelectTrigger className="h-10 w-full text-base sm:text-sm mt-1">
                <SelectValue placeholder="Choose a petrol card" />
              </SelectTrigger>
              <SelectContent>
                {availablePetrolCards.map(card => (
                  <SelectItem key={card} value={card}>{card}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Vehicle Condition Photos */}
        <div className="mt-5 text-center">
          <h4 className="font-bold text-foreground text-sm mb-1">Vehicle Condition Photos</h4>
          <p className="text-xs text-muted-foreground mb-4">Maximum 12MB per photo</p>
          <div className="mx-auto grid max-w-lg grid-cols-3 grid-rows-3 gap-2 rounded-xl border border-border bg-muted/20 p-3 shadow-sm sm:gap-4 sm:p-4">
            <div className="col-start-2 row-start-1">
              {renderPhotoUpload('front', 'Front View')}
            </div>
            <div className="col-start-1 row-start-2">
              {renderPhotoUpload('left', 'Left Side')}
            </div>
            <div className="col-start-2 row-start-2 flex items-center justify-center">
              <Car className="h-12 w-12 text-muted-foreground/30" />
            </div>
            <div className="col-start-3 row-start-2">
              {renderPhotoUpload('right', 'Right Side')}
            </div>
            <div className="col-start-2 row-start-3">
              {renderPhotoUpload('back', 'Back View')}
            </div>
          </div>
        </div>

        {/* Condition Remarks */}
        <div className="mt-5 space-y-1.5">
          <label htmlFor="checkout-remarks" className="text-sm font-medium text-foreground">
            Condition Remarks
          </label>
          <textarea id="checkout-remarks" rows={3} placeholder="Enter a remark if any..." value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row-reverse justify-center gap-3 sm:gap-4 pt-4 pb-8">
        <button
          onClick={async () => {
            const selectedBooking = bookings.find(booking => booking.submissionId === submissionId);
            if (!selectedBooking) {
              toast.error("Please select an active approved booking.");
              return;
            }
            if (new Date(selectedBooking.toDate).getTime() < Date.now()) {
              toast.error("This booking has expired. Return to the overview and select another booking.");
              return;
            }
            setIsSubmitting(true);
            const uploadedUrls: Record<string, string | null> = { front: null, back: null, left: null, right: null };
            const uploadedPaths: string[] = [];
            try {
              if (petrolCard && !petrolSerial) {
                throw new Error("Please select a petrol card.");
              }
              if (!mileage) {
                throw new Error("Please enter the current mileage.");
              }
              if (!/^\d+$/.test(mileage) || Number(mileage) < 0) {
                throw new Error("Mileage must be a whole number.");
              }
              const lastMileage = car.history?.[0]?.mileageIn;
              if (lastMileage && Number(mileage) < Number(lastMileage)) {
                throw new Error(`Current mileage cannot be lower than the last recorded mileage (${lastMileage} km).`);
              }

              for (const [side, data] of Object.entries(photos)) {
                if (data.file) {
                  const filePath = `public/${user?.id || 'admin'}/car_out_${side}_${Date.now()}_${data.file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                  const { data: uploadData, error } = await supabase.storage.from('form-attachments').upload(filePath, data.file);
                  if (error) throw error;
                  if (uploadData) {
                    uploadedPaths.push(uploadData.path);
                    const { data: urlData } = supabase.storage.from('form-attachments').getPublicUrl(uploadData.path);
                    uploadedUrls[side] = urlData.publicUrl;
                  }
                }
              }
              const success = await onSubmit(car, selectedBooking, mileage, fuelLevel, remarks, uploadedUrls, new Date(dateTimeOut).toISOString(), petrolCard, petrolSerial);
              if (!success && uploadedPaths.length > 0) await supabase.storage.from('form-attachments').remove(uploadedPaths);
            } catch (error: any) {
              if (uploadedPaths.length > 0) await supabase.storage.from('form-attachments').remove(uploadedPaths);
              console.error("Upload error:", error);
              toast.error(error.message || `Failed to submit check-out.`);
            } finally {
              setIsSubmitting(false);
            }
          }}
          disabled={isSubmitting}
          className="btn-gold w-full sm:w-auto px-6 py-3.5 sm:px-32 sm:py-4 rounded-full text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300">
          <CheckCircle className="h-4 w-4" /> {isSubmitting ? "Submitting..." : "Submit Check-Out"}
        </button>
        <div className="w-full h-px bg-border sm:hidden" />
        <button type="button" onClick={onCancel} disabled={isSubmitting} className="w-full sm:w-auto px-6 py-3.5 sm:px-12 sm:py-4 rounded-full border-2 border-border text-foreground font-bold text-sm hover:bg-muted transition-colors text-center">
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ─── Check-In Form ─── */
function CheckInForm({ car, onCancel, onSubmit }: { car: CarInfo; onCancel: () => void; onSubmit: (car: CarInfo, mileageIn: string, fuelLevel: string, remarks: string, photosIn: Record<string, string | null>, dateTimeIn: string) => Promise<boolean> }) {
  const { user } = useAuth();
  const [mileageIn, setMileageIn] = useState("");
  const [fuelLevel, setFuelLevel] = useState("4/7");
  const [remarks, setRemarks] = useState("");
  const [dateTimeIn] = useState(() => toLocalDateTimeValue(new Date()));
  const [photos, setPhotos] = useState<{ [key: string]: { file: File | null; url: string | null } }>({
    front: { file: null, url: null }, back: { file: null, url: null }, left: { file: null, url: null }, right: { file: null, url: null }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePhotoUpload = (side: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // 12MB file size limit (12 * 1024 * 1024 bytes)
      if (file.size > 12 * 1024 * 1024) {
        toast.error("File size must be less than 12MB.");
        e.target.value = ""; // Reset input
        return;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        toast.error("Upload JPG, PNG, or WebP photos only.");
        e.target.value = "";
        return;
      }

      const url = URL.createObjectURL(file);
      setPhotos(prev => ({ ...prev, [side]: { file, url } }));
    }
  };

  const renderPhotoUpload = (side: string, label: string) => (
    <div className="relative w-full aspect-square sm:aspect-auto sm:h-24 border-2 border-dashed border-border rounded-xl overflow-hidden bg-background shadow-sm group">
      <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
      {photos[side].url ? (
        <img src={photos[side].url!} alt={label} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
      ) : (
        <>
          <Camera className="h-6 w-6 text-muted-foreground mb-1 sm:mb-2" />
          <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground">{label}</span>
        </>
      )}
      <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={e => handlePhotoUpload(side, e)} />
      </label>
      {photos[side].url && <button type="button" aria-label={`Remove ${label}`} onClick={() => setPhotos(prev => ({ ...prev, [side]: { file: null, url: null } }))} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-destructive"><XCircle className="h-4 w-4" /></button>}
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl animate-in slide-in-from-bottom-2 p-4 duration-700 sm:p-6 lg:p-8">
      <p className="text-sm text-primary mb-1">Cars Overview › <span className="font-bold text-foreground">Check-In</span></p>
      <h1 className="text-2xl font-bold text-foreground">Vehicle Check-In Form</h1>

      {/* Section 1: Booking Summary */}
      <div className="card-elevated mt-4 p-4">
        <div className="mb-3 border-b border-border pb-2">
          <h3 className="text-sm font-bold text-primary">Section 1: Booking Summary</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Car Name</p>
            <p className="text-sm font-semibold text-foreground">{car.model} ({car.plateNumber})</p>
          </div>
          <div>
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Petrol Card</p>
            <p className="text-sm font-semibold text-foreground">{car.petrolCardOut ? car.petrolCardSerialOut || "Issued" : "Not issued"}</p>
          </div>
          <div>
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Employee</p>
            <p className="text-sm font-semibold text-foreground">{car.lastCheckedOutBy || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Date Out</p>
            <p className="text-sm font-semibold text-foreground">{car.lastCheckedOutAt ? new Date(car.lastCheckedOutAt).toLocaleString() : "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Mileage Out</p>
            <p className="text-sm font-semibold text-foreground">{car.mileageOut ? `${car.mileageOut} km` : "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-0.5">Fuel Level Out</p>
            {car.fuelLevelOut ? (() => {
              const activeBars = fuelBars[car.fuelLevelOut] || 0;
              return (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{car.fuelLevelOut}</span>
                  <div className="flex gap-0.5 h-2.5">
                    {[1, 2, 3, 4, 5, 6, 7].map(bar => (
                      <div key={bar} className={`w-1.5 h-full ${bar <= activeBars ? (activeBars === 1 ? 'bg-destructive' : 'bg-primary') : 'bg-muted-foreground/20'}`} />
                    ))}
                  </div>
                </div>
              );
            })() : (
              <p className="text-sm font-semibold text-foreground">—</p>
            )}
          </div>
        </div>

        {car.remarksOut && (
          <div className="mt-3 border-t border-border/50 pt-3">
            <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Condition Remarks (Out)</p>
            <p className="text-sm text-foreground mt-0.5">{car.remarksOut}</p>
          </div>
        )}
      </div>

      {/* Section 2: Check-In Details */}
      <div className="card-elevated p-5 mt-4">
        <div className="border-b border-border pb-3 mb-4">
          <h3 className="font-bold text-primary">Section 2: Check-In Details</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-0.5">Current Mileage (Return)</label>
            <div className="relative group mt-1.5">
              <input type="number" min={car.mileageOut || "0"} step="1" inputMode="numeric" placeholder="Enter current mileage" value={mileageIn} onChange={e => setMileageIn(e.target.value)} className="w-full h-11 rounded-lg border border-input bg-muted/20 hover:bg-muted/50 focus:bg-background px-3 pr-10 text-base sm:text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all shadow-sm" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">km</span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-0.5">Date & Time In</label>
            <Input type="datetime-local" value={dateTimeIn} className="h-11 mt-1.5 w-full bg-muted/20 text-base sm:text-sm font-medium shadow-sm transition-colors dark:[color-scheme:dark]" readOnly />
          </div>
        </div>

        {/* Fuel Level */}
        <div className="mb-5">
          <label className="text-sm font-medium text-foreground block mb-0.5">Fuel Level (Return)</label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mt-1.5">
            {fuelOptions.map(opt => {
              const activeBars = fuelBars[opt] || 0;
              const isSelected = fuelLevel === opt;
              return (
                <button type="button" key={opt} onClick={() => setFuelLevel(opt)} className={`flex-1 py-2 flex flex-col items-center justify-center gap-1.5 rounded-lg border transition-all ${isSelected ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                  <span className="text-[11px] sm:text-xs font-bold">{opt}</span>
                  <div className="flex gap-0.5 h-2.5">
                    {[1, 2, 3, 4, 5, 6, 7].map(bar => (
                      <div key={bar} className={`w-1.5 h-full ${bar <= activeBars ? (activeBars === 1 ? 'bg-destructive' : isSelected ? 'bg-primary' : 'bg-primary/60') : (isSelected ? 'bg-primary/20' : 'bg-muted-foreground/20')}`} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Condition Remarks */}
        <div className="mb-5 space-y-1.5">
          <label htmlFor="checkin-remarks" className="text-sm font-medium text-foreground">Condition Remarks</label>
          <textarea id="checkin-remarks" rows={3} placeholder="State any new scratches, cleaning required or issues..." value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>

        {/* Vehicle Condition Photos */}
        <div className="mb-5 pt-2 text-center">
          <h4 className="font-bold text-foreground text-sm mb-1">Vehicle Condition Photos</h4>
          <p className="text-xs text-muted-foreground mb-4">Maximum 12MB per photo</p>
          <div className="mx-auto grid max-w-lg grid-cols-3 grid-rows-3 gap-2 rounded-xl border border-border bg-muted/20 p-3 shadow-sm sm:gap-4 sm:p-4">
            <div className="col-start-2 row-start-1">
              {renderPhotoUpload('front', 'Front View')}
            </div>
            <div className="col-start-1 row-start-2">
              {renderPhotoUpload('left', 'Left Side')}
            </div>
            <div className="col-start-2 row-start-2 flex items-center justify-center">
              <Car className="h-12 w-12 text-muted-foreground/30" />
            </div>
            <div className="col-start-3 row-start-2">
              {renderPhotoUpload('right', 'Right Side')}
            </div>
            <div className="col-start-2 row-start-3">
              {renderPhotoUpload('back', 'Back View')}
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row-reverse justify-center gap-3 sm:gap-4 pt-4 pb-8">
        <button 
          onClick={async () => {
            setIsSubmitting(true);
            const uploadedUrls: Record<string, string | null> = { front: null, back: null, left: null, right: null };
            const uploadedPaths: string[] = [];
            try {
              if (!mileageIn) {
                throw new Error("Please enter the return mileage.");
              }
              if (!/^\d+$/.test(mileageIn) || Number(mileageIn) < 0) {
                throw new Error("Return mileage must be a whole number.");
              }
              if (car.mileageOut && Number(mileageIn) < Number(car.mileageOut)) {
                throw new Error(`Return mileage cannot be lower than the check-out mileage (${car.mileageOut} km).`);
              }

              for (const [side, data] of Object.entries(photos)) {
                if (data.file) {
                  const filePath = `public/${user?.id || 'admin'}/car_in_${side}_${Date.now()}_${data.file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                  const { data: uploadData, error } = await supabase.storage.from('form-attachments').upload(filePath, data.file);
                  if (error) throw error;
                  if (uploadData) {
                    uploadedPaths.push(uploadData.path);
                    const { data: urlData } = supabase.storage.from('form-attachments').getPublicUrl(uploadData.path);
                    uploadedUrls[side] = urlData.publicUrl;
                  }
                }
              }
              const success = await onSubmit(car, mileageIn, fuelLevel, remarks, uploadedUrls, new Date(dateTimeIn).toISOString());
              if (!success && uploadedPaths.length > 0) await supabase.storage.from('form-attachments').remove(uploadedPaths);
            } catch (error: any) {
              if (uploadedPaths.length > 0) await supabase.storage.from('form-attachments').remove(uploadedPaths);
              console.error("Upload error:", error);
              toast.error(error.message || `Failed to submit check-in.`);
            } finally {
              setIsSubmitting(false);
            }
          }} 
          disabled={isSubmitting}
          className="btn-gold w-full sm:w-auto px-6 py-3.5 sm:px-32 sm:py-4 rounded-full text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300">
          <CheckCircle className="h-4 w-4" /> {isSubmitting ? "Submitting..." : "Submit Check-In"}
        </button>
        <div className="w-full h-px bg-border sm:hidden" />
        <button type="button" onClick={onCancel} disabled={isSubmitting} className="w-full sm:w-auto px-6 py-3.5 sm:px-12 sm:py-4 rounded-full border-2 border-border text-foreground font-bold text-sm hover:bg-muted transition-colors text-center">
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ─── Booking History Modal ─── */
function BookingHistoryModal({ history, onClose, onImageClick }: { history: AggregatedHistoryEntry[]; onClose: () => void; onImageClick: (url: string) => void }) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const HistoryDateTime = ({ value }: { value?: string }) => {
    if (!value) return <span>—</span>;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return <span>—</span>;
    return <span className="block whitespace-nowrap"><span className="block font-semibold text-foreground">{date.toLocaleDateString()}</span><span className="mt-0.5 block text-muted-foreground">{date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></span>;
  };

  const getDistance = (entry: AggregatedHistoryEntry) => {
    const out = Number(entry.mileageOut);
    const incoming = Number(entry.mileageIn);
    return Number.isFinite(out) && Number.isFinite(incoming) && incoming >= out ? `${incoming - out} km` : "—";
  };

  const PhotoGroup = ({ photos, label, tone }: { photos?: Record<string, string | null>; label: string; tone: string }) => {
    const availablePhotos = Object.entries(photos || {}).filter((entry): entry is [string, string] => Boolean(entry[1]));
    if (availablePhotos.length === 0) return null;
    return (
      <div className="mt-2">
        <p className={`mb-1.5 text-[10px] font-bold uppercase ${tone}`}>{label}</p>
        <div className="flex flex-wrap gap-2">{availablePhotos.map(([side, url]) => <button type="button" key={`${label}-${side}`} onClick={() => onImageClick(url)} aria-label={`View ${label.toLowerCase()} ${side} photo`} className="overflow-hidden rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><img src={url} alt={`${label} ${side}`} className="h-11 w-11 object-cover transition-opacity hover:opacity-80" /></button>)}</div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="vehicle-history-title">
      <div className="card-elevated flex max-h-[92vh] w-full max-w-6xl animate-in flex-col overflow-hidden p-4 fade-in-90 slide-in-from-bottom-10 sm:p-6" onClick={e => e.stopPropagation()}>
        <div className="mb-5 flex items-start gap-3 border-b border-border pb-4 sm:items-center sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 sm:h-12 sm:w-12">
            <CalendarClock className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="vehicle-history-title" className="font-bold text-lg text-foreground">Vehicle Usage History</h3>
            <p className="text-sm text-muted-foreground">Completed vehicle trips and return records</p>
          </div>
          <button onClick={onClose} aria-label="Close vehicle usage history" className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {history.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No booking history found.</p>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-3 lg:hidden">
            {history.map((entry, index) => (
              <article key={index} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
                  <div><p className="font-bold text-foreground">{entry.employeeName || "Unknown employee"}</p><p className="text-xs text-muted-foreground">{entry.model} · {entry.plateNumber}</p>{entry.submissionRefNo && <p className="mt-1 text-[11px] font-semibold text-primary">{entry.submissionRefNo}</p>}</div>
                  <Badge className="shrink-0 border-0 bg-primary/10 text-primary">{getDistance(entry)}</Badge>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  <div><dt className="text-muted-foreground">Date & Time Out</dt><dd className="mt-0.5"><HistoryDateTime value={entry.checkedOutAt} /></dd></div>
                  <div><dt className="text-muted-foreground">Date & Time In</dt><dd className="mt-0.5"><HistoryDateTime value={entry.checkedInAt} /></dd></div>
                  <div><dt className="text-muted-foreground">Mileage</dt><dd className="mt-0.5 font-semibold text-foreground">{entry.mileageOut || "—"} → {entry.mileageIn || "—"} km</dd></div>
                  <div><dt className="text-muted-foreground">Fuel</dt><dd className="mt-0.5 font-semibold text-foreground">{entry.fuelLevelOut || "—"} → {entry.fuelLevelIn || "—"}</dd></div>
                  <div className="col-span-2"><dt className="text-muted-foreground">Petrol Card</dt><dd className="mt-0.5 font-semibold text-foreground">{entry.petrolCardOut ? entry.petrolCardSerialOut || "Issued" : "Not issued"}</dd></div>
                </dl>
                {(entry.remarksOut || entry.remarksIn || entry.remarks) && <div className="mt-3 rounded-lg bg-muted/30 p-3 text-xs"><p>{entry.remarksOut && <><span className="font-bold text-amber-600">Out:</span> {entry.remarksOut}</>}</p><p className={entry.remarksOut ? "mt-1" : ""}>{(entry.remarksIn || entry.remarks) && <><span className="font-bold text-emerald-600">In:</span> {entry.remarksIn || entry.remarks}</>}</p></div>}
                <PhotoGroup photos={entry.photosOut} label="Photos Out" tone="text-amber-600" />
                <PhotoGroup photos={entry.photosIn} label="Photos In" tone="text-emerald-600" />
              </article>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-lg border border-border lg:block">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Employee</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Vehicle</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Trip period</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Mileage / Distance</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Fuel Out → In</TableHead>
                  <TableHead className="w-28 text-right text-xs font-bold uppercase tracking-wider">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry, index) => (
                  <Fragment key={index}>
                  <TableRow className="hover:bg-muted/20">
                    <TableCell className="font-medium text-foreground">{entry.employeeName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground"><p>{entry.model} ({entry.plateNumber})</p>{entry.submissionRefNo && <p className="mt-1 text-[11px] font-semibold text-primary">{entry.submissionRefNo}</p>}<p className="mt-1 text-[10px]">Card: {entry.petrolCardOut ? entry.petrolCardSerialOut || "Issued" : "Not issued"}</p></TableCell>
                    <TableCell className="text-sm"><div className="grid grid-cols-[2rem_1fr] gap-x-2 gap-y-2"><span className="text-xs font-bold text-amber-600">OUT</span><HistoryDateTime value={entry.checkedOutAt} /><span className="text-xs font-bold text-emerald-600">IN</span><HistoryDateTime value={entry.checkedInAt} /></div></TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap"><p className="font-semibold text-foreground">{entry.mileageOut || "—"} → {entry.mileageIn || "—"} km</p><p className="mt-1">Distance: {getDistance(entry)}</p></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(entry.fuelLevelOut || entry.fuelLevelIn) ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold whitespace-nowrap">{entry.fuelLevelOut || "—"} → {entry.fuelLevelIn || "—"}</span>
                          <div className="flex gap-0.5 h-2.5">
                            {[1, 2, 3, 4, 5, 6, 7].map(bar => {
                              const activeBars = fuelBars[entry.fuelLevelIn || ""] || 0;
                              return <div key={bar} className={`w-1 h-full ${bar <= activeBars ? (activeBars === 1 ? 'bg-destructive' : 'bg-primary') : 'bg-muted-foreground/20'}`} />
                            })}
                          </div>
                        </div>
                      ) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <button type="button" onClick={() => setExpandedRow(expandedRow === index ? null : index)} aria-expanded={expandedRow === index} aria-label={`${expandedRow === index ? "Hide" : "Show"} trip details`} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted">
                    {expandedRow === index ? "Hide" : "View"}
                    {expandedRow === index ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                    </TableCell>
                  </TableRow>
                  {expandedRow === index && (
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableCell colSpan={6} className="px-5 py-4">
                        <div className="grid gap-5 md:grid-cols-2">
                          <div><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Remarks</p><div className="mt-2 space-y-2 text-sm">{entry.remarksOut && <p><span className="font-bold text-amber-600">Out:</span> {entry.remarksOut}</p>}{(entry.remarksIn || entry.remarks) && <p><span className="font-bold text-emerald-600">In:</span> {entry.remarksIn || entry.remarks}</p>}{!entry.remarksOut && !entry.remarksIn && !entry.remarks && <p className="text-muted-foreground">No remarks recorded.</p>}</div></div>
                          <div><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Vehicle photos</p><div className="mt-2 flex flex-wrap gap-x-6"><PhotoGroup photos={entry.photosOut} label="Photos Out" tone="text-amber-600" /><PhotoGroup photos={entry.photosIn} label="Photos In" tone="text-emerald-600" />{!(entry.photosOut && Object.values(entry.photosOut).some(v => v)) && !(entry.photosIn && Object.values(entry.photosIn).some(v => v)) && <p className="text-sm text-muted-foreground">No photos recorded.</p>}</div></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
          </div>
        )}
        
      </div>
    </div>
  );
}

/* ─── Add/Edit Car Modal ─── */
function CarModal({ initialData, onClose, onSubmit }: { initialData?: CarInfo | null; onClose: () => void; onSubmit: (model: string, plateNumber: string, type: string, imageUrl: string, status: string) => Promise<void> }) {
  const { user } = useAuth();
  const [model, setModel] = useState(initialData?.model || "");
  const [plateNumber, setPlateNumber] = useState(initialData?.plateNumber || "");
  const [type, setType] = useState(initialData?.type || "Sedan");
  const [status, setStatus] = useState(initialData?.status || "available");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(initialData?.imageUrl || "");
  const [isUploading, setIsUploading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();

    if (!model.trim() || !plateNumber.trim()) {
      toast.error("Please fill in all required fields (Model, Plate Number)");
      return;
    }

    setIsUploading(true);
    let finalImageUrl = previewUrl;

    if (imageFile) {
      const filePath = `public/${user?.id || 'admin'}/car_${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { data, error } = await supabase.storage.from('form-attachments').upload(filePath, imageFile, {
        upsert: true
      });
      if (!error && data) {
        const { data: urlData } = supabase.storage.from('form-attachments').getPublicUrl(data.path);
        finalImageUrl = urlData.publicUrl;
      } else {
        console.error("Upload error:", error);
        toast.error(`Failed to upload: ${error?.message || 'Unknown error'}`);
        setIsUploading(false);
        return;
      }
    }

    await onSubmit(model, plateNumber, type, finalImageUrl, status);
    setIsUploading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card-elevated p-6 w-full max-w-md relative animate-in fade-in-90 slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors" disabled={isUploading}>
          <XCircle className="h-5 w-5" />
        </button>
        <div className="border-b border-border pb-4 mb-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Car className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">{initialData ? "Edit Car" : "Add New Car"}</h3>
            <p className="text-sm text-muted-foreground">{initialData ? "Update vehicle details" : "Create a fleet vehicle"}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Car Photo</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                )}
              </div>
              <label className="cursor-pointer flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors">
                <Upload className="h-4 w-4 text-muted-foreground" />
                Upload Photo
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={isUploading} />
              </label>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Car Model <span className="text-destructive">*</span></label>
            <input type="text" value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. Proton X50" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-base sm:text-sm" required autoFocus={!initialData} disabled={isUploading} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Plate Number <span className="text-destructive">*</span></label>
            <input type="text" value={plateNumber} onChange={e => setPlateNumber(e.target.value)} placeholder="e.g. VCA 1234" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-base sm:text-sm uppercase" required disabled={isUploading} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Car Type <span className="text-destructive">*</span></label>
              <Select value={type} onValueChange={setType} disabled={isUploading}>
                <SelectTrigger className="h-10 text-base sm:text-sm">
                  <SelectValue placeholder="Select car type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sedan">Sedan</SelectItem>
                  <SelectItem value="SUV">SUV</SelectItem>
                  <SelectItem value="Truck">Truck</SelectItem>
                  <SelectItem value="Van">Van</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Status <span className="text-destructive">*</span></label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)} disabled={isUploading || status === 'checked_out'}>
                <SelectTrigger className="h-10 text-base sm:text-sm">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  {status === 'checked_out' && <SelectItem value="checked_out">In Use</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="mt-6 flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={isUploading} className="flex-1 py-2.5 rounded-lg border border-border text-foreground font-medium text-sm hover:bg-muted/50 transition-colors">
              Cancel
            </button>
          <button type="submit" disabled={isUploading} className="btn-gold flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300">
              {isUploading ? "Saving..." : (
                <>
                  {initialData ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {initialData ? "Save Changes" : "Add Car"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CarManagement;
