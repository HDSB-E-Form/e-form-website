import { useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useITApplicationOptions, type ITApplicationOption } from "@/hooks/useITApplicationOptions";

export function ITApplicationOptionsSettings() {
  const { options, isLoading, refresh } = useITApplicationOptions(false);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<ITApplicationOption | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const reset = () => { setName(""); setEditing(null); };
  const edit = (option: ITApplicationOption) => { setEditing(option); setName(option.name); };

  const save = async () => {
    const cleanName = name.trim().replace(/^ERP\s*-\s*/i, "");
    if (!cleanName) return toast.error("Enter an application option name.");
    if (options.some(option => option.id !== editing?.id && option.name.toLowerCase() === cleanName.toLowerCase())) {
      return toast.error("This application option already exists.");
    }
    setIsSaving(true);
    const query = editing
      ? supabase.from("it_application_options").update({ name: cleanName, updated_at: new Date().toISOString() }).eq("id", editing.id)
      : supabase.from("it_application_options").insert({ name: cleanName, sort_order: (options.at(-1)?.sort_order || 0) + 10 });
    const { error } = await query;
    setIsSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Application option updated." : "Application option added.");
    reset();
    await refresh();
  };

  const remove = async (option: ITApplicationOption) => {
    if (!window.confirm(`Delete "${option.name}" from future IT Application Request forms? Existing submissions will not be changed.`)) return;
    setDeletingId(option.id);
    const { error } = await supabase.from("it_application_options").delete().eq("id", option.id);
    setDeletingId(null);
    if (error) return toast.error(error.message);
    if (editing?.id === option.id) reset();
    toast.success("Application option deleted from future forms.");
    await refresh();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-muted/10 p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">{editing ? "Edit Application Option" : "Add Application Option"}</p>
        <Label htmlFor="it-application-option">Application or module name</Label>
        <Input id="it-application-option" value={name} onChange={event => setName(event.target.value)} className="mt-1.5" placeholder="e.g. Quality Management" maxLength={80} />
        <p className="mt-1.5 text-xs text-muted-foreground">“ERP -” is added automatically in stored submissions.</p>
        <div className="mt-4 flex gap-2">
          {editing && <Button type="button" variant="secondary" onClick={reset} disabled={isSaving}><X className="mr-2 h-4 w-4" />Cancel</Button>}
          <Button type="button" onClick={save} disabled={isSaving || !name.trim()} className="flex-1">
            {editing ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {isSaving ? "Saving..." : editing ? "Save Changes" : "Add Option"}
          </Button>
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Application Options</p>
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {isLoading ? <p className="p-4 text-sm text-muted-foreground">Loading options...</p>
            : options.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No application options configured.</p>
            : options.map(option => (
              <div key={option.id} className="flex items-center justify-between gap-3 p-3">
                <p className="min-w-0 truncate text-sm font-semibold text-foreground">{option.name}</p>
                <div className="flex shrink-0 gap-1">
                  <Button type="button" size="icon" variant="ghost" onClick={() => edit(option)} aria-label={`Edit ${option.name}`}><Pencil className="h-4 w-4" /></Button>
                  <Button type="button" size="icon" variant="ghost" className="text-destructive hover:text-destructive" disabled={deletingId === option.id} onClick={() => remove(option)} aria-label={`Delete ${option.name}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
