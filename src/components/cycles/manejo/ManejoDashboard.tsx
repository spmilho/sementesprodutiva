import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CropInput, INPUT_TYPE_CONFIG, CropInputImport } from "./types";
import { format } from "date-fns";
import { addDays } from "date-fns";

interface Props {
  inputs: CropInput[];
  imports: CropInputImport[];
}

export default function ManejoDashboard({ inputs, imports }: Props) {
  const stats = useMemo(() => {
    const fertilizers = inputs.filter(i => i.input_type.startsWith("fertilizer"));
    const macros = inputs.filter(i => i.input_type === "fertilizer_macro");
    const micros = inputs.filter(i => i.input_type === "fertilizer_micro");
    const insecticides = inputs.filter(i => i.input_type === "insecticide");
    const herbicides = inputs.filter(i => i.input_type === "herbicide");
    const fungicides = inputs.filter(i => i.input_type === "fungicide");
    const adjuvants = inputs.filter(i => i.input_type === "adjuvant");

    const applied = inputs.filter(i => i.status === "applied").length;
    const recommended = inputs.filter(i => i.status === "recommended").length;
    const inProgress = inputs.filter(i => i.status === "in_progress").length;

    const pendingInsecticides = insecticides.filter(i => i.status !== "applied").length;
    const pendingHerbicides = herbicides.filter(i => i.status !== "applied").length;
    const pendingFungicides = fungicides.filter(i => i.status !== "applied").length;

    const lastImport = imports[0];
    const lastDate = lastImport ? new Date(lastImport.imported_at) : null;
    const nextDate = lastDate ? addDays(lastDate, 7) : null;

    return {
      totalFert: fertilizers.length, macroCount: macros.length, microCount: micros.length,
      insecticideCount: insecticides.length, herbicideCount: herbicides.length,
      fungicideCount: fungicides.length, adjuvantCount: adjuvants.length,
      total: inputs.length, applied, recommended, inProgress,
      pendingInsecticides, pendingHerbicides, pendingFungicides,
      lastDate, nextDate,
    };
  }, [inputs, imports]);

  const cards = [
    {
      label: "Total Adubações",
      value: `${stats.totalFert}`,
      sub: `${stats.macroCount} macro + ${stats.microCount} micro/foliar`,
      icon: "🌾",
    },
    {
      label: "Inseticidas",
      value: `${stats.insecticideCount}`,
      sub: stats.pendingInsecticides > 0
        ? `🟡 ${stats.pendingInsecticides} pendentes`
        : "🟢 todos realizados",
      icon: "💊",
    },
    {
      label: "Herbicidas",
      value: `${stats.herbicideCount}`,
      sub: stats.pendingHerbicides > 0
        ? `🟡 ${stats.pendingHerbicides} pendentes`
        : "🟢 todos realizados",
      icon: "🧪",
    },
    {
      label: "Fungicidas",
      value: `${stats.fungicideCount}`,
      sub: stats.pendingFungicides > 0
        ? `🟡 ${stats.pendingFungicides} pendentes`
        : "🟢 todos realizados",
      icon: "🍄",
    },
    {
      label: "Adjuvantes",
      value: `${stats.adjuvantCount}`,
      sub: "",
      icon: "💧",
    },
    {
      label: "Total Insumos",
      value: `${stats.total}`,
      sub: `${stats.applied} realizados | ${stats.recommended} recomend. | ${stats.inProgress} em exec.`,
      icon: "📦",
    },
    {
      label: "Última Atualização",
      value: stats.lastDate ? format(stats.lastDate, "dd/MM/yyyy") : "—",
      sub: stats.nextDate ? `Próxima: ~${format(stats.nextDate, "dd/MM")}` : "",
      icon: "📅",
    },
  ];

  if (inputs.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {cards.map((c, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span>{c.icon}</span> {c.label}
            </p>
            <p className="text-lg font-bold text-foreground mt-1">{c.value}</p>
            {c.sub && <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
