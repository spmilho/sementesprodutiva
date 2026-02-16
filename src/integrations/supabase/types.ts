export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      client_contacts: {
        Row: {
          client_id: string
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          name: string
          org_id: string
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name: string
          org_id: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name?: string
          org_id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          created_at: string
          deleted_at: string | null
          id: string
          logo_url: string | null
          name: string
          org_id: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          org_id: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          org_id?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cooperators: {
        Row: {
          active: boolean
          address: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          document: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          org_id: string
          phone: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          org_id: string
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          org_id?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cooperators_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      emergence_counts: {
        Row: {
          count_date: string
          created_at: string
          cycle_id: string
          deleted_at: string | null
          emergence_pct: number
          id: string
          latitude: number | null
          line_length: number
          longitude: number | null
          observations: string | null
          org_id: string
          plant_count: number
          plants_per_ha: number
          plants_per_meter: number
          row_spacing: number
          sample_point: string
          target_population: number
          type: string
          updated_at: string
        }
        Insert: {
          count_date: string
          created_at?: string
          cycle_id: string
          deleted_at?: string | null
          emergence_pct: number
          id?: string
          latitude?: number | null
          line_length?: number
          longitude?: number | null
          observations?: string | null
          org_id: string
          plant_count: number
          plants_per_ha: number
          plants_per_meter: number
          row_spacing?: number
          sample_point: string
          target_population?: number
          type: string
          updated_at?: string
        }
        Update: {
          count_date?: string
          created_at?: string
          cycle_id?: string
          deleted_at?: string | null
          emergence_pct?: number
          id?: string
          latitude?: number | null
          line_length?: number
          longitude?: number | null
          observations?: string | null
          org_id?: string
          plant_count?: number
          plants_per_ha?: number
          plants_per_meter?: number
          row_spacing?: number
          sample_point?: string
          target_population?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergence_counts_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergence_counts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      farms: {
        Row: {
          active: boolean
          address: string | null
          city: string | null
          client_id: string | null
          cooperado_email: string | null
          cooperado_name: string | null
          cooperado_phone: string | null
          cooperator_document: string | null
          cooperator_email: string | null
          cooperator_id: string | null
          cooperator_name: string | null
          cooperator_phone: string | null
          created_at: string
          deleted_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          org_id: string
          state: string | null
          status: string
          total_area_ha: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          city?: string | null
          client_id?: string | null
          cooperado_email?: string | null
          cooperado_name?: string | null
          cooperado_phone?: string | null
          cooperator_document?: string | null
          cooperator_email?: string | null
          cooperator_id?: string | null
          cooperator_name?: string | null
          cooperator_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          org_id: string
          state?: string | null
          status?: string
          total_area_ha?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          city?: string | null
          client_id?: string | null
          cooperado_email?: string | null
          cooperado_name?: string | null
          cooperado_phone?: string | null
          cooperator_document?: string | null
          cooperator_email?: string | null
          cooperator_id?: string | null
          cooperator_name?: string | null
          cooperator_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          org_id?: string
          state?: string | null
          status?: string
          total_area_ha?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "farms_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farms_cooperator_id_fkey"
            columns: ["cooperator_id"]
            isOneToOne: false
            referencedRelation: "cooperators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farms_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nicking_observations: {
        Row: {
          action_taken: string | null
          created_at: string
          cycle_id: string
          deleted_at: string | null
          female_stage: string
          id: string
          latitude: number
          longitude: number
          male_stage: string
          observation_date: string
          observations: string | null
          org_id: string
          photo_url: string | null
          pollen_availability: string
          silk_reception_pct: number
          synchrony_status: string
          updated_at: string
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          cycle_id: string
          deleted_at?: string | null
          female_stage: string
          id?: string
          latitude: number
          longitude: number
          male_stage: string
          observation_date: string
          observations?: string | null
          org_id: string
          photo_url?: string | null
          pollen_availability: string
          silk_reception_pct?: number
          synchrony_status: string
          updated_at?: string
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          cycle_id?: string
          deleted_at?: string | null
          female_stage?: string
          id?: string
          latitude?: number
          longitude?: number
          male_stage?: string
          observation_date?: string
          observations?: string | null
          org_id?: string
          photo_url?: string | null
          pollen_availability?: string
          silk_reception_pct?: number
          synchrony_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nicking_observations_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nicking_observations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      phenology_records: {
        Row: {
          created_at: string
          cycle_id: string
          deleted_at: string | null
          description: string | null
          id: string
          latitude: number | null
          longitude: number | null
          observation_date: string
          org_id: string
          photo_url: string | null
          stage: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_id: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          observation_date: string
          org_id: string
          photo_url?: string | null
          stage: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_id?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          observation_date?: string
          org_id?: string
          photo_url?: string | null
          stage?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "phenology_records_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phenology_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pivots: {
        Row: {
          active: boolean
          area_ha: number | null
          created_at: string
          deleted_at: string | null
          farm_id: string
          id: string
          irrigation_type: string | null
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          org_id: string
          status: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          area_ha?: number | null
          created_at?: string
          deleted_at?: string | null
          farm_id: string
          id?: string
          irrigation_type?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          org_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          area_ha?: number | null
          created_at?: string
          deleted_at?: string | null
          farm_id?: string
          id?: string
          irrigation_type?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          org_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pivots_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pivots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      planting_actual: {
        Row: {
          actual_area: number
          created_at: string
          cv_percent: number | null
          cycle_id: string
          deleted_at: string | null
          id: string
          observations: string | null
          org_id: string
          planter_speed: number | null
          planting_date: string
          planting_plan_id: string | null
          row_spacing: number | null
          seeds_per_meter: number | null
          type: string
          updated_at: string
        }
        Insert: {
          actual_area: number
          created_at?: string
          cv_percent?: number | null
          cycle_id: string
          deleted_at?: string | null
          id?: string
          observations?: string | null
          org_id: string
          planter_speed?: number | null
          planting_date: string
          planting_plan_id?: string | null
          row_spacing?: number | null
          seeds_per_meter?: number | null
          type: string
          updated_at?: string
        }
        Update: {
          actual_area?: number
          created_at?: string
          cv_percent?: number | null
          cycle_id?: string
          deleted_at?: string | null
          id?: string
          observations?: string | null
          org_id?: string
          planter_speed?: number | null
          planting_date?: string
          planting_plan_id?: string | null
          row_spacing?: number | null
          seeds_per_meter?: number | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planting_actual_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planting_actual_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planting_actual_planting_plan_id_fkey"
            columns: ["planting_plan_id"]
            isOneToOne: false
            referencedRelation: "planting_plan"
            referencedColumns: ["id"]
          },
        ]
      }
      planting_plan: {
        Row: {
          created_at: string
          cycle_id: string
          deleted_at: string | null
          germination_rate: number
          id: string
          observations: string | null
          org_id: string
          planned_area: number
          planned_date: string
          planting_order: number
          row_spacing: number
          seeds_per_meter: number
          target_population: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_id: string
          deleted_at?: string | null
          germination_rate?: number
          id?: string
          observations?: string | null
          org_id: string
          planned_area: number
          planned_date: string
          planting_order?: number
          row_spacing?: number
          seeds_per_meter: number
          target_population?: number
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_id?: string
          deleted_at?: string | null
          germination_rate?: number
          id?: string
          observations?: string | null
          org_id?: string
          planned_area?: number
          planned_date?: string
          planting_order?: number
          row_spacing?: number
          seeds_per_meter?: number
          target_population?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planting_plan_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planting_plan_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      production_cycles: {
        Row: {
          client_id: string
          contract_number: string | null
          cooperator_id: string | null
          created_at: string
          deleted_at: string | null
          expected_production: number | null
          expected_productivity: number | null
          farm_id: string
          female_area: number
          female_line: string
          female_male_ratio: string
          female_planting_finished: boolean
          field_name: string
          hybrid_name: string
          id: string
          irrigation_system: string
          isolation_distance: number | null
          male_area: number
          male_line: string
          male_planting_finished: boolean
          material_cycle_days: number | null
          org_id: string
          pivot_area: number | null
          pivot_id: string | null
          season: string
          status: string
          target_moisture: number | null
          temporal_isolation_days: number | null
          total_area: number
          updated_at: string
        }
        Insert: {
          client_id: string
          contract_number?: string | null
          cooperator_id?: string | null
          created_at?: string
          deleted_at?: string | null
          expected_production?: number | null
          expected_productivity?: number | null
          farm_id: string
          female_area: number
          female_line: string
          female_male_ratio?: string
          female_planting_finished?: boolean
          field_name: string
          hybrid_name: string
          id?: string
          irrigation_system?: string
          isolation_distance?: number | null
          male_area: number
          male_line: string
          male_planting_finished?: boolean
          material_cycle_days?: number | null
          org_id: string
          pivot_area?: number | null
          pivot_id?: string | null
          season: string
          status?: string
          target_moisture?: number | null
          temporal_isolation_days?: number | null
          total_area: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          contract_number?: string | null
          cooperator_id?: string | null
          created_at?: string
          deleted_at?: string | null
          expected_production?: number | null
          expected_productivity?: number | null
          farm_id?: string
          female_area?: number
          female_line?: string
          female_male_ratio?: string
          female_planting_finished?: boolean
          field_name?: string
          hybrid_name?: string
          id?: string
          irrigation_system?: string
          isolation_distance?: number | null
          male_area?: number
          male_line?: string
          male_planting_finished?: boolean
          material_cycle_days?: number | null
          org_id?: string
          pivot_area?: number | null
          pivot_id?: string | null
          season?: string
          status?: string
          target_moisture?: number | null
          temporal_isolation_days?: number | null
          total_area?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_cycles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_cycles_cooperator_id_fkey"
            columns: ["cooperator_id"]
            isOneToOne: false
            referencedRelation: "cooperators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_cycles_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_cycles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_cycles_pivot_id_fkey"
            columns: ["pivot_id"]
            isOneToOne: false
            referencedRelation: "pivots"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          org_id: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          org_id?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_org_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
