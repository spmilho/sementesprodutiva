import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { MoistureSample, PivotGleba, METHOD_LABELS, POSITION_LABELS, GLEBA_COLORS } from "./types";
import { getMoistureBgClass, getStatusBadge, calcGlebaStatus } from "./utils";

interface Props {
  samples: MoistureSample[];
  glebas: PivotGleba[];
  target: number;
  onDelete: (id: string) => void;
}

export default function MoistureSampleTable({ samples, glebas, target, onDelete }: Props) {
  const [glebaFilter, setGlebaFilter] = useState("__all__");
  const [moistureFilter, setMoistureFilter] = useState("__all__");
  const [grouped, setGrouped] = useState(false);

  const filtered = useMemo(() => {
    let s = [...samples];
    if (glebaFilter !== "__all__") {
      s = s.filter((x) => (glebaFilter === "__none__" ? !x.gleba_id : x.gleba_id === glebaFilter));
    }
    if (moistureFilter === "below") s = s.filter((x) => Number(x.moisture_pct) <= target);
    else if (moistureFilter === "above") s = s.filter((x) => Number(x.moisture_pct) > target);
    else if (moistureFilter === "high") s = s.filter((x) => Number(x.moisture_pct) > target + 7);
    return s.sort((a, b) => `${b.sample_date}${b.sample_time}`.localeCompare(`${a.sample_date}${a.sample_time}`));
  }, [samples, glebaFilter, moistureFilter, target]);

  const glebaColorMap = useMemo(() => {
    const m: Record<string, string> = {};
    glebas.forEach((g, i) => (m[g.id] = GLEBA_COLORS[i % GLEBA_COLORS.length]));
    return m;
  }, [glebas]);

  const glebaNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    glebas.forEach((g) => (m[g.id] = g.name));
    return m;
  }, [glebas]);

  const overallVals = filtered.map((s) => Number(s.moisture_pct));
  const overallAvg = overallVals.length ? overallVals.reduce((a, b) => a + b, 0) / overallVals.length : 0;
  const overallMin = overallVals.length ? Math.min(...overallVals) : 0;
  const overallMax = overallVals.length ? Math.max(...overallVals) : 0;
  const overallBelow = overallVals.filter((v) => v <= target).length;

  // Group by gleba
  const groups = useMemo(() => {
    if (!grouped) return null;
    const map = new Map<string, MoistureSample[]>();
    filtered.forEach((s) => {
      const key = s.gleba_id || "__none__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return Array.from(map.entries()).map(([key, samps]) => {
      const gleba = glebas.find((g) => g.id === key) ?? null;
      return { key, gleba, samples: samps, status: calcGlebaStatus(gleba, samps, target) };
    });
  }, [grouped, filtered, glebas, target]);

  const renderRow = (s: MoistureSample) => (
    <tr key={s.id} className="border-b text-xs">
      <td className="p-2">{new Date(s.sample_date + "T00:00:00").toLocaleDateString("pt-BR")} {s.sample_time?.slice(0, 5)}</td>
      {glebas.length > 0 && (
        <td className="p-2">
          {s.gleba_id && glebaNameMap[s.gleba_id] ? (
            <Badge variant="outline" style={{ borderColor: glebaColorMap[s.gleba_id] }}>{glebaNameMap[s.gleba_id]}</Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
      )}
      <td className="p-2">{s.point_identifier ?? "—"}</td>
      <td className="p-2">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getMoistureBgClass(Number(s.moisture_pct), target)}`}>
          {Number(s.moisture_pct).toFixed(1)}%
        </span>
      </td>
      <td className="p-2">{METHOD_LABELS[s.method] ?? s.method}</td>
      <td className="p-2">{s.field_position ? POSITION_LABELS[s.field_position] ?? s.field_position : "—"}</td>
      <td className="p-2">{s.grain_temperature_c ? `${s.grain_temperature_c}°C` : "—"}</td>
      <td className="p-2">{s.latitude ? "✓" : "—"}</td>
      <td className="p-2">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDelete(s.id)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </td>
    </tr>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm">Amostras de Umidade</CardTitle>
          <div className="flex items-center gap-3 flex-wrap">
            {glebas.length > 0 && (
              <Select value={glebaFilter} onValueChange={setGlebaFilter}>
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas glebas</SelectItem>
                  {glebas.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  <SelectItem value="__none__">Sem gleba</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Select value={moistureFilter} onValueChange={setMoistureFilter}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas faixas</SelectItem>
                <SelectItem value="below">Abaixo do alvo</SelectItem>
                <SelectItem value="above">Acima do alvo</SelectItem>
                <SelectItem value="high">&gt; alvo+7%</SelectItem>
              </SelectContent>
            </Select>
            {glebas.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Switch id="group-toggle" checked={grouped} onCheckedChange={setGrouped} />
                <Label htmlFor="group-toggle" className="text-xs">Agrupar</Label>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-muted-foreground border-b bg-muted/30">
                <th className="p-2 text-left">Data/Hora</th>
                {glebas.length > 0 && <th className="p-2 text-left">Gleba</th>}
                <th className="p-2 text-left">Ponto</th>
                <th className="p-2 text-left">Umidade %</th>
                <th className="p-2 text-left">Método</th>
                <th className="p-2 text-left">Posição</th>
                <th className="p-2 text-left">Temp °C</th>
                <th className="p-2 text-left">GPS</th>
                <th className="p-2 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {grouped && groups
                ? groups.map((g) => {
                    const badge = getStatusBadge(g.status.status);
                    return (
                      <tr key={g.key}>
                        <td colSpan={glebas.length > 0 ? 9 : 8} className="p-0">
                          <div className="bg-muted/50 px-3 py-1.5 text-xs font-semibold border-b flex items-center gap-2">
                            <span>{g.gleba ? `GLEBA ${g.gleba.name}` : "ÁREA GERAL"}</span>
                            {g.gleba?.area_ha && <span className="text-muted-foreground">({g.gleba.area_ha} ha)</span>}
                            <span>— Média: {g.status.avg.toFixed(1)}%</span>
                            <span>| {g.status.count} amostras</span>
                            <Badge className={`text-xs ${badge.className}`}>{badge.emoji} {badge.label}</Badge>
                          </div>
                          <table className="w-full">
                            <tbody>{g.samples.map(renderRow)}</tbody>
                          </table>
                        </td>
                      </tr>
                    );
                  })
                : filtered.map(renderRow)
              }
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="flex gap-4 p-3 text-xs text-muted-foreground border-t bg-muted/20">
            <span>Total: {filtered.length}</span>
            <span>Média: {overallAvg.toFixed(1)}%</span>
            <span>Min: {overallMin.toFixed(1)}%</span>
            <span>Max: {overallMax.toFixed(1)}%</span>
            <span>Abaixo do alvo: {overallVals.length ? ((overallBelow / overallVals.length) * 100).toFixed(0) : 0}%</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
