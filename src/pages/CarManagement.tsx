import { useSubmissions, type CarInfo } from "@/contexts/SubmissionsContext";
import { useAuth } from "@/contexts/AuthContext";
import { Car, CheckCircle, ArrowRightLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  available: "status-approved",
  checked_out: "status-pending",
  maintenance: "status-rejected",
};

const CarManagement = () => {
  const { cars, checkInCar, checkOutCar } = useSubmissions();
  const { user } = useAuth();

  const handleCheckIn = (carId: string) => {
    checkInCar(carId);
    toast.success("Car checked in successfully");
  };

  const handleCheckOut = (carId: string) => {
    checkOutCar(carId, user?.name || "");
    toast.success("Car checked out successfully");
  };

  const available = cars.filter(c => c.status === "available");
  const checkedOut = cars.filter(c => c.status === "checked_out");
  const maintenance = cars.filter(c => c.status === "maintenance");

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Car Management</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage company vehicle check-in and check-out</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-success">{available.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Available</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-warning">{checkedOut.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Checked Out</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{maintenance.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Maintenance</p>
        </div>
      </div>

      <div className="space-y-3">
        {cars.map((car) => (
          <CarCard key={car.id} car={car} onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} />
        ))}
      </div>
    </div>
  );
};

function CarCard({ car, onCheckIn, onCheckOut }: { car: CarInfo; onCheckIn: (id: string) => void; onCheckOut: (id: string) => void }) {
  return (
    <div className="card-elevated p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Car className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-foreground text-sm">{car.model}</span>
          <Badge variant="outline" className={`text-xs px-2 py-0.5 border-0 ${statusColors[car.status]}`}>
            {car.status === "checked_out" ? "Checked Out" : car.status === "maintenance" ? "Maintenance" : "Available"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{car.plateNumber}{car.lastCheckedOutBy ? ` · Last used by ${car.lastCheckedOutBy}` : ""}</p>
      </div>
      {car.status === "available" && (
        <button onClick={() => onCheckOut(car.id)} className="btn-gold text-xs px-4 py-2 flex items-center gap-1">
          <ArrowRightLeft className="h-3.5 w-3.5" /> Check Out
        </button>
      )}
      {car.status === "checked_out" && (
        <button onClick={() => onCheckIn(car.id)} className="px-4 py-2 text-xs rounded-lg border border-success text-success font-semibold hover:bg-success/10 transition-colors flex items-center gap-1">
          <CheckCircle className="h-3.5 w-3.5" /> Check In
        </button>
      )}
    </div>
  );
}

export default CarManagement;
