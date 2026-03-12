import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useRole } from "./useRole";
import { toast } from "sonner";

export interface Contrato {
  id: string;
  org_id: string;
  tipo: string;
  titulo: string;
  numero_contrato: string | null;
  contratante: string | null;
  contratado: string | null;
  hibrido: string | null;
  safra: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  area_ha: number | null;
  volume_sacos: number | null;
  preco_por_ha: number | null;
  preco_por_saco: number | null;
  valor_total: number | null;
  observacoes: string | null;
  arquivo_url: string | null;
  arquivo_nome: string | null;
  dados_ia: any;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ContratoAditivo {
  id: string;
  contrato_id: string;
  numero_aditivo: number;
  data_aditivo: string | null;
  descricao: string | null;
  arquivo_url: string | null;
  arquivo_nome: string | null;
  dados_ia: any;
  novo_preco_por_ha: number | null;
  novo_preco_por_saco: number | null;
  novo_volume_sacos: number | null;
  nova_area_ha: number | null;
  novo_valor_total: number | null;
  nova_data_fim: string | null;
  created_by: string | null;
  created_at: string;
}

export function useContratoAccess() {
  const { user } = useAuth();
  const { isAdmin } = useRole();

  const { data } = useQuery({
    queryKey: ["contrato-acesso", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("contrato_acesso")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    canView: isAdmin || data?.pode_visualizar === true,
    canInsert: isAdmin || data?.pode_inserir === true,
    canDelete: isAdmin || data?.pode_deletar === true,
  };
}

export function useContratos() {
  return useQuery({
    queryKey: ["contratos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contratos")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Contrato[];
    },
  });
}

export function useContratoAditivos(contratoId: string | null) {
  return useQuery({
    queryKey: ["contrato-aditivos", contratoId],
    enabled: !!contratoId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contrato_aditivos")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("numero_aditivo", { ascending: true });
      if (error) throw error;
      return (data || []) as ContratoAditivo[];
    },
  });
}

export function useCreateContrato() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (contrato: Partial<Contrato>) => {
      // Get org_id from profile
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("org_id")
        .eq("id", user!.id)
        .single();

      const { data, error } = await (supabase as any)
        .from("contratos")
        .insert({ ...contrato, org_id: profile.org_id, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as Contrato;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Contrato criado com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contrato> & { id: string }) => {
      const { error } = await (supabase as any)
        .from("contratos")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Contrato atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("soft_delete_record", {
        _table_name: "contratos",
        _record_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Contrato removido");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useCreateAditivo() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (aditivo: Partial<ContratoAditivo>) => {
      const { data, error } = await (supabase as any)
        .from("contrato_aditivos")
        .insert({ ...aditivo, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as ContratoAditivo;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["contrato-aditivos", vars.contrato_id] });
      qc.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Aditivo adicionado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export async function parseContratoPdf(file: File, tipo: string): Promise<any> {
  // Read PDF as text using pdf.js alternative - send raw to AI
  const text = await file.text();

  const { data, error } = await supabase.functions.invoke("parse-contrato", {
    body: { text, tipo },
  });
  if (error) throw error;
  return data?.dados || {};
}

export async function uploadContratoPdf(file: File, orgId: string): Promise<string> {
  const path = `${orgId}/${Date.now()}_${file.name}`;
  const { error } = await supabase.storage.from("contratos").upload(path, file);
  if (error) throw error;

  const { data } = supabase.storage.from("contratos").getPublicUrl(path);
  return data.publicUrl;
}
