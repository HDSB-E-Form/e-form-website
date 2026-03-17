import { useState } from "react";
import { useSubmissions, type CarInfo } from "@/contexts/SubmissionsContext";
import { useAuth } from "@/contexts/AuthContext";
import { Car, CheckCircle, ArrowRightLeft, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type ViewMode = "overview" | "checkout" | "checkin";

const CarManagement = () => {
  const { cars, checkInCar, checkOutCar } = useSubmissions();
  const { user } = useAuth();
  const [view, setView] = useState<ViewMode>("overview");
  const [selectedCar, setSelectedCar] = useState<CarInfo | null>(null);

  const available = cars.filter(c => c.status === "available");
  const checkedOut = cars.filter(c => c.status === "checked_out");

  const handleStartCheckout = (car: CarInfo) => {
    setSelectedCar(car);
    setView("checkout");
  };

  const handleStartCheckin = (car: CarInfo) => {
    setSelectedCar(car);
    setView("checkin");
  };

  if (view === "checkout" && selectedCar) {
    return <CheckOutForm car={selectedCar} onCancel={() => setView("overview")} onSubmit={(car, mileage, fuelLevel) => {
      checkOutCar(car.id, user?.name || "", mileage, fuelLevel);
      toast.success("Vehicle checked out successfully");
      setView("overview");
    }} />;
  }

  if (view === "checkin" && selectedCar) {
    return <CheckInForm car={selectedCar} onCancel={() => setView("overview")} onSubmit={(car) => {
      checkInCar(car.id);
      toast.success("Vehicle checked in successfully");
      setView("overview");
    }} />;
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Cars Overview / Gambaran keseluruhan kereta</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage and review all incoming department requests.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="card-elevated p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Available / Tersedia</p>
            <p className="text-3xl font-bold text-foreground">{available.length}</p>
          </div>
        </div>
        <div className="card-elevated p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Car className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Booked / Ditempah</p>
            <p className="text-3xl font-bold text-foreground">{checkedOut.length}</p>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ready for Check-Out */}
        <div className="card-elevated overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-bold text-foreground">Ready for Check-Out</h2>
              <p className="text-xs text-muted-foreground">Sedia untuk Daftar Keluar (Available Cars)</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs font-bold">{available.length} VEHICLES</Badge>
          </div>
          <div className="divide-y divide-border">
            {available.map(car => (
              <div key={car.id} className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Car className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-sm">{car.model}</p>
                  <p className="text-xs text-muted-foreground">{car.plateNumber} • Sedan</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] font-bold">100% FUEL</Badge>
              </div>
            ))}
            {available.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">No vehicles available</p>
            )}
          </div>
          {available.length > 0 && (
            <div className="p-4 border-t border-border space-y-2">
              {available.map(car => (
                <div key={car.id} className="flex items-center justify-between">
                  <span className="text-sm text-foreground font-medium">{car.model}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleStartCheckout(car)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors">
                      <ArrowRightLeft className="h-3.5 w-3.5" /> Check-Out / Daftar Keluar
                    </button>
                    <button className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/50">
                      <Info className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Waiting for Check-In */}
        <div className="card-elevated overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-bold text-foreground">Waiting for Check-In</h2>
              <p className="text-xs text-muted-foreground">Menunggu Daftar Masuk (Booked-out Cars)</p>
            </div>
            <Badge className="bg-destructive/10 text-destructive border-0 text-xs font-bold">{checkedOut.length} VEHICLES</Badge>
          </div>
          <div className="divide-y divide-border">
            {checkedOut.map(car => (
              <div key={car.id} className="p-4">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 relative">
                    <Car className="h-6 w-6 text-muted-foreground" />
                    <Badge className="absolute -top-1 -right-1 bg-amber-500 text-white border-0 text-[8px] px-1">IN USE</Badge>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-sm">{car.model}</p>
                    <p className="text-xs text-muted-foreground">{car.plateNumber} • Sedan</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Booked By</p>
                    <p className="text-sm font-bold text-foreground">{car.lastCheckedOutBy || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleStartCheckin(car)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-foreground text-xs font-medium hover:bg-muted/50 transition-colors">
                    <ArrowRightLeft className="h-3.5 w-3.5" /> Check-In / Daftar Masuk
                  </button>
                  <p className="text-xs text-muted-foreground ml-auto">Due today 5:00 PM</p>
                </div>
              </div>
            ))}
            {checkedOut.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">No vehicles checked out</p>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-6">Last Updated: Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
    </div>
  );
};

/* ─── Check-Out Form ─── */
function CheckOutForm({ car, onCancel, onSubmit }: { car: CarInfo; onCancel: () => void; onSubmit: (car: CarInfo, mileage: string, fuelLevel: string) => void }) {
  const [employee, setEmployee] = useState("");
  const [mileage, setMileage] = useState("");
  const [fuelLevel, setFuelLevel] = useState("Full");
  const [petrolCard, setPetrolCard] = useState(false);
  const [petrolSerial, setPetrolSerial] = useState("");
  const [remarks, setRemarks] = useState("");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    license: false, keys: false, petrolReturn: false,
    front: false, left: false, right: false, back: false,
  });

  const toggleCheck = (key: string) => setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  const fuelOptions = ["Empty", "1/4", "1/2", "3/4", "Full"];

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <p className="text-sm text-primary mb-1">Fleet › <span className="font-bold text-foreground">Check-Out</span></p>
      <h1 className="text-2xl font-bold text-foreground">Vehicle Check-Out Form</h1>
      <p className="text-muted-foreground text-sm">Borang Keluar Kenderaan</p>

      {/* Car Info */}
      <div className="card-elevated p-5 mt-6">
        <h3 className="font-bold text-foreground flex items-center gap-2 mb-3">
          <Info className="h-4 w-4 text-primary" /> Car Info / Maklumat Kenderaan
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Vehicle Model / Model</p>
            <p className="font-semibold text-foreground">{car.model}</p>
          </div>
          <div>
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Plate Number / No. Plat</p>
            <p className="font-semibold text-foreground">{car.plateNumber}</p>
          </div>
        </div>
      </div>

      {/* Employee Selection */}
      <div className="card-elevated p-5 mt-4">
        <h3 className="font-bold text-foreground flex items-center gap-2 mb-3">👤 Employee Selection / Pilihan Pekerja</h3>
        <p className="text-xs text-muted-foreground mb-2">Who is taking the car? / Siapa yang mengambil kenderaan?</p>
        <select value={employee} onChange={e => setEmployee(e.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
          <option value="">Select Employee / Pilih Pekerja</option>
          <option value="Ahmad Razak">Ahmad Razak</option>
          <option value="Sarah Abdullah">Sarah Abdullah</option>
          <option value="Lim Wei Jie">Lim Wei Jie</option>
        </select>
      </div>

      {/* Rent Details */}
      <div className="card-elevated p-5 mt-4">
        <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">📋 Rent Details / Butiran Sewaan</h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Current Mileage / Perbatuan Semasa (km)</label>
            <input type="text" placeholder="e.g. 45000" value={mileage} onChange={e => setMileage(e.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Date & Time Out / Tarikh & Masa Keluar</label>
            <input type="datetime-local" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
        </div>

        {/* Fuel Level */}
        <div className="mb-4">
          <label className="text-sm font-medium text-foreground block mb-2">Fuel Level / Aras Bahan Api</label>
          <div className="flex gap-2">
            {fuelOptions.map(opt => (
              <button key={opt} onClick={() => setFuelLevel(opt)} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${fuelLevel === opt ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Petrol Card */}
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-foreground">Petrol Card / Kad Petrol</label>
          <div className="flex gap-1">
            <button onClick={() => setPetrolCard(false)} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${!petrolCard ? "bg-primary text-primary-foreground" : "border border-border text-foreground"}`}>NO</button>
            <button onClick={() => setPetrolCard(true)} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${petrolCard ? "bg-primary text-primary-foreground" : "border border-border text-foreground"}`}>YES</button>
          </div>
        </div>
        {petrolCard && (
          <div className="mt-2">
            <label className="text-xs text-primary font-medium">Petrol Card Serial No (If YES)</label>
            <input type="text" placeholder="e.g. 7088 1234 5678" value={petrolSerial} onChange={e => setPetrolSerial(e.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm mt-1" />
          </div>
        )}

        {/* Checklist */}
        <div className="mt-5">
          <h4 className="font-bold text-foreground text-sm mb-3">Return Checklist / Senarai Semak</h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "license", en: "Verify driver's license status", ms: "Sahkan status lesen memandu" },
              { key: "front", en: "Verify Car front side", ms: "Sahkan bahagian hadapan kereta" },
              { key: "keys", en: "Vehicle keys returned", ms: "Kunci kenderaan telah dipulangkan" },
              { key: "left", en: "Verify Car left side", ms: "Sahkan bahagian kiri Kereta" },
              { key: "petrolReturn", en: "Petrol card returned (if applicable)", ms: "Kad petrol telah dipulangkan (jika berkenaan)" },
              { key: "right", en: "Verify Car right side", ms: "Sahkan bahagian kanan Kereta" },
              { key: "back", en: "Verify Car back side", ms: "Sahkan bahagian belakang kereta" },
            ].map(item => (
              <label key={item.key} className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={checklist[item.key]} onChange={() => toggleCheck(item.key)} className="mt-1 rounded border-border" />
                <div>
                  <p className="text-sm text-foreground">{item.en}</p>
                  <p className="text-xs text-muted-foreground">{item.ms}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Condition Remarks */}
        <div className="mt-5">
          <label className="text-sm font-medium text-foreground block mb-1">Condition Remarks / Catatan Keadaan</label>
          <textarea placeholder="Note any scratches, dents, or issues..." value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[80px] resize-none" />
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-6 space-y-3">
        <button onClick={() => onSubmit(car)} className="w-full py-3 rounded-lg bg-accent text-accent-foreground font-bold text-sm hover:bg-accent/90 transition-colors flex items-center justify-center gap-2">
          <CheckCircle className="h-4 w-4" /> Submit / Hantar
        </button>
        <button onClick={onCancel} className="w-full py-3 rounded-lg bg-muted text-foreground font-medium text-sm hover:bg-muted/70 transition-colors">
          Cancel / Batal
        </button>
      </div>
    </div>
  );
}

/* ─── Check-In Form ─── */
function CheckInForm({ car, onCancel, onSubmit }: { car: CarInfo; onCancel: () => void; onSubmit: (car: CarInfo) => void }) {
  const [mileageIn, setMileageIn] = useState("");
  const [fuelLevel, setFuelLevel] = useState("1/2");
  const [remarks, setRemarks] = useState("");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    license: false, keys: false, petrolReturn: false,
    front: false, left: false, right: false, back: false,
  });

  const toggleCheck = (key: string) => setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  const fuelOptions = [
    { label: "Empty", sub: "KOSONG" },
    { label: "1/4", sub: "" },
    { label: "1/2", sub: "" },
    { label: "3/4", sub: "" },
    { label: "Full", sub: "PENUH" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <p className="text-sm text-primary mb-1">Fleet › <span className="font-bold text-foreground">Check-In</span></p>
      <h1 className="text-2xl font-bold text-foreground">Vehicle Check-In Form</h1>
      <p className="text-muted-foreground text-sm">Borang Pulang Kenderaan</p>

      {/* Section 1: Rental Summary */}
      <div className="card-elevated p-5 mt-6">
        <div className="border-b border-border pb-3 mb-4">
          <h3 className="font-bold text-primary">Section 1: Rental Summary</h3>
          <p className="text-[10px] text-accent font-bold uppercase tracking-wider">RINGKASAN SEWAAN</p>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Car Name</p>
            <p className="font-semibold text-foreground">{car.model} ({car.plateNumber})</p>
          </div>
          <div>
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Employee</p>
            <p className="font-semibold text-foreground">{car.lastCheckedOutBy || "—"}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Date Out</p>
            <p className="font-semibold text-foreground">{car.lastCheckedOutAt ? new Date(car.lastCheckedOutAt).toLocaleString() : "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Mileage Out</p>
            <p className="font-semibold text-foreground">45,200 km</p>
          </div>
        </div>
      </div>

      {/* Section 2: Check-In Details */}
      <div className="card-elevated p-5 mt-4">
        <div className="border-b border-border pb-3 mb-4">
          <h3 className="font-bold text-primary">Section 2: Check-In Details</h3>
          <p className="text-[10px] text-accent font-bold uppercase tracking-wider">BUTIRAN DAFTAR MASUK</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-0.5">Current Mileage (Return)</label>
            <p className="text-xs text-muted-foreground mb-1">Perbatuan Semasa (Pulang)</p>
            <div className="relative">
              <input type="text" placeholder="45,500" value={mileageIn} onChange={e => setMileageIn(e.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 pr-10 text-sm" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">km</span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-0.5">Date & Time In</label>
            <p className="text-xs text-muted-foreground mb-1">Tarikh & Masa Masuk</p>
            <input type="datetime-local" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
        </div>

        {/* Fuel Level */}
        <div className="mb-5">
          <label className="text-sm font-medium text-foreground block mb-0.5">Fuel Level (Return)</label>
          <p className="text-xs text-muted-foreground mb-2">Aras Bahan Api (Pulang)</p>
          <div className="flex gap-2">
            {fuelOptions.map(opt => (
              <button key={opt.label} onClick={() => setFuelLevel(opt.label)} className={`flex-1 py-2.5 rounded-lg border text-center transition-all ${fuelLevel === opt.label ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                <p className="text-sm font-bold">{opt.label}</p>
                {opt.sub && <p className="text-[9px] text-muted-foreground">{opt.sub}</p>}
              </button>
            ))}
          </div>
        </div>

        {/* Condition Remarks */}
        <div className="mb-5">
          <label className="text-sm font-medium text-foreground block mb-0.5">Condition Remarks</label>
          <p className="text-xs text-muted-foreground mb-1">Catatan Keadaan</p>
          <textarea placeholder="State any new scratches, cleaning required or issues..." value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[80px] resize-none" />
        </div>

        {/* Return Checklist */}
        <div>
          <h4 className="font-bold text-foreground text-sm mb-3">Return Checklist / Senarai Semak</h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "license", en: "Verify driver's license status", ms: "Sahkan status lesen memandu" },
              { key: "front", en: "Verify Car front side", ms: "Sahkan bahagian hadapan kereta" },
              { key: "keys", en: "Vehicle keys returned", ms: "Kunci kenderaan telah dipulangkan" },
              { key: "left", en: "Verify Car left side", ms: "Sahkan bahagian kiri Kereta" },
              { key: "petrolReturn", en: "Petrol card returned (if applicable)", ms: "Kad petrol telah dipulangkan (jika berkenaan)" },
              { key: "right", en: "Verify Car right side", ms: "Sahkan bahagian kanan Kereta" },
              { key: "back", en: "Verify Car back side", ms: "Sahkan bahagian belakang kereta" },
            ].map(item => (
              <label key={item.key} className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={checklist[item.key]} onChange={() => toggleCheck(item.key)} className="mt-1 rounded border-border" />
                <div>
                  <p className="text-sm text-foreground">{item.en}</p>
                  <p className="text-xs text-muted-foreground">{item.ms}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-6 flex items-center justify-center gap-3">
        <button onClick={onCancel} className="px-8 py-3 rounded-lg border border-border text-foreground font-medium text-sm hover:bg-muted/50 transition-colors">
          Cancel
        </button>
        <button onClick={() => onSubmit(car)} className="px-8 py-3 rounded-lg bg-accent text-accent-foreground font-bold text-sm hover:bg-accent/90 transition-colors flex items-center gap-2">
          <CheckCircle className="h-4 w-4" /> Confirm Check-In / Sahkan Daftar Masuk
        </button>
      </div>
    </div>
  );
}

export default CarManagement;
