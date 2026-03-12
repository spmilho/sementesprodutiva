import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CropInput, CropInputImport } from "./types";

export function useCropInputs(cycleId: string) {
  return useQuery({
    queryKey: ["crop_inputs", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("crop_inputs")
        .select("*")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .order("execution_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []) as CropInput[];
    },
    enabled: !!cycleId,
  });
}

export function useCropInputImports(cycleId: string) {
  return useQuery({
    queryKey: ["crop_input_imports", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("crop_input_imports")
        .select("*")
        .eq("cycle_id", cycleId)
        .order("imported_at", { ascending: false });
      if (error) throw error;
      return (data || []) as CropInputImport[];
    },
    enabled: !!cycleId,
  });
}

export function usePlantingDate(cycleId: string) {
  return useQuery({
    queryKey: ["planting_date_for_manejo", cycleId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("planting_actual")
        .select("planting_date")
        .eq("cycle_id", cycleId)
        .eq("parent_type", "female")
        .is("deleted_at", null)
        .order("planting_date", { ascending: true })
        .limit(1);
      return data?.[0]?.planting_date || null;
    },
    enabled: !!cycleId,
  });
}

export function useManejoMutations(cycleId: string, orgId: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["crop_inputs", cycleId] });
    qc.invalidateQueries({ queryKey: ["crop_input_imports", cycleId] });
  };

  const upsertInputs = useMutation({
    mutationFn: async (inputs: Partial<CropInput>[]) => {
      // For each input, check if duplicate exists (same event_code + product_name + cycle_id)
      let newCount = 0;
      let updatedCount = 0;

      for (const input of inputs) {
        if (input.event_code && input.product_name) {
          const { data: existing } = await (supabase as any)
            .from("crop_inputs")
            .select("id")
            .eq("cycle_id", cycleId)
            .eq("event_code", input.event_code)
            .eq("product_name", input.product_name)
            .is("deleted_at", null)
            .limit(1);

          if (existing && existing.length > 0) {
            // Update
            await (supabase as any)
              .from("crop_inputs")
              .update({
                ...input,
                cycle_id: cycleId,
                org_id: orgId,
              })
              .eq("id", existing[0].id);
            updatedCount++;
          } else {
            // Insert
            const { error } = await (supabase as any)
              .from("crop_inputs")
              .insert({ ...input, cycle_id: cycleId, org_id: orgId });
            if (error) throw error;
            newCount++;
          }
        } else {
          const { error } = await (supabase as any)
            .from("crop_inputs")
            .insert({ ...input, cycle_id: cycleId, org_id: orgId });
          if (error) throw error;
          newCount++;
        }
      }

      return { newCount, updatedCount, total: inputs.length };
    },
    onSuccess: () => invalidate(),
  });

  const insertManual = useMutation({
    mutationFn: async (input: Partial<CropInput>) => {
      const { error } = await (supabase as any)
        .from("crop_inputs")
        .insert({ ...input, cycle_id: cycleId, org_id: orgId, source: "manual" });
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });

  const deleteInput = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("crop_inputs")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });

  const saveImportRecord = useMutation({
    mutationFn: async (record: Partial<CropInputImport>) => {
      const { error } = await (supabase as any)
        .from("crop_input_imports")
        .insert({ ...record, cycle_id: cycleId, org_id: orgId });
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });

  return { upsertInputs, insertManual, deleteInput, saveImportRecord };
}
