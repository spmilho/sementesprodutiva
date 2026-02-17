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
      detasseling_records: {
        Row: {
          area_worked_ha: number
          created_at: string
          created_by: string | null
          cycle_id: string
          deleted_at: string | null
          difficulties: string[] | null
          gleba_id: string | null
          gps_latitude: number | null
          gps_longitude: number | null
          id: string
          machine_hours: number | null
          machine_id: string | null
          machine_speed_kmh: number | null
          machine_yield_ha_h: number | null
          method: string
          non_conformities: string | null
          notes: string | null
          operation_date: string
          org_id: string
          pass_type: string
          pct_detasseled_this_pass: number
          pct_remaining_after: number
          photos: string[] | null
          shift: string | null
          tassel_height: string | null
          team_size: number | null
          updated_at: string
          yield_per_person_ha: number | null
        }
        Insert: {
          area_worked_ha: number
          created_at?: string
          created_by?: string | null
          cycle_id: string
          deleted_at?: string | null
          difficulties?: string[] | null
          gleba_id?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          machine_hours?: number | null
          machine_id?: string | null
          machine_speed_kmh?: number | null
          machine_yield_ha_h?: number | null
          method: string
          non_conformities?: string | null
          notes?: string | null
          operation_date: string
          org_id: string
          pass_type: string
          pct_detasseled_this_pass: number
          pct_remaining_after: number
          photos?: string[] | null
          shift?: string | null
          tassel_height?: string | null
          team_size?: number | null
          updated_at?: string
          yield_per_person_ha?: number | null
        }
        Update: {
          area_worked_ha?: number
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          deleted_at?: string | null
          difficulties?: string[] | null
          gleba_id?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          machine_hours?: number | null
          machine_id?: string | null
          machine_speed_kmh?: number | null
          machine_yield_ha_h?: number | null
          method?: string
          non_conformities?: string | null
          notes?: string | null
          operation_date?: string
          org_id?: string
          pass_type?: string
          pct_detasseled_this_pass?: number
          pct_remaining_after?: number
          photos?: string[] | null
          shift?: string | null
          tassel_height?: string | null
          team_size?: number | null
          updated_at?: string
          yield_per_person_ha?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "detasseling_records_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detasseling_records_org_id_fkey"
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
      fertilization_records: {
        Row: {
          application_date: string
          application_method: string | null
          area_applied_ha: number
          b_kg_ha: number | null
          ca_kg_ha: number | null
          co_kg_ha: number | null
          conditions: string | null
          created_at: string
          created_by: string | null
          cu_kg_ha: number | null
          cycle_id: string
          deleted_at: string | null
          dose_per_ha: number
          dose_unit: string | null
          equipment_used: string | null
          fe_kg_ha: number | null
          fertilization_type: string
          foliar_application_time: string | null
          foliar_mixed_with_pesticide: boolean | null
          foliar_pesticide_name: string | null
          foliar_product_detail: string | null
          foliar_spray_volume: number | null
          formulation_k_pct: number | null
          formulation_n_pct: number | null
          formulation_p_pct: number | null
          growth_stage: string | null
          id: string
          k2o_supplied_kg_ha: number | null
          mg_kg_ha: number | null
          micro_unit: string | null
          mn_kg_ha: number | null
          mo_kg_ha: number | null
          n_supplied_kg_ha: number | null
          notes: string | null
          org_id: string
          p2o5_supplied_kg_ha: number | null
          photos: string[] | null
          product_name: string
          responsible_person: string | null
          s_kg_ha: number | null
          si_kg_ha: number | null
          target_parent: string | null
          updated_at: string
          zn_kg_ha: number | null
        }
        Insert: {
          application_date: string
          application_method?: string | null
          area_applied_ha: number
          b_kg_ha?: number | null
          ca_kg_ha?: number | null
          co_kg_ha?: number | null
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          cu_kg_ha?: number | null
          cycle_id: string
          deleted_at?: string | null
          dose_per_ha: number
          dose_unit?: string | null
          equipment_used?: string | null
          fe_kg_ha?: number | null
          fertilization_type: string
          foliar_application_time?: string | null
          foliar_mixed_with_pesticide?: boolean | null
          foliar_pesticide_name?: string | null
          foliar_product_detail?: string | null
          foliar_spray_volume?: number | null
          formulation_k_pct?: number | null
          formulation_n_pct?: number | null
          formulation_p_pct?: number | null
          growth_stage?: string | null
          id?: string
          k2o_supplied_kg_ha?: number | null
          mg_kg_ha?: number | null
          micro_unit?: string | null
          mn_kg_ha?: number | null
          mo_kg_ha?: number | null
          n_supplied_kg_ha?: number | null
          notes?: string | null
          org_id: string
          p2o5_supplied_kg_ha?: number | null
          photos?: string[] | null
          product_name: string
          responsible_person?: string | null
          s_kg_ha?: number | null
          si_kg_ha?: number | null
          target_parent?: string | null
          updated_at?: string
          zn_kg_ha?: number | null
        }
        Update: {
          application_date?: string
          application_method?: string | null
          area_applied_ha?: number
          b_kg_ha?: number | null
          ca_kg_ha?: number | null
          co_kg_ha?: number | null
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          cu_kg_ha?: number | null
          cycle_id?: string
          deleted_at?: string | null
          dose_per_ha?: number
          dose_unit?: string | null
          equipment_used?: string | null
          fe_kg_ha?: number | null
          fertilization_type?: string
          foliar_application_time?: string | null
          foliar_mixed_with_pesticide?: boolean | null
          foliar_pesticide_name?: string | null
          foliar_product_detail?: string | null
          foliar_spray_volume?: number | null
          formulation_k_pct?: number | null
          formulation_n_pct?: number | null
          formulation_p_pct?: number | null
          growth_stage?: string | null
          id?: string
          k2o_supplied_kg_ha?: number | null
          mg_kg_ha?: number | null
          micro_unit?: string | null
          mn_kg_ha?: number | null
          mo_kg_ha?: number | null
          n_supplied_kg_ha?: number | null
          notes?: string | null
          org_id?: string
          p2o5_supplied_kg_ha?: number | null
          photos?: string[] | null
          product_name?: string
          responsible_person?: string | null
          s_kg_ha?: number | null
          si_kg_ha?: number | null
          target_parent?: string | null
          updated_at?: string
          zn_kg_ha?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fertilization_records_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fertilization_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_counting_points: {
        Row: {
          created_at: string
          detasseled_count: number | null
          id: string
          inspection_data_id: string
          latitude: number | null
          longitude: number | null
          male1_count: number | null
          male2_count: number | null
          male3_count: number | null
          normal_not_pol: number | null
          normal_pol: number | null
          point_number: number
          pse_not_pol: number | null
          pse_pol: number | null
          rogue_female_not_pol: number | null
          rogue_female_pol: number | null
          rogue_male_not_pol: number | null
          rogue_male_pol: number | null
          short_not_pol: number | null
          short_pol: number | null
          stigma_receptive_count: number | null
          stump_not_pol: number | null
          stump_pol: number | null
          volunteer_female_not_pol: number | null
          volunteer_female_pol: number | null
          volunteer_male_not_pol: number | null
          volunteer_male_pol: number | null
        }
        Insert: {
          created_at?: string
          detasseled_count?: number | null
          id?: string
          inspection_data_id: string
          latitude?: number | null
          longitude?: number | null
          male1_count?: number | null
          male2_count?: number | null
          male3_count?: number | null
          normal_not_pol?: number | null
          normal_pol?: number | null
          point_number: number
          pse_not_pol?: number | null
          pse_pol?: number | null
          rogue_female_not_pol?: number | null
          rogue_female_pol?: number | null
          rogue_male_not_pol?: number | null
          rogue_male_pol?: number | null
          short_not_pol?: number | null
          short_pol?: number | null
          stigma_receptive_count?: number | null
          stump_not_pol?: number | null
          stump_pol?: number | null
          volunteer_female_not_pol?: number | null
          volunteer_female_pol?: number | null
          volunteer_male_not_pol?: number | null
          volunteer_male_pol?: number | null
        }
        Update: {
          created_at?: string
          detasseled_count?: number | null
          id?: string
          inspection_data_id?: string
          latitude?: number | null
          longitude?: number | null
          male1_count?: number | null
          male2_count?: number | null
          male3_count?: number | null
          normal_not_pol?: number | null
          normal_pol?: number | null
          point_number?: number
          pse_not_pol?: number | null
          pse_pol?: number | null
          rogue_female_not_pol?: number | null
          rogue_female_pol?: number | null
          rogue_male_not_pol?: number | null
          rogue_male_pol?: number | null
          short_not_pol?: number | null
          short_pol?: number | null
          stigma_receptive_count?: number | null
          stump_not_pol?: number | null
          stump_pol?: number | null
          volunteer_female_not_pol?: number | null
          volunteer_female_pol?: number | null
          volunteer_male_not_pol?: number | null
          volunteer_male_pol?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_counting_points_inspection_data_id_fkey"
            columns: ["inspection_data_id"]
            isOneToOne: false
            referencedRelation: "inspection_data"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_data: {
        Row: {
          created_at: string
          id: string
          import_id: string
          inspection_date: string | null
          inspection_number: number
          inspection_time: string | null
          inspector_name: string | null
          observations: string | null
          pct_detasseled: number | null
          pct_female_pollinating: number | null
          pct_male1_pollinating: number | null
          pct_male2_pollinating: number | null
          pct_male3_pollinating: number | null
          pct_normal_pollinating: number | null
          pct_pse_pollinating: number | null
          pct_rogue_female: number | null
          pct_rogue_male: number | null
          pct_short_pollinating: number | null
          pct_stigma_receptive: number | null
          pct_stump_pollinating: number | null
          pct_volunteer_female: number | null
          pct_volunteer_male: number | null
          pf_male1_pollinating: number | null
          pf_male2_pollinating: number | null
          pf_male3_pollinating: number | null
          pf_stigma_receptive: number | null
          temperature: string | null
          total_atypical_pollinating: number | null
          weather: string | null
          wind: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          import_id: string
          inspection_date?: string | null
          inspection_number: number
          inspection_time?: string | null
          inspector_name?: string | null
          observations?: string | null
          pct_detasseled?: number | null
          pct_female_pollinating?: number | null
          pct_male1_pollinating?: number | null
          pct_male2_pollinating?: number | null
          pct_male3_pollinating?: number | null
          pct_normal_pollinating?: number | null
          pct_pse_pollinating?: number | null
          pct_rogue_female?: number | null
          pct_rogue_male?: number | null
          pct_short_pollinating?: number | null
          pct_stigma_receptive?: number | null
          pct_stump_pollinating?: number | null
          pct_volunteer_female?: number | null
          pct_volunteer_male?: number | null
          pf_male1_pollinating?: number | null
          pf_male2_pollinating?: number | null
          pf_male3_pollinating?: number | null
          pf_stigma_receptive?: number | null
          temperature?: string | null
          total_atypical_pollinating?: number | null
          weather?: string | null
          wind?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          import_id?: string
          inspection_date?: string | null
          inspection_number?: number
          inspection_time?: string | null
          inspector_name?: string | null
          observations?: string | null
          pct_detasseled?: number | null
          pct_female_pollinating?: number | null
          pct_male1_pollinating?: number | null
          pct_male2_pollinating?: number | null
          pct_male3_pollinating?: number | null
          pct_normal_pollinating?: number | null
          pct_pse_pollinating?: number | null
          pct_rogue_female?: number | null
          pct_rogue_male?: number | null
          pct_short_pollinating?: number | null
          pct_stigma_receptive?: number | null
          pct_stump_pollinating?: number | null
          pct_volunteer_female?: number | null
          pct_volunteer_male?: number | null
          pf_male1_pollinating?: number | null
          pf_male2_pollinating?: number | null
          pf_male3_pollinating?: number | null
          pf_stigma_receptive?: number | null
          temperature?: string | null
          total_atypical_pollinating?: number | null
          weather?: string | null
          wind?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_data_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "inspection_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_imports: {
        Row: {
          area_ha: number | null
          created_at: string
          cycle_id: string
          deleted_at: string | null
          endosperm: string | null
          field_code: string | null
          file_name: string
          file_url: string | null
          hybrid_name: string | null
          id: string
          imported_at: string
          imported_by: string | null
          isolation: string | null
          leader: string | null
          org_id: string
          technician: string | null
          total_inspections: number
        }
        Insert: {
          area_ha?: number | null
          created_at?: string
          cycle_id: string
          deleted_at?: string | null
          endosperm?: string | null
          field_code?: string | null
          file_name: string
          file_url?: string | null
          hybrid_name?: string | null
          id?: string
          imported_at?: string
          imported_by?: string | null
          isolation?: string | null
          leader?: string | null
          org_id: string
          technician?: string | null
          total_inspections?: number
        }
        Update: {
          area_ha?: number | null
          created_at?: string
          cycle_id?: string
          deleted_at?: string | null
          endosperm?: string | null
          field_code?: string | null
          file_name?: string
          file_url?: string | null
          hybrid_name?: string | null
          id?: string
          imported_at?: string
          imported_by?: string | null
          isolation?: string | null
          leader?: string | null
          org_id?: string
          technician?: string | null
          total_inspections?: number
        }
        Relationships: [
          {
            foreignKeyName: "inspection_imports_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_imports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nicking_fixed_points: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          cycle_id: string
          deleted_at: string | null
          id: string
          latitude: number
          longitude: number
          name: string
          org_id: string
          parent_type: string
          photo_url: string | null
          plants_monitored: number
          reference_description: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          cycle_id: string
          deleted_at?: string | null
          id?: string
          latitude: number
          longitude: number
          name: string
          org_id: string
          parent_type: string
          photo_url?: string | null
          plants_monitored?: number
          reference_description?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          deleted_at?: string | null
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          org_id?: string
          parent_type?: string
          photo_url?: string | null
          plants_monitored?: number
          reference_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nicking_fixed_points_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nicking_fixed_points_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nicking_milestones: {
        Row: {
          anthesis_50pct_date: string | null
          anthesis_end_date: string | null
          anthesis_start_date: string | null
          cycle_id: string
          fixed_point_id: string
          id: string
          parent_type: string
          silk_50pct_date: string | null
          silk_end_date: string | null
          silk_start_date: string | null
          updated_at: string
        }
        Insert: {
          anthesis_50pct_date?: string | null
          anthesis_end_date?: string | null
          anthesis_start_date?: string | null
          cycle_id: string
          fixed_point_id: string
          id?: string
          parent_type: string
          silk_50pct_date?: string | null
          silk_end_date?: string | null
          silk_start_date?: string | null
          updated_at?: string
        }
        Update: {
          anthesis_50pct_date?: string | null
          anthesis_end_date?: string | null
          anthesis_start_date?: string | null
          cycle_id?: string
          fixed_point_id?: string
          id?: string
          parent_type?: string
          silk_50pct_date?: string | null
          silk_end_date?: string | null
          silk_start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nicking_milestones_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nicking_milestones_fixed_point_id_fkey"
            columns: ["fixed_point_id"]
            isOneToOne: false
            referencedRelation: "nicking_fixed_points"
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
          female_stage: string | null
          gdu_accumulated: number | null
          id: string
          latitude: number | null
          longitude: number | null
          male_stage: string | null
          observation_date: string
          observation_time: string | null
          observations: string | null
          observer_name: string | null
          org_id: string
          overall_synchrony_status: string | null
          photo_url: string | null
          photos: string[] | null
          pollen_availability: string | null
          silk_reception_pct: number | null
          synchrony_status: string | null
          technical_notes: string | null
          temp_max_c: number | null
          temp_min_c: number | null
          updated_at: string
          water_stress: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          cycle_id: string
          deleted_at?: string | null
          female_stage?: string | null
          gdu_accumulated?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          male_stage?: string | null
          observation_date: string
          observation_time?: string | null
          observations?: string | null
          observer_name?: string | null
          org_id: string
          overall_synchrony_status?: string | null
          photo_url?: string | null
          photos?: string[] | null
          pollen_availability?: string | null
          silk_reception_pct?: number | null
          synchrony_status?: string | null
          technical_notes?: string | null
          temp_max_c?: number | null
          temp_min_c?: number | null
          updated_at?: string
          water_stress?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          cycle_id?: string
          deleted_at?: string | null
          female_stage?: string | null
          gdu_accumulated?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          male_stage?: string | null
          observation_date?: string
          observation_time?: string | null
          observations?: string | null
          observer_name?: string | null
          org_id?: string
          overall_synchrony_status?: string | null
          photo_url?: string | null
          photos?: string[] | null
          pollen_availability?: string | null
          silk_reception_pct?: number | null
          synchrony_status?: string | null
          technical_notes?: string | null
          temp_max_c?: number | null
          temp_min_c?: number | null
          updated_at?: string
          water_stress?: string | null
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
      nicking_point_readings: {
        Row: {
          created_at: string
          female_pollination_evidence: string | null
          female_silk_receptive_pct: number | null
          female_silk_stage: string | null
          female_silk_visible_pct: number | null
          fixed_point_id: string
          id: string
          male_anthers_exposed_pct: number | null
          male_pollen_intensity: string | null
          male_pollen_release_pct: number | null
          male_tassel_stage: string | null
          observation_id: string
          parent_type: string
        }
        Insert: {
          created_at?: string
          female_pollination_evidence?: string | null
          female_silk_receptive_pct?: number | null
          female_silk_stage?: string | null
          female_silk_visible_pct?: number | null
          fixed_point_id: string
          id?: string
          male_anthers_exposed_pct?: number | null
          male_pollen_intensity?: string | null
          male_pollen_release_pct?: number | null
          male_tassel_stage?: string | null
          observation_id: string
          parent_type: string
        }
        Update: {
          created_at?: string
          female_pollination_evidence?: string | null
          female_silk_receptive_pct?: number | null
          female_silk_stage?: string | null
          female_silk_visible_pct?: number | null
          fixed_point_id?: string
          id?: string
          male_anthers_exposed_pct?: number | null
          male_pollen_intensity?: string | null
          male_pollen_release_pct?: number | null
          male_tassel_stage?: string | null
          observation_id?: string
          parent_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "nicking_point_readings_fixed_point_id_fkey"
            columns: ["fixed_point_id"]
            isOneToOne: false
            referencedRelation: "nicking_fixed_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nicking_point_readings_observation_id_fkey"
            columns: ["observation_id"]
            isOneToOne: false
            referencedRelation: "nicking_observations"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_targets: {
        Row: {
          cycle_id: string
          id: string
          k2o_target: number
          n_target: number
          p2o5_target: number
          updated_at: string
        }
        Insert: {
          cycle_id: string
          id?: string
          k2o_target?: number
          n_target?: number
          p2o5_target?: number
          updated_at?: string
        }
        Update: {
          cycle_id?: string
          id?: string
          k2o_target?: number
          n_target?: number
          p2o5_target?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_targets_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: true
            referencedRelation: "production_cycles"
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
      roguing_records: {
        Row: {
          affected_area_m2: number | null
          affected_parent: string
          corrective_action: string | null
          created_at: string
          created_by: string | null
          cycle_id: string
          deleted_at: string | null
          description: string
          gps_latitude: number | null
          gps_longitude: number | null
          growth_stage: string | null
          id: string
          notes: string | null
          observation_date: string
          off_type: string
          org_id: string
          photos: string[] | null
          plants_removed: number
          updated_at: string
        }
        Insert: {
          affected_area_m2?: number | null
          affected_parent: string
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          cycle_id: string
          deleted_at?: string | null
          description: string
          gps_latitude?: number | null
          gps_longitude?: number | null
          growth_stage?: string | null
          id?: string
          notes?: string | null
          observation_date: string
          off_type: string
          org_id: string
          photos?: string[] | null
          plants_removed: number
          updated_at?: string
        }
        Update: {
          affected_area_m2?: number | null
          affected_parent?: string
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          deleted_at?: string | null
          description?: string
          gps_latitude?: number | null
          gps_longitude?: number | null
          growth_stage?: string | null
          id?: string
          notes?: string | null
          observation_date?: string
          off_type?: string
          org_id?: string
          photos?: string[] | null
          plants_removed?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roguing_records_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roguing_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seed_lot_treatment_products: {
        Row: {
          active_ingredient: string | null
          application_order: number | null
          category: string | null
          created_at: string
          dose: number
          dose_unit: string
          id: string
          product_name: string
          product_type: string | null
          seed_lot_treatment_id: string
        }
        Insert: {
          active_ingredient?: string | null
          application_order?: number | null
          category?: string | null
          created_at?: string
          dose: number
          dose_unit: string
          id?: string
          product_name: string
          product_type?: string | null
          seed_lot_treatment_id: string
        }
        Update: {
          active_ingredient?: string | null
          application_order?: number | null
          category?: string | null
          created_at?: string
          dose?: number
          dose_unit?: string
          id?: string
          product_name?: string
          product_type?: string | null
          seed_lot_treatment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seed_lot_treatment_products_seed_lot_treatment_id_fkey"
            columns: ["seed_lot_treatment_id"]
            isOneToOne: false
            referencedRelation: "seed_lot_treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      seed_lot_treatments: {
        Row: {
          client_document_url: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          equipment_used: string | null
          germination_after_ts: number | null
          id: string
          no_treatment_reason: string | null
          notes: string | null
          photos: string[] | null
          responsible_person: string | null
          seed_lot_id: string
          total_slurry_volume: string | null
          treatment_date: string | null
          treatment_location: string | null
          treatment_origin: string
          visual_quality: string | null
        }
        Insert: {
          client_document_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          equipment_used?: string | null
          germination_after_ts?: number | null
          id?: string
          no_treatment_reason?: string | null
          notes?: string | null
          photos?: string[] | null
          responsible_person?: string | null
          seed_lot_id: string
          total_slurry_volume?: string | null
          treatment_date?: string | null
          treatment_location?: string | null
          treatment_origin: string
          visual_quality?: string | null
        }
        Update: {
          client_document_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          equipment_used?: string | null
          germination_after_ts?: number | null
          id?: string
          no_treatment_reason?: string | null
          notes?: string | null
          photos?: string[] | null
          responsible_person?: string | null
          seed_lot_id?: string
          total_slurry_volume?: string | null
          treatment_date?: string | null
          treatment_location?: string | null
          treatment_origin?: string
          visual_quality?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seed_lot_treatments_seed_lot_id_fkey"
            columns: ["seed_lot_id"]
            isOneToOne: false
            referencedRelation: "seed_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      seed_lots: {
        Row: {
          analysis_report_number: string | null
          analysis_report_url: string | null
          created_at: string
          created_by: string | null
          cycle_id: string
          deleted_at: string | null
          designated_male_planting: string | null
          genetic_purity_pct: number | null
          germination_pct: number
          id: string
          lot_number: string
          org_id: string
          origin_season: string
          packaging_condition: string | null
          parent_type: string
          pest_presence: string | null
          physical_purity_pct: number | null
          quality_analysis_date: string | null
          quantity: number
          quantity_kg: number | null
          quantity_unit: string
          received_date: string | null
          reception_notes: string | null
          reception_photos: string[] | null
          seed_moisture_pct: number | null
          sieve_classification: string | null
          status: string
          supplier_origin: string | null
          tetrazolium_viability_pct: number | null
          tetrazolium_vigor_pct: number | null
          thousand_seed_weight_g: number | null
          vigor_aa_pct: number | null
          vigor_cold_pct: number | null
        }
        Insert: {
          analysis_report_number?: string | null
          analysis_report_url?: string | null
          created_at?: string
          created_by?: string | null
          cycle_id: string
          deleted_at?: string | null
          designated_male_planting?: string | null
          genetic_purity_pct?: number | null
          germination_pct: number
          id?: string
          lot_number: string
          org_id: string
          origin_season: string
          packaging_condition?: string | null
          parent_type: string
          pest_presence?: string | null
          physical_purity_pct?: number | null
          quality_analysis_date?: string | null
          quantity: number
          quantity_kg?: number | null
          quantity_unit?: string
          received_date?: string | null
          reception_notes?: string | null
          reception_photos?: string[] | null
          seed_moisture_pct?: number | null
          sieve_classification?: string | null
          status?: string
          supplier_origin?: string | null
          tetrazolium_viability_pct?: number | null
          tetrazolium_vigor_pct?: number | null
          thousand_seed_weight_g?: number | null
          vigor_aa_pct?: number | null
          vigor_cold_pct?: number | null
        }
        Update: {
          analysis_report_number?: string | null
          analysis_report_url?: string | null
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          deleted_at?: string | null
          designated_male_planting?: string | null
          genetic_purity_pct?: number | null
          germination_pct?: number
          id?: string
          lot_number?: string
          org_id?: string
          origin_season?: string
          packaging_condition?: string | null
          parent_type?: string
          pest_presence?: string | null
          physical_purity_pct?: number | null
          quality_analysis_date?: string | null
          quantity?: number
          quantity_kg?: number | null
          quantity_unit?: string
          received_date?: string | null
          reception_notes?: string | null
          reception_photos?: string[] | null
          seed_moisture_pct?: number | null
          sieve_classification?: string | null
          status?: string
          supplier_origin?: string | null
          tetrazolium_viability_pct?: number | null
          tetrazolium_vigor_pct?: number | null
          thousand_seed_weight_g?: number | null
          vigor_aa_pct?: number | null
          vigor_cold_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "seed_lots_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seed_lots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seed_treatment: {
        Row: {
          client_document_url: string | null
          created_at: string
          created_by: string | null
          cycle_id: string
          deleted_at: string | null
          equipment_used: string | null
          germination_after: number | null
          germination_before: number | null
          id: string
          no_treatment_reason: string | null
          notes: string | null
          org_id: string
          parent_type: string
          photos: string[] | null
          responsible_person: string | null
          seed_condition_notes: string | null
          seed_lot: string | null
          total_slurry_volume: string | null
          treatment_date: string | null
          treatment_location: string | null
          treatment_origin: string
          updated_at: string
          vigor_before: number | null
          visual_quality: string | null
        }
        Insert: {
          client_document_url?: string | null
          created_at?: string
          created_by?: string | null
          cycle_id: string
          deleted_at?: string | null
          equipment_used?: string | null
          germination_after?: number | null
          germination_before?: number | null
          id?: string
          no_treatment_reason?: string | null
          notes?: string | null
          org_id: string
          parent_type: string
          photos?: string[] | null
          responsible_person?: string | null
          seed_condition_notes?: string | null
          seed_lot?: string | null
          total_slurry_volume?: string | null
          treatment_date?: string | null
          treatment_location?: string | null
          treatment_origin: string
          updated_at?: string
          vigor_before?: number | null
          visual_quality?: string | null
        }
        Update: {
          client_document_url?: string | null
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          deleted_at?: string | null
          equipment_used?: string | null
          germination_after?: number | null
          germination_before?: number | null
          id?: string
          no_treatment_reason?: string | null
          notes?: string | null
          org_id?: string
          parent_type?: string
          photos?: string[] | null
          responsible_person?: string | null
          seed_condition_notes?: string | null
          seed_lot?: string | null
          total_slurry_volume?: string | null
          treatment_date?: string | null
          treatment_location?: string | null
          treatment_origin?: string
          updated_at?: string
          vigor_before?: number | null
          visual_quality?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seed_treatment_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seed_treatment_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seed_treatment_products: {
        Row: {
          active_ingredient: string | null
          application_order: number | null
          category: string | null
          created_at: string
          dose: number
          dose_unit: string
          id: string
          product_name: string
          product_type: string | null
          seed_treatment_id: string
        }
        Insert: {
          active_ingredient?: string | null
          application_order?: number | null
          category?: string | null
          created_at?: string
          dose: number
          dose_unit: string
          id?: string
          product_name: string
          product_type?: string | null
          seed_treatment_id: string
        }
        Update: {
          active_ingredient?: string | null
          application_order?: number | null
          category?: string | null
          created_at?: string
          dose?: number
          dose_unit?: string
          id?: string
          product_name?: string
          product_type?: string | null
          seed_treatment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seed_treatment_products_seed_treatment_id_fkey"
            columns: ["seed_treatment_id"]
            isOneToOne: false
            referencedRelation: "seed_treatment"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_role: { Args: { _user_id: string }; Returns: undefined }
      admin_upsert_role: {
        Args: {
          _client_id?: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      get_user_emails_for_admin: {
        Args: never
        Returns: {
          email: string
          id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      soft_delete_record: {
        Args: { _record_id: string; _table_name: string }
        Returns: undefined
      }
      user_client_id: { Args: never; Returns: string }
      user_org_id: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "manager" | "field_user" | "client"
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
    Enums: {
      app_role: ["admin", "manager", "field_user", "client"],
    },
  },
} as const
