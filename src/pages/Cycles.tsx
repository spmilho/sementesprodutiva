import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search as SearchIcon, Loader2, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
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

function ContractIdentifier({ contractNumber, fieldName }: { contractNumber?: string | null; fieldName: string }) {
  if (contractNumber) {
    return <span className="font-medium">{contractNumber}</span>;
  }
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{fieldName}</span>
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
        sem contrato
      </Badge>
    </span>
  );
}

export default function Cycles() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin } = useRole();
  const [search, setSearch] = useState("");
  const [filterSeason, setFilterSeason] = useState("all");
  const [filterClient, setFilterClient] = useState("all");
  const [filterCooperator, setFilterCooperator] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const deleteMutation = useMutation({
    mutationFn: async (cycleId: string) => {
      const { error } = await (supabase as any).rpc("soft_delete_record", {
        p_table_name: "production_cycles",
        p_record_id: cycleId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production_cycles"] });
      toast.success("Ciclo excluído com sucesso!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const { data: cycles = [], isLoading } = useQuery({
    queryKey: ["production_cycles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("production_cycles")
        .select("*, clients(name), farms(name), cooperators(name)")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const clients = useMemo(() => {
    const unique = new Map<string, string>();
    cycles.forEach((c: any) => { if (c.clients?.name) unique.set(c.client_id, c.clients.name); });
    return Array.from(unique, ([id, name]) => ({ id, name }));
  }, [cycles]);

  const cooperatorsList = useMemo(() => {
    const unique = new Map<string, string>();
    cycles.forEach((c: any) => { if (c.cooperators?.name) unique.set(c.cooperator_id, c.cooperators.name); });
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
      if (filterCooperator !== "all" && c.cooperator_id !== filterCooperator) return false;
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        const match =
          c.hybrid_name?.toLowerCase().includes(q) ||
          c.field_name?.toLowerCase().includes(q) ||
          c.contract_number?.toLowerCase().includes(q) ||
          c.clients?.name?.toLowerCase().includes(q) ||
          c.farms?.name?.toLowerCase().includes(q) ||
          c.cooperators?.name?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [cycles, filterSeason, filterClient, filterCooperator, filterStatus, search]);

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
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por contrato, pivô, híbrido, cooperado..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterSeason} onValueChange={setFilterSeason}>
          <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Safra" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Safras</SelectItem>
            {seasons.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Cliente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCooperator} onValueChange={setFilterCooperator}>
          <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Cooperado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {cooperatorsList.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              {cycles.length === 0 ? "Nenhum ciclo cadastrado ainda." : "Nenhum ciclo encontrado com os filtros aplicados."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Contrato / Pivô</TableHead>
                    <TableHead className="text-xs">Safra</TableHead>
                    <TableHead className="text-xs">Cliente</TableHead>
                    <TableHead className="text-xs">Cooperado</TableHead>
                    <TableHead className="text-xs">Fazenda</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Híbrido</TableHead>
                    <TableHead className="text-xs text-right">Área (ha)</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                     <TableHead className="text-xs text-right hidden sm:table-cell">Atualização</TableHead>
                     {isAdmin && <TableHead className="text-xs w-10"></TableHead>}
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {filtered.map((c: any) => (
                    <TableRow
                      key={c.id}
                      className={`cursor-pointer hover:bg-muted/50 ${!c.contract_number ? "bg-amber-50/40 dark:bg-amber-950/20" : ""}`}
                      onClick={() => navigate(`/ciclos/${c.id}`)}
                    >
                      <TableCell className="text-sm">
                        <ContractIdentifier contractNumber={c.contract_number} fieldName={c.field_name} />
                      </TableCell>
                      <TableCell className="text-sm font-medium">{c.season}</TableCell>
                      <TableCell className="text-sm">{c.clients?.name}</TableCell>
                      <TableCell className="text-sm">{c.cooperators?.name || "—"}</TableCell>
                      <TableCell className="text-sm">{c.farms?.name}</TableCell>
                      <TableCell className="text-sm font-mono hidden md:table-cell">{c.hybrid_name}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{c.total_area}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                       <TableCell className="text-right text-sm text-muted-foreground hidden sm:table-cell">
                         {format(new Date(c.updated_at), "dd/MM/yyyy")}
                       </TableCell>
                       {isAdmin && (
                         <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                           <AlertDialog>
                             <AlertDialogTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                             </AlertDialogTrigger>
                             <AlertDialogContent>
                               <AlertDialogHeader>
                                 <AlertDialogTitle>Excluir ciclo?</AlertDialogTitle>
                                 <AlertDialogDescription>
                                   Tem certeza que deseja excluir o ciclo <strong>{c.contract_number || c.field_name}</strong> ({c.hybrid_name})?
                                   Esta ação não pode ser desfeita.
                                 </AlertDialogDescription>
                               </AlertDialogHeader>
                               <AlertDialogFooter>
                                 <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                 <AlertDialogAction
                                   className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                   onClick={() => deleteMutation.mutate(c.id)}
                                 >
                                   Excluir
                                 </AlertDialogAction>
                               </AlertDialogFooter>
                             </AlertDialogContent>
                           </AlertDialog>
                         </TableCell>
                       )}
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
