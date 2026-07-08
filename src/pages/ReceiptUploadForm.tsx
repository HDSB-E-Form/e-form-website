import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, FileText, Trash2, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/supabase";

const ReceiptUploadForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { submissions, updateSubmissionStatus } = useSubmissions();
  const [refNo, setRefNo] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const refNoMap = useMemo(() => {
    const map = new Map<string, string>();
    const excludedForms = ["inventory_addition", "ppe_request", "waste_inventory", "mixing_chemical_stages", "final_discharge", "daily_operation_monitoring"];
    const standardForms = submissions
      .filter(s => !excludedForms.includes(s.formType))
      .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
    standardForms.forEach((s, idx) => {
      map.set(`HDSB-${String(idx + 1).padStart(4, "0")}`, s.id);
    });
    return map;
  }, [submissions]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      setAttachedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refNo.trim()) {
      toast.error("Please enter the submission reference number.");
      return;
    }
    if (attachedFiles.length === 0) {
      toast.error("Please attach at least one receipt file.");
      return;
    }

    const submissionId = refNoMap.get(refNo.trim().toUpperCase());
    if (!submissionId) {
      toast.error("Invalid reference number. Please check and try again.");
      return;
    }

    const submission = submissions.find(s => s.id === submissionId);
    if (!submission || submission.formType !== 'claim') {
      toast.error("This reference number does not correspond to a Petty Cash Claim.");
      return;
    }

    setIsSubmitting(true);

    try {
      let attachmentUrls: string[] = [];
      for (const file of attachedFiles) {
        const filePath = `public/${user?.id || 'unknown_user'}/receipt_${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage.from('form-attachments').upload(filePath, file);

        if (error) throw new Error(`Attachment upload failed: ${error.message}`);

        const { data: urlData } = supabase.storage.from('form-attachments').getPublicUrl(data.path);
        attachmentUrls.push(urlData.publicUrl);
      }

      const existingAttachments = submission.data.receiptAttachments || [];
      const updatedData = {
        ...submission.data,
        receiptAttachments: [...existingAttachments, ...attachmentUrls],
      };

      // The updateSubmissionStatus function resolves on success or throws on error.
      await updateSubmissionStatus(submission.id, submission.status, updatedData);
      toast.success("Receipt uploaded and attached successfully!");
      navigate("/submissions");
    } catch (error: any) {
      toast.error(error.message || "An error occurred during upload.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <button onClick={() => navigate("/finance")} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all mb-6 group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Finance Forms
      </button>

      <div className="mb-8">
        <h1 className="text-2xl lg:text-2xl font-bold text-foreground uppercase tracking-wide">
          Upload Petty Cash Receipt
        </h1>
        <p className="text-muted-foreground text-sm mt-1 uppercase tracking-wide">HICOM Diecastings Sdn Bhd</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card-elevated p-6">
          <div className="space-y-1.5 mb-6">
            <Label htmlFor="refNo" className="text-xs font-semibold text-primary">Submission Reference Number <span className="text-destructive">*</span></Label>
            <Input
              id="refNo"
              value={refNo}
              onChange={e => setRefNo(e.target.value)}
              placeholder="e.g. HDSB-0012"
              className="h-11 text-base"
              required
            />
            <p className="text-xs text-muted-foreground">Enter the reference number from your original Petty Cash Claim submission.</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-primary">Receipt / Invoice File(s) <span className="text-destructive">*</span></Label>
            {attachedFiles.length > 0 && (
              <div className="space-y-2 py-2">
                {attachedFiles.map((file, i) => (
                  <div key={i} className="border rounded-lg p-3 flex items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    </div>
                    <button type="button" onClick={() => removeFile(i)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-md"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
            <label
              htmlFor="file-upload"
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${isDragging ? "border-primary bg-primary/10" : "border-border hover:border-border/70"}`}
            >
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-semibold text-muted-foreground">Drag & drop or click to upload</p>
              <p className="text-xs text-muted-foreground mt-1">(PDF, JPG, PNG supported)</p>
              <input id="file-upload" type="file" className="hidden" multiple onChange={handleFileChange} />
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting} className="px-12 py-6 text-base">
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Send className="h-5 w-5 mr-2" />}
            {isSubmitting ? "Uploading..." : "Submit Receipt"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ReceiptUploadForm;