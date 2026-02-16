import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Pencil, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import FarmFormDialog from "./FarmFormDialog";

export interface Farm {
  id: string;
  org_id: string;
  name: string;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  cooperator_name: string | null;
  cooperator_document: string | null;
  cooperator_phone: string | null;
  cooperator_email: string | null;
  address: string | null;
  status: string;
}

export default function FarmsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);

  const { data: farms = [], isLoading } = useQuery({
    queryKey: ["farms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("farms")
        .select("*")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data as unknown as Farm[];
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async (farm: Farm) => {
      const newStatus = farm.status === "active" ? "inactive" : "active";
      const { error } = await (supabase as any)
        .from("farms")
        .update({ status: newStatus })
        .eq("id", farm.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farms"] });
      toast.success("Status atualizado");
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const filtered = farms.filter((f) => {
    const q = search.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      (f.cooperator_name?.toLowerCase().includes(q) ?? false) ||
      (f.city?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar fazenda ou cooperado..."
            className="pl-9 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
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
                  <TableHead className="text-xs">Nome da Fazenda</TableHead>
                  <TableHead className="text-xs">Cooperado</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Cidade/UF</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Telefone</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
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
                      <TableCell className="text-sm">{f.cooperator_name || "—"}</TableCell>
                      <TableCell className="text-sm hidden sm:table-cell">
                        {f.city && f.state ? `${f.city}/${f.state}` : f.city || f.state || "—"}
                      </TableCell>
                      <TableCell className="text-sm hidden md:table-cell">
                        {f.cooperator_phone || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={f.status === "active" ? "default" : "secondary"}>
                          {f.status === "active" ? "Ativo" : "Inativo"}
                        </Badge>
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
                            onClick={() => toggleStatus.mutate(f)}
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
      />
    </div>
  );
}
