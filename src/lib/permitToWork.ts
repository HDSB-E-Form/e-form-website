import type { Submission } from "@/contexts/SubmissionsContext";

/**
 * Single source of truth for the Permit to Work (PTW) form — the digital version of
 * HICOM Diecasting's paper "Permit To Work". Hazard lists, PPE codes, hot-work
 * counter-measures and the JSA pre-assessment questions are transcribed verbatim
 * from the controlled form so the digital record matches the hard copy.
 */

export const PTW_FORM_TYPE = "permit_to_work" as const;

// ---------------------------------------------------------------------------
// Section A — task description
// ---------------------------------------------------------------------------
export const TASK_TYPES = [
  "Building construction & maintenance",
  "Mechanical & electrical installation / maintenance",
  "Chemical handling",
  "Machines installation / maintenance",
  "Others",
] as const;

// ---------------------------------------------------------------------------
// Section C — control-measure codes
// ---------------------------------------------------------------------------
export const CONTROL_CODES: { code: string; label: string }[] = [
  { code: "EC", label: "Engineering Control" },
  { code: "AC", label: "Administrative Control" },
  { code: "PPE", label: "Personal Protective Equipment" },
  { code: "EE", label: "Emergency Equipment" },
];

// ---------------------------------------------------------------------------
// Section C — hazard identification matrix (9 categories)
// ---------------------------------------------------------------------------
export interface HazardCategory {
  key: string;
  label: string;
  hazards: string[];
}

export const HAZARD_CATEGORIES: HazardCategory[] = [
  {
    key: "physical",
    label: "Physical Hazard",
    hazards: [
      "Explosion",
      "Fire",
      "Radiation",
      "Excessive exposure to heat",
      "Friction / Puncture with sharp objects",
      "Hit by falling objects",
      "Struck or run over by forklift",
      "Crushed by portable machine / moving parts",
      "Electrical shock",
      "Fall from height",
      "Arc welding",
      "Hit by flying objects",
      "Stitching",
      "Shearing",
      "Caught in between machineries",
      "Entanglement of dangling wire / hose",
      "Vibration",
      "Slip & fall due to uneven / slippery surface",
      "Valve burst",
      "Glare",
      "Noise",
      "Poor lighting",
      "Confined space",
      "Grinding job",
      "Contact with abrasive surface",
    ],
  },
  {
    key: "chemical",
    label: "Chemical",
    hazards: [
      "Flammable / combustible chemical substances",
      "Oxidizing substances",
      "Usage of flammable chemical substance",
      "Toxic / corrosive / irritant chemical substance",
      "Hazardous chemical spillage",
      "Gas leaking",
      "Oil spillage",
    ],
  },
  {
    key: "ergonomic",
    label: "Ergonomic",
    hazards: [
      "Manual handling",
      "Pushing / Pulling heavy loads",
      "Awkward posture",
      "Bending",
      "Repetitive motion",
      "Static postures",
      "Twisting movements",
    ],
  },
  {
    key: "environment",
    label: "Environment",
    hazards: [
      "Production of scheduled wastes",
      "Air pollution",
      "Noise pollution",
      "Water pollution",
      "Soil pollution",
      "Energy usage (Electric, LPG, NG, Diesel etc)",
    ],
  },
  {
    key: "confinedSpace",
    label: "Confined Space",
    hazards: ["Toxic atmosphere", "Dusty", "Limited space", "Poor lighting"],
  },
  {
    key: "electrical",
    label: "Electrical Maintenance",
    hazards: ["≤ 415 volt", "> 415 volt"],
  },
  {
    key: "buildingMaintenance",
    label: "Building Maintenance",
    hazards: [
      "Depth > 3 meter",
      "Demolition",
      "Piping maintenance",
      "Working on the roof",
    ],
  },
  {
    key: "workingAtHeight",
    label: "Working at Height",
    hazards: ["Height between 1m – 3m", "Height > 3m"],
  },
  {
    key: "hotWork",
    label: "Hot Work",
    hazards: ["Hot work (Welding, Oxy-Cutting, Brazing etc.)"],
  },
];

