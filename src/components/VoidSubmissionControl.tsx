import { useState } from "react";
import { Ban } from "lucide-react";
import type { Submission } from "@/contexts/SubmissionsContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const VoidSubmissionControl = ({
  submission,
  onVoided,
  variant = "full",
}: {
  submission: Submission;
  onVoided: () => void;
  variant?: "full" | "icon";
}) => {
  const { voidSubmission } = useSubmissions();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  if (["completed", "rejected", "voided"].includes(submission.status)) return null;

  const handleVoid = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (reason.trim().length < 5) {
      toast.error("Enter a clear reason of at least 5 characters.");
      return;
    }
    setSaving(true);
    const success = await voidSubmission(submission.id, reason);
    setSaving(false);
    if (!success) return;
    toast.success("Submission voided and removed from all active approval queues.");
    setOpen(false);
    onVoided();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          aria-label="Void submission"
          title="Void submission"
          className={variant === "icon"
            ? "inline-flex h-9 min-w-12 shrink-0 items-center justify-center rounded-md bg-transparent px-2 text-xs font-bold text-slate-500 transition-colors hover:text-destructive hover:underline active:scale-[0.98] dark:text-slate-400"
            : "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-400/40 bg-slate-500/10 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-500/15 dark:text-slate-300"
          }
        >
          {variant === "icon" ? "Void" : (
            <>
              <Ban className="h-4 w-4" />
              Void Submission
            </>
          )}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Void this submission?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the request from every active approval queue and disables further workflow actions. Its audit history will be retained.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea value={reason} onChange={event => setReason(event.target.value)} rows={3} placeholder="Required: explain why this submission is being voided..." />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleVoid} disabled={saving} className="bg-slate-700 text-white hover:bg-slate-800">
            {saving ? "Voiding..." : "Confirm Void"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default VoidSubmissionControl;
