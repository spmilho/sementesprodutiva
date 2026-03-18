import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { RoguingRequest } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: RoguingRequest;
  cycleId: string;
  orgId: string;
  onSaved: () => void;
}

export default function ExecutionFormDialog({ open, onOpenChange, request, cycleId, orgId, onSaved }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [teamSize, setTeamSize] = useState("");
  const [hours, setHours] = useState("");
  const [areaCovered, setAreaCovered] = useState("");
  const [volunteersRemoved, setVolunteersRemoved] = useState("0");
  const [offtypeRemoved, setOfftypeRemoved] = useState("0");
  const [diseasedRemoved, setDiseasedRemoved] = useState("0");
  const [femaleInMaleRemoved, setFemaleInMaleRemoved] = useState("0");
  const [efficacy, setEfficacy] = useState("complete");
  const [followup, setFollowup] = useState("no");
  const [followupDays, setFollowupDays] = useState("");
  const [resultNotes, setResultNotes] = useState("");

  const types = request.occurrence_types ?? [];
  const total = [volunteersRemoved, offtypeRemoved, diseasedRemoved, femaleInMaleRemoved]
    .reduce((s, v) => s + (parseInt(v) || 0), 0);

  const handleSave = async () => {
    if (!date || !teamSize || !hours) return toast.error("Preencha data, equipe e tempo");
    setSaving(true);
    try {
      // 1. Create execution
      const { error: execError } = await (supabase as any)
        .from("roguing_executions").insert({
          cycle_id: cycleId, org_id: orgId,
          request_id: request.id,
          execution_date: date,
          team_size: parseInt(teamSize),
          hours_spent: parseFloat(hours),
          area_covered_ha: areaCovered ? parseFloat(areaCovered) : null,
          volunteers_removed: parseInt(volunteersRemoved) || 0,
          offtype_removed: parseInt(offtypeRemoved) || 0,
          diseased_removed: parseInt(diseasedRemoved) || 0,
          female_in_male_removed: parseInt(femaleInMaleRemoved) || 0,
          total_plants_removed: total,
          efficacy,
          needs_followup: followup,
          followup_days: followup === "repass" ? parseInt(followupDays) || null : null,
          result_notes: resultNotes || null,
          created_by: user?.id || null,
        });
      if (execError) throw execError;

      // 2. Update request status
      const { error: reqError } = await (supabase as any)
        .from("roguing_requests")
        .update({ status: "executed", execution_date: date })
        .eq("id", request.id);
      if (reqError) throw reqError;

      // 3. If partial/insufficient, generate follow-up request
      if (efficacy === "partial" || efficacy === "insufficient") {
        const { data: existingReqs } = await (supabase as any)
          .from("roguing_requests")
          .select("request_number")
          .eq("cycle_id", cycleId)
          .order("request_number", { ascending: false })
          .limit(1);
        const nextNum = (existingReqs?.[0]?.request_number ?? 0) + 1;

        await (supabase as any).from("roguing_requests").insert({
          cycle_id: cycleId, org_id: orgId,
          request_number: nextNum,
          request_date: date,
          priority: "urgent",
          parent_target: request.parent_target,
          occurrence_types: request.occurrence_types,
          occurrence_summary: `Repasse do roguing #${request.request_number}`,
          status: "pending",
          notes: efficacy === "partial" ? "Repasse necessário — roguing parcial" : "Roguing insuficiente — nova ação urgente",
          created_by: user?.id || null,
        });

        toast.success(efficacy === "partial"
          ? "✅ Roguing registrado. Nova solicitação de repasse gerada."
          : "⚠️ Roguing insuficiente. Solicitação urgente gerada.");
      } else {
        toast.success("✅ Roguing completo! Campo limpo.");
      }

      onSaved();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Execução — Solicitação #{request.request_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Data *</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            <div><Label>Equipe (pessoas) *</Label><Input type="number" min="1" value={teamSize} onChange={e => setTeamSize(e.target.value)} /></div>
            <div><Label>Tempo (horas) *</Label><Input type="number" step="0.5" value={hours} onChange={e => setHours(e.target.value)} /></div>
          </div>
          <div><Label>Área percorrida (ha)</Label><Input type="number" step="0.1" value={areaCovered} onChange={e => setAreaCovered(e.target.value)} /></div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Plantas Removidas</Label>
            <div className="grid grid-cols-2 gap-3">
              {types.includes("volunteers") && (
                <div><Label className="text-xs">🌽 Voluntárias</Label><Input type="number" min="0" value={volunteersRemoved} onChange={e => setVolunteersRemoved(e.target.value)} /></div>
              )}
              {types.includes("offtype") && (
                <div><Label className="text-xs">🔀 Off-type</Label><Input type="number" min="0" value={offtypeRemoved} onChange={e => setOfftypeRemoved(e.target.value)} /></div>
              )}
              {types.includes("diseased") && (
                <div><Label className="text-xs">🌱 Doentes</Label><Input type="number" min="0" value={diseasedRemoved} onChange={e => setDiseasedRemoved(e.target.value)} /></div>
              )}
              {types.includes("female_in_male") && (
                <div><Label className="text-xs">🌾 Fêmea no macho</Label><Input type="number" min="0" value={femaleInMaleRemoved} onChange={e => setFemaleInMaleRemoved(e.target.value)} /></div>
              )}
            </div>
            <p className="text-sm font-semibold">Total: {total} plantas</p>
          </div>

          <div>
            <Label>Resultado *</Label>
            <Select value={efficacy} onValueChange={setEfficacy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="complete">✅ Roguing completo — campo limpo</SelectItem>
                <SelectItem value="partial">🟡 Parcial — necessário repasse</SelectItem>
                <SelectItem value="insufficient">🔴 Insuficiente — muitas plantas restantes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Próximo roguing?</Label>
            <Select value={followup} onValueChange={setFollowup}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no">Não — campo OK</SelectItem>
                <SelectItem value="repass">Sim — repasse em X dias</SelectItem>
                <SelectItem value="new_evaluation">Sim — nova avaliação necessária</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {followup === "repass" && (
            <div><Label>Repasse em quantos dias?</Label><Input type="number" min="1" value={followupDays} onChange={e => setFollowupDays(e.target.value)} /></div>
          )}

          <div><Label>Observações</Label><Textarea value={resultNotes} onChange={e => setResultNotes(e.target.value)} placeholder="Observações da execução..." /></div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Salvar Execução
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
