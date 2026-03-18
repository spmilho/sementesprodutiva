import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { PARENTS } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleId: string;
  orgId: string;
  existingCount: number;
  onSaved: () => void;
}

export default function ManualRequestDialog({ open, onOpenChange, cycleId, orgId, existingCount, onSaved }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [priority, setPriority] = useState("recommended");
  const [parentTarget, setParentTarget] = useState("both");
  const [occTypes, setOccTypes] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const toggleType = (t: string) => {
    setOccTypes(prev => prev.includes(t) ? prev.filter(v => v !== t) : [...prev, t]);
  };

  const handleSave = async () => {
    if (!date) return toast.error("Data obrigatória");
    setSaving(true);
    try {
      const { data: existingReqs } = await (supabase as any)
        .from("roguing_requests").select("request_number").eq("cycle_id", cycleId)
        .order("request_number", { ascending: false }).limit(1);
      const nextNum = (existingReqs?.[0]?.request_number ?? 0) + 1;

      const { error } = await (supabase as any).from("roguing_requests").insert({
        cycle_id: cycleId, org_id: orgId,
        request_number: nextNum, request_date: date,
        priority, parent_target: parentTarget,
        occurrence_types: occTypes.length > 0 ? occTypes : null,
        occurrence_summary: notes || null,
        status: "pending", notes: notes || null,
        created_by: user?.id || null,
      });
      if (error) throw error;
      toast.success(`Solicitação #${nextNum} criada!`);
      onSaved();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nova Solicitação Manual</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Data *</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            <div>
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recommended">🟠 Recomendado</SelectItem>
                  <SelectItem value="urgent">🔴 Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Parental</Label>
            <Select value={parentTarget} onValueChange={setParentTarget}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PARENTS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tipos de ocorrência</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {[
                { value: "volunteers", label: "🌽 Voluntárias" },
                { value: "offtype", label: "🔀 Off-type" },
                { value: "diseased", label: "🌱 Doentes" },
                { value: "female_in_male", label: "🌾 Fêmea no macho" },
              ].map(t => (
                <div key={t.value} className="flex items-center gap-1">
                  <Checkbox checked={occTypes.includes(t.value)} onCheckedChange={() => toggleType(t.value)} />
                  <Label className="text-xs cursor-pointer">{t.label}</Label>
                </div>
              ))}
            </div>
          </div>
          <div><Label>Observações</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Criar Solicitação
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
