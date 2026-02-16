import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search as SearchIcon, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

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

export default function Cycles() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterSeason, setFilterSeason] = useState("all");
  const [filterClient, setFilterClient] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: cycles = [], isLoading } = useQuery({
    queryKey: ["production_cycles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("production_cycles")
        .select("*, clients(name), farms(name)")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const clients = useMemo(() => {
    const unique = new Map<string, string>();
    cycles.forEach((c: any) => {
      if (c.clients?.name) unique.set(c.client_id, c.clients.name);
    });
    return Array.from(unique, ([id, name]) => ({ id, name }));
  }, [cycles]);

  const seasons = useMemo(() => {
    const unique = new Set<string>();
    cycles.forEach((c: any) => unique.add(c.season));
    return Array.from(unique).sort().reverse();
  }, [cycles]);

  const filtered = useMemo(() => {
    return cycles.filter((c: any) => {
      if (filterSeason !== "all" && c.season !== filterSeason) return false;
      if (filterClient !== "all" && c.client_id !== filterClient) return false;
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        const match =
          c.hybrid_name?.toLowerCase().includes(q) ||
          c.field_name?.toLowerCase().includes(q) ||
          c.clients?.name?.toLowerCase().includes(q) ||
          c.farms?.name?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [cycles, filterSeason, filterClient, filterStatus, search]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ciclos de Produção</h1>
          <p className="text-sm text-muted-foreground">{cycles.length} ciclos cadastrados</p>
        </div>
        <Button className="gap-2" onClick={() => navigate("/ciclos/novo")}>
          <Plus className="h-4 w-4" /> Novo Ciclo
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por híbrido, fazenda ou cliente..."
            className="pl-9 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterSeason} onValueChange={setFilterSeason}>
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <SelectValue placeholder="Safra" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Safras</SelectItem>
            {seasons.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              {cycles.length === 0 ? "Nenhum ciclo cadastrado ainda." : "Nenhum ciclo encontrado com os filtros aplicados."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Safra</TableHead>
                    <TableHead className="text-xs">Cliente</TableHead>
                    <TableHead className="text-xs">Fazenda</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Talhão</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Híbrido</TableHead>
                    <TableHead className="text-xs text-right">Área (ha)</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right hidden sm:table-cell">Atualização</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c: any) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/ciclos/${c.id}`)}
                    >
                      <TableCell className="text-sm font-medium">{c.season}</TableCell>
                      <TableCell className="text-sm">{c.clients?.name}</TableCell>
                      <TableCell className="text-sm">{c.farms?.name}</TableCell>
                      <TableCell className="text-sm hidden md:table-cell">{c.field_name}</TableCell>
                      <TableCell className="text-sm font-mono hidden md:table-cell">{c.hybrid_name}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{c.total_area}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground hidden sm:table-cell">
                        {format(new Date(c.updated_at), "dd/MM/yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
