import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import OccurrenceChecklist from "./OccurrenceChecklist";
import { STAGES, PARENTS, OVERALL_CONDITIONS, computeConclusion, getFrequencyLabel } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleId: string;
  orgId: string;
  onSaved: () => void;
  userName?: string;
  lastStage?: string;
}

export default function EvaluationFormDialog({ open, onOpenChange, cycleId, orgId, onSaved, userName, lastStage }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"form" | "confirm">("form");

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [evaluator, setEvaluator] = useState(userName ?? "");
  const [stage, setStage] = useState(lastStage ?? "");
  const [parentEval, setParentEval] = useState("both");
  const [areaCovered, setAreaCovered] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [overallCondition, setOverallCondition] = useState("clean");
  const [generalNotes, setGeneralNotes] = useState("");

  // Volunteers
  const [hasVolunteers, setHasVolunteers] = useState(false);
  const [volunteersFreq, setVolunteersFreq] = useState("");
  const [volunteersLoc, setVolunteersLoc] = useState("");
  const [volunteersParent, setVolunteersParent] = useState("");
  const [volunteersId, setVolunteersId] = useState("");
  const [volunteersNotes, setVolunteersNotes] = useState("");
  const [volunteersPhotos, setVolunteersPhotos] = useState<string[]>([]);

  // Offtype
  const [hasOfftype, setHasOfftype] = useState(false);
  const [offtypeTypes, setOfftypeTypes] = useState<string[]>([]);
  const [offtypeFreq, setOfftypeFreq] = useState("");
  const [offtypeLoc, setOfftypeLoc] = useState("");
  const [offtypeParent, setOfftypeParent] = useState("");
  const [offtypeNotes, setOfftypeNotes] = useState("");
  const [offtypePhotos, setOfftypePhotos] = useState<string[]>([]);

  // Diseased
  const [hasDiseased, setHasDiseased] = useState(false);
  const [diseasedTypes, setDiseasedTypes] = useState<string[]>([]);
  const [diseasedFreq, setDiseasedFreq] = useState("");
  const [diseasedParent, setDiseasedParent] = useState("");
  const [diseasedNotes, setDiseasedNotes] = useState("");
  const [diseasedPhotos, setDiseasedPhotos] = useState<string[]>([]);

  // Female in male
  const [hasFemaleInMale, setHasFemaleInMale] = useState(false);
  const [femaleInMaleType, setFemaleInMaleType] = useState("");
  const [femaleInMaleFreq, setFemaleInMaleFreq] = useState("");
  const [femaleInMaleLoc, setFemaleInMaleLoc] = useState("");
  const [femaleInMaleNotes, setFemaleInMaleNotes] = useState("");
  const [femaleInMalePhotos, setFemaleInMalePhotos] = useState<string[]>([]);

  const conclusion = useMemo(() => computeConclusion({
    has_volunteers: hasVolunteers,
    volunteers_frequency: volunteersFreq || null,
    has_offtype: hasOfftype,
    offtype_frequency: offtypeFreq || null,
    has_diseased: hasDiseased,
    diseased_frequency: diseasedFreq || null,
    has_female_in_male: hasFemaleInMale,
    female_in_male_frequency: femaleInMaleFreq || null,
    overall_condition: overallCondition,
  }), [hasVolunteers, volunteersFreq, hasOfftype, offtypeFreq, hasDiseased, diseasedFreq, hasFemaleInMale, femaleInMaleFreq, overallCondition]);

  const detectedTypes = useMemo(() => {
    const types: string[] = [];
    if (hasVolunteers) types.push(`🌽 Voluntárias — ${getFrequencyLabel(volunteersFreq)}`);
    if (hasOfftype) types.push(`🔀 Off-type — ${getFrequencyLabel(offtypeFreq)}`);
    if (hasDiseased) types.push(`🌱 Doentes — ${getFrequencyLabel(diseasedFreq)}`);
    if (hasFemaleInMale) types.push(`🌾 Fêmea no macho — ${getFrequencyLabel(femaleInMaleFreq)}`);
    return types;
  }, [hasVolunteers, volunteersFreq, hasOfftype, offtypeFreq, hasDiseased, diseasedFreq, hasFemaleInMale, femaleInMaleFreq]);

  const captureGPS = () => {
    if (!navigator.geolocation) return toast.error("GPS não suportado");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); toast.success("GPS capturado!"); },
      () => toast.error("Erro ao capturar GPS")
    );
  };

  const handleSave = async () => {
    if (!date) return toast.error("Data obrigatória");
    if (!parentEval) return toast.error("Selecione o parental avaliado");
    setSaving(true);
    try {
      const evalData = {
        cycle_id: cycleId, org_id: orgId, evaluation_date: date,
        evaluator_name: evaluator || null, growth_stage: stage || null,
        parent_evaluated: parentEval,
        area_covered_ha: areaCovered ? parseFloat(areaCovered) : null,
        gps_latitude: lat, gps_longitude: lng,
        has_volunteers: hasVolunteers,
        volunteers_frequency: hasVolunteers ? volunteersFreq || null : null,
        volunteers_location: hasVolunteers ? volunteersLoc || null : null,
        volunteers_parent: hasVolunteers ? volunteersParent || null : null,
        volunteers_identification: hasVolunteers ? volunteersId || null : null,
        volunteers_notes: hasVolunteers ? volunteersNotes || null : null,
        volunteers_photos: hasVolunteers && volunteersPhotos.length > 0 ? volunteersPhotos : null,
        has_offtype: hasOfftype,
        offtype_types: hasOfftype && offtypeTypes.length > 0 ? offtypeTypes : null,
        offtype_frequency: hasOfftype ? offtypeFreq || null : null,
        offtype_location: hasOfftype ? offtypeLoc || null : null,
        offtype_parent: hasOfftype ? offtypeParent || null : null,
        offtype_notes: hasOfftype ? offtypeNotes || null : null,
        offtype_photos: hasOfftype && offtypePhotos.length > 0 ? offtypePhotos : null,
        has_diseased: hasDiseased,
        diseased_types: hasDiseased && diseasedTypes.length > 0 ? diseasedTypes : null,
        diseased_frequency: hasDiseased ? diseasedFreq || null : null,
        diseased_parent: hasDiseased ? diseasedParent || null : null,
        diseased_notes: hasDiseased ? diseasedNotes || null : null,
        diseased_photos: hasDiseased && diseasedPhotos.length > 0 ? diseasedPhotos : null,
        has_female_in_male: hasFemaleInMale,
        female_in_male_type: hasFemaleInMale ? femaleInMaleType || null : null,
        female_in_male_frequency: hasFemaleInMale ? femaleInMaleFreq || null : null,
        female_in_male_location: hasFemaleInMale ? femaleInMaleLoc || null : null,
        female_in_male_notes: hasFemaleInMale ? femaleInMaleNotes || null : null,
        female_in_male_photos: hasFemaleInMale && femaleInMalePhotos.length > 0 ? femaleInMalePhotos : null,
        overall_condition: overallCondition,
        auto_conclusion: conclusion.action === "sem_acao" ? "clean" : conclusion.action === "observar" ? "observe" : conclusion.action.includes("urgente") ? "urgent_roguing" : "roguing",
        auto_conclusion_message: conclusion.message,
        general_notes: generalNotes || null,
        created_by: user?.id || null,
      };

      console.log("[Roguing] Inserting evaluation...", { cycleId, orgId });

      const res = await (supabase as any)
        .from("roguing_evaluations").insert(evalData).select("id").single();
      
      console.log("[Roguing] Insert response:", JSON.stringify(res));
      
      if (res.error) {
        console.error("[Roguing] Insert error:", res.error);
        throw res.error;
      }

      if (!res.data?.id) {
        console.error("[Roguing] No data returned from insert");
        throw new Error("Falha ao salvar avaliação — nenhum dado retornado.");
      }

      const evalId = res.data.id;

      if (conclusion.action.includes("solicitar")) {
        const { data: existingReqs } = await (supabase as any)
          .from("roguing_requests").select("request_number").eq("cycle_id", cycleId)
          .order("request_number", { ascending: false }).limit(1);
        const nextNum = (existingReqs?.[0]?.request_number ?? 0) + 1;

        const occTypes: string[] = [];
        if (hasVolunteers) occTypes.push("volunteers");
        if (hasOfftype) occTypes.push("offtype");
        if (hasDiseased) occTypes.push("diseased");
        if (hasFemaleInMale) occTypes.push("female_in_male");

        const { error: reqError } = await (supabase as any)
          .from("roguing_requests").insert({
            cycle_id: cycleId, org_id: orgId,
            evaluation_id: evalId,
            request_number: nextNum, request_date: date,
            priority: conclusion.action.includes("urgente") ? "urgent" : "recommended",
            parent_target: parentEval, growth_stage: stage || null,
            occurrence_types: occTypes,
            occurrence_summary: detectedTypes.join(" | "),
            status: "pending", created_by: user?.id || null,
          });
        if (reqError) {
          console.error("[Roguing] Request insert error:", reqError);
          throw reqError;
        }
        toast.success(`✅ Avaliação salva + Solicitação #${nextNum} gerada!`);
      } else if (conclusion.action === "observar") {
        toast.success("✅ Avaliação salva. Reavaliar em 5 dias.");
      } else {
        toast.success("✅ Campo limpo registrado.");
      }

      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error("[Roguing] Save failed:", err);
      toast.error("Erro ao salvar: " + (err.message || JSON.stringify(err)));
    } finally {
      setSaving(false);
    }
  };

  const conclusionColorMap: Record<string, string> = {
    green: "bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-700",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-700",
    orange: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-700",
    red: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-700",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{step === "form" ? "Nova Avaliação de Roguing" : "📋 Conclusão da Avaliação"}</DialogTitle>
        </DialogHeader>

        {step === "form" ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Identificação</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data *</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
                <div><Label>Avaliador</Label><Input value={evaluator} onChange={e => setEvaluator(e.target.value)} /></div>
                <div>
                  <Label>Estádio Fenológico</Label>
                  <Select value={stage} onValueChange={setStage}>
                    <SelectTrigger><SelectValue placeholder="VE→R6" /></SelectTrigger>
                    <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Parental avaliado *</Label>
                  <Select value={parentEval} onValueChange={setParentEval}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PARENTS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Área percorrida (ha)</Label><Input type="number" step="0.1" value={areaCovered} onChange={e => setAreaCovered(e.target.value)} /></div>
                <div className="flex items-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={captureGPS}><MapPin className="h-3.5 w-3.5 mr-1" /> GPS</Button>
                  {lat && lng && <span className="text-xs text-muted-foreground">{lat.toFixed(5)}, {lng.toFixed(5)}</span>}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Checklist de Ocorrências</h4>
              <OccurrenceChecklist
                cycleId={cycleId}
                hasVolunteers={hasVolunteers} setHasVolunteers={setHasVolunteers}
                volunteersFreq={volunteersFreq} setVolunteersFreq={setVolunteersFreq}
                volunteersLoc={volunteersLoc} setVolunteersLoc={setVolunteersLoc}
                volunteersParent={volunteersParent} setVolunteersParent={setVolunteersParent}
                volunteersId={volunteersId} setVolunteersId={setVolunteersId}
                volunteersNotes={volunteersNotes} setVolunteersNotes={setVolunteersNotes}
                volunteersPhotos={volunteersPhotos} setVolunteersPhotos={setVolunteersPhotos}
                hasOfftype={hasOfftype} setHasOfftype={setHasOfftype}
                offtypeTypes={offtypeTypes} setOfftypeTypes={setOfftypeTypes}
                offtypeFreq={offtypeFreq} setOfftypeFreq={setOfftypeFreq}
                offtypeLoc={offtypeLoc} setOfftypeLoc={setOfftypeLoc}
                offtypeParent={offtypeParent} setOfftypeParent={setOfftypeParent}
                offtypeNotes={offtypeNotes} setOfftypeNotes={setOfftypeNotes}
                offtypePhotos={offtypePhotos} setOfftypePhotos={setOfftypePhotos}
                hasDiseased={hasDiseased} setHasDiseased={setHasDiseased}
                diseasedTypes={diseasedTypes} setDiseasedTypes={setDiseasedTypes}
                diseasedFreq={diseasedFreq} setDiseasedFreq={setDiseasedFreq}
                diseasedParent={diseasedParent} setDiseasedParent={setDiseasedParent}
                diseasedNotes={diseasedNotes} setDiseasedNotes={setDiseasedNotes}
                diseasedPhotos={diseasedPhotos} setDiseasedPhotos={setDiseasedPhotos}
                hasFemaleInMale={hasFemaleInMale} setHasFemaleInMale={setHasFemaleInMale}
                femaleInMaleType={femaleInMaleType} setFemaleInMaleType={setFemaleInMaleType}
                femaleInMaleFreq={femaleInMaleFreq} setFemaleInMaleFreq={setFemaleInMaleFreq}
                femaleInMaleLoc={femaleInMaleLoc} setFemaleInMaleLoc={setFemaleInMaleLoc}
                femaleInMaleNotes={femaleInMaleNotes} setFemaleInMaleNotes={setFemaleInMaleNotes}
                femaleInMalePhotos={femaleInMalePhotos} setFemaleInMalePhotos={setFemaleInMalePhotos}
              />
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Avaliação Geral</h4>
              <div>
                <Label>Condição geral do campo</Label>
                <Select value={overallCondition} onValueChange={setOverallCondition}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OVERALL_CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações gerais</Label>
                <Textarea value={generalNotes} onChange={e => setGeneralNotes(e.target.value)} placeholder="Observações sobre a avaliação..." />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={() => setStep("confirm")}>Avançar → Conclusão</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Card className={`border-2 ${conclusionColorMap[conclusion.color]}`}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={conclusionColorMap[conclusion.color]}>{conclusion.conclusion}</Badge>
                </div>
                {detectedTypes.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Detectados: {detectedTypes.length} tipo(s) de ocorrência</p>
                    {detectedTypes.map((t, i) => <p key={i} className="text-sm">• {t}</p>)}
                  </div>
                )}
                <p className="text-sm whitespace-pre-line">{conclusion.message}</p>
                {conclusion.action.includes("solicitar") && (
                  <p className="text-xs text-muted-foreground">➡️ Solicitação de roguing será gerada automaticamente ao salvar.</p>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>❌ Cancelar</Button>
              <Button variant="outline" onClick={() => setStep("form")}>✏️ Revisar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} 💾 Salvar Avaliação
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
