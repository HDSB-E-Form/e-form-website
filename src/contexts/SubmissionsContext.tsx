import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/supabase";
import { toast } from "sonner";
import { formatSubmissionRefNo, getNextSequenceNumber } from "@/lib/refNo";

export type SubmissionStatus =
  | "pending"
  | "approved_hos"
  | "approved_hod"
  | "approved_manco"
  | "approved_hop"
  | "approved_hof"
  | "on_leave"
  | "approved"
  | "rejected"
  | "paid"
  | "completed"
  | "awaiting_confirmation"
  | "reopened"
  | "voided"
  | "pending_finance_review";
export type FormType = "car_rental" | "leave" | "claim" | "ppe_request" | "inventory_addition" | "waste_inventory" | "mixing_chemical_stages" | "final_discharge" | string;

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
  petrolCardOut?: boolean;
  petrolCardSerialOut?: string | null;
  activeSubmissionId?: string | null;
  activeSubmissionRefNo?: string | null;
  history?: any[];
  type?: string;
  imageUrl?: string;
}

export interface Announcement {
  id: string;
  content: string;
  created_at: string;
  is_active: boolean;
}

type CarHistoryEntry = {
  employeeName?: string | null;
  checkedOutAt?: string | null;
  checkedInAt: string;
  mileageOut?: string | null;
  mileageIn: string;
  fuelLevelOut?: string | null;
  fuelLevelIn: string;
  remarksOut?: string | null;
  remarksIn: string;
  photosOut?: Record<string, string | null>;
  photosIn: Record<string, string | null>;
  petrolCardOut?: boolean;
  petrolCardSerialOut?: string | null;
  submissionId?: string | null;
  submissionRefNo?: string | null;
};

interface SubmissionsContextType {
  submissions: Submission[];
  refNoMap: Map<string, string>;
  cars: CarInfo[];
  isLoading: boolean;
  refreshSubmissions: () => Promise<void>;
  addSubmission: (sub: Omit<Submission, "id" | "submittedAt">) => Promise<boolean>;
  updateSubmissionStatus: (id: string, status: SubmissionStatus, dataToMerge?: Record<string, any>) => Promise<boolean>;
  updateSubmission: (id: string, dataToMerge?: Record<string, any>, status?: SubmissionStatus) => Promise<boolean>;
  voidSubmission: (id: string, reason: string) => Promise<boolean>;
  permanentlyDeleteSubmission: (id: string, reason: string) => Promise<boolean>;
  checkInCar: (carId: string, mileageIn: string, fuelLevelIn: string, remarks: string, photosIn: Record<string, string | null>, dateTimeIn: string) => Promise<boolean>;
  checkOutCar: (carId: string, submissionId: string, submissionRefNo: string, employeeName: string, mileage?: string, fuelLevel?: string, remarksOut?: string, photosOut?: Record<string, string | null>, dateTimeOut?: string, petrolCardOut?: boolean, petrolCardSerialOut?: string) => Promise<boolean>;
  addCar: (car: CarInfo) => Promise<boolean>;
  deleteCar: (carId: string) => void;
  updateCar: (carId: string, updates: Partial<CarInfo>) => Promise<boolean>;
  announcements: Announcement[];
  addAnnouncement: (content: string, isActive: boolean) => Promise<boolean>;
  updateAnnouncement: (id: string, updates: Partial<Omit<Announcement, 'id' | 'created_at'>>) => Promise<boolean>;
  deleteAnnouncement: (id: string) => Promise<boolean>;
}

const SubmissionsContext = createContext<SubmissionsContextType | null>(null);

