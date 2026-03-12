import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calcStats, getCvLabel, getOverallStatus, isFemaleType, isMaleType, getPlantingTypeInfo, calcMaleAreaForGleba } from "./planting-utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from "recharts";

interface Props {
  plans: any[];
  actuals: any[];
  cvPoints: any[];
  cvRecords: any[];
  standCounts: any[];
  standPoints: any[];
  glebas: any[];
  femaleArea?: number;
  maleArea?: number;
}

export default function PlantingDashboard({ plans, actuals, cvPoints, standCounts, standPoints, glebas, femaleArea, maleArea }: Props) {
  // Calculate CV% planting per type
  const cvPlantingStats = useMemo(() => {
    const result: Record<string, { cv: number; mean: number; n: number }> = {};
    for (const type of ["female", "male"]) {
      const filteredActuals = actuals.filter((a: any) => type === "female" ? isFemaleType(a.type) : isMaleType(a.type));
      const allPoints = filteredActuals.flatMap((a: any) =>
        cvPoints.filter((p: any) => p.planting_actual_id === a.id).map((p: any) => Number(p.seeds_per_meter))
      ).filter(v => v > 0);
      result[type] = calcStats(allPoints);
    }
    return result;
  }, [actuals, cvPoints]);

  // Stand stats per type (latest count)
  const standStats = useMemo(() => {
    const result: Record<string, { avgPlantsHa: number; avgPlantsPerMeter: number; cv: number; emergPct: number; n: number }> = {};
    for (const type of ["female", "male"]) {
      const counts = standCounts.filter((s: any) => s.parent_type === type);
      if (counts.length === 0) {
        result[type] = { avgPlantsHa: 0, avgPlantsPerMeter: 0, cv: 0, emergPct: 0, n: 0 };
        continue;
      }
      const latest = counts[0];
      const pts = standPoints.filter((p: any) => p.stand_count_id === latest.id);
      result[type] = {
        avgPlantsHa: latest.avg_plants_per_ha ?? 0,
        avgPlantsPerMeter: latest.avg_plants_per_meter ?? 0,
        cv: latest.cv_stand_pct ?? 0,
        emergPct: latest.emergence_pct ?? 0,
        n: pts.length,
      };
    }
    return result;
  }, [standCounts, standPoints]);

  // Chart data by gleba
  const glebaChartData = useMemo(() => {
    const glebaMap = new Map<string, { name: string; cvPlantingF: number; cvPlantingM: number; cvStandF: number; cvStandM: number; popF: number; popM: number; popPlanF: number; popPlanM: number; emergF: number; emergM: number; ppmF: number; ppmM: number; ppmPlanF: number; ppmPlanM: number }>();

    const getGlebaName = (glebaId: string | null) => {
      if (!glebaId) return "Geral";
      return glebas.find((g: any) => g.id === glebaId)?.name || "Geral";
    };

    // Process actuals for CV planting
    const glebaIds = new Set<string>();
    actuals.forEach((a: any) => glebaIds.add(a.gleba_id || "none"));
    standCounts.forEach((s: any) => glebaIds.add(s.gleba_id || "none"));

    glebaIds.forEach(gid => {
      const name = getGlebaName(gid === "none" ? null : gid);
      const entry = { name, cvPlantingF: 0, cvPlantingM: 0, cvStandF: 0, cvStandM: 0, popF: 0, popM: 0, popPlanF: 0, popPlanM: 0, emergF: 0, emergM: 0, ppmF: 0, ppmM: 0, ppmPlanF: 0, ppmPlanM: 0 };

      // CV planting
      for (const type of ["female", "male"] as const) {
        const filtered = actuals.filter((a: any) => (a.gleba_id || "none") === gid && (type === "female" ? isFemaleType(a.type) : isMaleType(a.type)));
        const pts = filtered.flatMap((a: any) => cvPoints.filter((p: any) => p.planting_actual_id === a.id).map((p: any) => Number(p.seeds_per_meter))).filter(v => v > 0);
        const stats = calcStats(pts);
        if (type === "female") entry.cvPlantingF = stats.cv;
        else entry.cvPlantingM = stats.cv;
      }

      // Stand
      for (const type of ["female", "male"] as const) {
        const counts = standCounts.filter((s: any) => (s.gleba_id || "none") === gid && s.parent_type === type);
        if (counts.length > 0) {
          const latest = counts[0];
          if (type === "female") {
            entry.cvStandF = latest.cv_stand_pct ?? 0;
            entry.popF = latest.avg_plants_per_ha ?? 0;
            entry.ppmF = latest.avg_plants_per_meter ?? 0;
            entry.emergF = latest.emergence_pct ?? 0;
          } else {
            entry.cvStandM = latest.cv_stand_pct ?? 0;
            entry.popM = latest.avg_plants_per_ha ?? 0;
            entry.ppmM = latest.avg_plants_per_meter ?? 0;
            entry.emergM = latest.emergence_pct ?? 0;
          }
        }
      }

      // Planned pop (convert to plants/meter for chart)
      for (const type of ["female", "male"] as const) {
        const filtered = plans.filter((p: any) => (p.gleba_id || "none") === gid && (type === "female" ? isFemaleType(p.type) : isMaleType(p.type)));
        if (filtered.length) {
          const avgPop = filtered.reduce((s: number, p: any) => s + (p.target_population || 0), 0) / filtered.length;
          const avgSeeds = filtered.reduce((s: number, p: any) => s + (p.seeds_per_meter || 0), 0) / filtered.length;
          if (type === "female") { entry.popPlanF = avgPop; entry.ppmPlanF = avgSeeds; }
          else { entry.popPlanM = avgPop; entry.ppmPlanM = avgSeeds; }
        }
      }

      glebaMap.set(gid, entry);
    });

    return Array.from(glebaMap.values());
  }, [actuals, cvPoints, standCounts, plans, glebas]);

  // Summary table data
  const summaryRows = useMemo(() => {
    const rows: any[] = [];
    const glebaIds = new Set<string>();
    actuals.forEach((a: any) => glebaIds.add(a.gleba_id || "none"));
    standCounts.forEach((s: any) => glebaIds.add(s.gleba_id || "none"));

    glebaIds.forEach(gid => {
      const glebaName = gid === "none" ? "Geral" : glebas.find((g: any) => g.id === gid)?.name || "Geral";
      for (const pType of ["female", "male"]) {
        const filteredActuals = actuals.filter((a: any) => (a.gleba_id || "none") === gid && (pType === "female" ? isFemaleType(a.type) : isMaleType(a.type)));
        // Use cycle-defined areas instead of summing from actuals
        const area = pType === "female" ? (femaleArea ?? 0) : (maleArea ?? 0);
        const pts = filteredActuals.flatMap((a: any) => cvPoints.filter((p: any) => p.planting_actual_id === a.id).map((p: any) => Number(p.seeds_per_meter))).filter(v => v > 0);
        const plantingStats = calcStats(pts);

        const sc = standCounts.filter((s: any) => (s.gleba_id || "none") === gid && s.parent_type === pType);
        const latest = sc[0];

        const planPop = plans.filter((p: any) => (p.gleba_id || "none") === gid && (pType === "female" ? isFemaleType(p.type) : isMaleType(p.type)));
        const avgPlanPop = planPop.length ? planPop.reduce((s: number, p: any) => s + (p.target_population || 0), 0) / planPop.length : null;

        if (area > 0 || latest) {
          rows.push({
            gleba: glebaName,
            parental: pType === "female" ? "Fêmea" : "Macho",
            area: area.toFixed(2),
            seedsPerMeter: plantingStats.mean > 0 ? plantingStats.mean.toFixed(2) : "—",
            cvPlanting: plantingStats.cv > 0 ? plantingStats.cv.toFixed(1) : "—",
            popPlan: avgPlanPop ? Math.round(avgPlanPop).toLocaleString("pt-BR") : "—",
            popReal: latest?.avg_plants_per_ha ? Math.round(latest.avg_plants_per_ha).toLocaleString("pt-BR") : "—",
            cvStand: latest?.cv_stand_pct != null ? latest.cv_stand_pct.toFixed(1) : "—",
            emergPct: latest?.emergence_pct != null ? latest.emergence_pct.toFixed(1) + "%" : "—",
            status: getOverallStatus(plantingStats.cv || null, latest?.cv_stand_pct ?? null, latest?.emergence_pct ?? null),
          });
        }
      }
    });
    return rows;
  }, [actuals, cvPoints, standCounts, plans, glebas]);

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-foreground border-b pb-2">📊 Dashboard Consolidado de Plantio</h3>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* CV% Plantio Fêmea */}
        <Card><CardContent className="p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CV% Plantio Fêmea</p>
          {cvPlantingStats.female.n > 0 ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">{cvPlantingStats.female.cv.toFixed(1)}%</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${getCvLabel(cvPlantingStats.female.cv).bg}`}>{getCvLabel(cvPlantingStats.female.cv).emoji}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Média: {cvPlantingStats.female.mean.toFixed(2)} sem/m | {cvPlantingStats.female.n} pts</p>
            </>
          ) : <p className="text-sm text-muted-foreground">Sem dados</p>}
        </CardContent></Card>

        {/* CV% Plantio Macho */}
        <Card><CardContent className="p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CV% Plantio Macho</p>
          {cvPlantingStats.male.n > 0 ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">{cvPlantingStats.male.cv.toFixed(1)}%</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${getCvLabel(cvPlantingStats.male.cv).bg}`}>{getCvLabel(cvPlantingStats.male.cv).emoji}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Média: {cvPlantingStats.male.mean.toFixed(2)} sem/m | {cvPlantingStats.male.n} pts</p>
            </>
          ) : <p className="text-sm text-muted-foreground">Sem dados</p>}
        </CardContent></Card>

        {/* Pop Fêmea - plantas/metro */}
        <Card><CardContent className="p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pop. Fêmea</p>
          {standStats.female.avgPlantsPerMeter > 0 ? (
            <>
              <p className="text-xl font-bold">{standStats.female.avgPlantsPerMeter.toFixed(2)} <span className="text-xs font-normal">pl/m</span></p>
              <p className="text-[10px] text-muted-foreground">Emerg: {standStats.female.emergPct.toFixed(0)}% | CV: {standStats.female.cv.toFixed(1)}%</p>
            </>
          ) : <p className="text-sm text-muted-foreground">Sem dados</p>}
        </CardContent></Card>

        {/* Pop Macho - plantas/metro */}
        <Card><CardContent className="p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pop. Macho</p>
          {standStats.male.avgPlantsPerMeter > 0 ? (
            <>
              <p className="text-xl font-bold">{standStats.male.avgPlantsPerMeter.toFixed(2)} <span className="text-xs font-normal">pl/m</span></p>
              <p className="text-[10px] text-muted-foreground">Emerg: {standStats.male.emergPct.toFixed(0)}% | CV: {standStats.male.cv.toFixed(1)}%</p>
            </>
          ) : <p className="text-sm text-muted-foreground">Sem dados</p>}
        </CardContent></Card>

        {/* CV% Stand Fêmea */}
        <Card><CardContent className="p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CV% Stand Fêmea</p>
          {standStats.female.n > 0 ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">{standStats.female.cv.toFixed(1)}%</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${getCvLabel(standStats.female.cv).bg}`}>{getCvLabel(standStats.female.cv).emoji}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{standStats.female.n} pontos</p>
            </>
          ) : <p className="text-sm text-muted-foreground">Sem dados</p>}
        </CardContent></Card>

        {/* CV% Stand Macho */}
        <Card><CardContent className="p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CV% Stand Macho</p>
          {standStats.male.n > 0 ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">{standStats.male.cv.toFixed(1)}%</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${getCvLabel(standStats.male.cv).bg}`}>{getCvLabel(standStats.male.cv).emoji}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{standStats.male.n} pontos</p>
            </>
          ) : <p className="text-sm text-muted-foreground">Sem dados</p>}
        </CardContent></Card>
      </div>

      {/* Charts Row 1: CV% by gleba */}
      {glebaChartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card><CardContent className="p-4">
            <p className="text-sm font-medium mb-3">CV% de Plantio por Gleba</p>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={glebaChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <ReferenceLine y={15} stroke="#22c55e" strokeDasharray="5 5" label="15%" />
                <ReferenceLine y={20} stroke="#eab308" strokeDasharray="5 5" label="20%" />
                <ReferenceLine y={25} stroke="#ef4444" strokeDasharray="5 5" label="25%" />
                <Bar dataKey="cvPlantingF" name="CV% Fêmea" fill="#1E88E5" barSize={20} />
                <Bar dataKey="cvPlantingM" name="CV% Macho" fill="#4CAF50" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent></Card>

          <Card><CardContent className="p-4">
            <p className="text-sm font-medium mb-3">CV% de Stand por Gleba</p>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={glebaChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <ReferenceLine y={15} stroke="#22c55e" strokeDasharray="5 5" label="15%" />
                <ReferenceLine y={20} stroke="#eab308" strokeDasharray="5 5" label="20%" />
                <ReferenceLine y={25} stroke="#ef4444" strokeDasharray="5 5" label="25%" />
                <Bar dataKey="cvStandF" name="CV% Fêmea" fill="#1E88E5" barSize={20} />
                <Bar dataKey="cvStandM" name="CV% Macho" fill="#4CAF50" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent></Card>
        </div>
      )}

      {/* Charts Row 2: Population & Emergence */}
      {glebaChartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card><CardContent className="p-4">
            <p className="text-sm font-medium mb-3">População Final — Plantas/Metro Linear</p>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={glebaChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar dataKey="ppmF" name="Pl/m Fêmea Real" fill="#1E88E5" barSize={16} />
                <Bar dataKey="ppmPlanF" name="Pl/m Fêmea Plan." fill="#90CAF9" barSize={16} />
                <Bar dataKey="ppmM" name="Pl/m Macho Real" fill="#4CAF50" barSize={16} />
                <Bar dataKey="ppmPlanM" name="Pl/m Macho Plan." fill="#A5D6A7" barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent></Card>

          <Card><CardContent className="p-4">
            <p className="text-sm font-medium mb-3">% Emergência por Gleba</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={glebaChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" domain={[0, 110]} />
                <Tooltip />
                <Legend />
                <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="5 5" label="90%" />
                <Bar dataKey="emergF" name="% Emerg. Fêmea" fill="#1E88E5" barSize={20} />
                <Bar dataKey="emergM" name="% Emerg. Macho" fill="#4CAF50" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent></Card>
        </div>
      )}

      {/* Summary Table */}
      {summaryRows.length > 0 && (
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Gleba</TableHead>
                  <TableHead className="text-xs">Parental</TableHead>
                  <TableHead className="text-xs text-right">Área(ha)</TableHead>
                  <TableHead className="text-xs text-right">Sem/metro</TableHead>
                  <TableHead className="text-xs text-right">CV% Plantio</TableHead>
                  <TableHead className="text-xs text-right">Pop.Plan.</TableHead>
                  <TableHead className="text-xs text-right">Pop.Real</TableHead>
                  <TableHead className="text-xs text-right">CV% Stand</TableHead>
                  <TableHead className="text-xs text-right">%Emerg.</TableHead>
                  <TableHead className="text-xs text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryRows.map((r: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{r.gleba}</TableCell>
                    <TableCell className="text-sm">{r.parental}</TableCell>
                    <TableCell className="text-sm text-right">{r.area}</TableCell>
                    <TableCell className="text-sm text-right font-mono">{r.seedsPerMeter}</TableCell>
                    <TableCell className="text-sm text-right">{r.cvPlanting !== "—" ? <span className={getCvLabel(parseFloat(r.cvPlanting)).color}>{r.cvPlanting}%</span> : "—"}</TableCell>
                    <TableCell className="text-sm text-right">{r.popPlan}</TableCell>
                    <TableCell className="text-sm text-right font-semibold">{r.popReal}</TableCell>
                    <TableCell className="text-sm text-right">{r.cvStand !== "—" ? <span className={getCvLabel(parseFloat(r.cvStand)).color}>{r.cvStand}%</span> : "—"}</TableCell>
                    <TableCell className="text-sm text-right">{r.emergPct}</TableCell>
                    <TableCell className="text-center">{r.status.icon}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}
