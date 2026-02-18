import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GlebaStatus, GROWTH_STAGE_LABELS } from "./types";
import { daysSince, getStatusBadge, getStatusBorderClass } from "./utils";

interface Props {
  allSamples: any[];
  glebaStatuses: GlebaStatus[];
  target: number;
  hasGlebas: boolean;
}

export default function MoistureDashboard({ allSamples, glebaStatuses, target, hasGlebas }: Props) {
  const vals = allSamples.map((s) => Number(s.moisture_pct));
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const min = vals.length ? Math.min(...vals) : 0;
  const max = vals.length ? Math.max(...vals) : 0;
  const belowTarget = vals.filter((v) => v <= target).length;
  const pctBelow = vals.length ? (belowTarget / vals.length) * 100 : 0;

  const sorted = [...allSamples].sort((a, b) => {
    const da = `${a.sample_date}T${a.sample_time}`;
    const db = `${b.sample_date}T${b.sample_time}`;
    return db.localeCompare(da);
  });
  const lastSample = sorted[0];
  const lastDate = lastSample?.sample_date ?? null;
  const daysSinceLastRaw = daysSince(lastDate);

  const avgColor = avg <= target ? "text-green-600" : avg <= target + 3 ? "text-yellow-600" : "text-red-600";
  const pctColor = pctBelow >= 80 ? "text-green-600" : pctBelow >= 50 ? "text-yellow-600" : "text-red-600";

  const glebasWithData = glebaStatuses.filter((gs) => gs.count > 0);

  return (
    <div className="space-y-4">
      {/* Row 1: General cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Média Geral</p>
            <p className={`text-2xl font-bold mt-1 ${avgColor}`}>
              {vals.length ? avg.toFixed(1) : "—"}%
            </p>
            {vals.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">Min: {min.toFixed(1)}% | Max: {max.toFixed(1)}%</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total de Amostras</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{vals.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {vals.length} pontos em {glebasWithData.length || 1} {hasGlebas ? "glebas" : "área"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">% Abaixo do Alvo</p>
            <p className={`text-2xl font-bold mt-1 ${pctColor}`}>
              {vals.length ? pctBelow.toFixed(0) : "—"}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Última Amostragem</p>
            {lastDate ? (
              <>
                <p className="text-lg font-semibold mt-1 text-foreground">
                  {new Date(lastDate + "T00:00:00").toLocaleDateString("pt-BR")}
                </p>
                {daysSinceLastRaw !== null && daysSinceLastRaw > 3 && (
                  <p className="text-xs text-red-600 mt-1">⚠️ {daysSinceLastRaw} dias sem amostragem!</p>
                )}
              </>
            ) : (
              <p className="text-lg font-semibold mt-1 text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Per-gleba cards */}
      {glebaStatuses.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Prontidão por Gleba</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {glebaStatuses.map((gs, i) => {
              const badge = getStatusBadge(gs.status);
              const borderClass = getStatusBorderClass(gs.status);
              const days = daysSince(gs.lastDate);
              return (
                <Card key={gs.gleba?.id ?? "general"} className={`border-l-4 ${borderClass}`}>
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm text-foreground">
                        {gs.gleba ? `Gleba ${gs.gleba.name}` : "Área Geral"}
                      </p>
                      {gs.gleba?.area_ha && (
                        <span className="text-xs text-muted-foreground">{gs.gleba.area_ha} ha</span>
                      )}
                    </div>
                    {gs.count > 0 ? (
                      <>
                        <p className="text-xs">Média: <span className="font-medium">{gs.avg.toFixed(1)}%</span></p>
                        <p className="text-xs">Amostras: {gs.count}</p>
                        {gs.predominantStage && (
                          <p className="text-xs">Estádio: <span className="font-medium">{gs.predominantStage}</span></p>
                        )}
                        <p className="text-xs">
                          Última: {gs.lastDate ? new Date(gs.lastDate + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                        </p>
                        <p className="text-xs">Abaixo do alvo: {gs.pctBelowTarget.toFixed(0)}%</p>
                        <Badge className={`mt-1 text-xs ${badge.className}`}>{badge.emoji} {badge.label}</Badge>
                        {days !== null && days > 3 && (
                          <p className="text-xs text-red-600 mt-1">⚠️ Amostrar!</p>
                        )}
                      </>
                    ) : (
                      <Badge className={`mt-1 text-xs ${badge.className}`}>{badge.emoji} {badge.label}</Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {!hasGlebas && (
            <p className="text-xs text-muted-foreground mt-2">
              💡 Cadastre glebas na aba Planejamento para acompanhar umidade por região do pivô.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
