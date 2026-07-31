import { useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/supabase";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useITAdminFacilities, type ITAdminFacility } from "@/hooks/useITAdminFacilities";

export function ITAdminFacilitiesSettings() {
  const { facilities, isLoading, refresh } = useITAdminFacilities(false);
  const [name, setName] = useState("");
  const [requiresDetails, setRequiresDetails] = useState(false);
  const [editing, setEditing] = useState<ITAdminFacility | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const resetEditor = () => {
    setEditing(null);
    setName("");
    setRequiresDetails(false);
  };

  const startEditing = (facility: ITAdminFacility) => {
    setEditing(facility);
    setName(facility.name);
    setRequiresDetails(facility.requires_details);
  };

  const save = async () => {
    const cleanName = name.trim();
    if (!cleanName) return toast.error("Enter a facility name.");
    if (facilities.some(item => item.id !== editing?.id && item.name.toLowerCase() === cleanName.toLowerCase())) {
      return toast.error("This facility already exists.");
    }

    setIsSaving(true);
    const query = editing
      ? supabase.from("it_admin_facilities").update({ name: cleanName, requires_details: requiresDetails, updated_at: new Date().toISOString() }).eq("id", editing.id)
      : supabase.from("it_admin_facilities").insert({ name: cleanName, requires_details: requiresDetails, sort_order: (facilities.at(-1)?.sort_order || 0) + 10 });
    const { error } = await query;
    setIsSaving(false);
    if (error) return toast.error(error.message);

    toast.success(editing ? "Facility updated." : "Facility added.");
    resetEditor();
    await refresh();
  };

  const remove = async (facility: ITAdminFacility) => {
    if (!window.confirm(`Delete "${facility.name}" from future IT Admin Request forms? Existing submissions will not be changed.`)) return;
    setDeletingId(facility.id);
    const { error } = await supabase.from("it_admin_facilities").delete().eq("id", facility.id);
    setDeletingId(null);
    if (error) return toast.error(error.message);
    if (editing?.id === facility.id) resetEditor();
    toast.success("Facility deleted from future forms.");
    await refresh();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-muted/10 p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">{editing ? "Edit Facility" : "Add Facility"}</p>
        <Label htmlFor="it-facility-name">Facility name</Label>
        <Input id="it-facility-name" value={name} onChange={event => setName(event.target.value)} className="mt-1.5" placeholder="e.g. VPN Access" maxLength={80} />
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <Checkbox checked={requiresDetails} onCheckedChange={checked => setRequiresDetails(checked === true)} />
          Require the employee to enter additional details
        </label>
        <div className="mt-4 flex gap-2">
          {editing && <Button type="button" variant="secondary" onClick={resetEditor} disabled={isSaving}><X className="mr-2 h-4 w-4" />Cancel</Button>}
          <Button type="button" onClick={save} disabled={isSaving || !name.trim()} className="flex-1">
            {editing ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {isSaving ? "Saving..." : editing ? "Save Changes" : "Add Facility"}
          </Button>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Facilities</p>
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading facilities...</p>
          ) : facilities.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No facilities configured.</p>
          ) : facilities.map(facility => (
            <div key={facility.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{facility.name}</p>
                {facility.requires_details && <p className="text-xs text-muted-foreground">Additional details required</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button type="button" size="icon" variant="ghost" onClick={() => startEditing(facility)} aria-label={`Edit ${facility.name}`}><Pencil className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="ghost" className="text-destructive hover:text-destructive" disabled={deletingId === facility.id} onClick={() => remove(facility)} aria-label={`Delete ${facility.name}`}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
