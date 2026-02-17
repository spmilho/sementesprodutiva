import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GlebaStatus } from "./types";
import { getStatusBadge, getRecommendation, daysSince } from "./utils";

interface Props {
  glebaStatuses: GlebaStatus[];
  target: number;
  femaleArea: number;
}

export default function HarvestDecision({ glebaStatuses, target, femaleArea }: Props) {
  const withData = glebaStatuses.filter((gs) => gs.count > 0);
  const readyGlebas = glebaStatuses.filter((gs) => gs.pctBelowTarget >= 80 && gs.count > 0);
  const readyArea = readyGlebas.reduce((sum, gs) => sum + (gs.gleba?.area_ha ?? femaleArea), 0);
  const totalArea = glebaStatuses.reduce((sum, gs) => sum + (gs.gleba?.area_ha ?? femaleArea), 0) || femaleArea;
  const allReady = glebaStatuses.length > 0 && glebaStatuses.every((gs) => gs.count > 0 && gs.pctBelowTarget >= 80);
  const pctReady = totalArea > 0 ? (readyArea / totalArea) * 100 : 0;

  return (
    <Card className="border-2 border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">🌾 Decisão de Colheita</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {allReady && (
          <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg p-3 text-center">
            <p className="text-green-800 dark:text-green-300 font-semibold">
              ✅ CAMPO PRONTO PARA COLHEITA — Todas as glebas abaixo de {target}%
            </p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b">
                <th className="p-2 text-left">Gleba</th>
                <th className="p-2 text-left">Área</th>
                <th className="p-2 text-left">Amostras</th>
                <th className="p-2 text-left">Última</th>
                <th className="p-2 text-left">Média %</th>
                <th className="p-2 text-left">Min %</th>
                <th className="p-2 text-left">Max %</th>
                <th className="p-2 text-left">% abaixo</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Recomendação</th>
              </tr>
            </thead>
            <tbody>
              {glebaStatuses.map((gs, i) => {
                const badge = getStatusBadge(gs.status);
                const rec = getRecommendation(gs, target);
                return (
                  <tr key={gs.gleba?.id ?? i} className="border-b">
                    <td className="p-2 font-medium">{gs.gleba?.name ?? "Geral"}</td>
                    <td className="p-2">{gs.gleba?.area_ha ?? femaleArea} ha</td>
                    <td className="p-2">{gs.count}</td>
                    <td className="p-2">
                      {gs.lastDate ? new Date(gs.lastDate + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                      {daysSince(gs.lastDate) !== null && (daysSince(gs.lastDate) ?? 0) > 3 && (
                        <span className="text-red-500 ml-1">⚠️</span>
                      )}
                    </td>
                    <td className="p-2">{gs.count > 0 ? gs.avg.toFixed(1) : "—"}</td>
                    <td className="p-2">{gs.count > 0 ? gs.min.toFixed(1) : "—"}</td>
                    <td className="p-2">{gs.count > 0 ? gs.max.toFixed(1) : "—"}</td>
                    <td className="p-2">{gs.count > 0 ? gs.pctBelowTarget.toFixed(0) + "%" : "—"}</td>
                    <td className="p-2"><Badge className={`text-xs ${badge.className}`}>{badge.emoji} {badge.label}</Badge></td>
                    <td className="p-2"><span className={`font-semibold ${rec.className}`}>{rec.emoji} {rec.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{readyGlebas.length}</span> de{" "}
            <span className="font-semibold">{glebaStatuses.length}</span> glebas prontas (
            <span className="font-semibold">{readyArea.toFixed(0)} ha</span> de{" "}
            <span className="font-semibold">{totalArea.toFixed(0)} ha</span>)
          </p>
          <Progress value={pctReady} className="h-3" />
        </div>
      </CardContent>
    </Card>
  );
}
