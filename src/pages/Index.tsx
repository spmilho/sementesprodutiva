import { Layers, Sprout, Scissors, Wheat, Droplets, BarChart3, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, ReferenceArea,
} from "recharts";
import KPICard from "@/components/KPICard";

const CHART_COLORS = {
  primary: "hsl(130, 55%, 24%)",
  accent: "hsl(42, 85%, 52%)",
  blue: "hsl(200, 65%, 48%)",
  orange: "hsl(25, 85%, 55%)",
  muted: "hsl(130, 10%, 72%)",
};

const plantingDataRaw = [
  { day: "01/01", planejado: 8, realizado: 7 },
  { day: "03/01", planejado: 12, realizado: 11 },
  { day: "05/01", planejado: 10, realizado: 12 },
  { day: "08/01", planejado: 15, realizado: 14 },
  { day: "10/01", planejado: 10, realizado: 10 },
  { day: "12/01", planejado: 8, realizado: 9 },
  { day: "15/01", planejado: 5, realizado: 4 },
];
const plantingData = plantingDataRaw.reduce((acc, item, i) => {
  const prev = i > 0 ? acc[i - 1] : { acumPlan: 0, acumReal: 0 };
  acc.push({ ...item, acumPlan: prev.acumPlan + item.planejado, acumReal: prev.acumReal + item.realizado });
  return acc;
}, [] as (typeof plantingDataRaw[0] & { acumPlan: number; acumReal: number })[]);

const moistureData = [
  { date: "25/01", umidade: 35.2 },
  { date: "01/02", umidade: 32.1 },
  { date: "05/02", umidade: 28.4 },
  { date: "08/02", umidade: 25.8 },
  { date: "10/02", umidade: 23.1 },
  { date: "12/02", umidade: 21.3 },
  { date: "14/02", umidade: 19.8 },
  { date: "16/02", umidade: 18.5 },
];

const statusData = [
  { name: "Planejamento", value: 2, color: "hsl(215, 70%, 55%)" },
  { name: "Plantio", value: 1, color: "hsl(42, 85%, 52%)" },
  { name: "Crescimento", value: 3, color: "hsl(130, 55%, 40%)" },
  { name: "Despendoamento", value: 1, color: "hsl(25, 85%, 55%)" },
  { name: "Colheita", value: 1, color: "hsl(70, 60%, 45%)" },
];

const harvestDataRaw = [
  { day: "05/02", planejado: 15, realizado: 12 },
  { day: "07/02", planejado: 18, realizado: 16 },
  { day: "09/02", planejado: 20, realizado: 22 },
  { day: "11/02", planejado: 20, realizado: 18 },
  { day: "13/02", planejado: 15, realizado: 17 },
  { day: "15/02", planejado: 12, realizado: 10 },
];
const harvestData = harvestDataRaw.reduce((acc, item, i) => {
  const prev = i > 0 ? acc[i - 1] : { acumPlan: 0, acumReal: 0 };
  acc.push({ ...item, acumPlan: prev.acumPlan + item.planejado, acumReal: prev.acumReal + item.realizado });
  return acc;
}, [] as (typeof harvestDataRaw[0] & { acumPlan: number; acumReal: number })[]);

const cyclesData = [
  { contract: "2025-0847", client: "Corteva", farm: "Faz. Santa Maria", field: "Pivô A1", hybrid: "P3456H", season: "2025/26", status: "growing", area: 45, updated: "14/02/2026" },
  { contract: "", client: "Syngenta", farm: "Faz. São José", field: "Pivô B3", hybrid: "SYN7205", season: "2025/26", status: "detasseling", area: 38, updated: "15/02/2026" },
  { contract: "2025-0912", client: "Advanta", farm: "Faz. Boa Vista", field: "Pivô C2", hybrid: "ADV9012", season: "2025/26", status: "harvest", area: 52, updated: "16/02/2026" },
  { contract: "", client: "GDM", farm: "Faz. Cerrado", field: "Pivô D1", hybrid: "GDM4510", season: "2025/26", status: "growing", area: 30, updated: "13/02/2026" },
  { contract: "2025-1003", client: "Corteva", farm: "Faz. Primavera", field: "Pivô E4", hybrid: "P4020Y", season: "2025/26", status: "planting", area: 60, updated: "16/02/2026" },
  { contract: "", client: "Syngenta", farm: "Faz. Esperança", field: "Pivô F2", hybrid: "SYN8300", season: "2025/26", status: "planning", area: 42, updated: "10/02/2026" },
  { contract: "2025-0788", client: "GDM", farm: "Faz. São Pedro", field: "Pivô G1", hybrid: "GDM5520", season: "2025/26", status: "growing", area: 35, updated: "12/02/2026" },
  { contract: "2025-0654", client: "Advanta", farm: "Faz. Ipê", field: "Pivô H3", hybrid: "ADV7800", season: "2025/26", status: "completed", area: 48, updated: "08/02/2026" },
];

