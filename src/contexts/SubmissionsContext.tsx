import React, { createContext, useContext, useState, useCallback } from "react";

export type SubmissionStatus = "pending" | "approved_hos" | "approved_hod" | "approved" | "rejected";
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
}

interface SubmissionsContextType {
  submissions: Submission[];
  cars: CarInfo[];
  addSubmission: (sub: Omit<Submission, "id" | "submittedAt">) => void;
  updateSubmissionStatus: (id: string, status: SubmissionStatus) => void;
  checkInCar: (carId: string) => void;
  checkOutCar: (carId: string, userId: string, mileage?: string, fuelLevel?: string) => void;
}

const SubmissionsContext = createContext<SubmissionsContextType | null>(null);

const INITIAL_CARS: CarInfo[] = [
  { id: "c1", plateNumber: "WKL 1234", model: "Toyota Camry", status: "available" },
  { id: "c2", plateNumber: "BJK 5678", model: "Honda Civic", status: "available" },
  { id: "c3", plateNumber: "PKD 9012", model: "Proton X70", status: "checked_out", lastCheckedOutBy: "Ahmad", lastCheckedOutAt: "2026-03-10" },
  { id: "c4", plateNumber: "WPJ 3456", model: "Perodua Ativa", status: "available" },
  { id: "c5", plateNumber: "KLM 7890", model: "Toyota Hilux", status: "maintenance" },
];

const INITIAL_SUBMISSIONS: Submission[] = [
  {
    id: "sub1", formType: "car_rental", status: "pending", submittedAt: "2026-03-10T09:00:00",
    submittedBy: "1", employeeName: "Ahmad Razak", department: "Engineering",
    data: { purpose: "Client meeting", destination: "Kuala Lumpur", startDate: "2026-03-15", endDate: "2026-03-16", carPreference: "Toyota Camry" },
  },
  {
    id: "sub2", formType: "leave", status: "approved", submittedAt: "2026-03-08T14:30:00",
    submittedBy: "1", employeeName: "Ahmad Razak", department: "Engineering",
    data: { leaveType: "Annual Leave", startDate: "2026-03-20", endDate: "2026-03-22", reason: "Family vacation", days: 3 },
  },
  {
    id: "sub3", formType: "claim", status: "pending", submittedAt: "2026-03-11T10:00:00",
    submittedBy: "1", employeeName: "Ahmad Razak", department: "Engineering",
    data: { claimType: "Travel", amount: 450.00, description: "Fuel and toll charges", receiptDate: "2026-03-09" },
  },
  {
    id: "sub4", formType: "leave", status: "rejected", submittedAt: "2026-03-05T08:00:00",
    submittedBy: "5", employeeName: "Lim Wei Jie", department: "Engineering",
    data: { leaveType: "Sick Leave", startDate: "2026-03-06", endDate: "2026-03-06", reason: "Unwell", days: 1 },
  },
];

export function SubmissionsProvider({ children }: { children: React.ReactNode }) {
  const [submissions, setSubmissions] = useState<Submission[]>(INITIAL_SUBMISSIONS);
  const [cars, setCars] = useState<CarInfo[]>(INITIAL_CARS);

  const addSubmission = useCallback((sub: Omit<Submission, "id" | "submittedAt">) => {
    const newSub: Submission = {
      ...sub,
      id: `sub-${Date.now()}`,
      submittedAt: new Date().toISOString(),
    };
    setSubmissions(prev => [newSub, ...prev]);
  }, []);

  const updateSubmissionStatus = useCallback((id: string, status: SubmissionStatus) => {
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  }, []);

  const checkInCar = useCallback((carId: string) => {
    setCars(prev => prev.map(c => c.id === carId ? { ...c, status: "available" as const, lastCheckedOutBy: undefined, lastCheckedOutAt: undefined } : c));
  }, []);

  const checkOutCar = useCallback((carId: string, userId: string, mileage?: string, fuelLevel?: string) => {
    setCars(prev => prev.map(c => c.id === carId ? { ...c, status: "checked_out" as const, lastCheckedOutBy: userId, lastCheckedOutAt: new Date().toISOString(), mileageOut: mileage, fuelLevelOut: fuelLevel } : c));
  }, []);

  return (
    <SubmissionsContext.Provider value={{ submissions, cars, addSubmission, updateSubmissionStatus, checkInCar, checkOutCar }}>
      {children}
    </SubmissionsContext.Provider>
  );
}

export function useSubmissions() {
  const ctx = useContext(SubmissionsContext);
  if (!ctx) throw new Error("useSubmissions must be used within SubmissionsProvider");
  return ctx;
}