// ---------------------------------------------------------------------------
// Section C(4) — PPE code list
// ---------------------------------------------------------------------------
export const PPE_ITEMS: { code: string; label: string }[] = [
  { code: "PPE1", label: "Safety Helmet" },
  { code: "PPE2", label: "Safety Shoes" },
  { code: "PPE3", label: "Brazing Eyewear (Shade 5)" },
  { code: "PPE4", label: "Face Shield - Complete Set" },
  { code: "PPE5", label: "Welding Face Shield (Shade 7)" },
  { code: "PPE6", label: "Full Leather Welding Gloves" },
  { code: "PPE7", label: "Safety Body Harness" },
  { code: "PPE8", label: "Respirator double cartridge / Chemical Mask N95" },
  { code: "PPE9", label: "Chemical Goggle" },
  { code: "PPE10", label: "Earplug / Earmuff" },
  { code: "PPE11", label: "Nitrile glove" },
  { code: "PPE12", label: "Impact Plain Eyewear" },
];

// ---------------------------------------------------------------------------
// Section D — hot-work counter measures
// ---------------------------------------------------------------------------
export const HOT_WORK_MEASURES: string[] = [
  "Flammable materials must be properly sealed and stored separately.",
  "Work materials used must be free from sources of gas, oil, or any flammable substances.",
  "Ensure there is no release of flammable substances from nearby activities around the work area.",
  "All manhole covers, drains, and catch basins must be properly closed and sealed.",
  "Ensure good ventilation at the work area.",
  "Welding machines and compressors must be placed in a safe condition.",
  "Fire extinguishers must be provided within a 3-meter radius from the work area throughout the operation.",
];

// ---------------------------------------------------------------------------
// Appendix A — JSA pre-assessment questions
// ---------------------------------------------------------------------------
export const JSA_ASSESSMENT_QUESTIONS: string[] = [
  "It is possible to work on a site that causes accidents and injuries to any person.",
  'Is there any "slips, trips and falls" affecting safe access and egress?',
  "Is there any other activities that could affect my job?",
  "Do you communicate with relevant parties in this area?",
  "Is there any risk of injury of workers from height and falling without protection? (eg stairwell, roof area, balcony)",
  "Is there a risk of workers or pedestrians being hit in plant and/or moving vehicle?",
  "Is there a risk of injury from puncture in the work area? (e.g. stacked pallets)",
  "Is there any risk to workers that come from overhead crane?",
  "Do you work at height? (over 10 ft)",
  "Do you work with hot work? (Example: Welding, cutting etc.)",
  "Do you work in a confined space? (Example: Tanks and others)",
];

export const GENDERS = ["Male", "Female"] as const;

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
export const PTW_STATUS_LABELS: Record<string, string> = {
  pending: "PENDING SAFETY APPROVAL",
  approved: "PERMIT ACTIVE",
  pending_closure: "PENDING CLOSURE",
  completed: "COMPLETED",
  rejected: "REJECTED",
  voided: "VOIDED",
};

type StageState =
  | "approved"
  | "rejected"
  | "pending"
  | "skipped"
  | "not_applicable"
  | "out"
  | "completed";

/**
 * Approval-overview stages for a Permit to Work, mirroring the shape used by
 * getApprovalStages() in ApprovalOverview.tsx.
 */
export const getPermitStages = (
  submission: Submission,
): { role: string; approver: string; state: StageState }[] => {
  const data = submission.data || {};
  const status =
    submission.status === "voided" && data.statusBeforeVoid
      ? data.statusBeforeVoid
      : submission.status;
  const isRejected = status === "rejected";

  const safetyApproved = ["approved", "pending_closure", "completed"].includes(status);
  const workComplete = ["pending_closure", "completed"].includes(status);
  const closed = status === "completed";

  return [
    {
      role: "Safety Approval",
      approver: data.safetyApproval?.name || "Safety Department",
      state: isRejected ? "rejected" : safetyApproved ? "approved" : "pending",
    },
    {
      role: "Contractor Completion",
      approver: data.originatorCompletion?.name || submission.employeeName || "Originator",
      state: isRejected ? "not_applicable" : workComplete ? "completed" : "pending",
    },
    {
      role: "Safety Closure",
      approver: data.closure?.name || "Safety Department",
      state: isRejected ? "not_applicable" : closed ? "completed" : "pending",
    },
  ];
};
