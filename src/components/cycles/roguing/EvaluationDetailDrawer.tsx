import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import type { RoguingEvaluation } from "./types";
import { getFrequencyLabel, getParentLabel } from "./types";

interface Props {
  evaluation: RoguingEvaluation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const conclusionColors: Record<string, string> = {
  clean: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  observe: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  roguing: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  urgent_roguing: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

const conclusionLabels: Record<string, string> = {
  clean: "🟢 Campo limpo",
  observe: "🟡 Observar",
  roguing: "🟠 Roguing recomendado",
  urgent_roguing: "🔴 Roguing urgente",
};

export default function EvaluationDetailDrawer({ evaluation, open, onOpenChange }: Props) {
  if (!evaluation) return null;
  const e = evaluation;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>📊 Avaliação de Roguing</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Header info */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{format(parseISO(e.evaluation_date), "dd/MM/yyyy")}</span>
                <Badge className={conclusionColors[e.auto_conclusion] ?? ""}>
                  {conclusionLabels[e.auto_conclusion] ?? e.auto_conclusion}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                {e.evaluator_name && <span>Avaliador: <strong>{e.evaluator_name}</strong></span>}
                {e.growth_stage && <span>Estádio: <strong>{e.growth_stage}</strong></span>}
                <span>Parental: <strong>{getParentLabel(e.parent_evaluated)}</strong></span>
                {e.area_covered_ha && <span>Área: <strong>{e.area_covered_ha} ha</strong></span>}
                {e.gps_latitude && e.gps_longitude && (
                  <span>GPS: {e.gps_latitude.toFixed(5)}, {e.gps_longitude.toFixed(5)}</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Conclusion message */}
          {e.auto_conclusion_message && (
            <div className={`p-3 rounded-lg border-2 text-sm ${conclusionColors[e.auto_conclusion] ?? ""}`}>
              {e.auto_conclusion_message}
            </div>
          )}

          {/* Occurrences */}
          <h4 className="text-sm font-semibold">Ocorrências Detectadas</h4>

          {!e.has_volunteers && !e.has_offtype && !e.has_diseased && !e.has_female_in_male && (
            <p className="text-sm text-muted-foreground">Nenhuma ocorrência detectada.</p>
          )}

          {e.has_volunteers && (
            <OccurrenceCard
              icon="🌽" title="Voluntárias"
              frequency={e.volunteers_frequency}
              location={e.volunteers_location}
              parent={e.volunteers_parent}
              notes={e.volunteers_notes}
              photos={e.volunteers_photos}
            />
          )}

          {e.has_offtype && (
            <OccurrenceCard
              icon="🔀" title="Off-type"
              frequency={e.offtype_frequency}
              location={e.offtype_location}
              parent={e.offtype_parent}
              notes={e.offtype_notes}
              photos={e.offtype_photos}
              extra={e.offtype_types?.join(", ")}
            />
          )}

          {e.has_diseased && (
            <OccurrenceCard
              icon="🌱" title="Doentes"
              frequency={e.diseased_frequency}
              parent={e.diseased_parent}
              notes={e.diseased_notes}
              photos={e.diseased_photos}
              extra={e.diseased_types?.join(", ")}
            />
          )}

          {e.has_female_in_male && (
            <OccurrenceCard
              icon="🌾" title="Fêmea no Macho"
              frequency={e.female_in_male_frequency}
              location={e.female_in_male_location}
              notes={e.female_in_male_notes}
              photos={e.female_in_male_photos}
              extra={e.female_in_male_type || undefined}
            />
          )}

          {/* General notes */}
          {e.general_notes && (
            <Card>
              <CardContent className="p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Observações Gerais</p>
                <p className="text-sm">{e.general_notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function OccurrenceCard({ icon, title, frequency, location, parent, notes, photos, extra }: {
  icon: string; title: string;
  frequency?: string | null; location?: string | null; parent?: string | null;
  notes?: string | null; photos?: string[] | null; extra?: string;
}) {
  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="text-sm font-semibold">{title}</span>
          {frequency && <Badge variant="secondary" className="text-xs">{getFrequencyLabel(frequency)}</Badge>}
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
          {location && <span>Local: {location}</span>}
          {parent && <span>Parental: {parent}</span>}
          {extra && <span>Tipo: {extra}</span>}
        </div>
        {notes && <p className="text-xs text-muted-foreground italic">"{notes}"</p>}
        {photos && photos.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {photos.map((url, i) => (
              <img key={i} src={url} alt={`${title} ${i + 1}`} className="h-20 w-20 rounded object-cover cursor-pointer" onClick={() => window.open(url, "_blank")} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
