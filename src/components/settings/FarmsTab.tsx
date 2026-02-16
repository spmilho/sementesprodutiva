import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Pencil, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import FarmFormDialog from "./FarmFormDialog";
import type { Client } from "./ClientsTab";

export interface Farm {
  id: string;
  org_id: string;
  client_id: string;
  name: string;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  cooperado_name?: string | null;
  cooperado_phone?: string | null;
  cooperado_email?: string | null;
  clients?: { name: string };
}

export default function FarmsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data as Client[];
    },
  });

  const { data: farms = [], isLoading } = useQuery({
    queryKey: ["farms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("farms")
        .select("*, clients(name)")
        .order("name");
      if (error) throw error;
      return data as Farm[];
    },
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("farms")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farms"] });
      toast.success("Fazenda desativada");
    },
    onError: () => toast.error("Erro ao desativar"),
  });

  const filtered = farms.filter((f) => {
    const matchSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.city?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchClient = clientFilter === "all" || f.client_id === clientFilter;
    return matchSearch && matchClient;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar fazenda..."
            className="pl-9 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          className="gap-2"
          onClick={() => {
            setEditingFarm(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nova Fazenda
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Nome</TableHead>
                  <TableHead className="text-xs">Cliente</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Cooperado</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Cidade/UF</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Coordenadas</TableHead>
                  <TableHead className="text-xs text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                      Nenhuma fazenda encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium text-sm">{f.name}</TableCell>
                      <TableCell className="text-sm">{f.clients?.name || "—"}</TableCell>
                      <TableCell className="text-sm hidden sm:table-cell">
                        {f.cooperado_name ? (
                          <div>
                            <div>{f.cooperado_name}</div>
                            {f.cooperado_phone && <div className="text-xs text-muted-foreground">{f.cooperado_phone}</div>}
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-sm hidden md:table-cell">
                        {f.city && f.state ? `${f.city}/${f.state}` : f.city || f.state || "—"}
                      </TableCell>
                      <TableCell className="text-sm font-mono hidden lg:table-cell">
                        {f.latitude && f.longitude
                          ? `${f.latitude.toFixed(4)}, ${f.longitude.toFixed(4)}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => {
                              setEditingFarm(f);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => softDelete.mutate(f.id)}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <FarmFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        farm={editingFarm}
        clients={clients}
      />
    </div>
  );
}
