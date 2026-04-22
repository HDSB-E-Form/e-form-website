import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/supabase";
import { toast } from "sonner";

export type SubmissionStatus = "pending" | "approved_hos" | "approved_hod" | "on_leave" | "approved" | "rejected";
export type FormType = "car_rental" | "leave" | "claim";

export interface Submission {
  id: string;
  formType: FormType;
  status: SubmissionStatus;
  submittedAt: string;
  submittedBy: string;
  employeeName: string;
  department: string;
  data: Record<string, any>;
}

export interface CarInfo {
  id: string;
  plateNumber: string;
  model: string;
  status: "available" | "checked_out" | "maintenance";
  lastCheckedOutBy?: string;
  lastCheckedOutAt?: string;
  mileageOut?: string;
  fuelLevelOut?: string;
  currentFuelLevel?: string;
  remarksOut?: string;
  photosOut?: Record<string, string | null>;
  history?: any[];
  type?: string;
  imageUrl?: string;
}

interface SubmissionsContextType {
  submissions: Submission[];
  cars: CarInfo[];
  addSubmission: (sub: Omit<Submission, "id" | "submittedAt">) => Promise<boolean>;
  updateSubmissionStatus: (id: string, status: SubmissionStatus, dataToMerge?: Record<string, any>) => void;
  checkInCar: (carId: string, mileageIn: string, fuelLevelIn: string, remarks: string, photosIn: Record<string, string | null>) => Promise<boolean>;
  checkOutCar: (carId: string, employeeName: string, mileage?: string, fuelLevel?: string, remarksOut?: string, photosOut?: Record<string, string | null>) => Promise<boolean>;
  addCar: (car: CarInfo) => Promise<boolean>;
  deleteCar: (carId: string) => void;
  updateCar: (carId: string, updates: Partial<CarInfo>) => Promise<boolean>;
}

const SubmissionsContext = createContext<SubmissionsContextType | null>(null);

