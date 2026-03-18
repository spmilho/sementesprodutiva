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
      attachments: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          document_category: string
          entity_id: string
          entity_type: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          org_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          document_category: string
          entity_id: string
          entity_type?: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          org_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          document_category?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          org_id?: string
        }
        Relationships: []
      }
      chemical_applications: {
        Row: {
          active_ingredient: string | null
          application_date: string
          application_method: string
          application_time: string | null
          application_type: string
          area_applied_ha: number
          created_at: string
          created_by: string | null
          cycle_id: string
          deleted_at: string | null
          dose_per_ha: number
          dose_unit: string
          gps_latitude: number | null
          gps_longitude: number | null
          humidity_pct: number | null
          id: string
          notes: string | null
          org_id: string
          photos: string[] | null
          prescription_number: string | null
          product_name: string
          responsible_technician: string | null
          spray_volume: number | null
          target_pest: string | null
          temperature_c: number | null
          updated_at: string
          wind_speed_kmh: number | null
        }
        Insert: {
          active_ingredient?: string | null
          application_date: string
          application_method?: string
          application_time?: string | null
          application_type: string
          area_applied_ha: number
          created_at?: string
          created_by?: string | null
          cycle_id: string
          deleted_at?: string | null
          dose_per_ha: number
          dose_unit?: string
          gps_latitude?: number | null
          gps_longitude?: number | null
          humidity_pct?: number | null
          id?: string
          notes?: string | null
          org_id: string
          photos?: string[] | null
          prescription_number?: string | null
          product_name: string
          responsible_technician?: string | null
          spray_volume?: number | null
          target_pest?: string | null
          temperature_c?: number | null
          updated_at?: string
          wind_speed_kmh?: number | null
        }
        Update: {
          active_ingredient?: string | null
          application_date?: string
          application_method?: string
          application_time?: string | null
          application_type?: string
          area_applied_ha?: number
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          deleted_at?: string | null
          dose_per_ha?: number
          dose_unit?: string
          gps_latitude?: number | null
          gps_longitude?: number | null
          humidity_pct?: number | null
          id?: string
          notes?: string | null
          org_id?: string
          photos?: string[] | null
          prescription_number?: string | null
          product_name?: string
          responsible_technician?: string | null
          spray_volume?: number | null
          target_pest?: string | null
          temperature_c?: number | null
          updated_at?: string
          wind_speed_kmh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chemical_applications_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chemical_applications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      contrato_acesso: {
        Row: {
          habilitado_em: string | null
          habilitado_por: string | null
          id: string
          pode_deletar: boolean
          pode_inserir: boolean
          pode_visualizar: boolean
          user_id: string
        }
        Insert: {
          habilitado_em?: string | null
          habilitado_por?: string | null
          id?: string
          pode_deletar?: boolean
          pode_inserir?: boolean
          pode_visualizar?: boolean
          user_id: string
        }
        Update: {
          habilitado_em?: string | null
          habilitado_por?: string | null
          id?: string
          pode_deletar?: boolean
          pode_inserir?: boolean
          pode_visualizar?: boolean
          user_id?: string
        }
        Relationships: []
      }
      contrato_aditivos: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string | null
          contrato_id: string
          created_at: string
          created_by: string | null
          dados_ia: Json | null
          data_aditivo: string | null
          descricao: string | null
          id: string
          nova_area_ha: number | null
          nova_data_fim: string | null
          novo_preco_por_ha: number | null
          novo_preco_por_saco: number | null
          novo_valor_total: number | null
          novo_volume_sacos: number | null
          numero_aditivo: number
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          contrato_id: string
          created_at?: string
          created_by?: string | null
          dados_ia?: Json | null
          data_aditivo?: string | null
          descricao?: string | null
          id?: string
          nova_area_ha?: number | null
          nova_data_fim?: string | null
          novo_preco_por_ha?: number | null
          novo_preco_por_saco?: number | null
          novo_valor_total?: number | null
          novo_volume_sacos?: number | null
          numero_aditivo?: number
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          contrato_id?: string
          created_at?: string
          created_by?: string | null
          dados_ia?: Json | null
          data_aditivo?: string | null
          descricao?: string | null
          id?: string
          nova_area_ha?: number | null
          nova_data_fim?: string | null
          novo_preco_por_ha?: number | null
          novo_preco_por_saco?: number | null
          novo_valor_total?: number | null
          novo_volume_sacos?: number | null
          numero_aditivo?: number
        }
        Relationships: [
          {
            foreignKeyName: "contrato_aditivos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          area_ha: number | null
          arquivo_nome: string | null
          arquivo_url: string | null
          contratado: string | null
          contratante: string | null
          created_at: string
          created_by: string | null
          dados_ia: Json | null
          data_fim: string | null
          data_inicio: string | null
          deleted_at: string | null
          hibrido: string | null
          id: string
          numero_contrato: string | null
          observacoes: string | null
          org_id: string
          preco_por_ha: number | null
          preco_por_saco: number | null
          safra: string | null
          status: string
          tipo: string
          titulo: string
          updated_at: string
          valor_total: number | null
          volume_sacos: number | null
        }
        Insert: {
          area_ha?: number | null
          arquivo_nome?: string | null
          arquivo_url?: string | null
          contratado?: string | null
          contratante?: string | null
          created_at?: string
          created_by?: string | null
          dados_ia?: Json | null
          data_fim?: string | null
          data_inicio?: string | null
          deleted_at?: string | null
          hibrido?: string | null
          id?: string
          numero_contrato?: string | null
          observacoes?: string | null
          org_id: string
          preco_por_ha?: number | null
          preco_por_saco?: number | null
          safra?: string | null
          status?: string
          tipo?: string
          titulo: string
          updated_at?: string
          valor_total?: number | null
          volume_sacos?: number | null
        }
        Update: {
          area_ha?: number | null
          arquivo_nome?: string | null
          arquivo_url?: string | null
          contratado?: string | null
          contratante?: string | null
          created_at?: string
          created_by?: string | null
          dados_ia?: Json | null
          data_fim?: string | null
          data_inicio?: string | null
          deleted_at?: string | null
          hibrido?: string | null
          id?: string
          numero_contrato?: string | null
          observacoes?: string | null
          org_id?: string
          preco_por_ha?: number | null
          preco_por_saco?: number | null
          safra?: string | null
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          valor_total?: number | null
          volume_sacos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_org_id_fkey"
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
      crop_input_imports: {
        Row: {
          cycle_id: string
          deleted_at: string | null
          file_name: string
          file_url: string | null
          id: string
          imported_at: string
          imported_by: string | null
          org_id: string
          records_new: number
          records_total: number
          records_updated: number
        }
        Insert: {
          cycle_id: string
          deleted_at?: string | null
          file_name: string
          file_url?: string | null
          id?: string
          imported_at?: string
          imported_by?: string | null
          org_id: string
          records_new?: number
          records_total?: number
          records_updated?: number
        }
        Update: {
          cycle_id?: string
          deleted_at?: string | null
          file_name?: string
          file_url?: string | null
          id?: string
          imported_at?: string
          imported_by?: string | null
          org_id?: string
          records_new?: number
          records_total?: number
          records_updated?: number
        }
        Relationships: [
          {
            foreignKeyName: "crop_input_imports_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crop_input_imports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crop_inputs: {
        Row: {
          active_ingredient: string | null
          created_at: string
          created_by: string | null
          cycle_id: string
          dap_at_application: number | null
          deleted_at: string | null
          dose_per_ha: number | null
          event_code: string | null
          event_type: string | null
          execution_date: string | null
          group_category: string | null
          growth_stage_at_application: string | null
          id: string
          import_file_id: string | null
          input_type: string
          notes: string | null
          org_id: string
          photos: string[] | null
          product_name: string
          qty_applied: number | null
          qty_recommended: number | null
          recommendation_date: string | null
          source: string
          status: string
          unit: string | null
        }
        Insert: {
          active_ingredient?: string | null
          created_at?: string
          created_by?: string | null
          cycle_id: string
          dap_at_application?: number | null
          deleted_at?: string | null
          dose_per_ha?: number | null
          event_code?: string | null
          event_type?: string | null
          execution_date?: string | null
          group_category?: string | null
          growth_stage_at_application?: string | null
          id?: string
          import_file_id?: string | null
          input_type?: string
          notes?: string | null
          org_id: string
          photos?: string[] | null
          product_name: string
          qty_applied?: number | null
          qty_recommended?: number | null
          recommendation_date?: string | null
          source?: string
          status?: string
          unit?: string | null
        }
        Update: {
          active_ingredient?: string | null
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          dap_at_application?: number | null
          deleted_at?: string | null
          dose_per_ha?: number | null
          event_code?: string | null
          event_type?: string | null
          execution_date?: string | null
          group_category?: string | null
          growth_stage_at_application?: string | null
          id?: string
          import_file_id?: string | null
          input_type?: string
          notes?: string | null
          org_id?: string
          photos?: string[] | null
          product_name?: string
          qty_applied?: number | null
          qty_recommended?: number | null
          recommendation_date?: string | null
          source?: string
          status?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crop_inputs_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crop_inputs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle_team: {
        Row: {
          created_at: string
          cycle_id: string
          deleted_at: string | null
          id: string
          org_id: string
          role_in_cycle: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cycle_id: string
          deleted_at?: string | null
          id?: string
          org_id: string
          role_in_cycle?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cycle_id?: string
          deleted_at?: string | null
          id?: string
          org_id?: string
          role_in_cycle?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_team_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_team_org_id_fkey"
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
      feed_comments: {
        Row: {
          comment_text: string
          created_at: string
          id: string
          is_deleted: boolean
          parent_comment_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "feed_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_media: {
        Row: {
          created_at: string
          id: string
          media_type: string
          media_url: string
          order_index: number
          post_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_type?: string
          media_url: string
          order_index?: number
          post_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string
          media_url?: string
          order_index?: number
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_moderation_log: {
        Row: {
          action_type: string
          created_at: string
          id: string
          moderator_user_id: string | null
          reason: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          moderator_user_id?: string | null
          reason?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          moderator_user_id?: string | null
          reason?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      feed_posts: {
        Row: {
          author_user_id: string
          caption: string | null
          cliente: string | null
          created_at: string
          deleted_at: string | null
          fazenda: string | null
          gps_lat: number | null
          gps_lng: number | null
          hibrido: string | null
          id: string
          is_hidden: boolean
          location_text: string | null
          pivo: string | null
          safra: string | null
          stage: string | null
          tags: string[] | null
          talhao: string | null
          updated_at: string
        }
        Insert: {
          author_user_id: string
          caption?: string | null
          cliente?: string | null
          created_at?: string
          deleted_at?: string | null
          fazenda?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          hibrido?: string | null
          id?: string
          is_hidden?: boolean
          location_text?: string | null
          pivo?: string | null
          safra?: string | null
          stage?: string | null
          tags?: string[] | null
          talhao?: string | null
          updated_at?: string
        }
        Update: {
          author_user_id?: string
          caption?: string | null
          cliente?: string | null
          created_at?: string
          deleted_at?: string | null
          fazenda?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          hibrido?: string | null
          id?: string
          is_hidden?: boolean
          location_text?: string | null
          pivo?: string | null
          safra?: string | null
          stage?: string | null
          tags?: string[] | null
          talhao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      feed_user_permissions: {
        Row: {
          can_access_feed: boolean
          created_at: string
          deleted_at: string | null
          id: string
          is_banned: boolean
          role_feed: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_access_feed?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_banned?: boolean
          role_feed?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_access_feed?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_banned?: boolean
          role_feed?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      field_visit_photos: {
        Row: {
          caption: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          org_id: string
          photo_url: string
          score_id: string | null
          visit_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          org_id: string
          photo_url: string
          score_id?: string | null
          visit_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          org_id?: string
          photo_url?: string
          score_id?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_visit_photos_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_visit_photos_score_id_fkey"
            columns: ["score_id"]
            isOneToOne: false
            referencedRelation: "field_visit_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_visit_photos_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "field_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      field_visit_scores: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          notes: string | null
          org_id: string
          score_points: number | null
          score_value: string | null
          stage: string
          subitem: string
          updated_at: string | null
          visit_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          org_id: string
          score_points?: number | null
          score_value?: string | null
          stage: string
          subitem: string
          updated_at?: string | null
          visit_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          score_points?: number | null
          score_value?: string | null
          stage?: string
          subitem?: string
          updated_at?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_visit_scores_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_visit_scores_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "field_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      field_visits: {
        Row: {
          created_at: string | null
          created_by: string | null
          cycle_id: string
          deleted_at: string | null
          final_score: number | null
          general_notes: string | null
          id: string
          max_possible_score: number | null
          org_id: string
          stage: string | null
          status: string | null
          technician_name: string | null
          updated_at: string | null
          visit_date: string
          visit_number: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          cycle_id: string
          deleted_at?: string | null
          final_score?: number | null
          general_notes?: string | null
          id?: string
          max_possible_score?: number | null
          org_id: string
          stage?: string | null
          status?: string | null
          technician_name?: string | null
          updated_at?: string | null
          visit_date: string
          visit_number?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          cycle_id?: string
          deleted_at?: string | null
          final_score?: number | null
          general_notes?: string | null
          id?: string
          max_possible_score?: number | null
          org_id?: string
          stage?: string | null
          status?: string | null
          technician_name?: string | null
          updated_at?: string | null
          visit_date?: string
          visit_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "field_visits_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_visits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      harvest_plan: {
        Row: {
          bag_weight_kg: number
          created_at: string
          created_by: string | null
          cycle_days_used: number
          cycle_id: string
          deleted_at: string | null
          gleba_id: string | null
          id: string
          notes: string | null
          org_id: string
          planned_harvest_end: string | null
          planned_harvest_start: string | null
          planting_date_used: string | null
          planting_source: string
          target_ha_per_day: number | null
          target_moisture_pct: number | null
          updated_at: string
        }
        Insert: {
          bag_weight_kg?: number
          created_at?: string
          created_by?: string | null
          cycle_days_used: number
          cycle_id: string
          deleted_at?: string | null
          gleba_id?: string | null
          id?: string
          notes?: string | null
          org_id: string
          planned_harvest_end?: string | null
          planned_harvest_start?: string | null
          planting_date_used?: string | null
          planting_source?: string
          target_ha_per_day?: number | null
          target_moisture_pct?: number | null
          updated_at?: string
        }
        Update: {
          bag_weight_kg?: number
          created_at?: string
          created_by?: string | null
          cycle_days_used?: number
          cycle_id?: string
          deleted_at?: string | null
          gleba_id?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          planned_harvest_end?: string | null
          planned_harvest_start?: string | null
          planting_date_used?: string | null
          planting_source?: string
          target_ha_per_day?: number | null
          target_moisture_pct?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "harvest_plan_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_plan_gleba_id_fkey"
            columns: ["gleba_id"]
            isOneToOne: false
            referencedRelation: "pivot_glebas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_plan_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      harvest_records: {
        Row: {
          area_harvested_ha: number
          avg_moisture_pct: number
          created_at: string
          created_by: string | null
          cycle_id: string
          deleted_at: string | null
          delivery_destination: string | null
          gleba_id: string | null
          harvest_date: string
          harvester_id: string | null
          id: string
          loads_count: number
          notes: string | null
          org_id: string
          ticket_number: string | null
          total_weight_tons: number
          transport_vehicle: string | null
          weight_per_load_tons: number | null
        }
        Insert: {
          area_harvested_ha: number
          avg_moisture_pct: number
          created_at?: string
          created_by?: string | null
          cycle_id: string
          deleted_at?: string | null
          delivery_destination?: string | null
          gleba_id?: string | null
          harvest_date: string
          harvester_id?: string | null
          id?: string
          loads_count: number
          notes?: string | null
          org_id: string
          ticket_number?: string | null
          total_weight_tons: number
          transport_vehicle?: string | null
          weight_per_load_tons?: number | null
        }
        Update: {
          area_harvested_ha?: number
          avg_moisture_pct?: number
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          deleted_at?: string | null
          delivery_destination?: string | null
          gleba_id?: string | null
          harvest_date?: string
          harvester_id?: string | null
          id?: string
          loads_count?: number
          notes?: string | null
          org_id?: string
          ticket_number?: string | null
          total_weight_tons?: number
          transport_vehicle?: string | null
          weight_per_load_tons?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "harvest_records_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_records_gleba_id_fkey"
            columns: ["gleba_id"]
            isOneToOne: false
            referencedRelation: "pivot_glebas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_records_org_id_fkey"
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
      irrigation_records: {
        Row: {
          created_at: string
          created_by: string | null
          cycle_id: string
          deleted_at: string | null
          depth_mm: number
          duration_hours: number | null
          end_date: string | null
          id: string
          notes: string | null
          org_id: string
          sector: string | null
          source: string
          source_file_id: string | null
          start_date: string
          system_type: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cycle_id: string
          deleted_at?: string | null
          depth_mm: number
          duration_hours?: number | null
          end_date?: string | null
          id?: string
          notes?: string | null
          org_id: string
          sector?: string | null
          source?: string
          source_file_id?: string | null
          start_date: string
          system_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          deleted_at?: string | null
          depth_mm?: number
          duration_hours?: number | null
          end_date?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          sector?: string | null
          source?: string
          source_file_id?: string | null
          start_date?: string
          system_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "irrigation_records_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "irrigation_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "irrigation_records_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "water_files"
            referencedColumns: ["id"]
          },
        ]
      }
      moisture_samples: {
        Row: {
          created_at: string
          created_by: string | null
          cycle_id: string
          deleted_at: string | null
          field_position: string | null
          gleba_id: string | null
          grain_temperature_c: number | null
          growth_stage: string | null
          id: string
          latitude: number
          longitude: number
          method: string
          moisture_pct: number
          notes: string | null
          org_id: string
          photos: string[] | null
          point_identifier: string | null
          sample_date: string
          sample_time: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cycle_id: string
          deleted_at?: string | null
          field_position?: string | null
          gleba_id?: string | null
          grain_temperature_c?: number | null
          growth_stage?: string | null
          id?: string
          latitude: number
          longitude: number
          method?: string
          moisture_pct: number
          notes?: string | null
          org_id: string
          photos?: string[] | null
          point_identifier?: string | null
          sample_date: string
          sample_time: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          deleted_at?: string | null
          field_position?: string | null
          gleba_id?: string | null
          grain_temperature_c?: number | null
          growth_stage?: string | null
          id?: string
          latitude?: number
          longitude?: number
          method?: string
          moisture_pct?: number
          notes?: string | null
          org_id?: string
          photos?: string[] | null
          point_identifier?: string | null
          sample_date?: string
          sample_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "moisture_samples_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moisture_samples_gleba_id_fkey"
            columns: ["gleba_id"]
            isOneToOne: false
            referencedRelation: "pivot_glebas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moisture_samples_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ndvi_analyses: {
        Row: {
          analysis_date: string
          analysis_text: string
          created_at: string
          created_by: string | null
          cycle_id: string
          dap: number | null
          filter_start_date: string | null
          growth_stage: string | null
          id: string
          ndvi_value: number | null
          org_id: string
        }
        Insert: {
          analysis_date?: string
          analysis_text: string
          created_at?: string
          created_by?: string | null
          cycle_id: string
          dap?: number | null
          filter_start_date?: string | null
          growth_stage?: string | null
          id?: string
          ndvi_value?: number | null
          org_id: string
        }
        Update: {
          analysis_date?: string
          analysis_text?: string
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          dap?: number | null
          filter_start_date?: string | null
          growth_stage?: string | null
          id?: string
          ndvi_value?: number | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ndvi_analyses_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ndvi_analyses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ndvi_polygons: {
        Row: {
          agro_polygon_id: string
          area_ha: number | null
          created_at: string
          cycle_id: string
          deleted_at: string | null
          id: string
          org_id: string
          polygon_geo: Json
          polygon_name: string | null
          updated_at: string
        }
        Insert: {
          agro_polygon_id: string
          area_ha?: number | null
          created_at?: string
          cycle_id: string
          deleted_at?: string | null
          id?: string
          org_id: string
          polygon_geo: Json
          polygon_name?: string | null
          updated_at?: string
        }
        Update: {
          agro_polygon_id?: string
          area_ha?: number | null
          created_at?: string
          cycle_id?: string
          deleted_at?: string | null
          id?: string
          org_id?: string
          polygon_geo?: Json
          polygon_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ndvi_polygons_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: true
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ndvi_polygons_org_id_fkey"
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
      notificacoes: {
        Row: {
          criado_em: string | null
          gerado_por: string | null
          id: string
          lida: boolean | null
          lida_em: string | null
          mensagem: string
          modulo: string | null
          referencia_id: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          criado_em?: string | null
          gerado_por?: string | null
          id?: string
          lida?: boolean | null
          lida_em?: string | null
          mensagem: string
          modulo?: string | null
          referencia_id?: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          criado_em?: string | null
          gerado_por?: string | null
          id?: string
          lida?: boolean | null
          lida_em?: string | null
          mensagem?: string
          modulo?: string | null
          referencia_id?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_gerado_por_fkey"
            columns: ["gerado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      organization_settings: {
        Row: {
          anthropic_api_key: string | null
          created_at: string
          id: string
          org_id: string
          report_cover_url: string | null
          report_footer_text: string | null
          report_logo_url: string | null
          updated_at: string
        }
        Insert: {
          anthropic_api_key?: string | null
          created_at?: string
          id?: string
          org_id: string
          report_cover_url?: string | null
          report_footer_text?: string | null
          report_logo_url?: string | null
          updated_at?: string
        }
        Update: {
          anthropic_api_key?: string | null
          created_at?: string
          id?: string
          org_id?: string
          report_cover_url?: string | null
          report_footer_text?: string | null
          report_logo_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slogan: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slogan?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slogan?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pest_disease_records: {
        Row: {
          action_taken: string | null
          affected_area_ha: number | null
          affected_parent: string
          created_at: string
          created_by: string | null
          cycle_id: string
          deleted_at: string | null
          economic_damage_reached: boolean
          gps_latitude: number | null
          gps_longitude: number | null
          growth_stage: string | null
          id: string
          incidence_pct: number | null
          notes: string | null
          observation_date: string
          org_id: string
          pest_name: string
          pest_type: string
          photos: string[] | null
          severity: string
          severity_score: number | null
          updated_at: string
        }
        Insert: {
          action_taken?: string | null
          affected_area_ha?: number | null
          affected_parent?: string
          created_at?: string
          created_by?: string | null
          cycle_id: string
          deleted_at?: string | null
          economic_damage_reached?: boolean
          gps_latitude?: number | null
          gps_longitude?: number | null
          growth_stage?: string | null
          id?: string
          incidence_pct?: number | null
          notes?: string | null
          observation_date: string
          org_id: string
          pest_name: string
          pest_type: string
          photos?: string[] | null
          severity?: string
          severity_score?: number | null
          updated_at?: string
        }
        Update: {
          action_taken?: string | null
          affected_area_ha?: number | null
          affected_parent?: string
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          deleted_at?: string | null
          economic_damage_reached?: boolean
          gps_latitude?: number | null
          gps_longitude?: number | null
          growth_stage?: string | null
          id?: string
          incidence_pct?: number | null
          notes?: string | null
          observation_date?: string
          org_id?: string
          pest_name?: string
          pest_type?: string
          photos?: string[] | null
          severity?: string
          severity_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pest_disease_records_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pest_disease_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      pivot_glebas: {
        Row: {
          area_ha: number | null
          created_at: string
          cycle_id: string
          deleted_at: string | null
          id: string
          name: string
          notes: string | null
          org_id: string
          parent_type: string
          planting_date: string | null
          updated_at: string
        }
        Insert: {
          area_ha?: number | null
          created_at?: string
          cycle_id: string
          deleted_at?: string | null
          id?: string
          name: string
          notes?: string | null
          org_id: string
          parent_type?: string
          planting_date?: string | null
          updated_at?: string
        }
        Update: {
          area_ha?: number | null
          created_at?: string
          cycle_id?: string
          deleted_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          org_id?: string
          parent_type?: string
          planting_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pivot_glebas_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pivot_glebas_org_id_fkey"
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
      plano_acoes: {
        Row: {
          atualizado_em: string | null
          categoria: string | null
          concluida_em: string | null
          criado_em: string | null
          criado_por: string | null
          deleted_at: string | null
          esforco: string | null
          how: string
          how_much: string | null
          id: string
          impacto: string | null
          ocultar_concluida: boolean | null
          prioridade: string
          status: string
          what: string
          when_prazo: string
          where_local: string
          who_resp: string | null
          why: string
        }
        Insert: {
          atualizado_em?: string | null
          categoria?: string | null
          concluida_em?: string | null
          criado_em?: string | null
          criado_por?: string | null
          deleted_at?: string | null
          esforco?: string | null
          how: string
          how_much?: string | null
          id?: string
          impacto?: string | null
          ocultar_concluida?: boolean | null
          prioridade?: string
          status?: string
          what: string
          when_prazo: string
          where_local: string
          who_resp?: string | null
          why: string
        }
        Update: {
          atualizado_em?: string | null
          categoria?: string | null
          concluida_em?: string | null
          criado_em?: string | null
          criado_por?: string | null
          deleted_at?: string | null
          esforco?: string | null
          how?: string
          how_much?: string | null
          id?: string
          impacto?: string | null
          ocultar_concluida?: boolean | null
          prioridade?: string
          status?: string
          what?: string
          when_prazo?: string
          where_local?: string
          who_resp?: string | null
          why?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_acoes_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_acoes_who_resp_fkey"
            columns: ["who_resp"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_acoes_acesso: {
        Row: {
          habilitado: boolean | null
          habilitado_em: string | null
          habilitado_por: string | null
          user_id: string
        }
        Insert: {
          habilitado?: boolean | null
          habilitado_em?: string | null
          habilitado_por?: string | null
          user_id: string
        }
        Update: {
          habilitado?: boolean | null
          habilitado_em?: string | null
          habilitado_por?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_acoes_acesso_habilitado_por_fkey"
            columns: ["habilitado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_acoes_acesso_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_acoes_anexos: {
        Row: {
          acao_id: string
          comentario_id: string | null
          criado_em: string | null
          enviado_por: string | null
          id: string
          nome_arquivo: string
          tamanho_bytes: number | null
          tipo_mime: string | null
          url: string
        }
        Insert: {
          acao_id: string
          comentario_id?: string | null
          criado_em?: string | null
          enviado_por?: string | null
          id?: string
          nome_arquivo: string
          tamanho_bytes?: number | null
          tipo_mime?: string | null
          url: string
        }
        Update: {
          acao_id?: string
          comentario_id?: string | null
          criado_em?: string | null
          enviado_por?: string | null
          id?: string
          nome_arquivo?: string
          tamanho_bytes?: number | null
          tipo_mime?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_acoes_anexos_acao_id_fkey"
            columns: ["acao_id"]
            isOneToOne: false
            referencedRelation: "plano_acoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_acoes_anexos_comentario_id_fkey"
            columns: ["comentario_id"]
            isOneToOne: false
            referencedRelation: "plano_acoes_comentarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_acoes_anexos_enviado_por_fkey"
            columns: ["enviado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_acoes_comentarios: {
        Row: {
          acao_id: string
          autor_id: string
          criado_em: string | null
          deleted_at: string | null
          editado_em: string | null
          id: string
          texto: string
        }
        Insert: {
          acao_id: string
          autor_id: string
          criado_em?: string | null
          deleted_at?: string | null
          editado_em?: string | null
          id?: string
          texto: string
        }
        Update: {
          acao_id?: string
          autor_id?: string
          criado_em?: string | null
          deleted_at?: string | null
          editado_em?: string | null
          id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_acoes_comentarios_acao_id_fkey"
            columns: ["acao_id"]
            isOneToOne: false
            referencedRelation: "plano_acoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_acoes_comentarios_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_acoes_mencoes: {
        Row: {
          acao_id: string
          comentario_id: string
          criado_em: string | null
          id: string
          usuario_id: string
        }
        Insert: {
          acao_id: string
          comentario_id: string
          criado_em?: string | null
          id?: string
          usuario_id: string
        }
        Update: {
          acao_id?: string
          comentario_id?: string
          criado_em?: string | null
          id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_acoes_mencoes_acao_id_fkey"
            columns: ["acao_id"]
            isOneToOne: false
            referencedRelation: "plano_acoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_acoes_mencoes_comentario_id_fkey"
            columns: ["comentario_id"]
            isOneToOne: false
            referencedRelation: "plano_acoes_comentarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_acoes_mencoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_acoes_notif_log: {
        Row: {
          acao_id: string
          enviado_em: string | null
          id: string
          tipo: string
        }
        Insert: {
          acao_id: string
          enviado_em?: string | null
          id?: string
          tipo: string
        }
        Update: {
          acao_id?: string
          enviado_em?: string | null
          id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_acoes_notif_log_acao_id_fkey"
            columns: ["acao_id"]
            isOneToOne: false
            referencedRelation: "plano_acoes"
            referencedColumns: ["id"]
          },
        ]
      }
      planting_actual: {
        Row: {
          actual_area: number
          created_at: string
          created_by: string | null
          cv_percent: number | null
          cycle_id: string
          deleted_at: string | null
          gleba_id: string | null
          gps_latitude: number | null
          gps_longitude: number | null
          id: string
          observations: string | null
          org_id: string
          photos: string[] | null
          planter_speed: number | null
          planting_date: string
          planting_plan_id: string | null
          row_spacing: number | null
          seed_lot_id: string | null
          seeds_per_meter: number | null
          seeds_per_meter_actual: number | null
          soil_condition: string | null
          sowing_depth_cm: number | null
          type: string
          updated_at: string
        }
        Insert: {
          actual_area: number
          created_at?: string
          created_by?: string | null
          cv_percent?: number | null
          cycle_id: string
          deleted_at?: string | null
          gleba_id?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          observations?: string | null
          org_id: string
          photos?: string[] | null
          planter_speed?: number | null
          planting_date: string
          planting_plan_id?: string | null
          row_spacing?: number | null
          seed_lot_id?: string | null
          seeds_per_meter?: number | null
          seeds_per_meter_actual?: number | null
          soil_condition?: string | null
          sowing_depth_cm?: number | null
          type: string
          updated_at?: string
        }
        Update: {
          actual_area?: number
          created_at?: string
          created_by?: string | null
          cv_percent?: number | null
          cycle_id?: string
          deleted_at?: string | null
          gleba_id?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          observations?: string | null
          org_id?: string
          photos?: string[] | null
          planter_speed?: number | null
          planting_date?: string
          planting_plan_id?: string | null
          row_spacing?: number | null
          seed_lot_id?: string | null
          seeds_per_meter?: number | null
          seeds_per_meter_actual?: number | null
          soil_condition?: string | null
          sowing_depth_cm?: number | null
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
            foreignKeyName: "planting_actual_gleba_id_fkey"
            columns: ["gleba_id"]
            isOneToOne: false
            referencedRelation: "pivot_glebas"
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
          {
            foreignKeyName: "planting_actual_seed_lot_id_fkey"
            columns: ["seed_lot_id"]
            isOneToOne: false
            referencedRelation: "seed_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      planting_cv_points: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          planting_actual_id: string
          point_number: number
          sample_length_m: number
          seeds_counted: number
          seeds_per_meter: number | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          planting_actual_id: string
          point_number: number
          sample_length_m?: number
          seeds_counted: number
          seeds_per_meter?: number | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          planting_actual_id?: string
          point_number?: number
          sample_length_m?: number
          seeds_counted?: number
          seeds_per_meter?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "planting_cv_points_planting_actual_id_fkey"
            columns: ["planting_actual_id"]
            isOneToOne: false
            referencedRelation: "planting_actual"
            referencedColumns: ["id"]
          },
        ]
      }
      planting_cv_records: {
        Row: {
          created_at: string
          cv_percent: number
          cycle_id: string
          deleted_at: string | null
          id: string
          notes: string | null
          org_id: string
          recorded_by: string | null
          recorded_date: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cv_percent: number
          cycle_id: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          org_id: string
          recorded_by?: string | null
          recorded_date?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cv_percent?: number
          cycle_id?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          recorded_by?: string | null
          recorded_date?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planting_cv_records_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planting_cv_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          gleba_id: string | null
          id: string
          observations: string | null
          org_id: string
          planned_area: number
          planned_date: string
          planting_order: number
          row_spacing: number
          seed_lot_id: string | null
          seeds_per_meter: number
          spacing_ff_cm: number | null
          spacing_fm_cm: number | null
          spacing_mm_cm: number | null
          target_population: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_id: string
          deleted_at?: string | null
          germination_rate?: number
          gleba_id?: string | null
          id?: string
          observations?: string | null
          org_id: string
          planned_area: number
          planned_date: string
          planting_order?: number
          row_spacing?: number
          seed_lot_id?: string | null
          seeds_per_meter: number
          spacing_ff_cm?: number | null
          spacing_fm_cm?: number | null
          spacing_mm_cm?: number | null
          target_population?: number
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_id?: string
          deleted_at?: string | null
          germination_rate?: number
          gleba_id?: string | null
          id?: string
          observations?: string | null
          org_id?: string
          planned_area?: number
          planned_date?: string
          planting_order?: number
          row_spacing?: number
          seed_lot_id?: string | null
          seeds_per_meter?: number
          spacing_ff_cm?: number | null
          spacing_fm_cm?: number | null
          spacing_mm_cm?: number | null
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
            foreignKeyName: "planting_plan_gleba_id_fkey"
            columns: ["gleba_id"]
            isOneToOne: false
            referencedRelation: "pivot_glebas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planting_plan_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planting_plan_seed_lot_id_fkey"
            columns: ["seed_lot_id"]
            isOneToOne: false
            referencedRelation: "seed_lots"
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
          detasseling_dap: number | null
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
          male_1_planting_finished: boolean | null
          male_2_planting_finished: boolean | null
          male_3_planting_finished: boolean | null
          male_area: number
          male_line: string
          male_planting_finished: boolean
          material_cycle_days: number | null
          material_split: string | null
          org_id: string
          pivot_area: number | null
          pivot_id: string | null
          season: string
          spacing_female_female_cm: number | null
          spacing_female_male_cm: number | null
          spacing_male_male_cm: number | null
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
          detasseling_dap?: number | null
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
          male_1_planting_finished?: boolean | null
          male_2_planting_finished?: boolean | null
          male_3_planting_finished?: boolean | null
          male_area: number
          male_line: string
          male_planting_finished?: boolean
          material_cycle_days?: number | null
          material_split?: string | null
          org_id: string
          pivot_area?: number | null
          pivot_id?: string | null
          season: string
          spacing_female_female_cm?: number | null
          spacing_female_male_cm?: number | null
          spacing_male_male_cm?: number | null
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
          detasseling_dap?: number | null
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
          male_1_planting_finished?: boolean | null
          male_2_planting_finished?: boolean | null
          male_3_planting_finished?: boolean | null
          male_area?: number
          male_line?: string
          male_planting_finished?: boolean
          material_cycle_days?: number | null
          material_split?: string | null
          org_id?: string
          pivot_area?: number | null
          pivot_id?: string | null
          season?: string
          spacing_female_female_cm?: number | null
          spacing_female_male_cm?: number | null
          spacing_male_male_cm?: number | null
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
      rainfall_records: {
        Row: {
          created_at: string
          created_by: string | null
          cycle_id: string
          deleted_at: string | null
          id: string
          method: string | null
          notes: string | null
          org_id: string
          precipitation_mm: number
          record_date: string
          source: string
          source_file_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cycle_id: string
          deleted_at?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          org_id: string
          precipitation_mm: number
          record_date: string
          source?: string
          source_file_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          deleted_at?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          org_id?: string
          precipitation_mm?: number
          record_date?: string
          source?: string
          source_file_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rainfall_records_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rainfall_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rainfall_records_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "water_files"
            referencedColumns: ["id"]
          },
        ]
      }
      roguing_evaluations: {
        Row: {
          area_covered_ha: number | null
          auto_conclusion: string
          auto_conclusion_message: string | null
          created_at: string
          created_by: string | null
          cycle_id: string
          dap: number | null
          deleted_at: string | null
          diseased_frequency: string | null
          diseased_notes: string | null
          diseased_parent: string | null
          diseased_photos: string[] | null
          diseased_types: string[] | null
          evaluation_date: string
          evaluator_name: string | null
          female_in_male_frequency: string | null
          female_in_male_location: string | null
          female_in_male_notes: string | null
          female_in_male_photos: string[] | null
          female_in_male_type: string | null
          general_notes: string | null
          gleba_id: string | null
          gps_latitude: number | null
          gps_longitude: number | null
          growth_stage: string | null
          has_diseased: boolean
          has_female_in_male: boolean
          has_offtype: boolean
          has_volunteers: boolean
          id: string
          offtype_frequency: string | null
          offtype_location: string | null
          offtype_notes: string | null
          offtype_parent: string | null
          offtype_photos: string[] | null
          offtype_types: string[] | null
          org_id: string
          overall_condition: string
          parent_evaluated: string
          volunteers_frequency: string | null
          volunteers_identification: string | null
          volunteers_location: string | null
          volunteers_notes: string | null
          volunteers_parent: string | null
          volunteers_photos: string[] | null
        }
        Insert: {
          area_covered_ha?: number | null
          auto_conclusion?: string
          auto_conclusion_message?: string | null
          created_at?: string
          created_by?: string | null
          cycle_id: string
          dap?: number | null
          deleted_at?: string | null
          diseased_frequency?: string | null
          diseased_notes?: string | null
          diseased_parent?: string | null
          diseased_photos?: string[] | null
          diseased_types?: string[] | null
          evaluation_date?: string
          evaluator_name?: string | null
          female_in_male_frequency?: string | null
          female_in_male_location?: string | null
          female_in_male_notes?: string | null
          female_in_male_photos?: string[] | null
          female_in_male_type?: string | null
          general_notes?: string | null
          gleba_id?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          growth_stage?: string | null
          has_diseased?: boolean
          has_female_in_male?: boolean
          has_offtype?: boolean
          has_volunteers?: boolean
          id?: string
          offtype_frequency?: string | null
          offtype_location?: string | null
          offtype_notes?: string | null
          offtype_parent?: string | null
          offtype_photos?: string[] | null
          offtype_types?: string[] | null
          org_id: string
          overall_condition?: string
          parent_evaluated?: string
          volunteers_frequency?: string | null
          volunteers_identification?: string | null
          volunteers_location?: string | null
          volunteers_notes?: string | null
          volunteers_parent?: string | null
          volunteers_photos?: string[] | null
        }
        Update: {
          area_covered_ha?: number | null
          auto_conclusion?: string
          auto_conclusion_message?: string | null
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          dap?: number | null
          deleted_at?: string | null
          diseased_frequency?: string | null
          diseased_notes?: string | null
          diseased_parent?: string | null
          diseased_photos?: string[] | null
          diseased_types?: string[] | null
          evaluation_date?: string
          evaluator_name?: string | null
          female_in_male_frequency?: string | null
          female_in_male_location?: string | null
          female_in_male_notes?: string | null
          female_in_male_photos?: string[] | null
          female_in_male_type?: string | null
          general_notes?: string | null
          gleba_id?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          growth_stage?: string | null
          has_diseased?: boolean
          has_female_in_male?: boolean
          has_offtype?: boolean
          has_volunteers?: boolean
          id?: string
          offtype_frequency?: string | null
          offtype_location?: string | null
          offtype_notes?: string | null
          offtype_parent?: string | null
          offtype_photos?: string[] | null
          offtype_types?: string[] | null
          org_id?: string
          overall_condition?: string
          parent_evaluated?: string
          volunteers_frequency?: string | null
          volunteers_identification?: string | null
          volunteers_location?: string | null
          volunteers_notes?: string | null
          volunteers_parent?: string | null
          volunteers_photos?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "roguing_evaluations_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roguing_evaluations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      roguing_executions: {
        Row: {
          area_covered_ha: number | null
          created_at: string
          created_by: string | null
          cycle_id: string
          deleted_at: string | null
          diseased_removed: number
          efficacy: string
          execution_date: string
          female_in_male_removed: number
          followup_days: number | null
          hours_spent: number | null
          id: string
          needs_followup: string
          offtype_removed: number
          org_id: string
          photos_post: string[] | null
          request_id: string
          result_notes: string | null
          team_size: number | null
          total_plants_removed: number
          volunteers_removed: number
        }
        Insert: {
          area_covered_ha?: number | null
          created_at?: string
          created_by?: string | null
          cycle_id: string
          deleted_at?: string | null
          diseased_removed?: number
          efficacy?: string
          execution_date?: string
          female_in_male_removed?: number
          followup_days?: number | null
          hours_spent?: number | null
          id?: string
          needs_followup?: string
          offtype_removed?: number
          org_id: string
          photos_post?: string[] | null
          request_id: string
          result_notes?: string | null
          team_size?: number | null
          total_plants_removed?: number
          volunteers_removed?: number
        }
        Update: {
          area_covered_ha?: number | null
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          deleted_at?: string | null
          diseased_removed?: number
          efficacy?: string
          execution_date?: string
          female_in_male_removed?: number
          followup_days?: number | null
          hours_spent?: number | null
          id?: string
          needs_followup?: string
          offtype_removed?: number
          org_id?: string
          photos_post?: string[] | null
          request_id?: string
          result_notes?: string | null
          team_size?: number | null
          total_plants_removed?: number
          volunteers_removed?: number
        }
        Relationships: [
          {
            foreignKeyName: "roguing_executions_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roguing_executions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roguing_executions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "roguing_requests"
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
      roguing_requests: {
        Row: {
          created_at: string
          created_by: string | null
          cycle_id: string
          deleted_at: string | null
          evaluation_id: string | null
          execution_date: string | null
          gleba_id: string | null
          growth_stage: string | null
          id: string
          notes: string | null
          occurrence_summary: string | null
          occurrence_types: string[] | null
          org_id: string
          parent_target: string
          priority: string
          request_date: string
          request_number: number
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cycle_id: string
          deleted_at?: string | null
          evaluation_id?: string | null
          execution_date?: string | null
          gleba_id?: string | null
          growth_stage?: string | null
          id?: string
          notes?: string | null
          occurrence_summary?: string | null
          occurrence_types?: string[] | null
          org_id: string
          parent_target?: string
          priority?: string
          request_date?: string
          request_number?: number
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          deleted_at?: string | null
          evaluation_id?: string | null
          execution_date?: string | null
          gleba_id?: string | null
          growth_stage?: string | null
          id?: string
          notes?: string | null
          occurrence_summary?: string | null
          occurrence_types?: string[] | null
          org_id?: string
          parent_target?: string
          priority?: string
          request_date?: string
          request_number?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "roguing_requests_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roguing_requests_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "roguing_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roguing_requests_org_id_fkey"
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
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
      shared_report_links: {
        Row: {
          code: string
          created_at: string
          created_by: string
          cycle_id: string
          id: string
          storage_path: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          cycle_id: string
          id?: string
          storage_path: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          cycle_id?: string
          id?: string
          storage_path?: string
        }
        Relationships: []
      }
      stand_count_points: {
        Row: {
          created_at: string
          deleted_at: string | null
          gps_latitude: number | null
          gps_longitude: number | null
          id: string
          plants_counted: number
          plants_per_ha: number | null
          plants_per_meter: number | null
          point_number: number
          row_spacing_cm: number
          sample_length_m: number
          stand_count_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          plants_counted: number
          plants_per_ha?: number | null
          plants_per_meter?: number | null
          point_number: number
          row_spacing_cm?: number
          sample_length_m?: number
          stand_count_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          plants_counted?: number
          plants_per_ha?: number | null
          plants_per_meter?: number | null
          point_number?: number
          row_spacing_cm?: number
          sample_length_m?: number
          stand_count_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stand_count_points_stand_count_id_fkey"
            columns: ["stand_count_id"]
            isOneToOne: false
            referencedRelation: "stand_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      stand_counts: {
        Row: {
          avg_plants_per_ha: number | null
          avg_plants_per_meter: number | null
          count_date: string
          count_type: string
          created_at: string
          created_by: string | null
          cv_stand_pct: number | null
          cycle_id: string
          days_after_planting: number | null
          deleted_at: string | null
          emergence_pct: number | null
          gleba_id: string | null
          id: string
          notes: string | null
          org_id: string
          parent_type: string
          photos: string[] | null
          planned_population_ha: number | null
          row_spacing_cm: number
          std_plants_per_ha: number | null
        }
        Insert: {
          avg_plants_per_ha?: number | null
          avg_plants_per_meter?: number | null
          count_date: string
          count_type?: string
          created_at?: string
          created_by?: string | null
          cv_stand_pct?: number | null
          cycle_id: string
          days_after_planting?: number | null
          deleted_at?: string | null
          emergence_pct?: number | null
          gleba_id?: string | null
          id?: string
          notes?: string | null
          org_id: string
          parent_type: string
          photos?: string[] | null
          planned_population_ha?: number | null
          row_spacing_cm?: number
          std_plants_per_ha?: number | null
        }
        Update: {
          avg_plants_per_ha?: number | null
          avg_plants_per_meter?: number | null
          count_date?: string
          count_type?: string
          created_at?: string
          created_by?: string | null
          cv_stand_pct?: number | null
          cycle_id?: string
          days_after_planting?: number | null
          deleted_at?: string | null
          emergence_pct?: number | null
          gleba_id?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          parent_type?: string
          photos?: string[] | null
          planned_population_ha?: number | null
          row_spacing_cm?: number
          std_plants_per_ha?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stand_counts_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stand_counts_gleba_id_fkey"
            columns: ["gleba_id"]
            isOneToOne: false
            referencedRelation: "pivot_glebas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stand_counts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stand_cv_records: {
        Row: {
          created_at: string
          cv_percent: number
          cycle_id: string
          deleted_at: string | null
          id: string
          notes: string | null
          org_id: string
          photo_url: string | null
          plantas_por_metro: number | null
          recorded_date: string
          type: string
        }
        Insert: {
          created_at?: string
          cv_percent: number
          cycle_id: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          org_id: string
          photo_url?: string | null
          plantas_por_metro?: number | null
          recorded_date?: string
          type: string
        }
        Update: {
          created_at?: string
          cv_percent?: number
          cycle_id?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          photo_url?: string | null
          plantas_por_metro?: number | null
          recorded_date?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stand_cv_records_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stand_cv_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ts_product_catalog: {
        Row: {
          active_ingredient: string | null
          category: string | null
          created_at: string | null
          default_dose: number | null
          default_dose_unit: string | null
          deleted_at: string | null
          id: string
          org_id: string
          product_name: string
          product_type: string | null
          updated_at: string | null
        }
        Insert: {
          active_ingredient?: string | null
          category?: string | null
          created_at?: string | null
          default_dose?: number | null
          default_dose_unit?: string | null
          deleted_at?: string | null
          id?: string
          org_id: string
          product_name: string
          product_type?: string | null
          updated_at?: string | null
        }
        Update: {
          active_ingredient?: string | null
          category?: string | null
          created_at?: string | null
          default_dose?: number | null
          default_dose_unit?: string | null
          deleted_at?: string | null
          id?: string
          org_id?: string
          product_name?: string
          product_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ts_product_catalog_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ubs_capacity_state: {
        Row: {
          created_at: string
          id: string
          org_id: string
          state_data: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          state_data?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          state_data?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ubs_capacity_state_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
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
      water_files: {
        Row: {
          content_type: string
          created_at: string
          created_by: string | null
          cycle_id: string
          deleted_at: string | null
          description: string | null
          extracted_html: string | null
          extracted_images: string[] | null
          file_name: string
          file_size_bytes: number
          file_type: string
          file_url: string
          id: string
          org_id: string
          parsed_data: Json | null
          reference_date: string | null
        }
        Insert: {
          content_type?: string
          created_at?: string
          created_by?: string | null
          cycle_id: string
          deleted_at?: string | null
          description?: string | null
          extracted_html?: string | null
          extracted_images?: string[] | null
          file_name: string
          file_size_bytes?: number
          file_type: string
          file_url: string
          id?: string
          org_id: string
          parsed_data?: Json | null
          reference_date?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          deleted_at?: string | null
          description?: string | null
          extracted_html?: string | null
          extracted_images?: string[] | null
          file_name?: string
          file_size_bytes?: number
          file_type?: string
          file_url?: string
          id?: string
          org_id?: string
          parsed_data?: Json | null
          reference_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "water_files_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "water_files_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_analyses: {
        Row: {
          analysis_text: string
          analysis_type: string
          created_at: string
          created_by: string | null
          cycle_id: string
          dap: number | null
          growth_stage: string | null
          id: string
          org_id: string
        }
        Insert: {
          analysis_text: string
          analysis_type?: string
          created_at?: string
          created_by?: string | null
          cycle_id: string
          dap?: number | null
          growth_stage?: string | null
          id?: string
          org_id: string
        }
        Update: {
          analysis_text?: string
          analysis_type?: string
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          dap?: number | null
          growth_stage?: string | null
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weather_analyses_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_analyses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_records: {
        Row: {
          created_at: string
          created_by: string | null
          cycle_id: string
          deleted_at: string | null
          eto_mm: number | null
          humidity_avg_pct: number | null
          humidity_max_pct: number | null
          humidity_min_pct: number | null
          id: string
          notes: string | null
          org_id: string
          precipitation_mm: number | null
          radiation_mj: number | null
          record_date: string
          source: string
          source_file_id: string | null
          temp_avg_c: number | null
          temp_max_c: number | null
          temp_min_c: number | null
          wind_avg_kmh: number | null
          wind_max_kmh: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cycle_id: string
          deleted_at?: string | null
          eto_mm?: number | null
          humidity_avg_pct?: number | null
          humidity_max_pct?: number | null
          humidity_min_pct?: number | null
          id?: string
          notes?: string | null
          org_id: string
          precipitation_mm?: number | null
          radiation_mj?: number | null
          record_date: string
          source?: string
          source_file_id?: string | null
          temp_avg_c?: number | null
          temp_max_c?: number | null
          temp_min_c?: number | null
          wind_avg_kmh?: number | null
          wind_max_kmh?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          deleted_at?: string | null
          eto_mm?: number | null
          humidity_avg_pct?: number | null
          humidity_max_pct?: number | null
          humidity_min_pct?: number | null
          id?: string
          notes?: string | null
          org_id?: string
          precipitation_mm?: number | null
          radiation_mj?: number | null
          record_date?: string
          source?: string
          source_file_id?: string | null
          temp_avg_c?: number | null
          temp_max_c?: number | null
          temp_min_c?: number | null
          wind_avg_kmh?: number | null
          wind_max_kmh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_records_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      yield_ear_samples: {
        Row: {
          created_at: string
          deleted_at: string | null
          ear_length_cm: number | null
          ear_number: number
          id: string
          kernel_rows: number
          kernels_per_row: number
          sample_point_id: string
          total_kernels: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          ear_length_cm?: number | null
          ear_number: number
          id?: string
          kernel_rows: number
          kernels_per_row: number
          sample_point_id: string
          total_kernels: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          ear_length_cm?: number | null
          ear_number?: number
          id?: string
          kernel_rows?: number
          kernels_per_row?: number
          sample_point_id?: string
          total_kernels?: number
        }
        Relationships: [
          {
            foreignKeyName: "yield_ear_samples_sample_point_id_fkey"
            columns: ["sample_point_id"]
            isOneToOne: false
            referencedRelation: "yield_sample_points"
            referencedColumns: ["id"]
          },
        ]
      }
      yield_estimates: {
        Row: {
          avg_ears_per_ha: number | null
          avg_kernels_per_ear: number | null
          bag_weight_kg: number
          classification_loss_pct: number
          created_at: string
          created_by: string | null
          cycle_id: string
          default_tgw_g: number
          dehusking_loss_pct: number
          deleted_at: string | null
          estimate_date: string
          estimate_number: number
          final_pms_g: number | null
          gross_yield_kg_ha: number | null
          id: string
          moisture_reference_pct: number
          net_yield_kg_ha: number | null
          notes: string | null
          org_id: string
          other_loss_pct: number
          total_production_bags: number | null
          total_production_tons: number | null
          total_sample_points: number | null
        }
        Insert: {
          avg_ears_per_ha?: number | null
          avg_kernels_per_ear?: number | null
          bag_weight_kg?: number
          classification_loss_pct?: number
          created_at?: string
          created_by?: string | null
          cycle_id: string
          default_tgw_g?: number
          dehusking_loss_pct?: number
          deleted_at?: string | null
          estimate_date: string
          estimate_number?: number
          final_pms_g?: number | null
          gross_yield_kg_ha?: number | null
          id?: string
          moisture_reference_pct?: number
          net_yield_kg_ha?: number | null
          notes?: string | null
          org_id: string
          other_loss_pct?: number
          total_production_bags?: number | null
          total_production_tons?: number | null
          total_sample_points?: number | null
        }
        Update: {
          avg_ears_per_ha?: number | null
          avg_kernels_per_ear?: number | null
          bag_weight_kg?: number
          classification_loss_pct?: number
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          default_tgw_g?: number
          dehusking_loss_pct?: number
          deleted_at?: string | null
          estimate_date?: string
          estimate_number?: number
          final_pms_g?: number | null
          gross_yield_kg_ha?: number | null
          id?: string
          moisture_reference_pct?: number
          net_yield_kg_ha?: number | null
          notes?: string | null
          org_id?: string
          other_loss_pct?: number
          total_production_bags?: number | null
          total_production_tons?: number | null
          total_sample_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "yield_estimates_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yield_estimates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      yield_sample_points: {
        Row: {
          avg_kernels_per_ear: number | null
          created_at: string
          deleted_at: string | null
          discarded_ears_counted: number
          ears_per_ha: number | null
          id: string
          kernels_cv_pct: number | null
          latitude: number
          longitude: number
          notes: string | null
          photos: string[] | null
          pivot_position: string | null
          plant_condition: string | null
          point_gross_yield_kg_ha: number | null
          point_number: string
          row_spacing_cm: number
          sample_date: string | null
          sample_length_m: number
          sample_moisture_pct: number
          sample_tgw_g: number | null
          sample_time: string | null
          viable_ears_counted: number
          viable_ears_pct: number | null
          yield_estimate_id: string
        }
        Insert: {
          avg_kernels_per_ear?: number | null
          created_at?: string
          deleted_at?: string | null
          discarded_ears_counted?: number
          ears_per_ha?: number | null
          id?: string
          kernels_cv_pct?: number | null
          latitude: number
          longitude: number
          notes?: string | null
          photos?: string[] | null
          pivot_position?: string | null
          plant_condition?: string | null
          point_gross_yield_kg_ha?: number | null
          point_number: string
          row_spacing_cm: number
          sample_date?: string | null
          sample_length_m?: number
          sample_moisture_pct: number
          sample_tgw_g?: number | null
          sample_time?: string | null
          viable_ears_counted: number
          viable_ears_pct?: number | null
          yield_estimate_id: string
        }
        Update: {
          avg_kernels_per_ear?: number | null
          created_at?: string
          deleted_at?: string | null
          discarded_ears_counted?: number
          ears_per_ha?: number | null
          id?: string
          kernels_cv_pct?: number | null
          latitude?: number
          longitude?: number
          notes?: string | null
          photos?: string[] | null
          pivot_position?: string | null
          plant_condition?: string | null
          point_gross_yield_kg_ha?: number | null
          point_number?: string
          row_spacing_cm?: number
          sample_date?: string | null
          sample_length_m?: number
          sample_moisture_pct?: number
          sample_tgw_g?: number | null
          sample_time?: string | null
          viable_ears_counted?: number
          viable_ears_pct?: number | null
          yield_estimate_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "yield_sample_points_yield_estimate_id_fkey"
            columns: ["yield_estimate_id"]
            isOneToOne: false
            referencedRelation: "yield_estimates"
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
      criar_notificacao: {
        Args: {
          p_gerado_por?: string
          p_mensagem: string
          p_modulo?: string
          p_referencia_id?: string
          p_tipo: string
          p_titulo: string
          p_user_id: string
        }
        Returns: string
      }
      feed_get_role: { Args: { _user_id: string }; Returns: string }
      feed_has_access: { Args: { _user_id: string }; Returns: boolean }
      feed_is_mod_or_admin: { Args: { _user_id: string }; Returns: boolean }
      get_all_profiles: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
      get_profiles_by_ids: {
        Args: { _ids: string[] }
        Returns: {
          full_name: string
          id: string
        }[]
      }
      get_user_emails_for_admin: {
        Args: never
        Returns: {
          email: string
          id: string
        }[]
      }
      has_contrato_access: { Args: { _user_id: string }; Returns: boolean }
      has_contrato_delete: { Args: { _user_id: string }; Returns: boolean }
      has_contrato_insert: { Args: { _user_id: string }; Returns: boolean }
      has_plano_acoes_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      restore_cycle: { Args: { _cycle_id: string }; Returns: undefined }
      soft_delete_cycle_cascade: {
        Args: { _cycle_id: string }
        Returns: undefined
      }
      soft_delete_record: {
        Args: { _record_id: string; _table_name: string }
        Returns: undefined
      }
      upsert_ndvi_polygon: {
        Args: {
          _agro_polygon_id: string
          _area_ha: number
          _cycle_id: string
          _org_id: string
          _polygon_geo: Json
          _polygon_name: string
        }
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
