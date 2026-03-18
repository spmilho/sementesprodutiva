import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { repairAmbiguousIsoRecordDates } from "./weatherDateUtils";

export function useWaterFiles(cycleId: string) {
  return useQuery({
    queryKey: ["water_files", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("water_files").select("*").eq("cycle_id", cycleId)
        .is("deleted_at", null).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useIrrigationRecords(cycleId: string) {
  return useQuery({
    queryKey: ["irrigation_records", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("irrigation_records").select("*").eq("cycle_id", cycleId)
        .is("deleted_at", null).order("start_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useRainfallRecords(cycleId: string) {
  return useQuery({
    queryKey: ["rainfall_records", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("rainfall_records").select("*").eq("cycle_id", cycleId)
        .is("deleted_at", null).order("record_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useWeatherRecords(cycleId: string) {
  return useQuery({
    queryKey: ["weather_records", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("weather_records").select("*").eq("cycle_id", cycleId)
        .is("deleted_at", null).order("record_date", { ascending: true });
      if (error) throw error;
      return repairAmbiguousIsoRecordDates((data || []) as any[]);
    },
  });
}

export function useWaterMutations(cycleId: string, orgId: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["water_files", cycleId] });
    qc.invalidateQueries({ queryKey: ["irrigation_records", cycleId] });
    qc.invalidateQueries({ queryKey: ["rainfall_records", cycleId] });
    qc.invalidateQueries({ queryKey: ["weather_records", cycleId] });
  };

  const saveFile = useMutation({
    mutationFn: async (file: {
      file_name: string; file_type: string; content_type: string;
      description?: string; reference_date?: string; file_url: string;
      file_size_bytes: number; parsed_data?: any; extracted_html?: string;
      extracted_images?: string[];
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any).from("water_files").insert({
        cycle_id: cycleId, org_id: orgId, created_by: u.user?.id, ...file,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { invalidate(); toast.success("Arquivo salvo!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteFile = useMutation({
    mutationFn: async (fileId: string) => {
      const { error } = await (supabase as any).rpc("soft_delete_record", {
        _table_name: "water_files", _record_id: fileId,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Arquivo removido!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveIrrigation = useMutation({
    mutationFn: async (rec: {
      start_date: string; end_date?: string; depth_mm: number;
      duration_hours?: number; system_type?: string; sector?: string;
      notes?: string; source?: string; source_file_id?: string;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("irrigation_records").insert({
        cycle_id: cycleId, org_id: orgId, created_by: u.user?.id,
        source: rec.source || "manual", ...rec,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Registro de irrigação salvo!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveRainfall = useMutation({
    mutationFn: async (rec: {
      record_date: string; precipitation_mm: number; method?: string;
      notes?: string; source?: string; source_file_id?: string;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("rainfall_records").insert({
        cycle_id: cycleId, org_id: orgId, created_by: u.user?.id,
        source: rec.source || "manual", ...rec,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Registro de chuva salvo!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveWeatherRecords = useMutation({
    mutationFn: async (records: Record<string, any>[]) => {
      const { data: u } = await supabase.auth.getUser();
      const rows = records.map(r => ({
        cycle_id: cycleId, org_id: orgId, created_by: u.user?.id,
        source: "imported", ...r,
      }));
      const { error } = await (supabase as any).from("weather_records").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteWeatherBatch = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("weather_records")
        .update({ deleted_at: new Date().toISOString() })
        .eq("cycle_id", cycleId)
        .is("deleted_at", null);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteIrrigation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("soft_delete_record", {
        _table_name: "irrigation_records", _record_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Registro removido!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteRainfall = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("soft_delete_record", {
        _table_name: "rainfall_records", _record_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Registro removido!"); },
    onError: (e: any) => toast.error(e.message),
  });

  return { saveFile, deleteFile, saveIrrigation, saveRainfall, saveWeatherRecords, deleteWeatherBatch, deleteIrrigation, deleteRainfall };
}
