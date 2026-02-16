import { Plus, Search as SearchIcon, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { generateCycleReport } from "@/lib/generateCycleReport";

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

const cycles = [
  { id: 1, client: "Corteva", farm: "Faz. Santa Maria", field: "Talhão A1", hybrid: "P3456H", female: "LF-201", male: "LM-105", season: "2025/26", status: "growing", area: 45, ratio: "4F:2M", irrigation: "Pivô", updated: "14/02/2026" },
  { id: 2, client: "Syngenta", farm: "Faz. São José", field: "Talhão B3", hybrid: "SYN7205", female: "LF-310", male: "LM-212", season: "2025/26", status: "detasseling", area: 38, ratio: "6F:2M", irrigation: "Sequeiro", updated: "15/02/2026" },
  { id: 3, client: "Advanta", farm: "Faz. Boa Vista", field: "Talhão C2", hybrid: "ADV9012", female: "LF-422", male: "LM-318", season: "2025/26", status: "harvest", area: 52, ratio: "4F:2M", irrigation: "Pivô", updated: "16/02/2026" },
  { id: 4, client: "GDM", farm: "Faz. Cerrado", field: "Talhão D1", hybrid: "GDM4510", female: "LF-550", male: "LM-401", season: "2025/26", status: "growing", area: 30, ratio: "4F:1M", irrigation: "Gotejo", updated: "13/02/2026" },
  { id: 5, client: "Corteva", farm: "Faz. Primavera", field: "Talhão E4", hybrid: "P4020Y", female: "LF-601", male: "LM-502", season: "2025/26", status: "planting", area: 60, ratio: "4F:2M", irrigation: "Pivô", updated: "16/02/2026" },
  { id: 6, client: "Syngenta", farm: "Faz. Esperança", field: "Talhão F2", hybrid: "SYN8300", female: "LF-715", male: "LM-610", season: "2025/26", status: "planning", area: 42, ratio: "6F:2M", irrigation: "Sequeiro", updated: "10/02/2026" },
  { id: 7, client: "GDM", farm: "Faz. São Pedro", field: "Talhão G1", hybrid: "GDM5520", female: "LF-820", male: "LM-701", season: "2025/26", status: "growing", area: 35, ratio: "4F:2M", irrigation: "Pivô", updated: "12/02/2026" },
  { id: 8, client: "Advanta", farm: "Faz. Ipê", field: "Talhão H3", hybrid: "ADV7800", female: "LF-930", male: "LM-815", season: "2025/26", status: "completed", area: 48, ratio: "4F:2M", irrigation: "Pivô", updated: "08/02/2026" },
];

export default function Cycles() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ciclos de Produção</h1>
          <p className="text-sm text-muted-foreground">{cycles.length} ciclos cadastrados</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Novo Ciclo
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por híbrido, fazenda ou cliente..." className="pl-9 h-9" />
        </div>
        <Select defaultValue="all-clients">
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-clients">Todos</SelectItem>
            <SelectItem value="corteva">Corteva</SelectItem>
            <SelectItem value="syngenta">Syngenta</SelectItem>
            <SelectItem value="advanta">Advanta</SelectItem>
            <SelectItem value="gdm">GDM</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all-status">
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-status">Todos</SelectItem>
            <SelectItem value="planning">Planejamento</SelectItem>
            <SelectItem value="planting">Plantio</SelectItem>
            <SelectItem value="growing">Crescimento</SelectItem>
            <SelectItem value="detasseling">Despendoamento</SelectItem>
            <SelectItem value="harvest">Colheita</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Cliente</TableHead>
                  <TableHead className="text-xs">Fazenda / Talhão</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Híbrido</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">♀ / ♂</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Proporção</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                   <TableHead className="text-xs text-right">Área (ha)</TableHead>
                   <TableHead className="text-xs text-right hidden sm:table-cell">Irrigação</TableHead>
                   <TableHead className="text-xs text-right hidden xl:table-cell">Atualização</TableHead>
                   <TableHead className="text-xs text-center hidden sm:table-cell">Relatório</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycles.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium text-sm">{c.client}</TableCell>
                    <TableCell className="text-sm">
                      <div>{c.farm}</div>
                      <div className="text-xs text-muted-foreground">{c.field}</div>
                    </TableCell>
                    <TableCell className="text-sm font-mono hidden md:table-cell">{c.hybrid}</TableCell>
                    <TableCell className="text-xs hidden lg:table-cell">
                      <div>{c.female}</div>
                      <div className="text-muted-foreground">{c.male}</div>
                    </TableCell>
                    <TableCell className="text-sm hidden lg:table-cell">{c.ratio}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="text-right text-sm font-medium">{c.area}</TableCell>
                    <TableCell className="text-right text-sm hidden sm:table-cell">{c.irrigation}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground hidden xl:table-cell">{c.updated}</TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => generateCycleReport(c)}>
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
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
