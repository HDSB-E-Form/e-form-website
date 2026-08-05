import { AlertTriangle, Clock } from "lucide-react";
import type { Submission } from "@/contexts/SubmissionsContext";

export const getGatePassTimeOut = (submission: Submission) => {
  const value = submission.data.securityLog?.actualTimeOut;
  if (!value) return null;

  // New records use ISO timestamps and are unambiguous.
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  // Legacy records may contain DD/MM/YYYY strings that browsers parse as MM/DD/YYYY.
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (match) {
    const [, first, second, year, hour = "0", minute = "0", secondValue = "0"] = match;
    const parts = [Number(first), Number(second), Number(year), Number(hour), Number(minute), Number(secondValue)] as const;
    const makeTime = (month: number, day: number) => {
      const date = new Date(parts[2], month - 1, day, parts[3], parts[4], parts[5]);
      return date.getFullYear() === parts[2] && date.getMonth() === month - 1 && date.getDate() === day ? date.getTime() : NaN;
    };
    const candidates = [makeTime(parts[1], parts[0]), makeTime(parts[0], parts[1])].filter(Number.isFinite);
    const submittedAt = new Date(submission.submittedAt).getTime();
    if (candidates.length > 0) return candidates.reduce((closest, candidate) => Math.abs(candidate - submittedAt) < Math.abs(closest - submittedAt) ? candidate : closest);
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

export const getPersonalGatePassElapsed = (submission: Submission, now = Date.now()) => {
  if (submission.formType !== "leave" || submission.data.purposeType !== "personal" || submission.status !== "on_leave") return null;
  const startedAt = getGatePassTimeOut(submission);
  if (startedAt === null) return null;
  const minutes = Math.max(0, Math.floor((now - startedAt) / 60000));
  return { minutes, overdue: minutes >= 120 };
};

export const formatElapsedTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
};

export const PersonalGatePassBadge = ({ submission, now }: { submission: Submission; now: number }) => {
  const elapsed = getPersonalGatePassElapsed(submission, now);
  if (!elapsed) return null;
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${elapsed.overdue ? "bg-red-500 text-white" : "bg-amber-500/15 text-amber-700 dark:text-amber-400"}`}>{elapsed.overdue ? <AlertTriangle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{elapsed.overdue ? "Over 2 hours" : "Currently out"} · {formatElapsedTime(elapsed.minutes)}</span>;
};