const statusLabels: Record<string, string> = {
  planning: "Planejamento",
  planting: "Plantio",
  growing: "Crescimento",
  detasseling: "Despendoamento",
  harvest: "Colheita",
  completed: "Concluído",
  cancelled: "Cancelado",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium status-${status}`}>
      {statusLabels[status] || status}
    </span>
  );
}

export default function Dashboard() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Executivo</h1>
          <p className="text-sm text-muted-foreground">Visão geral da produção de sementes</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select defaultValue="2025-26">
            <SelectTrigger className="w-[130px] h-9 text-sm">
              <SelectValue placeholder="Safra" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025-26">Safra 2025/26</SelectItem>
              <SelectItem value="2024-25">Safra 2024/25</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-[130px] h-9 text-sm">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="corteva">Corteva</SelectItem>
              <SelectItem value="syngenta">Syngenta</SelectItem>
              <SelectItem value="advanta">Advanta</SelectItem>
              <SelectItem value="gdm">GDM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
        <KPICard title="Ciclos Ativos" value="8" icon={Layers} description="6 em execução" />
        <KPICard title="Plantio ♀" value="85%" icon={Sprout} progress={85} description="228 / 267 ha" />
        <KPICard title="Plantio ♂" value="92%" icon={Sprout} progress={92} description="98 / 107 ha" />
        <KPICard title="Despendoamento" value="67%" icon={Scissors} progress={67} description="3 ciclos ativos" />
        <KPICard title="Colheita" value="45%" icon={Wheat} progress={45} description="120 / 267 ha" />
        <KPICard title="Umidade Média" value="21,3%" icon={Droplets} description="↓ tendência" />
        <KPICard title="Produção" value="1.245,8 t" icon={Target} description="Meta: 2.800 t" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Plantio Plan x Real */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Plantio: Planejado × Realizado (ha)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={plantingData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(110,12%,87%)" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="planejado" name="Planejado" fill={CHART_COLORS.muted} radius={[3, 3, 0, 0]} />
                <Bar yAxisId="left" dataKey="realizado" name="Realizado" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="acumPlan" name="Acum. Plan." stroke={CHART_COLORS.muted} strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="acumReal" name="Acum. Real." stroke={CHART_COLORS.primary} strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Colheita Plan x Real */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Colheita: Planejado × Realizado (ha)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={harvestData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(110,12%,87%)" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="planejado" name="Planejado" fill={CHART_COLORS.muted} radius={[3, 3, 0, 0]} />
                <Bar yAxisId="left" dataKey="realizado" name="Realizado" fill={CHART_COLORS.accent} radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="acumPlan" name="Acum. Plan." stroke={CHART_COLORS.muted} strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="acumReal" name="Acum. Real." stroke={CHART_COLORS.accent} strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Umidade */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Evolução da Umidade (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={moistureData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(110,12%,87%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[15, 40]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <ReferenceArea y1={15} y2={18} fill="hsl(130,55%,24%)" fillOpacity={0.08} label={{ value: "Alvo", fontSize: 10, fill: CHART_COLORS.primary }} />
                <Line type="monotone" dataKey="umidade" name="Umidade %" stroke={CHART_COLORS.blue} strokeWidth={2.5} dot={{ r: 4, fill: CHART_COLORS.blue }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Status dos Ciclos</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={{ strokeWidth: 1 }}
                  style={{ fontSize: 11 }}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cycles Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Resumo dos Ciclos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Contrato / Pivô</TableHead>
                  <TableHead className="text-xs">Cliente</TableHead>
                  <TableHead className="text-xs">Fazenda</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Híbrido</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right hidden sm:table-cell">Área (ha)</TableHead>
                  <TableHead className="text-xs text-right hidden lg:table-cell">Atualização</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cyclesData.map((c, i) => (
                  <TableRow key={i} className={`cursor-pointer hover:bg-muted/50 ${!c.contract ? "bg-amber-50/40 dark:bg-amber-950/20" : ""}`}>
                    <TableCell className="text-sm">
                      {c.contract ? (
                        <span className="font-medium">{c.contract}</span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">{c.field}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                            sem contrato
                          </Badge>
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{c.client}</TableCell>
                    <TableCell className="text-sm">{c.farm}</TableCell>
                    <TableCell className="text-sm hidden md:table-cell font-mono">{c.hybrid}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="text-right text-sm hidden sm:table-cell">{c.area}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground hidden lg:table-cell">{c.updated}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