export function SubmissionsProvider({ children }: { children: React.ReactNode }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [cars, setCars] = useState<CarInfo[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const sendWorkflowNotification = useCallback(async (submissionId: string) => {
    try {
      const { error } = await supabase.functions.invoke("send-notification", {
        body: { submissionId },
      });
      if (error) console.warn("Submission saved, but its email notification could not be sent:", error.message);
    } catch (error) {
      console.warn("Submission saved, but its email notification could not be sent:", error);
    }
  }, []);

  const refreshSubmissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const [submissionsRes, carsRes, announcementsRes] = await Promise.all([
        supabase.from("submissions").select("*").order("submittedAt", { ascending: false }),
        supabase.from("cars").select("*").order("model"),
        supabase.from("announcements").select("*").order("created_at", { ascending: false }),
      ]);

      if (submissionsRes.error) throw submissionsRes.error;
      if (carsRes.error) throw carsRes.error;

      setSubmissions(submissionsRes.data as Submission[]);
      setCars(carsRes.data as CarInfo[]);
      
      if (announcementsRes.error) {
        console.warn("Could not fetch announcements:", announcementsRes.error.message);
      } else {
        setAnnouncements(announcementsRes.data as Announcement[]);
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSubmissions();
  }, [refreshSubmissions]);

  useEffect(() => {
    const channel = supabase
      .channel("realtime-submissions-context")
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions" }, payload => {
        if (payload.eventType === "INSERT") {
          const submission = payload.new as Submission;
          setSubmissions(prev => [submission, ...prev.filter(item => item.id !== submission.id)]);
        } else if (payload.eventType === "UPDATE") {
          const submission = payload.new as Submission;
          setSubmissions(prev => prev.map(item => item.id === submission.id ? submission : item));
        } else if (payload.eventType === "DELETE") {
          const deleted = payload.old as Pick<Submission, "id">;
          setSubmissions(prev => prev.filter(item => item.id !== deleted.id));
        }
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("realtime-announcements")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, payload => {
        if (payload.eventType === "INSERT") {
          const announcement = payload.new as Announcement;
          setAnnouncements(prev => [announcement, ...prev.filter(item => item.id !== announcement.id)]);
        } else if (payload.eventType === "UPDATE") {
          const announcement = payload.new as Announcement;
          setAnnouncements(prev => prev.map(item => item.id === announcement.id ? announcement : item));
        } else if (payload.eventType === "DELETE") {
          const deleted = payload.old as Pick<Announcement, "id">;
          setAnnouncements(prev => prev.filter(item => item.id !== deleted.id));
        }
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, []);

  const refNoMap = useMemo(() => {
    const map = new Map<string, string>();
    submissions.forEach(s => {
      if (s.data?.refNo) {
        map.set(s.id, s.data.refNo);
      }
    });
    return map;
  }, [submissions]);

  const addSubmission = useCallback(async (sub: Omit<Submission, "id" | "submittedAt">) => {
    const limitedFormLabels: Record<string, string> = {
      car_rental: "Vehicle Booking",
      leave: "Gate Pass",
    };
    const limitedFormLabel = limitedFormLabels[sub.formType];
    if (limitedFormLabel) {
      const malaysiaDateKey = (value: string | Date) => {
        const parts = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Kuala_Lumpur",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).formatToParts(new Date(value));
        const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value || "";
        return `${part("year")}-${part("month")}-${part("day")}`;
      };
      const todayInMalaysia = malaysiaDateKey(new Date());
      const submissionsToday = submissions.filter(existing =>
        existing.submittedBy === sub.submittedBy &&
        existing.formType === sub.formType &&
        malaysiaDateKey(existing.submittedAt) === todayInMalaysia
      ).length;

      if (submissionsToday >= 2) {
        toast.error(`Daily submission limit reached. You can submit a maximum of 2 ${limitedFormLabel} requests per day.`);
        return false;
      }
    }

    const isSafetyFormType = ["waste_inventory", "mixing_chemical_stages", "final_discharge", "daily_operation_monitoring"].includes(sub.formType);
    const isSafetyDashboardRemark = sub.data?.dashboardRemark === true || (
      sub.formType !== "waste_inventory" &&
      Boolean(sub.data?.remarks) &&
      !sub.data?.processInfo &&
      !sub.data?.finalDischarge
    );
    const isSafetyForm = isSafetyFormType && !isSafetyDashboardRemark;
    const isGatePass = sub.formType === 'leave';
    const isMaterialRequisition = sub.formType === 'material_requisition_slip';
    const usesSharedHdsbReference = [
      "claim",
      "car_rental",
      "cctv_access_request",
      "it_help_desk",
      "it_admin_request",
      "it_application_request",
    ].includes(sub.formType);
    const isStandardForm = !["inventory_addition", "ppe_request", "leave", "waste_inventory", "mixing_chemical_stages", "final_discharge", "daily_operation_monitoring", "material_requisition_slip"].includes(sub.formType);

    const submissionId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    let refNo = null;
    if (isSafetyForm) {
      const { data: safetyRefNo, error } = await supabase.rpc('next_safety_ref_no');
      if (error || typeof safetyRefNo !== "string") {
        console.error("Could not allocate Safety reference number:", error);
        toast.error("Could not generate a Safety reference number. Please try again.");
        return false;
      }
      refNo = safetyRefNo;
    } else if (isGatePass) {
      const { data: gatePassRefNo, error } = await supabase.rpc('next_gate_pass_ref_no');
      if (error || typeof gatePassRefNo !== "string") {
        console.error("Could not allocate Gate Pass reference number:", error);
        toast.error("Could not generate a Gate Pass reference number. Please try again.");
        return false;
      }
      refNo = gatePassRefNo;
    } else if (isMaterialRequisition) {
      const { data: mrsRefNo, error: mrsRpcError } = await supabase.rpc('next_mrs_ref_no');
      if (!mrsRpcError && typeof mrsRefNo === "string") {
        refNo = mrsRefNo;
      } else {
        // Falls back to a client-computed serial number if the atomic
        // next_mrs_ref_no() DB function hasn't been deployed yet.
        const { data: existingMrs, error } = await supabase.from('submissions').select('data').eq('formType', 'material_requisition_slip');
        if (error) console.error("Could not fetch existing MRS submissions for serial number:", error);
        const highest = ((existingMrs || []) as Array<{ data?: { refNo?: string } }>).reduce((max, s) => {
          const match = /^MRS(\d+)$/.exec(s?.data?.refNo || "");
          return match ? Math.max(max, parseInt(match[1], 10)) : max;
        }, 1999);
        refNo = `MRS${highest + 1}`;
      }
    } else if (usesSharedHdsbReference) {
      const { data: hdsbRefNo, error } = await supabase.rpc('next_hdsb_ref_no');
      if (error || typeof hdsbRefNo !== "string") {
        console.error("Could not allocate HDSB reference number:", error);
        toast.error("Could not generate a submission reference number. Please try again.");
        return false;
      }
      refNo = hdsbRefNo;
    } else if (isStandardForm) {
      const excludedForms = '("inventory_addition", "ppe_request", "leave", "waste_inventory", "mixing_chemical_stages", "final_discharge", "daily_operation_monitoring")';
      const { data: existingSubmissions, error } = await supabase.from('submissions').select('data').not('formType', 'in', excludedForms);
      if (error) { console.error("Could not fetch standard submissions for ref no:", error); }
      const nextSequence = getNextSequenceNumber((existingSubmissions || []) as Array<{ data?: { refNo?: string } }>, sub.formType);
      refNo = formatSubmissionRefNo(sub.formType, nextSequence);
    }

    const submissionToInsert = {
      id: submissionId,
      formType: sub.formType,
      status: sub.status ?? "pending",
      submittedBy: sub.submittedBy,
      employeeName: sub.employeeName,
      department: sub.department,
      data: { ...sub.data, refNo }, // Correctly merge refNo into the existing data object
      submittedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('submissions').insert([submissionToInsert]).select();
    if (error) {
      console.error("Error adding submission:", error);
      console.error("Submission insert payload:", submissionToInsert);
      console.error("Supabase error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      if (error.message?.includes("DAILY_SUBMISSION_LIMIT")) {
        const formLabel = sub.formType === "leave" ? "Gate Pass" : "Vehicle Booking";
        toast.error(`Daily submission limit reached. You can submit a maximum of 2 ${formLabel} requests per day.`);
      } else {
        toast.error("Database error: " + error.message);
      }
      return false;
    } else if (data) {
      setSubmissions(prev => [data[0] as Submission, ...prev]);
      void sendWorkflowNotification(data[0].id);
      return true;
    }
    return false;
  }, [submissions, sendWorkflowNotification]);

  const updateSubmission = useCallback(async (id: string, dataToMerge?: Record<string, any>, status?: SubmissionStatus): Promise<boolean> => {
    const currentSub = submissions.find(s => s.id === id);
    if (!currentSub) {
      toast.error("Submission not found.");
      return false;
    }

    let updatedData = currentSub.data;
    if (dataToMerge) {
      updatedData = {
        ...(currentSub.data || {}),
        ...dataToMerge,
      };
      if (dataToMerge.attachments) updatedData.attachments = dataToMerge.attachments;
    }
    updatedData = { ...(updatedData || {}), lastUpdatedAt: new Date().toISOString() };

    const updatePayload: any = {};
    if (status) updatePayload.status = status;
    if (updatedData) updatePayload.data = updatedData;

    const { error } = await supabase.from('submissions').update(updatePayload).eq('id', id);
    if (error) {
      console.error("Error updating submission:", error);
      toast.error("Database error: " + error.message);
      return false;
    }

    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: status ?? s.status, data: updatedData } : s));
    if (status && status !== currentSub.status) void sendWorkflowNotification(id);
    return true;
  }, [submissions, sendWorkflowNotification]);

  const updateSubmissionStatus = useCallback(async (id: string, status: SubmissionStatus, dataToMerge?: Record<string, any>): Promise<boolean> => {
    return await updateSubmission(id, dataToMerge, status);
  }, [updateSubmission]);

  const voidSubmission = useCallback(async (id: string, reason: string): Promise<boolean> => {
    const { error } = await supabase.rpc("void_submission", { p_submission_id: id, p_reason: reason.trim() });
    if (error) {
      toast.error(error.message);
      return false;
    }
    await refreshSubmissions();
    return true;
  }, [refreshSubmissions]);

  const permanentlyDeleteSubmission = useCallback(async (id: string, reason: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc("permanently_delete_submission", { p_submission_id: id, p_reason: reason.trim() });
    if (error) {
      toast.error(error.message);
      return false;
    }

    const values = [data?.attachment, ...(Array.isArray(data?.attachments) ? data.attachments : [])]
      .filter((value): value is string => typeof value === "string");
    const marker = "/form-attachments/";
    const paths = values.flatMap(value => {
      const markerIndex = value.indexOf(marker);
      if (markerIndex < 0) return [];
      return [decodeURIComponent(value.slice(markerIndex + marker.length).split("?")[0])];
    });
    if (paths.length > 0) {
      const { error: storageError } = await supabase.storage.from("form-attachments").remove([...new Set(paths)]);
      if (storageError) console.warn("Submission deleted, but some attachments could not be removed:", storageError.message);
    }

    setSubmissions(previous => previous.filter(submission => submission.id !== id));
    return true;
  }, []);

const checkInCar = useCallback(async (carId: string, mileageIn: string, fuelLevelIn: string, remarks: string, photosIn: Record<string, string | null>, dateTimeIn: string) => {
    const carToCheckIn = cars.find(c => c.id === carId);
    if (!carToCheckIn) {
      toast.error("Cannot check-in: Car not found.");
      return false;
    }
    if (carToCheckIn.status !== "checked_out") {
      toast.error("This vehicle is no longer checked out. Refresh and try again.");
      return false;
    }

    const newHistoryEntry: CarHistoryEntry = {
      employeeName: carToCheckIn.lastCheckedOutBy,
      checkedOutAt: carToCheckIn.lastCheckedOutAt,
      checkedInAt: dateTimeIn,
      mileageOut: carToCheckIn.mileageOut,
      mileageIn: mileageIn,
      fuelLevelOut: carToCheckIn.fuelLevelOut,
      fuelLevelIn: fuelLevelIn,
        remarksOut: carToCheckIn.remarksOut,
        remarksIn: remarks,
      photosOut: carToCheckIn.photosOut,
      photosIn: photosIn,
      petrolCardOut: carToCheckIn.petrolCardOut,
      petrolCardSerialOut: carToCheckIn.petrolCardSerialOut,
      submissionId: carToCheckIn.activeSubmissionId,
      submissionRefNo: carToCheckIn.activeSubmissionRefNo,
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
      petrolCardOut: null,
      petrolCardSerialOut: null,
      activeSubmissionId: null,
      activeSubmissionRefNo: null,
      currentFuelLevel: fuelLevelIn,
      history: updatedHistory,
    };

    let { data, error } = await supabase.from('cars').update(updates).eq('id', carId).eq('status', 'checked_out').select().maybeSingle();

    // Backward-compatible fallback for projects where the latest migration has
    // not been applied yet. The return fuel level remains preserved in history.
    if (error?.message?.includes("currentFuelLevel")) {
      const { currentFuelLevel: _currentFuelLevel, ...legacyUpdates } = updates;
      const retry = await supabase.from('cars').update(legacyUpdates).eq('id', carId).eq('status', 'checked_out').select().maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("Error checking in car:", error);
      toast.error("Database error while checking in: " + error.message);
      return false;
    } else if (!data) {
      toast.error("Check-in was not completed because the vehicle state changed. Refresh and try again.");
      return false;
    } else {
      setCars(prev => prev.map(c => c.id === carId ? { ...c, ...(data as CarInfo), currentFuelLevel: fuelLevelIn } : c));
      if (carToCheckIn.activeSubmissionId) {
        await updateSubmissionStatus(carToCheckIn.activeSubmissionId, "completed", {
          carCheckoutStatus: "returned",
          assignedCarId: carId,
          assignedCarModel: carToCheckIn.model,
          assignedCarPlateNumber: carToCheckIn.plateNumber,
          checkedInAt: dateTimeIn,
        });
      }
      return true;
    }
  }, [cars, updateSubmissionStatus]); // Keep the exact booking lifecycle synchronized with the vehicle.

  const checkOutCar = useCallback(async (carId: string, submissionId: string, submissionRefNo: string, employeeName: string, mileage?: string, fuelLevel?: string, remarksOut?: string, photosOut?: Record<string, string | null>, dateTimeOut?: string, petrolCardOut = false, petrolCardSerialOut?: string) => {
    const checkedOutAt = dateTimeOut || new Date().toISOString();
    const updates = { status: "checked_out" as const, activeSubmissionId: submissionId, activeSubmissionRefNo: submissionRefNo, lastCheckedOutBy: employeeName, lastCheckedOutAt: checkedOutAt, mileageOut: mileage, fuelLevelOut: fuelLevel, remarksOut: remarksOut, photosOut: photosOut, petrolCardOut, petrolCardSerialOut: petrolCardOut ? petrolCardSerialOut : null };
    const { data, error } = await supabase.from('cars').update(updates).eq('id', carId).eq('status', 'available').select().maybeSingle();
    if (error) {
      console.error("Error checking out car:", error);
      toast.error("Database error while checking out: " + error.message);
      return false;
    } else if (!data) {
      toast.error("Checkout was not completed because this vehicle is no longer available. Refresh and try again.");
      return false;
    } else {
      setCars(prev => prev.map(c => c.id === carId ? { ...c, ...(data as CarInfo) } : c));
      await updateSubmissionStatus(submissionId, "approved", {
        carCheckoutStatus: "checked_out",
        assignedCarId: carId,
        assignedCarModel: (data as CarInfo).model,
        assignedCarPlateNumber: (data as CarInfo).plateNumber,
        checkedOutAt,
      });
      return true;
    }
  }, [updateSubmissionStatus]);

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

  const addAnnouncement = useCallback(async (content: string, isActive: boolean) => {
    const { data, error } = await supabase.from('announcements').insert([{ content: content.trim(), is_active: isActive }]).select().single();
    if (error) {
      console.error("Error adding announcement:", error);
      toast.error("Database error: " + error.message);
      return false;
    }
    if (data) {
      const announcement = data as Announcement;
      setAnnouncements(prev => [announcement, ...prev.filter(item => item.id !== announcement.id).map(item => isActive ? { ...item, is_active: false } : item)]);
      return true;
    }
    return false;
  }, []);

  const updateAnnouncement = useCallback(async (id: string, updates: Partial<Omit<Announcement, 'id' | 'created_at'>>) => {
    const cleanedUpdates = { ...updates, ...(typeof updates.content === "string" ? { content: updates.content.trim() } : {}) };
    const { data, error } = await supabase.from('announcements').update(cleanedUpdates).eq('id', id as any).select().single();
    if (error) {
      console.error("Error updating announcement:", error);
      toast.error("Database error: " + error.message);
      return false;
    }
    if (!data) return false;
    const updated = data as Announcement;
    setAnnouncements(prev => prev.map(ann => ann.id === id ? updated : (updated.is_active ? { ...ann, is_active: false } : ann)));
    return true;
  }, []);

  const deleteAnnouncement = useCallback(async (id: string) => {
    const { data, error } = await supabase.from('announcements').delete().eq('id', id as any).select('id').single();
    if (error) {
      console.error("Error deleting announcement:", error);
      toast.error("Database error: " + error.message);
      return false;
    }
    if (!data) return false;
    setAnnouncements(prev => prev.filter(ann => ann.id !== id));
    return true;
  }, []);

  return (
    <SubmissionsContext.Provider value={{ 
      submissions, refNoMap, cars, isLoading, refreshSubmissions, addSubmission, updateSubmissionStatus, updateSubmission,
      voidSubmission, permanentlyDeleteSubmission,
      checkInCar, checkOutCar, addCar, deleteCar, updateCar,
      announcements, addAnnouncement, updateAnnouncement, deleteAnnouncement
    }}>
      {children}
    </SubmissionsContext.Provider>
  );
}

export function useSubmissions() {
  const ctx = useContext(SubmissionsContext);
  if (!ctx) throw new Error("useSubmissions must be used within SubmissionsProvider");
  return ctx;
}
