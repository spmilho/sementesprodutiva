import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CropInput, INPUT_TYPE_CONFIG, STATUS_CONFIG } from "./types";
import { format, parseISO } from "date-fns";

interface Props {
  inputs: CropInput[];
}

export default function ManejoTable({ inputs }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return inputs.filter(i => {
      if (typeFilter !== "all" && i.input_type !== typeFilter) return false;
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (search && !i.product_name.toLowerCase().includes(search.toLowerCase()) &&
          !(i.active_ingredient || "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [inputs, search, typeFilter, statusFilter]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-foreground">Tabela Completa</h3>
        <Input placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 w-48 text-xs" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            {Object.entries(INPUT_TYPE_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} registros</span>
      </div>

      <ScrollArea className="border rounded-md max-h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Data Exec.</TableHead>
              <TableHead className="text-xs">Produto</TableHead>
              <TableHead className="text-xs">IA</TableHead>
              <TableHead className="text-xs">Tipo</TableHead>
              <TableHead className="text-xs">Dose/ha</TableHead>
              <TableHead className="text-xs">Unid.</TableHead>
              <TableHead className="text-xs">Rec.</TableHead>
              <TableHead className="text-xs">Apl.</TableHead>
              <TableHead className="text-xs">Evento</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(r => {
              const typeCfg = INPUT_TYPE_CONFIG[r.input_type] || INPUT_TYPE_CONFIG.other;
              const statusCfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.recommended;
              return (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">
                    {r.execution_date ? format(parseISO(r.execution_date), "dd/MM/yy") : "—"}
                  </TableCell>
                  <TableCell className="text-xs font-medium">{r.product_name}</TableCell>
                  <TableCell className="text-xs">{r.active_ingredient || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${typeCfg.bgClass} ${typeCfg.colorClass}`}>
                      {typeCfg.icon} {typeCfg.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{r.dose_per_ha ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.unit || "—"}</TableCell>
                  <TableCell className="text-xs">{r.qty_recommended ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.qty_applied ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.event_type || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${statusCfg.bgClass} ${statusCfg.colorClass}`}>
                      {statusCfg.icon} {statusCfg.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