export function SubmissionsProvider({ children }: { children: React.ReactNode }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [cars, setCars] = useState<CarInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [submissionsRes, carsRes] = await Promise.all([
          supabase.from("submissions").select("*").order("submittedAt", { ascending: false }),
          supabase.from("cars").select("*").order("model"),
        ]);

        if (submissionsRes.error) throw submissionsRes.error;
        if (carsRes.error) throw carsRes.error;

        setSubmissions(submissionsRes.data as Submission[]);
        setCars(carsRes.data as CarInfo[]);
      } catch (error) {
        console.error("Error fetching submissions or cars:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const addSubmission = useCallback(async (sub: Omit<Submission, "id" | "submittedAt">) => {
    const newSub = {
      ...sub,
      id: `sub_${Math.random().toString(36).slice(2)}`,
      submittedAt: new Date().toISOString()
    }
    const { data, error } = await supabase.from('submissions').insert([newSub]).select();
    if (error) {
      console.error("Error adding submission:", error);
      toast.error("Database error: " + error.message);
      return false;
    } else if (data) {
      setSubmissions(prev => [data[0] as Submission, ...prev]);
      return true;
    }
    return false;
  }, []);

  const updateSubmissionStatus = useCallback(async (id: string, status: SubmissionStatus, dataToMerge?: Record<string, any>) => {
    const currentSub = submissions.find(s => s.id === id);
    const updatedData = dataToMerge ? { ...(currentSub?.data || {}), ...dataToMerge } : currentSub?.data;
    
    const updatePayload: any = { status };
    if (updatedData) {
      updatePayload.data = updatedData;
    }

    const { error } = await supabase.from('submissions').update(updatePayload).eq('id', id);
    if (error) {
      console.error("Error updating status:", error);
      toast.error("Database error: " + error.message);
    } else {
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status, data: updatedData || s.data } : s));
    }
  }, [submissions]);

  const checkInCar = useCallback(async (carId: string, mileageIn: string, fuelLevelIn: string, remarks: string, photosIn: Record<string, string | null>) => {
    const carToCheckIn = cars.find(c => c.id === carId);
    if (!carToCheckIn) {
      toast.error("Cannot check-in: Car not found.");
      return false;
    }

    const newHistoryEntry = {
      employeeName: carToCheckIn.lastCheckedOutBy,
      checkedOutAt: carToCheckIn.lastCheckedOutAt,
      checkedInAt: new Date().toISOString(),
      mileageOut: carToCheckIn.mileageOut,
      mileageIn: mileageIn,
      fuelLevelOut: carToCheckIn.fuelLevelOut,
      fuelLevelIn: fuelLevelIn,
        remarksOut: carToCheckIn.remarksOut,
        remarksIn: remarks,
      photosOut: carToCheckIn.photosOut,
      photosIn: photosIn,
      remarks: remarks,
    };

    const updatedHistory = [newHistoryEntry, ...(carToCheckIn.history || [])];

    const updates = { 
      status: "available" as const, 
      lastCheckedOutBy: null, 
      lastCheckedOutAt: null, 
      mileageOut: null, 
      fuelLevelOut: null,
        remarksOut: null,
      photosOut: null,
      history: updatedHistory 
    };

    const { error } = await supabase.from('cars').update(updates).eq('id', carId);

    if (error) {
      console.error("Error checking in car:", error);
      toast.error("Database error while checking in: " + error.message);
      return false;
    } else {
      setCars(prev => prev.map(c => c.id === carId ? { ...c, ...updates, currentFuelLevel: fuelLevelIn } : c));
      return true;
    }
  }, [cars]); // Added `cars` here so the function always has the latest list!

  const checkOutCar = useCallback(async (carId: string, employeeName: string, mileage?: string, fuelLevel?: string, remarksOut?: string, photosOut?: Record<string, string | null>) => {
    const updates = { status: "checked_out" as const, lastCheckedOutBy: employeeName, lastCheckedOutAt: new Date().toISOString(), mileageOut: mileage, fuelLevelOut: fuelLevel, remarksOut: remarksOut, photosOut: photosOut };
    const { error } = await supabase.from('cars').update(updates).eq('id', carId);
    if (error) {
      console.error("Error checking out car:", error);
      toast.error("Database error while checking out: " + error.message);
      return false;
    } else {
      setCars(prev => prev.map(c => c.id === carId ? { ...c, ...updates } : c));
      return true;
    }
  }, []);

  const addCar = useCallback(async (newCar: CarInfo) => {
    const { error } = await supabase.from('cars').insert([newCar]);
    if (error) {
      console.error("Error adding car:", error);
      toast.error("Database error while adding car: " + error.message);
      return false;
    }
    setCars(prev => [...prev, newCar]);
    return true;
  }, []);

  const deleteCar = useCallback(async (carId: string) => {
    const { error } = await supabase.from('cars').delete().eq('id', carId);
    if (error) {
      console.error("Error deleting car:", error);
      toast.error("Failed to delete car from database.");
    } else {
      setCars(prev => prev.filter(c => c.id !== carId));
      toast.success("Car deleted successfully.");
    }
  }, []);

  const updateCar = useCallback(async (carId: string, updates: Partial<CarInfo>) => {
    const { error } = await supabase.from('cars').update(updates).eq('id', carId);
    if (error) {
      console.error("Error updating car:", error);
      toast.error("Database error while updating car: " + error.message);
      return false;
    } else {
      setCars(prev => prev.map(c => c.id === carId ? { ...c, ...updates } : c));
      return true;
    }
  }, []);

  return (
    <SubmissionsContext.Provider value={{ submissions, cars, addSubmission, updateSubmissionStatus, checkInCar, checkOutCar, addCar, deleteCar, updateCar }}>
      {children}
    </SubmissionsContext.Provider>
  );
}

export function useSubmissions() {
  const ctx = useContext(SubmissionsContext);
  if (!ctx) throw new Error("useSubmissions must be used within SubmissionsProvider");
  return ctx;
}
