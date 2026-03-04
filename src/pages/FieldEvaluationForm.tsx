import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, ChevronDown, ChevronRight, Loader2, Save, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PHASES, STAGE_OPTIONS, getPhasesByStage, getScorePoints, getClassification, type ScoreValue, type SubitemDef, type PhaseDef } from "@/components/field-evaluation/constants";
import ScoreCard from "@/components/field-evaluation/ScoreCard";
import InstructionsDrawer from "@/components/field-evaluation/InstructionsDrawer";

interface ScoreState {
  value?: ScoreValue;
  notes?: string;
  dbId?: string;
  photos: { id: string; photo_url: string }[];
}

export default function FieldEvaluationForm() {
  const { id: cycleId, visitId } = useParams<{ id: string; visitId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Creation dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(!visitId);
  const [visitDate, setVisitDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [techName, setTechName] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [completa, setCompleta] = useState(false);

  // Evaluation state
  const [currentVisitId, setCurrentVisitId] = useState(visitId || "");
  const [currentOrgId, setCurrentOrgId] = useState("");
  const [scores, setScores] = useState<Record<string, ScoreState>>({});
  const [openPhases, setOpenPhases] = useState<Record<string, boolean>>({});
  const [instructionSubitem, setInstructionSubitem] = useState<SubitemDef | null>(null);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [activeStage, setActiveStage] = useState("");

  // Fetch cycle data
  const { data: cycle } = useQuery({
    queryKey: ["cycle-detail", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("production_cycles")
        .select("*, clients(name), farms(name)")
        .eq("id", cycleId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!cycleId,
  });

  // Get next visit number
  const { data: visitCount = 0 } = useQuery({
    queryKey: ["field-visits-count", cycleId],
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("field_visits")
        .select("id", { count: "exact", head: true })
        .eq("cycle_id", cycleId!);
      if (error) throw error;
      return (count ?? 0) + 1;
    },
    enabled: !!cycleId && !visitId,
  });

  // Load existing visit
  const { data: existingVisit } = useQuery({
    queryKey: ["field-visit", visitId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("field_visits")
        .select("*")
        .eq("id", visitId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!visitId,
  });

  // Load existing scores
  const { data: existingScores = [] } = useQuery({
    queryKey: ["field-visit-scores", visitId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("field_visit_scores")
        .select("*")
        .eq("visit_id", visitId!);
      if (error) throw error;
      return data;
    },
    enabled: !!visitId,
  });

  // Load existing photos
  const { data: existingPhotos = [] } = useQuery({
    queryKey: ["field-visit-photos", visitId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("field_visit_photos")
        .select("*")
        .eq("visit_id", visitId!);
      if (error) throw error;
      return data;
    },
    enabled: !!visitId,
  });

  // Initialize from existing data
  useEffect(() => {
    if (existingVisit && existingScores.length > 0) {
      setShowCreateDialog(false);
      setCurrentVisitId(existingVisit.id);
      setCurrentOrgId(existingVisit.org_id);
      setActiveStage(existingVisit.stage || "Completa");
      setVisitDate(existingVisit.visit_date);
      setTechName(existingVisit.technician_name || "");
      setGeneralNotes(existingVisit.general_notes || "");

      const newScores: Record<string, ScoreState> = {};
      existingScores.forEach((s: any) => {
        const photos = existingPhotos.filter((p: any) => p.score_id === s.id);
        newScores[s.subitem] = {
          value: s.score_value as ScoreValue,
          notes: s.notes || "",
          dbId: s.id,
          photos: photos.map((p: any) => ({ id: p.id, photo_url: p.photo_url })),
        };
      });
      setScores(newScores);

      const initialOpen: Record<string, boolean> = {};
      getPhasesByStage(existingVisit.stage || "Completa").forEach((p) => { initialOpen[p.key] = true; });
      setOpenPhases(initialOpen);
    }
  }, [existingVisit, existingScores, existingPhotos]);

  // Computed phases
  const activePhases = useMemo(() => {
    return getPhasesByStage(activeStage);
  }, [activeStage]);

  const allSubitems = useMemo(() => activePhases.flatMap((p) => p.subitems), [activePhases]);
  const totalMaxPoints = useMemo(() => activePhases.reduce((sum, p) => sum + p.maxPoints, 0), [activePhases]);
  const evaluatedCount = useMemo(() => allSubitems.filter((s) => scores[s.key]?.value).length, [allSubitems, scores]);
  const currentScore = useMemo(() => {
    return allSubitems.reduce((sum, s) => {
      const sc = scores[s.key];
      if (!sc?.value) return sum;
      return sum + getScorePoints(s, sc.value);
    }, 0);
  }, [allSubitems, scores]);

  const progressPct = allSubitems.length > 0 ? (evaluatedCount / allSubitems.length) * 100 : 0;
  const allEvaluated = evaluatedCount === allSubitems.length && allSubitems.length > 0;

  // Create visit mutation
  const createVisitMut = useMutation({
    mutationFn: async () => {
      const stage = completa ? "Completa" : selectedStages.join(", ");
      const phases = completa ? PHASES : PHASES.filter((p) => selectedStages.includes(p.label));
      const maxPts = phases.reduce((s, p) => s + p.maxPoints, 0);

      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("org_id")
        .eq("id", user!.id)
        .single();

      const orgId = profile.org_id;

      const { data: visit, error } = await (supabase as any)
        .from("field_visits")
        .insert({
          org_id: orgId,
          cycle_id: cycleId,
          visit_date: visitDate,
          visit_number: visitCount,
          technician_name: techName || null,
          stage,
          general_notes: generalNotes || null,
          max_possible_score: maxPts,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Create score rows for each subitem
      const scoreRows = phases.flatMap((p) =>
        p.subitems.map((s) => ({
          org_id: orgId,
          visit_id: visit.id,
          stage: p.label,
          subitem: s.key,
        }))
      );
      const { data: insertedScores, error: scErr } = await (supabase as any)
        .from("field_visit_scores")
        .insert(scoreRows)
        .select();
      if (scErr) throw scErr;

      return { visit, scores: insertedScores, orgId };
    },
    onSuccess: ({ visit, scores: dbScores, orgId }) => {
      setCurrentVisitId(visit.id);
      setCurrentOrgId(orgId);
      setActiveStage(visit.stage);
      setShowCreateDialog(false);

      const newScores: Record<string, ScoreState> = {};
      dbScores.forEach((s: any) => {
        newScores[s.subitem] = { dbId: s.id, photos: [] };
      });
      setScores(newScores);

      const initialOpen: Record<string, boolean> = {};
      getPhasesByStage(visit.stage).forEach((p) => { initialOpen[p.key] = true; });
      setOpenPhases(initialOpen);

      toast.success("Avaliação criada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Update score
  const updateScore = useCallback(async (subitemKey: string, value: ScoreValue, subitem: SubitemDef) => {
    const sc = scores[subitemKey];
    if (!sc?.dbId) return;

    const points = getScorePoints(subitem, value);
    await (supabase as any).from("field_visit_scores").update({
      score_value: value,
      score_points: points,
      updated_at: new Date().toISOString(),
    }).eq("id", sc.dbId);

    setScores((prev) => ({ ...prev, [subitemKey]: { ...prev[subitemKey], value } }));
  }, [scores]);

  // Update notes
  const updateNotes = useCallback(async (subitemKey: string, notes: string) => {
    const sc = scores[subitemKey];
    if (!sc?.dbId) return;

    setScores((prev) => ({ ...prev, [subitemKey]: { ...prev[subitemKey], notes } }));
    await (supabase as any).from("field_visit_scores").update({ notes, updated_at: new Date().toISOString() }).eq("id", sc.dbId);
  }, [scores]);

  // Save draft
  const saveDraft = async () => {
    await (supabase as any).from("field_visits").update({
      final_score: currentScore,
      general_notes: generalNotes || null,
      updated_at: new Date().toISOString(),
    }).eq("id", currentVisitId);
    toast.success("Rascunho salvo!");
  };

  // Finalize
  const finalize = async () => {
    await (supabase as any).from("field_visits").update({
      final_score: currentScore,
      max_possible_score: totalMaxPoints,
      status: "finalizada",
      general_notes: generalNotes || null,
      updated_at: new Date().toISOString(),
    }).eq("id", currentVisitId);
    queryClient.invalidateQueries({ queryKey: ["field-visits", cycleId] });
    toast.success("Avaliação finalizada!");
    navigate(`/ciclos/${cycleId}/avaliacoes/${currentVisitId}`);
  };

  const handlePhotoAdded = (subitemKey: string, photo: { id: string; photo_url: string }) => {
    setScores((prev) => ({
      ...prev,
      [subitemKey]: { ...prev[subitemKey], photos: [...(prev[subitemKey]?.photos || []), photo] },
    }));
  };

  const handlePhotoRemoved = (subitemKey: string, photoId: string) => {
    setScores((prev) => ({
      ...prev,
      [subitemKey]: { ...prev[subitemKey], photos: (prev[subitemKey]?.photos || []).filter((p) => p.id !== photoId) },
    }));
  };

  // ── Creation dialog ──
  if (showCreateDialog) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/ciclos/${cycleId}`)}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-xl font-bold">Nova Avaliação de Campo</h1>
        </div>

        <Card className="max-w-2xl">
          <CardHeader><CardTitle>Configurar Avaliação</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Data da Visita</Label>
                <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm">Nº da Visita</Label>
                <Input value={visitCount} disabled className="bg-muted" />
              </div>
            </div>
            <div>
              <Label className="text-sm">Técnico Responsável</Label>
              <Input value={techName} onChange={(e) => setTechName(e.target.value)} placeholder="Nome do técnico" />
            </div>

            <div>
              <Label className="text-sm font-semibold">Fase(s) a avaliar</Label>
              <div className="space-y-2 mt-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="completa"
                    checked={completa}
                    onCheckedChange={(c) => {
                      setCompleta(!!c);
                      if (c) setSelectedStages([]);
                    }}
                  />
                  <label htmlFor="completa" className="text-sm font-medium">Completa (todas as fases) — 100 pts</label>
                </div>
                {!completa && STAGE_OPTIONS.filter((s) => s.value !== "Completa").map((s) => (
                  <div key={s.value} className="flex items-center gap-2">
                    <Checkbox
                      id={s.value}
                      checked={selectedStages.includes(s.value)}
                      onCheckedChange={(c) => {
                        setSelectedStages((prev) =>
                          c ? [...prev, s.value] : prev.filter((v) => v !== s.value)
                        );
                      }}
                    />
                    <label htmlFor={s.value} className="text-sm">{s.label}</label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm">Observações Gerais (opcional)</Label>
              <Textarea value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} placeholder="Notas gerais sobre a visita..." />
            </div>

            <Button
              className="w-full"
              disabled={(!completa && selectedStages.length === 0) || createVisitMut.isPending}
              onClick={() => createVisitMut.mutate()}
            >
              {createVisitMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Iniciar Avaliação
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Evaluation form ──
  return (
    <div className="pb-32">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-background border-b p-4 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/ciclos/${cycleId}`)}><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <h1 className="text-lg font-bold">Avaliação de Campo</h1>
              <p className="text-xs text-muted-foreground">
                {cycle?.contract_number || cycle?.field_name} • {cycle?.hybrid_name} • {format(new Date(visitDate), "dd/MM/yyyy")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={saveDraft}>
              <Save className="h-3.5 w-3.5" /> Salvar
            </Button>
            <Button size="sm" className="gap-1" disabled={!allEvaluated} onClick={finalize}>
              <CheckCircle className="h-3.5 w-3.5" /> Finalizar
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Progress value={progressPct} className="flex-1 h-2" />
          <span className="text-xs font-medium whitespace-nowrap">{evaluatedCount}/{allSubitems.length}</span>
          <Badge variant="secondary" className="text-xs font-mono">{currentScore.toFixed(1)}/{totalMaxPoints} pts</Badge>
        </div>
      </div>

      {/* Phases */}
      <div className="p-4 space-y-4">
        {activePhases.map((phase) => {
          const phaseScore = phase.subitems.reduce((sum, s) => {
            const sc = scores[s.key];
            if (!sc?.value) return sum;
            return sum + getScorePoints(s, sc.value);
          }, 0);
          const isOpen = openPhases[phase.key] !== false;

          return (
            <Collapsible key={phase.key} open={isOpen} onOpenChange={(o) => setOpenPhases((prev) => ({ ...prev, [phase.key]: o }))}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border cursor-pointer hover:bg-primary/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{phase.icon}</span>
                    <h3 className="font-semibold text-sm">{phase.label}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">{phaseScore.toFixed(1)}/{phase.maxPoints}</Badge>
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-3">
                {phase.subitems.map((subitem) => (
                  <ScoreCard
                    key={subitem.key}
                    subitem={subitem}
                    value={scores[subitem.key]?.value}
                    notes={scores[subitem.key]?.notes}
                    photos={scores[subitem.key]?.photos || []}
                    onChange={(v) => updateScore(subitem.key, v, subitem)}
                    onNotesChange={(n) => updateNotes(subitem.key, n)}
                    onOpenInstructions={() => { setInstructionSubitem(subitem); setInstructionsOpen(true); }}
                    scoreId={scores[subitem.key]?.dbId}
                    visitId={currentVisitId}
                    orgId={currentOrgId || cycle?.org_id || ""}
                    onPhotoAdded={(p) => handlePhotoAdded(subitem.key, p)}
                    onPhotoRemoved={(pid) => handlePhotoRemoved(subitem.key, pid)}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      <InstructionsDrawer open={instructionsOpen} onOpenChange={setInstructionsOpen} subitem={instructionSubitem} />
    </div>
  );
}
