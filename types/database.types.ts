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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      academic_years: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          is_current: boolean | null
          name: string
          organization_id: string | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          is_current?: boolean | null
          name: string
          organization_id?: string | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          is_current?: boolean | null
          name?: string
          organization_id?: string | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_years_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      access_logs: {
        Row: {
          action: string
          created_at: string
          error_message: string | null
          id: string
          ip_address: unknown
          location: string | null
          organization_id: string | null
          resource_id: string | null
          resource_type: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          location?: string | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          location?: string | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accessibility_accommodations: {
        Row: {
          accommodation_type: string
          assigned_to_user_id: string | null
          category: string | null
          completion_rate: number | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          metadata: Json | null
          organization_id: string
          start_date: string | null
          status: string | null
          student_id: string
          student_need_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          accommodation_type: string
          assigned_to_user_id?: string | null
          category?: string | null
          completion_rate?: number | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          start_date?: string | null
          status?: string | null
          student_id: string
          student_need_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          accommodation_type?: string
          assigned_to_user_id?: string | null
          category?: string | null
          completion_rate?: number | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          start_date?: string | null
          status?: string | null
          student_id?: string
          student_need_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accessibility_accommodations_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accessibility_accommodations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accessibility_accommodations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accessibility_accommodations_student_need_id_fkey"
            columns: ["student_need_id"]
            isOneToOne: false
            referencedRelation: "accessibility_student_needs"
            referencedColumns: ["id"]
          },
        ]
      }
      accessibility_compliance_reports: {
        Row: {
          accommodations_implemented: number | null
          accommodations_requested: number | null
          compliance_rate: number | null
          created_at: string
          digital_accessibility_compliant: boolean | null
          equipment_used: number | null
          findings: Json | null
          generated_by_user_id: string | null
          id: string
          organization_id: string
          partner_collaborations: number | null
          period_end: string
          period_start: string
          physical_accessibility_compliant: boolean | null
          recommendations: Json | null
          referent_training_up_to_date: boolean | null
          report_type: string | null
          students_with_disabilities: number | null
          title: string
          total_students: number | null
        }
        Insert: {
          accommodations_implemented?: number | null
          accommodations_requested?: number | null
          compliance_rate?: number | null
          created_at?: string
          digital_accessibility_compliant?: boolean | null
          equipment_used?: number | null
          findings?: Json | null
          generated_by_user_id?: string | null
          id?: string
          organization_id: string
          partner_collaborations?: number | null
          period_end: string
          period_start: string
          physical_accessibility_compliant?: boolean | null
          recommendations?: Json | null
          referent_training_up_to_date?: boolean | null
          report_type?: string | null
          students_with_disabilities?: number | null
          title: string
          total_students?: number | null
        }
        Update: {
          accommodations_implemented?: number | null
          accommodations_requested?: number | null
          compliance_rate?: number | null
          created_at?: string
          digital_accessibility_compliant?: boolean | null
          equipment_used?: number | null
          findings?: Json | null
          generated_by_user_id?: string | null
          id?: string
          organization_id?: string
          partner_collaborations?: number | null
          period_end?: string
          period_start?: string
          physical_accessibility_compliant?: boolean | null
          recommendations?: Json | null
          referent_training_up_to_date?: boolean | null
          report_type?: string | null
          students_with_disabilities?: number | null
          title?: string
          total_students?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accessibility_compliance_reports_generated_by_user_id_fkey"
            columns: ["generated_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accessibility_compliance_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accessibility_configurations: {
        Row: {
          accessibility_policy: string | null
          created_at: string
          digital_accessibility_statement: string | null
          id: string
          organization_id: string
          partner_agefiph: boolean | null
          partner_cap_emploi: boolean | null
          partner_fiphfp: boolean | null
          partner_other: Json | null
          physical_accessibility_statement: string | null
          referent_training_certificate: string | null
          referent_training_date: string | null
          referent_user_id: string | null
          updated_at: string
        }
        Insert: {
          accessibility_policy?: string | null
          created_at?: string
          digital_accessibility_statement?: string | null
          id?: string
          organization_id: string
          partner_agefiph?: boolean | null
          partner_cap_emploi?: boolean | null
          partner_fiphfp?: boolean | null
          partner_other?: Json | null
          physical_accessibility_statement?: string | null
          referent_training_certificate?: string | null
          referent_training_date?: string | null
          referent_user_id?: string | null
          updated_at?: string
        }
        Update: {
          accessibility_policy?: string | null
          created_at?: string
          digital_accessibility_statement?: string | null
          id?: string
          organization_id?: string
          partner_agefiph?: boolean | null
          partner_cap_emploi?: boolean | null
          partner_fiphfp?: boolean | null
          partner_other?: Json | null
          physical_accessibility_statement?: string | null
          referent_training_certificate?: string | null
          referent_training_date?: string | null
          referent_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accessibility_configurations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accessibility_configurations_referent_user_id_fkey"
            columns: ["referent_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      accessibility_disability_types: {
        Row: {
          code: string
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name_en: string
          name_fr: string
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name_en: string
          name_fr: string
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name_en?: string
          name_fr?: string
        }
        Relationships: []
      }
      accessibility_documents: {
        Row: {
          created_at: string
          document_type: string | null
          expiry_date: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_confidential: boolean | null
          issue_date: string | null
          issuer: string | null
          mime_type: string | null
          notes: string | null
          organization_id: string
          reference_number: string | null
          student_id: string
          student_need_id: string | null
          title: string
          updated_at: string
          uploaded_by_user_id: string | null
          verified: boolean | null
          verified_at: string | null
          verified_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          document_type?: string | null
          expiry_date?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_confidential?: boolean | null
          issue_date?: string | null
          issuer?: string | null
          mime_type?: string | null
          notes?: string | null
          organization_id: string
          reference_number?: string | null
          student_id: string
          student_need_id?: string | null
          title: string
          updated_at?: string
          uploaded_by_user_id?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string | null
          expiry_date?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_confidential?: boolean | null
          issue_date?: string | null
          issuer?: string | null
          mime_type?: string | null
          notes?: string | null
          organization_id?: string
          reference_number?: string | null
          student_id?: string
          student_need_id?: string | null
          title?: string
          updated_at?: string
          uploaded_by_user_id?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accessibility_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accessibility_documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accessibility_documents_student_need_id_fkey"
            columns: ["student_need_id"]
            isOneToOne: false
            referencedRelation: "accessibility_student_needs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accessibility_documents_uploaded_by_user_id_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accessibility_documents_verified_by_user_id_fkey"
            columns: ["verified_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      accessibility_equipment: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          last_maintenance_date: string | null
          location: string | null
          maintenance_schedule: string | null
          metadata: Json | null
          name: string
          next_maintenance_date: string | null
          notes: string | null
          organization_id: string
          purchase_date: string | null
          quantity_available: number
          quantity_total: number
          responsible_user_id: string | null
          site_id: string | null
          status: string | null
          updated_at: string
          warranty_expiry_date: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          last_maintenance_date?: string | null
          location?: string | null
          maintenance_schedule?: string | null
          metadata?: Json | null
          name: string
          next_maintenance_date?: string | null
          notes?: string | null
          organization_id: string
          purchase_date?: string | null
          quantity_available?: number
          quantity_total?: number
          responsible_user_id?: string | null
          site_id?: string | null
          status?: string | null
          updated_at?: string
          warranty_expiry_date?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          last_maintenance_date?: string | null
          location?: string | null
          maintenance_schedule?: string | null
          metadata?: Json | null
          name?: string
          next_maintenance_date?: string | null
          notes?: string | null
          organization_id?: string
          purchase_date?: string | null
          quantity_available?: number
          quantity_total?: number
          responsible_user_id?: string | null
          site_id?: string | null
          status?: string | null
          updated_at?: string
          warranty_expiry_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accessibility_equipment_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accessibility_equipment_responsible_user_id_fkey"
            columns: ["responsible_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      accessibility_equipment_assignments: {
        Row: {
          accommodation_id: string | null
          actual_return_date: string | null
          assigned_date: string
          condition_on_assignment: string | null
          condition_on_return: string | null
          created_at: string
          equipment_id: string
          id: string
          notes: string | null
          organization_id: string
          return_date: string | null
          status: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          accommodation_id?: string | null
          actual_return_date?: string | null
          assigned_date?: string
          condition_on_assignment?: string | null
          condition_on_return?: string | null
          created_at?: string
          equipment_id: string
          id?: string
          notes?: string | null
          organization_id: string
          return_date?: string | null
          status?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          accommodation_id?: string | null
          actual_return_date?: string | null
          assigned_date?: string
          condition_on_assignment?: string | null
          condition_on_return?: string | null
          created_at?: string
          equipment_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          return_date?: string | null
          status?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accessibility_equipment_assignments_accommodation_id_fkey"
            columns: ["accommodation_id"]
            isOneToOne: false
            referencedRelation: "accessibility_accommodations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accessibility_equipment_assignments_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "accessibility_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accessibility_equipment_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accessibility_equipment_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      accessibility_student_needs: {
        Row: {
          consent_share_info: boolean | null
          created_at: string
          declaration_date: string | null
          disability_description: string | null
          disability_type_ids: string[] | null
          exam_accommodations_detail: string | null
          external_referent_contact: string | null
          external_referent_name: string | null
          has_disability: boolean | null
          has_mdph_recognition: boolean | null
          id: string
          mdph_expiry_date: string | null
          mdph_number: string | null
          needs_exam_accommodations: boolean | null
          needs_pedagogical_accommodations: boolean | null
          needs_physical_accommodations: boolean | null
          needs_technical_aids: boolean | null
          notes: string | null
          organization_id: string
          pedagogical_accommodations_detail: string | null
          physical_accommodations_detail: string | null
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: string | null
          student_id: string
          technical_aids_detail: string | null
          updated_at: string
        }
        Insert: {
          consent_share_info?: boolean | null
          created_at?: string
          declaration_date?: string | null
          disability_description?: string | null
          disability_type_ids?: string[] | null
          exam_accommodations_detail?: string | null
          external_referent_contact?: string | null
          external_referent_name?: string | null
          has_disability?: boolean | null
          has_mdph_recognition?: boolean | null
          id?: string
          mdph_expiry_date?: string | null
          mdph_number?: string | null
          needs_exam_accommodations?: boolean | null
          needs_pedagogical_accommodations?: boolean | null
          needs_physical_accommodations?: boolean | null
          needs_technical_aids?: boolean | null
          notes?: string | null
          organization_id: string
          pedagogical_accommodations_detail?: string | null
          physical_accommodations_detail?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string | null
          student_id: string
          technical_aids_detail?: string | null
          updated_at?: string
        }
        Update: {
          consent_share_info?: boolean | null
          created_at?: string
          declaration_date?: string | null
          disability_description?: string | null
          disability_type_ids?: string[] | null
          exam_accommodations_detail?: string | null
          external_referent_contact?: string | null
          external_referent_name?: string | null
          has_disability?: boolean | null
          has_mdph_recognition?: boolean | null
          id?: string
          mdph_expiry_date?: string | null
          mdph_number?: string | null
          needs_exam_accommodations?: boolean | null
          needs_pedagogical_accommodations?: boolean | null
          needs_physical_accommodations?: boolean | null
          needs_technical_aids?: boolean | null
          notes?: string | null
          organization_id?: string
          pedagogical_accommodations_detail?: string | null
          physical_accommodations_detail?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string | null
          student_id?: string
          technical_aids_detail?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accessibility_student_needs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accessibility_student_needs_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accessibility_student_needs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_entity_mappings: {
        Row: {
          created_at: string
          entity_type: string
          external_entity_data: Json | null
          external_entity_id: string
          id: string
          integration_id: string
          last_synced_at: string
          local_entity_id: string
          sync_direction: string | null
          sync_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          external_entity_data?: Json | null
          external_entity_id: string
          id?: string
          integration_id: string
          last_synced_at?: string
          local_entity_id: string
          sync_direction?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          external_entity_data?: Json | null
          external_entity_id?: string
          id?: string
          integration_id?: string
          last_synced_at?: string
          local_entity_id?: string
          sync_direction?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_entity_mappings_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "accounting_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_integrations: {
        Row: {
          access_token: string | null
          api_key: string | null
          api_secret: string | null
          api_url: string | null
          auto_sync: boolean | null
          company_id: string | null
          company_name: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          is_test_mode: boolean | null
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          metadata: Json | null
          organization_id: string
          provider: string
          refresh_token: string | null
          sync_expenses: boolean | null
          sync_frequency: string | null
          sync_invoices: boolean | null
          sync_payments: boolean | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          api_key?: string | null
          api_secret?: string | null
          api_url?: string | null
          auto_sync?: boolean | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_test_mode?: boolean | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          metadata?: Json | null
          organization_id: string
          provider: string
          refresh_token?: string | null
          sync_expenses?: boolean | null
          sync_frequency?: string | null
          sync_invoices?: boolean | null
          sync_payments?: boolean | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          api_key?: string | null
          api_secret?: string | null
          api_url?: string | null
          auto_sync?: boolean | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_test_mode?: boolean | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          metadata?: Json | null
          organization_id?: string
          provider?: string
          refresh_token?: string | null
          sync_expenses?: boolean | null
          sync_frequency?: string | null
          sync_invoices?: boolean | null
          sync_payments?: boolean | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_sync_logs: {
        Row: {
          completed_at: string | null
          created_by: string | null
          duration_ms: number | null
          entity_type: string | null
          error_message: string | null
          id: string
          integration_id: string
          records_created: number | null
          records_failed: number | null
          records_skipped: number | null
          records_synced: number | null
          records_updated: number | null
          started_at: string
          status: string
          sync_data: Json | null
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          created_by?: string | null
          duration_ms?: number | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          integration_id: string
          records_created?: number | null
          records_failed?: number | null
          records_skipped?: number | null
          records_synced?: number | null
          records_updated?: number | null
          started_at?: string
          status: string
          sync_data?: Json | null
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          created_by?: string | null
          duration_ms?: number | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          integration_id?: string
          records_created?: number | null
          records_failed?: number | null
          records_skipped?: number | null
          records_synced?: number | null
          records_updated?: number | null
          started_at?: string
          status?: string
          sync_data?: Json | null
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_sync_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "accounting_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_models: {
        Row: {
          accuracy_score: number | null
          configuration: Json | null
          created_at: string
          deployed_at: string | null
          f1_score: number | null
          id: string
          model_name: string
          model_type: string
          model_version: string
          organization_id: string | null
          precision_score: number | null
          recall_score: number | null
          status: string | null
          trained_at: string | null
          training_data_summary: Json | null
          updated_at: string
        }
        Insert: {
          accuracy_score?: number | null
          configuration?: Json | null
          created_at?: string
          deployed_at?: string | null
          f1_score?: number | null
          id?: string
          model_name: string
          model_type: string
          model_version: string
          organization_id?: string | null
          precision_score?: number | null
          recall_score?: number | null
          status?: string | null
          trained_at?: string | null
          training_data_summary?: Json | null
          updated_at?: string
        }
        Update: {
          accuracy_score?: number | null
          configuration?: Json | null
          created_at?: string
          deployed_at?: string | null
          f1_score?: number | null
          id?: string
          model_name?: string
          model_type?: string
          model_version?: string
          organization_id?: string | null
          precision_score?: number | null
          recall_score?: number | null
          status?: string | null
          trained_at?: string | null
          training_data_summary?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_models_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_predictions: {
        Row: {
          confidence: number | null
          created_at: string
          expires_at: string | null
          id: string
          input_features: Json | null
          model_id: string | null
          organization_id: string
          predicted_label: string | null
          predicted_value: number | null
          prediction_type: string
          target_id: string
          target_type: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          input_features?: Json | null
          model_id?: string | null
          organization_id: string
          predicted_label?: string | null
          predicted_value?: number | null
          prediction_type: string
          target_id: string
          target_type: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          input_features?: Json | null
          model_id?: string | null
          organization_id?: string
          predicted_label?: string | null
          predicted_value?: number | null
          prediction_type?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_predictions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_predictions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      anomalies: {
        Row: {
          anomaly_score: number
          anomaly_type_id: string
          assigned_to: string | null
          confidence_level: number
          context_data: Json | null
          description: string
          detected_at: string
          detected_values: Json | null
          deviation_from_normal: number | null
          entity_id: string | null
          entity_type: string
          expected_values: Json | null
          expires_at: string | null
          id: string
          investigated_at: string | null
          organization_id: string
          resolved_at: string | null
          status: string | null
          title: string
        }
        Insert: {
          anomaly_score: number
          anomaly_type_id: string
          assigned_to?: string | null
          confidence_level: number
          context_data?: Json | null
          description: string
          detected_at?: string
          detected_values?: Json | null
          deviation_from_normal?: number | null
          entity_id?: string | null
          entity_type: string
          expected_values?: Json | null
          expires_at?: string | null
          id?: string
          investigated_at?: string | null
          organization_id: string
          resolved_at?: string | null
          status?: string | null
          title: string
        }
        Update: {
          anomaly_score?: number
          anomaly_type_id?: string
          assigned_to?: string | null
          confidence_level?: number
          context_data?: Json | null
          description?: string
          detected_at?: string
          detected_values?: Json | null
          deviation_from_normal?: number | null
          entity_id?: string | null
          entity_type?: string
          expected_values?: Json | null
          expires_at?: string | null
          id?: string
          investigated_at?: string | null
          organization_id?: string
          resolved_at?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "anomalies_anomaly_type_id_fkey"
            columns: ["anomaly_type_id"]
            isOneToOne: false
            referencedRelation: "anomaly_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomalies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      anomaly_actions: {
        Row: {
          action_details: Json | null
          action_type: string
          anomaly_id: string
          created_at: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          anomaly_id: string
          created_at?: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          anomaly_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anomaly_actions_anomaly_id_fkey"
            columns: ["anomaly_id"]
            isOneToOne: false
            referencedRelation: "anomalies"
            referencedColumns: ["id"]
          },
        ]
      }
      anomaly_alerts: {
        Row: {
          alert_type: string | null
          anomaly_id: string
          created_at: string
          id: string
          is_sent: boolean | null
          organization_id: string
          sent_at: string | null
          user_id: string | null
        }
        Insert: {
          alert_type?: string | null
          anomaly_id: string
          created_at?: string
          id?: string
          is_sent?: boolean | null
          organization_id: string
          sent_at?: string | null
          user_id?: string | null
        }
        Update: {
          alert_type?: string | null
          anomaly_id?: string
          created_at?: string
          id?: string
          is_sent?: boolean | null
          organization_id?: string
          sent_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anomaly_alerts_anomaly_id_fkey"
            columns: ["anomaly_id"]
            isOneToOne: false
            referencedRelation: "anomalies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomaly_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      anomaly_detection_models: {
        Row: {
          configuration: Json | null
          created_at: string
          deployed_at: string | null
          f1_score: number | null
          false_positive_rate: number | null
          id: string
          is_production: boolean | null
          model_name: string
          model_type: string
          model_version: string
          organization_id: string | null
          precision_score: number | null
          recall_score: number | null
          status: string | null
          trained_at: string | null
          training_data_summary: Json | null
          updated_at: string
        }
        Insert: {
          configuration?: Json | null
          created_at?: string
          deployed_at?: string | null
          f1_score?: number | null
          false_positive_rate?: number | null
          id?: string
          is_production?: boolean | null
          model_name: string
          model_type: string
          model_version: string
          organization_id?: string | null
          precision_score?: number | null
          recall_score?: number | null
          status?: string | null
          trained_at?: string | null
          training_data_summary?: Json | null
          updated_at?: string
        }
        Update: {
          configuration?: Json | null
          created_at?: string
          deployed_at?: string | null
          f1_score?: number | null
          false_positive_rate?: number | null
          id?: string
          is_production?: boolean | null
          model_name?: string
          model_type?: string
          model_version?: string
          organization_id?: string | null
          precision_score?: number | null
          recall_score?: number | null
          status?: string | null
          trained_at?: string | null
          training_data_summary?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anomaly_detection_models_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      anomaly_detection_rules: {
        Row: {
          anomaly_type_id: string
          created_at: string
          id: string
          is_active: boolean | null
          min_confidence: number | null
          organization_id: string | null
          rule_config: Json
          rule_description: string | null
          rule_name: string
          threshold_value: number | null
          updated_at: string
        }
        Insert: {
          anomaly_type_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          min_confidence?: number | null
          organization_id?: string | null
          rule_config: Json
          rule_description?: string | null
          rule_name: string
          threshold_value?: number | null
          updated_at?: string
        }
        Update: {
          anomaly_type_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          min_confidence?: number | null
          organization_id?: string | null
          rule_config?: Json
          rule_description?: string | null
          rule_name?: string
          threshold_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anomaly_detection_rules_anomaly_type_id_fkey"
            columns: ["anomaly_type_id"]
            isOneToOne: false
            referencedRelation: "anomaly_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomaly_detection_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      anomaly_types: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string | null
          detection_method: string | null
          id: string
          is_active: boolean | null
          name: string
          severity: string | null
          updated_at: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          description?: string | null
          detection_method?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          severity?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          detection_method?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          severity?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          attachments: Json | null
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          score: number | null
          status: string | null
          student_id: string
          submission_text: string | null
          submitted_at: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          attachments?: Json | null
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          status?: string | null
          student_id: string
          submission_text?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          attachments?: Json | null
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          status?: string | null
          student_id?: string
          submission_text?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          allow_late_submission: boolean | null
          allowed_file_types: string[] | null
          attachment_required: boolean | null
          course_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          instructions: string | null
          lesson_id: string | null
          max_file_size_mb: number | null
          max_score: number | null
          title: string
          updated_at: string
        }
        Insert: {
          allow_late_submission?: boolean | null
          allowed_file_types?: string[] | null
          attachment_required?: boolean | null
          course_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          lesson_id?: string | null
          max_file_size_mb?: number | null
          max_score?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          allow_late_submission?: boolean | null
          allowed_file_types?: string[] | null
          attachment_required?: boolean | null
          course_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          lesson_id?: string | null
          max_file_size_mb?: number | null
          max_score?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          class_id: string | null
          created_at: string | null
          date: string
          id: string
          late_minutes: number | null
          notes: string | null
          organization_id: string | null
          session_id: string | null
          status: string
          student_id: string | null
          teacher_id: string | null
          teacher_signature_url: string | null
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          date: string
          id?: string
          late_minutes?: number | null
          notes?: string | null
          organization_id?: string | null
          session_id?: string | null
          status: string
          student_id?: string | null
          teacher_id?: string | null
          teacher_signature_url?: string | null
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          date?: string
          id?: string
          late_minutes?: number | null
          notes?: string | null
          organization_id?: string | null
          session_id?: string | null
          status?: string
          student_id?: string | null
          teacher_id?: string | null
          teacher_signature_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_findings: {
        Row: {
          assigned_to: string | null
          audit_id: string
          control_id: string | null
          created_at: string
          description: string | null
          finding_id: string
          id: string
          remediation_plan: string | null
          resolved_at: string | null
          severity: string
          status: string | null
          target_resolution_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          audit_id: string
          control_id?: string | null
          created_at?: string
          description?: string | null
          finding_id: string
          id?: string
          remediation_plan?: string | null
          resolved_at?: string | null
          severity: string
          status?: string | null
          target_resolution_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          audit_id?: string
          control_id?: string | null
          created_at?: string
          description?: string | null
          finding_id?: string
          id?: string
          remediation_plan?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string | null
          target_resolution_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_findings_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "security_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_findings_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "security_controls"
            referencedColumns: ["id"]
          },
        ]
      }
      bpf_monthly_snapshots: {
        Row: {
          auto_generated: boolean | null
          created_at: string
          id: string
          metrics: Json
          month: number
          organization_id: string
          snapshot_date: string
          year: number
        }
        Insert: {
          auto_generated?: boolean | null
          created_at?: string
          id?: string
          metrics?: Json
          month: number
          organization_id: string
          snapshot_date: string
          year: number
        }
        Update: {
          auto_generated?: boolean | null
          created_at?: string
          id?: string
          metrics?: Json
          month?: number
          organization_id?: string
          snapshot_date?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "bpf_monthly_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bpf_reports: {
        Row: {
          completion_rate: number | null
          created_at: string
          employment_rate: number | null
          freelance_trainers: number | null
          generated_at: string | null
          generated_by: string | null
          id: string
          notes: string | null
          organization_id: string
          owned_locations: number | null
          permanent_trainers: number | null
          rented_locations: number | null
          report_data: Json | null
          revenue_companies: number | null
          revenue_cpf: number | null
          revenue_individuals: number | null
          revenue_opco: number | null
          revenue_other: number | null
          revenue_pole_emploi: number | null
          revenue_regions: number | null
          revenue_state: number | null
          satisfaction_rate: number | null
          status: string | null
          students_disabled: number | null
          students_men: number | null
          students_over_45: number | null
          students_under_26: number | null
          students_women: number | null
          subcontracting_amount: number | null
          submitted_at: string | null
          submitted_by: string | null
          success_rate: number | null
          total_capacity: number | null
          total_programs: number | null
          total_revenue: number | null
          total_sessions: number | null
          total_students: number | null
          total_trainee_hours: number | null
          total_trainers: number | null
          total_training_hours: number | null
          trainer_hours: number | null
          training_locations: number | null
          updated_at: string
          year: number
        }
        Insert: {
          completion_rate?: number | null
          created_at?: string
          employment_rate?: number | null
          freelance_trainers?: number | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          owned_locations?: number | null
          permanent_trainers?: number | null
          rented_locations?: number | null
          report_data?: Json | null
          revenue_companies?: number | null
          revenue_cpf?: number | null
          revenue_individuals?: number | null
          revenue_opco?: number | null
          revenue_other?: number | null
          revenue_pole_emploi?: number | null
          revenue_regions?: number | null
          revenue_state?: number | null
          satisfaction_rate?: number | null
          status?: string | null
          students_disabled?: number | null
          students_men?: number | null
          students_over_45?: number | null
          students_under_26?: number | null
          students_women?: number | null
          subcontracting_amount?: number | null
          submitted_at?: string | null
          submitted_by?: string | null
          success_rate?: number | null
          total_capacity?: number | null
          total_programs?: number | null
          total_revenue?: number | null
          total_sessions?: number | null
          total_students?: number | null
          total_trainee_hours?: number | null
          total_trainers?: number | null
          total_training_hours?: number | null
          trainer_hours?: number | null
          training_locations?: number | null
          updated_at?: string
          year: number
        }
        Update: {
          completion_rate?: number | null
          created_at?: string
          employment_rate?: number | null
          freelance_trainers?: number | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          owned_locations?: number | null
          permanent_trainers?: number | null
          rented_locations?: number | null
          report_data?: Json | null
          revenue_companies?: number | null
          revenue_cpf?: number | null
          revenue_individuals?: number | null
          revenue_opco?: number | null
          revenue_other?: number | null
          revenue_pole_emploi?: number | null
          revenue_regions?: number | null
          revenue_state?: number | null
          satisfaction_rate?: number | null
          status?: string | null
          students_disabled?: number | null
          students_men?: number | null
          students_over_45?: number | null
          students_under_26?: number | null
          students_women?: number | null
          subcontracting_amount?: number | null
          submitted_at?: string | null
          submitted_by?: string | null
          success_rate?: number | null
          total_capacity?: number | null
          total_programs?: number | null
          total_revenue?: number | null
          total_sessions?: number | null
          total_students?: number | null
          total_trainee_hours?: number | null
          total_trainers?: number | null
          total_training_hours?: number | null
          trainer_hours?: number | null
          training_locations?: number | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "bpf_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bpf_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bpf_reports_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bpf_training_domains: {
        Row: {
          bpf_report_id: string
          created_at: string
          domain_category: string | null
          domain_code: string | null
          domain_name: string
          id: string
          programs_count: number | null
          revenue: number | null
          students_count: number | null
          training_hours: number | null
        }
        Insert: {
          bpf_report_id: string
          created_at?: string
          domain_category?: string | null
          domain_code?: string | null
          domain_name: string
          id?: string
          programs_count?: number | null
          revenue?: number | null
          students_count?: number | null
          training_hours?: number | null
        }
        Update: {
          bpf_report_id?: string
          created_at?: string
          domain_category?: string | null
          domain_code?: string | null
          domain_name?: string
          id?: string
          programs_count?: number | null
          revenue?: number | null
          students_count?: number | null
          training_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bpf_training_domains_bpf_report_id_fkey"
            columns: ["bpf_report_id"]
            isOneToOne: false
            referencedRelation: "bpf_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_mappings: {
        Row: {
          created_at: string
          entity_type: string
          external_calendar_id: string | null
          external_event_data: Json | null
          external_event_id: string
          id: string
          integration_id: string
          last_synced_at: string
          local_entity_id: string
          sync_direction: string | null
          sync_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          external_calendar_id?: string | null
          external_event_data?: Json | null
          external_event_id: string
          id?: string
          integration_id: string
          last_synced_at?: string
          local_entity_id: string
          sync_direction?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          external_calendar_id?: string | null
          external_event_data?: Json | null
          external_event_id?: string
          id?: string
          integration_id?: string
          last_synced_at?: string
          local_entity_id?: string
          sync_direction?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_mappings_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "calendar_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          calendar_id: string
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string
          event_type: string | null
          id: string
          is_all_day: boolean | null
          location: string | null
          organization_id: string
          recurrence_end_date: string | null
          recurrence_rule: string | null
          start_time: string
          status: string | null
          timezone: string | null
          title: string
          updated_at: string
        }
        Insert: {
          calendar_id: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time: string
          event_type?: string | null
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          organization_id: string
          recurrence_end_date?: string | null
          recurrence_rule?: string | null
          start_time: string
          status?: string | null
          timezone?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          calendar_id?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string
          event_type?: string | null
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          organization_id?: string
          recurrence_end_date?: string | null
          recurrence_rule?: string | null
          start_time?: string
          status?: string | null
          timezone?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_integrations: {
        Row: {
          access_token: string | null
          api_key: string | null
          api_secret: string | null
          auto_sync: boolean | null
          create_events_for_sessions: boolean | null
          created_at: string
          created_by: string | null
          default_calendar_id: string | null
          default_calendar_name: string | null
          id: string
          include_location: boolean | null
          include_students_in_events: boolean | null
          is_active: boolean | null
          is_test_mode: boolean | null
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          metadata: Json | null
          organization_id: string
          provider: string
          refresh_token: string | null
          reminder_minutes: number | null
          send_reminders: boolean | null
          sync_attendance: boolean | null
          sync_frequency: string | null
          sync_sessions: boolean | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          api_key?: string | null
          api_secret?: string | null
          auto_sync?: boolean | null
          create_events_for_sessions?: boolean | null
          created_at?: string
          created_by?: string | null
          default_calendar_id?: string | null
          default_calendar_name?: string | null
          id?: string
          include_location?: boolean | null
          include_students_in_events?: boolean | null
          is_active?: boolean | null
          is_test_mode?: boolean | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          metadata?: Json | null
          organization_id: string
          provider: string
          refresh_token?: string | null
          reminder_minutes?: number | null
          send_reminders?: boolean | null
          sync_attendance?: boolean | null
          sync_frequency?: string | null
          sync_sessions?: boolean | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          api_key?: string | null
          api_secret?: string | null
          auto_sync?: boolean | null
          create_events_for_sessions?: boolean | null
          created_at?: string
          created_by?: string | null
          default_calendar_id?: string | null
          default_calendar_name?: string | null
          id?: string
          include_location?: boolean | null
          include_students_in_events?: boolean | null
          is_active?: boolean | null
          is_test_mode?: boolean | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          metadata?: Json | null
          organization_id?: string
          provider?: string
          refresh_token?: string | null
          reminder_minutes?: number | null
          send_reminders?: boolean | null
          sync_attendance?: boolean | null
          sync_frequency?: string | null
          sync_sessions?: boolean | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_notifications: {
        Row: {
          channel: string | null
          created_at: string
          formation_id: string | null
          id: string
          message: string | null
          notification_type: string
          organization_id: string
          read_at: string | null
          scheduled_at: string
          sent_at: string | null
          session_id: string | null
          status: string | null
          title: string
          todo_id: string | null
          user_id: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          formation_id?: string | null
          id?: string
          message?: string | null
          notification_type: string
          organization_id: string
          read_at?: string | null
          scheduled_at: string
          sent_at?: string | null
          session_id?: string | null
          status?: string | null
          title: string
          todo_id?: string | null
          user_id: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          formation_id?: string | null
          id?: string
          message?: string | null
          notification_type?: string
          organization_id?: string
          read_at?: string | null
          scheduled_at?: string
          sent_at?: string | null
          session_id?: string | null
          status?: string | null
          title?: string
          todo_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_notifications_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_notifications_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_notifications_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "calendar_todos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_shares: {
        Row: {
          accepted_at: string | null
          calendar_id: string
          id: string
          is_accepted: boolean | null
          permission_level: string | null
          shared_at: string
          shared_by: string | null
          shared_with_email: string | null
          shared_with_user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          calendar_id: string
          id?: string
          is_accepted?: boolean | null
          permission_level?: string | null
          shared_at?: string
          shared_by?: string | null
          shared_with_email?: string | null
          shared_with_user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          calendar_id?: string
          id?: string
          is_accepted?: boolean | null
          permission_level?: string | null
          shared_at?: string
          shared_by?: string | null
          shared_with_email?: string | null
          shared_with_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_shares_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_sync_logs: {
        Row: {
          completed_at: string | null
          created_by: string | null
          duration_ms: number | null
          entity_type: string | null
          error_message: string | null
          events_created: number | null
          events_deleted: number | null
          events_failed: number | null
          events_skipped: number | null
          events_synced: number | null
          events_updated: number | null
          id: string
          integration_id: string
          started_at: string
          status: string
          sync_data: Json | null
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          created_by?: string | null
          duration_ms?: number | null
          entity_type?: string | null
          error_message?: string | null
          events_created?: number | null
          events_deleted?: number | null
          events_failed?: number | null
          events_skipped?: number | null
          events_synced?: number | null
          events_updated?: number | null
          id?: string
          integration_id: string
          started_at?: string
          status: string
          sync_data?: Json | null
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          created_by?: string | null
          duration_ms?: number | null
          entity_type?: string | null
          error_message?: string | null
          events_created?: number | null
          events_deleted?: number | null
          events_failed?: number | null
          events_skipped?: number | null
          events_synced?: number | null
          events_updated?: number | null
          id?: string
          integration_id?: string
          started_at?: string
          status?: string
          sync_data?: Json | null
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "calendar_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_todos: {
        Row: {
          all_day: boolean | null
          assigned_to: string | null
          category: string | null
          color: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string
          due_time: string | null
          id: string
          is_recurring: boolean | null
          linked_formation_id: string | null
          linked_session_id: string | null
          linked_student_id: string | null
          metadata: Json | null
          organization_id: string
          parent_todo_id: string | null
          priority: string | null
          recurrence_end_date: string | null
          recurrence_rule: string | null
          reminder_enabled: boolean | null
          reminder_minutes_before: number | null
          reminder_sent: boolean | null
          reminder_sent_at: string | null
          start_date: string | null
          start_time: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean | null
          assigned_to?: string | null
          category?: string | null
          color?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date: string
          due_time?: string | null
          id?: string
          is_recurring?: boolean | null
          linked_formation_id?: string | null
          linked_session_id?: string | null
          linked_student_id?: string | null
          metadata?: Json | null
          organization_id: string
          parent_todo_id?: string | null
          priority?: string | null
          recurrence_end_date?: string | null
          recurrence_rule?: string | null
          reminder_enabled?: boolean | null
          reminder_minutes_before?: number | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          start_date?: string | null
          start_time?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean | null
          assigned_to?: string | null
          category?: string | null
          color?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string
          due_time?: string | null
          id?: string
          is_recurring?: boolean | null
          linked_formation_id?: string | null
          linked_session_id?: string | null
          linked_student_id?: string | null
          metadata?: Json | null
          organization_id?: string
          parent_todo_id?: string | null
          priority?: string | null
          recurrence_end_date?: string | null
          recurrence_rule?: string | null
          reminder_enabled?: boolean | null
          reminder_minutes_before?: number | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          start_date?: string | null
          start_time?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_todos_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_todos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_todos_linked_formation_id_fkey"
            columns: ["linked_formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_todos_linked_session_id_fkey"
            columns: ["linked_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_todos_linked_student_id_fkey"
            columns: ["linked_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_todos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_todos_parent_todo_id_fkey"
            columns: ["parent_todo_id"]
            isOneToOne: false
            referencedRelation: "calendar_todos"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_user_preferences: {
        Row: {
          created_at: string
          default_reminder_minutes: number | null
          default_view: string | null
          email_notifications: boolean | null
          formation_color: string | null
          id: string
          organization_id: string
          push_notifications: boolean | null
          session_color: string | null
          show_completed: boolean | null
          show_formations: boolean | null
          show_sessions: boolean | null
          show_todos: boolean | null
          show_weekends: boolean | null
          todo_color: string | null
          updated_at: string
          user_id: string
          week_starts_on: number | null
          working_hours_end: string | null
          working_hours_start: string | null
        }
        Insert: {
          created_at?: string
          default_reminder_minutes?: number | null
          default_view?: string | null
          email_notifications?: boolean | null
          formation_color?: string | null
          id?: string
          organization_id: string
          push_notifications?: boolean | null
          session_color?: string | null
          show_completed?: boolean | null
          show_formations?: boolean | null
          show_sessions?: boolean | null
          show_todos?: boolean | null
          show_weekends?: boolean | null
          todo_color?: string | null
          updated_at?: string
          user_id: string
          week_starts_on?: number | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Update: {
          created_at?: string
          default_reminder_minutes?: number | null
          default_view?: string | null
          email_notifications?: boolean | null
          formation_color?: string | null
          id?: string
          organization_id?: string
          push_notifications?: boolean | null
          session_color?: string | null
          show_completed?: boolean | null
          show_formations?: boolean | null
          show_sessions?: boolean | null
          show_todos?: boolean | null
          show_weekends?: boolean | null
          todo_color?: string | null
          updated_at?: string
          user_id?: string
          week_starts_on?: number | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_user_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      calendars: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_default: boolean | null
          is_public: boolean | null
          last_synced_at: string | null
          name: string
          organization_id: string
          owner_id: string
          sync_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          is_public?: boolean | null
          last_synced_at?: string | null
          name: string
          organization_id: string
          owner_id: string
          sync_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          is_public?: boolean | null
          last_synced_at?: string | null
          name?: string
          organization_id?: string
          owner_id?: string
          sync_enabled?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendars_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      call_participants: {
        Row: {
          call_id: string
          id: string
          joined_at: string | null
          left_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          call_id: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          call_id?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_participants_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          call_type: string | null
          conversation_id: string
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          initiator_id: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          call_type?: string | null
          conversation_id: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          initiator_id: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          call_type?: string | null
          conversation_id?: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          initiator_id?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      certification_certificates: {
        Row: {
          certificate_number: string | null
          certification_id: string
          certification_level: string | null
          created_at: string | null
          delivered_at: string | null
          delivered_to: string | null
          file_hash: string | null
          file_url: string | null
          id: string
          issue_date: string
          issued_by: string | null
          jury_id: string | null
          metadata: Json | null
          organization_id: string
          rncp_code: string | null
          session_id: string | null
          status: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          certificate_number?: string | null
          certification_id: string
          certification_level?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivered_to?: string | null
          file_hash?: string | null
          file_url?: string | null
          id?: string
          issue_date: string
          issued_by?: string | null
          jury_id?: string | null
          metadata?: Json | null
          organization_id: string
          rncp_code?: string | null
          session_id?: string | null
          status?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          certificate_number?: string | null
          certification_id?: string
          certification_level?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivered_to?: string | null
          file_hash?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string
          issued_by?: string | null
          jury_id?: string | null
          metadata?: Json | null
          organization_id?: string
          rncp_code?: string | null
          session_id?: string | null
          status?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certification_certificates_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "rncp_certifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_certificates_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_certificates_jury_id_fkey"
            columns: ["jury_id"]
            isOneToOne: false
            referencedRelation: "certification_juries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_certificates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_certificates_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      certification_juries: {
        Row: {
          certification_id: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          external_members: string[] | null
          id: string
          jury_date: string
          jury_name: string
          jury_time: string | null
          location: string | null
          members: string[] | null
          metadata: Json | null
          organization_id: string
          president_id: string | null
          session_id: string | null
          site_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          certification_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          external_members?: string[] | null
          id?: string
          jury_date: string
          jury_name: string
          jury_time?: string | null
          location?: string | null
          members?: string[] | null
          metadata?: Json | null
          organization_id: string
          president_id?: string | null
          session_id?: string | null
          site_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          certification_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          external_members?: string[] | null
          id?: string
          jury_date?: string
          jury_name?: string
          jury_time?: string | null
          location?: string | null
          members?: string[] | null
          metadata?: Json | null
          organization_id?: string
          president_id?: string | null
          session_id?: string | null
          site_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certification_juries_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "rncp_certifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_juries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_juries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_juries_president_id_fkey"
            columns: ["president_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_juries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_juries_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      charge_categories: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "charge_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year_id: string | null
          capacity: number | null
          code: string
          created_at: string | null
          id: string
          level: string | null
          name: string
          organization_id: string | null
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          academic_year_id?: string | null
          capacity?: number | null
          code: string
          created_at?: string | null
          id?: string
          level?: string | null
          name: string
          organization_id?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          academic_year_id?: string | null
          capacity?: number | null
          code?: string
          created_at?: string | null
          id?: string
          level?: string | null
          name?: string
          organization_id?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_resources: {
        Row: {
          added_at: string
          added_by: string | null
          collection_id: string
          id: string
          order_index: number | null
          resource_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          collection_id: string
          id?: string
          order_index?: number | null
          resource_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          collection_id?: string
          id?: string
          order_index?: number | null
          resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_resources_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "resource_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "educational_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_evidence: {
        Row: {
          collected_at: string
          collected_by: string | null
          control_id: string
          created_at: string
          description: string | null
          evidence_type: string
          expires_at: string | null
          file_url: string | null
          id: string
          organization_id: string | null
          title: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          collected_at?: string
          collected_by?: string | null
          control_id: string
          created_at?: string
          description?: string | null
          evidence_type: string
          expires_at?: string | null
          file_url?: string | null
          id?: string
          organization_id?: string | null
          title: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          collected_at?: string
          collected_by?: string | null
          control_id?: string
          created_at?: string
          description?: string | null
          evidence_type?: string
          expires_at?: string | null
          file_url?: string | null
          id?: string
          organization_id?: string | null
          title?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_evidence_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "security_controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_evidence_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          is_muted: boolean | null
          joined_at: string
          last_read_at: string | null
          notification_preferences: Json | null
          role: string | null
          student_id: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id: string
          id?: string
          is_muted?: boolean | null
          joined_at?: string
          last_read_at?: string | null
          notification_preferences?: Json | null
          role?: string | null
          student_id?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string
          id?: string
          is_muted?: boolean | null
          joined_at?: string
          last_read_at?: string | null
          notification_preferences?: Json | null
          role?: string | null
          student_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          avatar_url: string | null
          conversation_type: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_archived: boolean | null
          is_pinned: boolean | null
          last_message_at: string | null
          name: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          conversation_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          last_message_at?: string | null
          name?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          conversation_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          last_message_at?: string | null
          name?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      course_certificates: {
        Row: {
          certificate_number: string
          certificate_url: string | null
          course_id: string
          enrollment_id: string | null
          id: string
          issued_at: string
          student_id: string
        }
        Insert: {
          certificate_number: string
          certificate_url?: string | null
          course_id: string
          enrollment_id?: string | null
          id?: string
          issued_at?: string
          student_id: string
        }
        Update: {
          certificate_number?: string
          certificate_url?: string | null
          course_id?: string
          enrollment_id?: string | null
          id?: string
          issued_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_certificates_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "course_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          completed_at: string | null
          completed_lessons: number[] | null
          course_id: string
          enrolled_at: string
          enrollment_status: string | null
          id: string
          last_accessed_at: string | null
          last_accessed_lesson_id: string | null
          progress_percentage: number | null
          student_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_lessons?: number[] | null
          course_id: string
          enrolled_at?: string
          enrollment_status?: string | null
          id?: string
          last_accessed_at?: string | null
          last_accessed_lesson_id?: string | null
          progress_percentage?: number | null
          student_id: string
        }
        Update: {
          completed_at?: string | null
          completed_lessons?: number[] | null
          course_id?: string
          enrolled_at?: string
          enrollment_status?: string | null
          id?: string
          last_accessed_at?: string | null
          last_accessed_lesson_id?: string | null
          progress_percentage?: number | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_last_accessed_lesson_id_fkey"
            columns: ["last_accessed_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_reviews: {
        Row: {
          course_id: string
          created_at: string
          id: string
          rating: number | null
          review_text: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          rating?: number | null
          review_text?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          rating?: number | null
          review_text?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_sections: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          order_index: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          cover_image_url: string | null
          created_at: string
          currency: string | null
          description: string | null
          difficulty_level: string | null
          estimated_duration_hours: number | null
          formation_id: string | null
          id: string
          instructor_id: string | null
          is_featured: boolean | null
          is_free: boolean | null
          is_published: boolean | null
          language: string | null
          meta_description: string | null
          meta_title: string | null
          organization_id: string
          price: number | null
          published_at: string | null
          scores_enabled: boolean
          short_description: string | null
          slug: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          total_lessons: number | null
          total_students: number | null
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          difficulty_level?: string | null
          estimated_duration_hours?: number | null
          formation_id?: string | null
          id?: string
          instructor_id?: string | null
          is_featured?: boolean | null
          is_free?: boolean | null
          is_published?: boolean | null
          language?: string | null
          meta_description?: string | null
          meta_title?: string | null
          organization_id: string
          price?: number | null
          published_at?: string | null
          scores_enabled?: boolean
          short_description?: string | null
          slug: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          total_lessons?: number | null
          total_students?: number | null
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          difficulty_level?: string | null
          estimated_duration_hours?: number | null
          formation_id?: string | null
          id?: string
          instructor_id?: string | null
          is_featured?: boolean | null
          is_free?: boolean | null
          is_published?: boolean | null
          language?: string | null
          meta_description?: string | null
          meta_title?: string | null
          organization_id?: string
          price?: number | null
          published_at?: string | null
          scores_enabled?: boolean
          short_description?: string | null
          slug?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          total_lessons?: number | null
          total_students?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cpf_catalog_sync: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_details: Json | null
          error_message: string | null
          id: string
          metadata: Json | null
          organization_id: string
          records_created: number | null
          records_failed: number | null
          records_skipped: number | null
          records_total: number | null
          records_updated: number | null
          started_at: string | null
          stats: Json | null
          sync_method: string
          sync_status: string
          sync_type: string
          updated_at: string | null
          xml_file_hash: string | null
          xml_file_url: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          records_created?: number | null
          records_failed?: number | null
          records_skipped?: number | null
          records_total?: number | null
          records_updated?: number | null
          started_at?: string | null
          stats?: Json | null
          sync_method?: string
          sync_status?: string
          sync_type?: string
          updated_at?: string | null
          xml_file_hash?: string | null
          xml_file_url?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          records_created?: number | null
          records_failed?: number | null
          records_skipped?: number | null
          records_total?: number | null
          records_updated?: number | null
          started_at?: string | null
          stats?: Json | null
          sync_method?: string
          sync_status?: string
          sync_type?: string
          updated_at?: string | null
          xml_file_hash?: string | null
          xml_file_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cpf_catalog_sync_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cpf_catalog_sync_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cpf_eligible_trainings: {
        Row: {
          certification_level: string | null
          cpf_funding_rate: number | null
          cpf_training_code: string | null
          cpf_training_title: string
          created_at: string | null
          currency: string | null
          current_learners: number | null
          description: string | null
          duration_days: number | null
          duration_hours: number | null
          eligibility_date: string | null
          eligibility_end_date: string | null
          eligibility_status: string | null
          external_id: string | null
          id: string
          last_synced_at: string | null
          learning_objectives: string | null
          max_learners: number | null
          organization_id: string
          prerequisites: string | null
          price: number
          rncp_code: string | null
          sync_date: string | null
          sync_id: string | null
          sync_source: string | null
          training_id: string | null
          updated_at: string | null
        }
        Insert: {
          certification_level?: string | null
          cpf_funding_rate?: number | null
          cpf_training_code?: string | null
          cpf_training_title: string
          created_at?: string | null
          currency?: string | null
          current_learners?: number | null
          description?: string | null
          duration_days?: number | null
          duration_hours?: number | null
          eligibility_date?: string | null
          eligibility_end_date?: string | null
          eligibility_status?: string | null
          external_id?: string | null
          id?: string
          last_synced_at?: string | null
          learning_objectives?: string | null
          max_learners?: number | null
          organization_id: string
          prerequisites?: string | null
          price: number
          rncp_code?: string | null
          sync_date?: string | null
          sync_id?: string | null
          sync_source?: string | null
          training_id?: string | null
          updated_at?: string | null
        }
        Update: {
          certification_level?: string | null
          cpf_funding_rate?: number | null
          cpf_training_code?: string | null
          cpf_training_title?: string
          created_at?: string | null
          currency?: string | null
          current_learners?: number | null
          description?: string | null
          duration_days?: number | null
          duration_hours?: number | null
          eligibility_date?: string | null
          eligibility_end_date?: string | null
          eligibility_status?: string | null
          external_id?: string | null
          id?: string
          last_synced_at?: string | null
          learning_objectives?: string | null
          max_learners?: number | null
          organization_id?: string
          prerequisites?: string | null
          price?: number
          rncp_code?: string | null
          sync_date?: string | null
          sync_id?: string | null
          sync_source?: string | null
          training_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cpf_eligible_trainings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cpf_eligible_trainings_sync_id_fkey"
            columns: ["sync_id"]
            isOneToOne: false
            referencedRelation: "cpf_catalog_sync"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cpf_eligible_trainings_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      cpf_enrollments: {
        Row: {
          attestation_date: string | null
          attestation_file_url: string | null
          completion_certificate_url: string | null
          cpf_attestation_number: string | null
          cpf_funding_amount: number
          cpf_transaction_id: string | null
          created_at: string | null
          end_date: string | null
          enrollment_date: string
          id: string
          learner_contribution: number | null
          learner_id: string
          notes: string | null
          organization_id: string
          start_date: string | null
          status: string | null
          total_amount: number
          training_id: string
          updated_at: string | null
        }
        Insert: {
          attestation_date?: string | null
          attestation_file_url?: string | null
          completion_certificate_url?: string | null
          cpf_attestation_number?: string | null
          cpf_funding_amount: number
          cpf_transaction_id?: string | null
          created_at?: string | null
          end_date?: string | null
          enrollment_date: string
          id?: string
          learner_contribution?: number | null
          learner_id: string
          notes?: string | null
          organization_id: string
          start_date?: string | null
          status?: string | null
          total_amount: number
          training_id: string
          updated_at?: string | null
        }
        Update: {
          attestation_date?: string | null
          attestation_file_url?: string | null
          completion_certificate_url?: string | null
          cpf_attestation_number?: string | null
          cpf_funding_amount?: number
          cpf_transaction_id?: string | null
          created_at?: string | null
          end_date?: string | null
          enrollment_date?: string
          id?: string
          learner_contribution?: number | null
          learner_id?: string
          notes?: string | null
          organization_id?: string
          start_date?: string | null
          status?: string | null
          total_amount?: number
          training_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cpf_enrollments_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cpf_enrollments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cpf_enrollments_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "cpf_eligible_trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_entity_mappings: {
        Row: {
          created_at: string
          entity_type: string
          external_entity_data: Json | null
          external_entity_id: string
          id: string
          integration_id: string
          last_synced_at: string
          local_entity_id: string
          sync_direction: string | null
          sync_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          external_entity_data?: Json | null
          external_entity_id: string
          id?: string
          integration_id: string
          last_synced_at?: string
          local_entity_id: string
          sync_direction?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          external_entity_data?: Json | null
          external_entity_id?: string
          id?: string
          integration_id?: string
          last_synced_at?: string
          local_entity_id?: string
          sync_direction?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_entity_mappings_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "crm_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_integrations: {
        Row: {
          access_token: string | null
          api_key: string | null
          api_secret: string | null
          auto_sync: boolean | null
          client_id: string | null
          client_secret: string | null
          created_at: string
          created_by: string | null
          enrollment_object_type: string | null
          formation_object_type: string | null
          id: string
          instance_url: string | null
          is_active: boolean | null
          is_test_mode: boolean | null
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          metadata: Json | null
          organization_id: string
          provider: string
          refresh_token: string | null
          student_object_type: string | null
          sync_enrollments: boolean | null
          sync_formations: boolean | null
          sync_frequency: string | null
          sync_payments: boolean | null
          sync_students: boolean | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          api_key?: string | null
          api_secret?: string | null
          auto_sync?: boolean | null
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          created_by?: string | null
          enrollment_object_type?: string | null
          formation_object_type?: string | null
          id?: string
          instance_url?: string | null
          is_active?: boolean | null
          is_test_mode?: boolean | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          metadata?: Json | null
          organization_id: string
          provider: string
          refresh_token?: string | null
          student_object_type?: string | null
          sync_enrollments?: boolean | null
          sync_formations?: boolean | null
          sync_frequency?: string | null
          sync_payments?: boolean | null
          sync_students?: boolean | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          api_key?: string | null
          api_secret?: string | null
          auto_sync?: boolean | null
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          created_by?: string | null
          enrollment_object_type?: string | null
          formation_object_type?: string | null
          id?: string
          instance_url?: string | null
          is_active?: boolean | null
          is_test_mode?: boolean | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          metadata?: Json | null
          organization_id?: string
          provider?: string
          refresh_token?: string | null
          student_object_type?: string | null
          sync_enrollments?: boolean | null
          sync_formations?: boolean | null
          sync_frequency?: string | null
          sync_payments?: boolean | null
          sync_students?: boolean | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_sync_logs: {
        Row: {
          completed_at: string | null
          created_by: string | null
          duration_ms: number | null
          entities_created: number | null
          entities_deleted: number | null
          entities_failed: number | null
          entities_skipped: number | null
          entities_synced: number | null
          entities_updated: number | null
          entity_type: string | null
          error_message: string | null
          id: string
          integration_id: string
          started_at: string
          status: string
          sync_data: Json | null
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          created_by?: string | null
          duration_ms?: number | null
          entities_created?: number | null
          entities_deleted?: number | null
          entities_failed?: number | null
          entities_skipped?: number | null
          entities_synced?: number | null
          entities_updated?: number | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          integration_id: string
          started_at?: string
          status: string
          sync_data?: Json | null
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          created_by?: string | null
          duration_ms?: number | null
          entities_created?: number | null
          entities_deleted?: number | null
          entities_failed?: number | null
          entities_skipped?: number | null
          entities_synced?: number | null
          entities_updated?: number | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          integration_id?: string
          started_at?: string
          status?: string
          sync_data?: Json | null
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_sync_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "crm_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_signatures: {
        Row: {
          comment: string | null
          created_at: string
          document_id: string
          height: number | null
          id: string
          ip_address: string | null
          is_valid: boolean | null
          organization_id: string
          page_number: number | null
          position_x: number | null
          position_y: number | null
          signature_data: string
          signature_type: string | null
          signed_at: string
          signer_email: string | null
          signer_id: string
          signer_name: string
          signer_role: string | null
          status: string | null
          updated_at: string
          user_agent: string | null
          validation_code: string | null
          width: number | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          document_id: string
          height?: number | null
          id?: string
          ip_address?: string | null
          is_valid?: boolean | null
          organization_id: string
          page_number?: number | null
          position_x?: number | null
          position_y?: number | null
          signature_data: string
          signature_type?: string | null
          signed_at?: string
          signer_email?: string | null
          signer_id: string
          signer_name: string
          signer_role?: string | null
          status?: string | null
          updated_at?: string
          user_agent?: string | null
          validation_code?: string | null
          width?: number | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          document_id?: string
          height?: number | null
          id?: string
          ip_address?: string | null
          is_valid?: boolean | null
          organization_id?: string
          page_number?: number | null
          position_x?: number | null
          position_y?: number | null
          signature_data?: string
          signature_type?: string | null
          signed_at?: string
          signer_email?: string | null
          signer_id?: string
          signer_name?: string
          signer_role?: string | null
          status?: string | null
          updated_at?: string
          user_agent?: string | null
          validation_code?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_signatures_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_signatures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_signatures_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      document_template_versions: {
        Row: {
          content: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          footer: Json | null
          footer_enabled: boolean | null
          footer_height: number | null
          header: Json | null
          header_enabled: boolean | null
          header_height: number | null
          id: string
          margins: Json | null
          name: string | null
          page_size: string | null
          template_id: string
          version_number: number
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          footer?: Json | null
          footer_enabled?: boolean | null
          footer_height?: number | null
          header?: Json | null
          header_enabled?: boolean | null
          header_height?: number | null
          id?: string
          margins?: Json | null
          name?: string | null
          page_size?: string | null
          template_id: string
          version_number: number
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          footer?: Json | null
          footer_enabled?: boolean | null
          footer_height?: number | null
          header?: Json | null
          header_enabled?: boolean | null
          header_height?: number | null
          id?: string
          margins?: Json | null
          name?: string | null
          page_size?: string | null
          template_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_template_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          content: Json
          created_at: string | null
          docx_template_url: string | null
          footer: Json | null
          footer_enabled: boolean | null
          footer_height: number | null
          header: Json | null
          header_enabled: boolean | null
          header_height: number | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          margins: Json | null
          name: string
          organization_id: string
          page_size: string | null
          type: Database["public"]["Enums"]["document_type"]
          updated_at: string | null
        }
        Insert: {
          content: Json
          created_at?: string | null
          docx_template_url?: string | null
          footer?: Json | null
          footer_enabled?: boolean | null
          footer_height?: number | null
          header?: Json | null
          header_enabled?: boolean | null
          header_height?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          margins?: Json | null
          name: string
          organization_id: string
          page_size?: string | null
          type: Database["public"]["Enums"]["document_type"]
          updated_at?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          docx_template_url?: string | null
          footer?: Json | null
          footer_enabled?: boolean | null
          footer_height?: number | null
          header?: Json | null
          header_enabled?: boolean | null
          header_height?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          margins?: Json | null
          name?: string
          organization_id?: string
          page_size?: string | null
          type?: Database["public"]["Enums"]["document_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          expires_at: string | null
          file_url: string
          id: string
          metadata: Json | null
          organization_id: string | null
          student_id: string | null
          template_id: string | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          file_url: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          student_id?: string | null
          template_id?: string | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          file_url?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          student_id?: string | null
          template_id?: string | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      dropout_predictions: {
        Row: {
          actual_dropout_date: string | null
          confidence_level: number | null
          did_dropout: boolean | null
          dropout_probability: number
          expires_at: string | null
          formation_id: string | null
          id: string
          input_features: Json | null
          model_id: string | null
          organization_id: string
          predicted_dropout_date: string | null
          prediction_date: string
          risk_category: string | null
          risk_factors: Json | null
          session_id: string | null
          student_id: string | null
          validated_at: string | null
          was_accurate: boolean | null
        }
        Insert: {
          actual_dropout_date?: string | null
          confidence_level?: number | null
          did_dropout?: boolean | null
          dropout_probability: number
          expires_at?: string | null
          formation_id?: string | null
          id?: string
          input_features?: Json | null
          model_id?: string | null
          organization_id: string
          predicted_dropout_date?: string | null
          prediction_date?: string
          risk_category?: string | null
          risk_factors?: Json | null
          session_id?: string | null
          student_id?: string | null
          validated_at?: string | null
          was_accurate?: boolean | null
        }
        Update: {
          actual_dropout_date?: string | null
          confidence_level?: number | null
          did_dropout?: boolean | null
          dropout_probability?: number
          expires_at?: string | null
          formation_id?: string | null
          id?: string
          input_features?: Json | null
          model_id?: string | null
          organization_id?: string
          predicted_dropout_date?: string | null
          prediction_date?: string
          risk_category?: string | null
          risk_factors?: Json | null
          session_id?: string | null
          student_id?: string | null
          validated_at?: string | null
          was_accurate?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "dropout_predictions_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dropout_predictions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "predictive_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dropout_predictions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dropout_predictions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      educational_resources: {
        Row: {
          access_level: string | null
          author_id: string | null
          category_id: string | null
          created_at: string
          description: string | null
          download_count: number | null
          duration_minutes: number | null
          external_url: string | null
          favorite_count: number | null
          file_extension: string | null
          file_size_bytes: number | null
          file_url: string | null
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          keywords: string[] | null
          mime_type: string | null
          organization_id: string
          published_at: string | null
          requires_authentication: boolean | null
          resource_type: string
          slug: string
          status: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          access_level?: string | null
          author_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          download_count?: number | null
          duration_minutes?: number | null
          external_url?: string | null
          favorite_count?: number | null
          file_extension?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          keywords?: string[] | null
          mime_type?: string | null
          organization_id: string
          published_at?: string | null
          requires_authentication?: boolean | null
          resource_type: string
          slug: string
          status?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          access_level?: string | null
          author_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          download_count?: number | null
          duration_minutes?: number | null
          external_url?: string | null
          favorite_count?: number | null
          file_extension?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          keywords?: string[] | null
          mime_type?: string | null
          organization_id?: string
          published_at?: string | null
          requires_authentication?: boolean | null
          resource_type?: string
          slug?: string
          status?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "educational_resources_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "resource_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "educational_resources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      elearning_courses: {
        Row: {
          created_at: string | null
          currency: string | null
          description: string | null
          difficulty_level: string | null
          duration_hours: number | null
          formation_id: string | null
          id: string
          instructor_id: string | null
          is_featured: boolean | null
          learning_objectives: string[] | null
          metadata: Json | null
          organization_id: string | null
          prerequisites: string[] | null
          price: number | null
          published_at: string | null
          slug: string
          status: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_hours?: number | null
          formation_id?: string | null
          id?: string
          instructor_id?: string | null
          is_featured?: boolean | null
          learning_objectives?: string[] | null
          metadata?: Json | null
          organization_id?: string | null
          prerequisites?: string[] | null
          price?: number | null
          published_at?: string | null
          slug: string
          status?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_hours?: number | null
          formation_id?: string | null
          id?: string
          instructor_id?: string | null
          is_featured?: boolean | null
          learning_objectives?: string[] | null
          metadata?: Json | null
          organization_id?: string | null
          prerequisites?: string[] | null
          price?: number | null
          published_at?: string | null
          slug?: string
          status?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elearning_courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      electronic_attendance_requests: {
        Row: {
          attendance_id: string | null
          attendance_session_id: string
          created_at: string | null
          id: string
          ip_address: unknown
          last_reminder_sent_at: string | null
          latitude: number | null
          location_accuracy: number | null
          location_verified: boolean | null
          longitude: number | null
          organization_id: string
          reminder_count: number | null
          signature_data: string | null
          signature_token: string
          signed_at: string | null
          status: string
          student_email: string
          student_id: string
          student_name: string
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          attendance_id?: string | null
          attendance_session_id: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          last_reminder_sent_at?: string | null
          latitude?: number | null
          location_accuracy?: number | null
          location_verified?: boolean | null
          longitude?: number | null
          organization_id: string
          reminder_count?: number | null
          signature_data?: string | null
          signature_token: string
          signed_at?: string | null
          status?: string
          student_email: string
          student_id: string
          student_name: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          attendance_id?: string | null
          attendance_session_id?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          last_reminder_sent_at?: string | null
          latitude?: number | null
          location_accuracy?: number | null
          location_verified?: boolean | null
          longitude?: number | null
          organization_id?: string
          reminder_count?: number | null
          signature_data?: string | null
          signature_token?: string
          signed_at?: string | null
          status?: string
          student_email?: string
          student_id?: string
          student_name?: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "electronic_attendance_requests_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "attendance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electronic_attendance_requests_attendance_session_id_fkey"
            columns: ["attendance_session_id"]
            isOneToOne: false
            referencedRelation: "electronic_attendance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electronic_attendance_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electronic_attendance_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      electronic_attendance_sessions: {
        Row: {
          allowed_radius_meters: number | null
          closes_at: string | null
          created_at: string | null
          created_by: string | null
          date: string
          end_time: string | null
          id: string
          latitude: number | null
          location_name: string | null
          longitude: number | null
          mode: string
          opens_at: string | null
          organization_id: string
          qr_code_data: string | null
          qr_code_enabled: boolean | null
          require_geolocation: boolean | null
          require_signature: boolean | null
          session_id: string
          start_time: string | null
          status: string
          title: string
          total_expected: number | null
          total_signed: number | null
          updated_at: string | null
        }
        Insert: {
          allowed_radius_meters?: number | null
          closes_at?: string | null
          created_at?: string | null
          created_by?: string | null
          date: string
          end_time?: string | null
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          mode?: string
          opens_at?: string | null
          organization_id: string
          qr_code_data?: string | null
          qr_code_enabled?: boolean | null
          require_geolocation?: boolean | null
          require_signature?: boolean | null
          session_id: string
          start_time?: string | null
          status?: string
          title: string
          total_expected?: number | null
          total_signed?: number | null
          updated_at?: string | null
        }
        Update: {
          allowed_radius_meters?: number | null
          closes_at?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          end_time?: string | null
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          mode?: string
          opens_at?: string | null
          organization_id?: string
          qr_code_data?: string | null
          qr_code_enabled?: boolean | null
          require_geolocation?: boolean | null
          require_signature?: boolean | null
          session_id?: string
          start_time?: string | null
          status?: string
          title?: string
          total_expected?: number | null
          total_signed?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "electronic_attendance_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electronic_attendance_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electronic_attendance_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      email_schedule_logs: {
        Row: {
          created_at: string | null
          error_details: Json | null
          error_message: string | null
          executed_at: string | null
          failed_sends: number | null
          id: string
          organization_id: string
          schedule_id: string
          status: string
          successful_sends: number | null
          total_recipients: number | null
          trigger_context: Json | null
        }
        Insert: {
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          executed_at?: string | null
          failed_sends?: number | null
          id?: string
          organization_id: string
          schedule_id: string
          status: string
          successful_sends?: number | null
          total_recipients?: number | null
          trigger_context?: Json | null
        }
        Update: {
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          executed_at?: string | null
          failed_sends?: number | null
          id?: string
          organization_id?: string
          schedule_id?: string
          status?: string
          successful_sends?: number | null
          total_recipients?: number | null
          trigger_context?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_schedule_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_schedule_logs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "email_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      email_schedules: {
        Row: {
          created_at: string | null
          created_by: string | null
          custom_variables: Json | null
          description: string | null
          document_template_id: string | null
          document_type: string | null
          email_type: string
          formation_id: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          last_run_error: string | null
          last_run_status: string | null
          name: string
          organization_id: string
          program_id: string | null
          send_document: boolean | null
          send_to_coordinators: boolean | null
          send_to_students: boolean | null
          send_to_teachers: boolean | null
          session_id: string | null
          session_status: string[] | null
          target_type: string
          template_id: string | null
          total_sent: number | null
          trigger_datetime: string | null
          trigger_days: number | null
          trigger_time: string | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          custom_variables?: Json | null
          description?: string | null
          document_template_id?: string | null
          document_type?: string | null
          email_type: string
          formation_id?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          last_run_error?: string | null
          last_run_status?: string | null
          name: string
          organization_id: string
          program_id?: string | null
          send_document?: boolean | null
          send_to_coordinators?: boolean | null
          send_to_students?: boolean | null
          send_to_teachers?: boolean | null
          session_id?: string | null
          session_status?: string[] | null
          target_type: string
          template_id?: string | null
          total_sent?: number | null
          trigger_datetime?: string | null
          trigger_days?: number | null
          trigger_time?: string | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          custom_variables?: Json | null
          description?: string | null
          document_template_id?: string | null
          document_type?: string | null
          email_type?: string
          formation_id?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          last_run_error?: string | null
          last_run_status?: string | null
          name?: string
          organization_id?: string
          program_id?: string | null
          send_document?: boolean | null
          send_to_coordinators?: boolean | null
          send_to_students?: boolean | null
          send_to_teachers?: boolean | null
          session_id?: string | null
          session_status?: string[] | null
          target_type?: string
          template_id?: string | null
          total_sent?: number | null
          trigger_datetime?: string | null
          trigger_days?: number | null
          trigger_time?: string | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_schedules_document_template_id_fkey"
            columns: ["document_template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_schedules_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_schedules_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_schedules_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          available_variables: Json | null
          body_html: string
          body_text: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          email_type: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          metadata: Json | null
          name: string
          organization_id: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          available_variables?: Json | null
          body_html: string
          body_text?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          email_type: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          metadata?: Json | null
          name: string
          organization_id: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          available_variables?: Json | null
          body_html?: string
          body_text?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          email_type?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          metadata?: Json | null
          name?: string
          organization_id?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          created_at: string | null
          enrollment_date: string | null
          id: string
          paid_amount: number | null
          payment_status: string | null
          session_id: string | null
          status: string | null
          student_id: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enrollment_date?: string | null
          id?: string
          paid_amount?: number | null
          payment_status?: string | null
          session_id?: string | null
          status?: string | null
          student_id?: string | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enrollment_date?: string | null
          id?: string
          paid_amount?: number | null
          payment_status?: string | null
          session_id?: string | null
          status?: string | null
          student_id?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_responses: {
        Row: {
          answer_boolean: boolean | null
          answer_choice: string[] | null
          answer_text: string | null
          corrected_at: string | null
          corrected_by: string | null
          created_at: string
          id: string
          instance_id: string
          is_correct: boolean | null
          max_points: number | null
          points_earned: number | null
          question_id: string
          student_id: string
          teacher_feedback: string | null
          updated_at: string
        }
        Insert: {
          answer_boolean?: boolean | null
          answer_choice?: string[] | null
          answer_text?: string | null
          corrected_at?: string | null
          corrected_by?: string | null
          created_at?: string
          id?: string
          instance_id: string
          is_correct?: boolean | null
          max_points?: number | null
          points_earned?: number | null
          question_id: string
          student_id: string
          teacher_feedback?: string | null
          updated_at?: string
        }
        Update: {
          answer_boolean?: boolean | null
          answer_choice?: string[] | null
          answer_text?: string | null
          corrected_at?: string | null
          corrected_by?: string | null
          created_at?: string
          id?: string
          instance_id?: string
          is_correct?: boolean | null
          max_points?: number | null
          points_earned?: number | null
          question_id?: string
          student_id?: string
          teacher_feedback?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_responses_corrected_by_fkey"
            columns: ["corrected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_responses_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "evaluation_template_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "evaluation_template_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_responses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_template_instances: {
        Row: {
          completed_at: string | null
          created_at: string
          grade_id: string
          id: string
          max_score: number | null
          started_at: string | null
          template_id: string
          time_limit_minutes: number | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          grade_id: string
          id?: string
          max_score?: number | null
          started_at?: string | null
          template_id: string
          time_limit_minutes?: number | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          grade_id?: string
          id?: string
          max_score?: number | null
          started_at?: string | null
          template_id?: string
          time_limit_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_template_instances_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: true
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_template_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "evaluation_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_template_questions: {
        Row: {
          correct_answer: string | null
          correct_answer_pattern: string | null
          created_at: string
          explanation: string | null
          id: string
          options: Json | null
          order_index: number
          points: number | null
          question_text: string
          question_type: string
          template_id: string
          updated_at: string
        }
        Insert: {
          correct_answer?: string | null
          correct_answer_pattern?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json | null
          order_index: number
          points?: number | null
          question_text: string
          question_type?: string
          template_id: string
          updated_at?: string
        }
        Update: {
          correct_answer?: string | null
          correct_answer_pattern?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json | null
          order_index?: number
          points?: number | null
          question_text?: string
          question_type?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_template_questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "evaluation_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_templates: {
        Row: {
          assessment_type: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_score: number | null
          name: string
          organization_id: string | null
          passing_score: number | null
          show_correct_answers: boolean | null
          shuffle_questions: boolean | null
          subject: string | null
          time_limit_minutes: number | null
          updated_at: string
        }
        Insert: {
          assessment_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_score?: number | null
          name: string
          organization_id?: string | null
          passing_score?: number | null
          show_correct_answers?: boolean | null
          shuffle_questions?: boolean | null
          subject?: string | null
          time_limit_minutes?: number | null
          updated_at?: string
        }
        Update: {
          assessment_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_score?: number | null
          name?: string
          organization_id?: string | null
          passing_score?: number | null
          show_correct_answers?: boolean | null
          shuffle_questions?: boolean | null
          subject?: string | null
          time_limit_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          email: string | null
          event_id: string
          id: string
          responded_at: string | null
          role: string | null
          send_notifications: boolean | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          email?: string | null
          event_id: string
          id?: string
          responded_at?: string | null
          role?: string | null
          send_notifications?: boolean | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          email?: string | null
          event_id?: string
          id?: string
          responded_at?: string | null
          role?: string | null
          send_notifications?: boolean | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_recurrence_exceptions: {
        Row: {
          created_at: string
          event_id: string
          exception_date: string
          id: string
          is_cancelled: boolean | null
          modified_end_time: string | null
          modified_start_time: string | null
          modified_title: string | null
          original_start_time: string
        }
        Insert: {
          created_at?: string
          event_id: string
          exception_date: string
          id?: string
          is_cancelled?: boolean | null
          modified_end_time?: string | null
          modified_start_time?: string | null
          modified_title?: string | null
          original_start_time: string
        }
        Update: {
          created_at?: string
          event_id?: string
          exception_date?: string
          id?: string
          is_cancelled?: boolean | null
          modified_end_time?: string | null
          modified_start_time?: string | null
          modified_title?: string | null
          original_start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_recurrence_exceptions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reminders: {
        Row: {
          created_at: string
          event_id: string
          id: string
          is_sent: boolean | null
          minutes_before: number
          reminder_type: string | null
          sent_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          is_sent?: boolean | null
          minutes_before: number
          reminder_type?: string | null
          sent_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          is_sent?: boolean | null
          minutes_before?: number
          reminder_type?: string | null
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reminders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string
          expense_date: string
          id: string
          invoice_number: string | null
          notes: string | null
          organization_id: string
          payment_method: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description: string
          expense_date: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          organization_id: string
          payment_method?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          expense_date?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          organization_id?: string
          payment_method?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      external_data_cache: {
        Row: {
          cache_key: string
          created_at: string | null
          data_source_id: string
          expires_at: string
          id: string
          response_data: Json
        }
        Insert: {
          cache_key: string
          created_at?: string | null
          data_source_id: string
          expires_at: string
          id?: string
          response_data: Json
        }
        Update: {
          cache_key?: string
          created_at?: string | null
          data_source_id?: string
          expires_at?: string
          id?: string
          response_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "external_data_cache_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "external_data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      external_data_logs: {
        Row: {
          created_at: string | null
          data_source_id: string
          error_message: string | null
          id: string
          request_body: Json | null
          request_headers: Json | null
          request_method: string
          request_url: string
          response_body: Json | null
          response_status: number | null
          response_time_ms: number | null
          success: boolean | null
          template_id: string | null
        }
        Insert: {
          created_at?: string | null
          data_source_id: string
          error_message?: string | null
          id?: string
          request_body?: Json | null
          request_headers?: Json | null
          request_method: string
          request_url: string
          response_body?: Json | null
          response_status?: number | null
          response_time_ms?: number | null
          success?: boolean | null
          template_id?: string | null
        }
        Update: {
          created_at?: string | null
          data_source_id?: string
          error_message?: string | null
          id?: string
          request_body?: Json | null
          request_headers?: Json | null
          request_method?: string
          request_url?: string
          response_body?: Json | null
          response_status?: number | null
          response_time_ms?: number | null
          success?: boolean | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_data_logs_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "external_data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_data_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      external_data_sources: {
        Row: {
          api_type: string
          authentication_config: Json | null
          authentication_type: string | null
          cache_enabled: boolean | null
          cache_ttl_seconds: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          endpoint_url: string
          headers: Json | null
          id: string
          is_active: boolean | null
          method: string | null
          name: string
          organization_id: string
          query_params: Json | null
          request_body: Json | null
          response_mapping: Json | null
          retry_count: number | null
          timeout_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          api_type: string
          authentication_config?: Json | null
          authentication_type?: string | null
          cache_enabled?: boolean | null
          cache_ttl_seconds?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          endpoint_url: string
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          method?: string | null
          name: string
          organization_id: string
          query_params?: Json | null
          request_body?: Json | null
          response_mapping?: Json | null
          retry_count?: number | null
          timeout_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          api_type?: string
          authentication_config?: Json | null
          authentication_type?: string | null
          cache_enabled?: boolean | null
          cache_ttl_seconds?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          endpoint_url?: string
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          method?: string | null
          name?: string
          organization_id?: string
          query_params?: Json | null
          request_body?: Json | null
          response_mapping?: Json | null
          retry_count?: number | null
          timeout_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_data_sources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_data_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          order_index: number | null
          organization_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_index?: number | null
          organization_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_index?: number | null
          organization_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faq_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_feedback: {
        Row: {
          comment: string | null
          created_at: string
          faq_id: string
          id: string
          is_helpful: boolean
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          faq_id: string
          id?: string
          is_helpful: boolean
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          faq_id?: string
          id?: string
          is_helpful?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faq_feedback_faq_id_fkey"
            columns: ["faq_id"]
            isOneToOne: false
            referencedRelation: "faq_items"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_items: {
        Row: {
          answer: string
          category_id: string
          created_at: string
          helpful_count: number | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          meta_description: string | null
          meta_title: string | null
          not_helpful_count: number | null
          order_index: number | null
          organization_id: string | null
          question: string
          tags: string[] | null
          updated_at: string
          view_count: number | null
        }
        Insert: {
          answer: string
          category_id: string
          created_at?: string
          helpful_count?: number | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          not_helpful_count?: number | null
          order_index?: number | null
          organization_id?: string | null
          question: string
          tags?: string[] | null
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          answer?: string
          category_id?: string
          created_at?: string
          helpful_count?: number | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          not_helpful_count?: number | null
          order_index?: number | null
          organization_id?: string | null
          question?: string
          tags?: string[] | null
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "faq_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "faq_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faq_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_forecasts: {
        Row: {
          actual_amount: number | null
          category_id: string | null
          confidence_level: number | null
          created_at: string
          created_by: string | null
          currency: string
          forecast_type: string
          forecasted_amount: number
          id: string
          notes: string | null
          organization_id: string
          period_end: string
          period_start: string
          period_type: string
          updated_at: string
        }
        Insert: {
          actual_amount?: number | null
          category_id?: string | null
          confidence_level?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          forecast_type: string
          forecasted_amount: number
          id?: string
          notes?: string | null
          organization_id: string
          period_end: string
          period_start: string
          period_type: string
          updated_at?: string
        }
        Update: {
          actual_amount?: number | null
          category_id?: string | null
          confidence_level?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          forecast_type?: string
          forecasted_amount?: number
          id?: string
          notes?: string | null
          organization_id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_forecasts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_forecasts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_reports: {
        Row: {
          file_url: string | null
          generated_at: string
          generated_by: string | null
          id: string
          organization_id: string
          period_end: string
          period_start: string
          period_type: string
          report_data: Json
          report_type: string
          status: string | null
        }
        Insert: {
          file_url?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          organization_id: string
          period_end: string
          period_start: string
          period_type: string
          report_data: Json
          report_type: string
          status?: string | null
        }
        Update: {
          file_url?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          organization_id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          report_data?: Json
          report_type?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      formation_sessions: {
        Row: {
          created_at: string
          formation_id: string
          id: string
          order_index: number | null
          organization_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          formation_id: string
          id?: string
          order_index?: number | null
          organization_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          formation_id?: string
          id?: string
          order_index?: number | null
          organization_id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formation_sessions_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formation_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formation_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      formations: {
        Row: {
          accounting_product_config: string | null
          age_max: number | null
          age_min: number | null
          capacity_max: number | null
          category: string | null
          certification_issued: boolean | null
          certification_modalities: string | null
          code: string
          competence_domains: string | null
          cpf_code: string | null
          created_at: string | null
          currency: string
          description: string | null
          duration_days: number | null
          duration_hours: number | null
          duration_unit: string | null
          edof_export_fields: Json | null
          eligible_cpf: boolean | null
          execution_follow_up: string | null
          id: string
          is_active: boolean | null
          learner_profile: string | null
          modalities: string | null
          name: string
          organization_id: string
          payment_plan: string
          pedagogical_objectives: string | null
          photo_url: string | null
          prerequisites: string | null
          price: number
          program_id: string | null
          program_version: string | null
          published_online: boolean | null
          quality: string | null
          subtitle: string | null
          training_action_type: string | null
          training_content: string | null
          updated_at: string | null
          version_date: string | null
        }
        Insert: {
          accounting_product_config?: string | null
          age_max?: number | null
          age_min?: number | null
          capacity_max?: number | null
          category?: string | null
          certification_issued?: boolean | null
          certification_modalities?: string | null
          code: string
          competence_domains?: string | null
          cpf_code?: string | null
          created_at?: string | null
          currency?: string
          description?: string | null
          duration_days?: number | null
          duration_hours?: number | null
          duration_unit?: string | null
          edof_export_fields?: Json | null
          eligible_cpf?: boolean | null
          execution_follow_up?: string | null
          id?: string
          is_active?: boolean | null
          learner_profile?: string | null
          modalities?: string | null
          name: string
          organization_id: string
          payment_plan?: string
          pedagogical_objectives?: string | null
          photo_url?: string | null
          prerequisites?: string | null
          price?: number
          program_id?: string | null
          program_version?: string | null
          published_online?: boolean | null
          quality?: string | null
          subtitle?: string | null
          training_action_type?: string | null
          training_content?: string | null
          updated_at?: string | null
          version_date?: string | null
        }
        Update: {
          accounting_product_config?: string | null
          age_max?: number | null
          age_min?: number | null
          capacity_max?: number | null
          category?: string | null
          certification_issued?: boolean | null
          certification_modalities?: string | null
          code?: string
          competence_domains?: string | null
          cpf_code?: string | null
          created_at?: string | null
          currency?: string
          description?: string | null
          duration_days?: number | null
          duration_hours?: number | null
          duration_unit?: string | null
          edof_export_fields?: Json | null
          eligible_cpf?: boolean | null
          execution_follow_up?: string | null
          id?: string
          is_active?: boolean | null
          learner_profile?: string | null
          modalities?: string | null
          name?: string
          organization_id?: string
          payment_plan?: string
          pedagogical_objectives?: string | null
          photo_url?: string | null
          prerequisites?: string | null
          price?: number
          program_id?: string | null
          program_version?: string | null
          published_online?: boolean | null
          quality?: string | null
          subtitle?: string | null
          training_action_type?: string | null
          training_content?: string | null
          updated_at?: string | null
          version_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      formations_temp: {
        Row: {
          accounting_product_config: string | null
          age_max: number | null
          age_min: number | null
          capacity_max: number | null
          category: string | null
          certification_issued: boolean | null
          certification_modalities: string | null
          code: string
          competence_domains: string | null
          cpf_code: string | null
          created_at: string | null
          currency: string
          description: string | null
          duration_days: number | null
          duration_hours: number | null
          duration_unit: string | null
          edof_export_fields: Json | null
          eligible_cpf: boolean | null
          execution_follow_up: string | null
          id: string
          is_active: boolean | null
          learner_profile: string | null
          modalities: string | null
          name: string
          organization_id: string | null
          payment_plan: string | null
          pedagogical_objectives: string | null
          photo_url: string | null
          prerequisites: string | null
          price: number
          program_version: string | null
          published_online: boolean | null
          quality: string | null
          subtitle: string | null
          training_action_type: string | null
          training_content: string | null
          updated_at: string | null
          version_date: string | null
        }
        Insert: {
          accounting_product_config?: string | null
          age_max?: number | null
          age_min?: number | null
          capacity_max?: number | null
          category?: string | null
          certification_issued?: boolean | null
          certification_modalities?: string | null
          code: string
          competence_domains?: string | null
          cpf_code?: string | null
          created_at?: string | null
          currency?: string
          description?: string | null
          duration_days?: number | null
          duration_hours?: number | null
          duration_unit?: string | null
          edof_export_fields?: Json | null
          eligible_cpf?: boolean | null
          execution_follow_up?: string | null
          id?: string
          is_active?: boolean | null
          learner_profile?: string | null
          modalities?: string | null
          name: string
          organization_id?: string | null
          payment_plan?: string | null
          pedagogical_objectives?: string | null
          photo_url?: string | null
          prerequisites?: string | null
          price?: number
          program_version?: string | null
          published_online?: boolean | null
          quality?: string | null
          subtitle?: string | null
          training_action_type?: string | null
          training_content?: string | null
          updated_at?: string | null
          version_date?: string | null
        }
        Update: {
          accounting_product_config?: string | null
          age_max?: number | null
          age_min?: number | null
          capacity_max?: number | null
          category?: string | null
          certification_issued?: boolean | null
          certification_modalities?: string | null
          code?: string
          competence_domains?: string | null
          cpf_code?: string | null
          created_at?: string | null
          currency?: string
          description?: string | null
          duration_days?: number | null
          duration_hours?: number | null
          duration_unit?: string | null
          edof_export_fields?: Json | null
          eligible_cpf?: boolean | null
          execution_follow_up?: string | null
          id?: string
          is_active?: boolean | null
          learner_profile?: string | null
          modalities?: string | null
          name?: string
          organization_id?: string | null
          payment_plan?: string | null
          pedagogical_objectives?: string | null
          photo_url?: string | null
          prerequisites?: string | null
          price?: number
          program_version?: string | null
          published_online?: boolean | null
          quality?: string | null
          subtitle?: string | null
          training_action_type?: string | null
          training_content?: string | null
          updated_at?: string | null
          version_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          created_at: string | null
          file_name: string
          file_url: string
          format: string
          generated_by: string | null
          id: string
          metadata: Json | null
          organization_id: string
          page_count: number | null
          related_entity_id: string | null
          related_entity_type: string | null
          template_id: string
          type: Database["public"]["Enums"]["document_type"]
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_url: string
          format: string
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          page_count?: number | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          template_id: string
          type: Database["public"]["Enums"]["document_type"]
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_url?: string
          format?: string
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          page_count?: number | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          template_id?: string
          type?: Database["public"]["Enums"]["document_type"]
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      global_document_layouts: {
        Row: {
          created_at: string | null
          created_by: string | null
          footer_content: string | null
          footer_enabled: boolean | null
          footer_height: number | null
          footer_image_url: string | null
          footer_logo_url: string | null
          header_content: string | null
          header_enabled: boolean | null
          header_height: number | null
          header_image_url: string | null
          header_logo_url: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          repeat_on_all_pages: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          footer_content?: string | null
          footer_enabled?: boolean | null
          footer_height?: number | null
          footer_image_url?: string | null
          footer_logo_url?: string | null
          header_content?: string | null
          header_enabled?: boolean | null
          header_height?: number | null
          header_image_url?: string | null
          header_logo_url?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          repeat_on_all_pages?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          footer_content?: string | null
          footer_enabled?: boolean | null
          footer_height?: number | null
          footer_image_url?: string | null
          footer_logo_url?: string | null
          header_content?: string | null
          header_enabled?: boolean | null
          header_height?: number | null
          header_image_url?: string | null
          header_logo_url?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          repeat_on_all_pages?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "global_document_layouts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_document_layouts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_document_layouts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          academic_year_id: string | null
          appreciation: string | null
          assessment_type: string | null
          class_id: string | null
          coefficient: number | null
          created_at: string | null
          graded_at: string | null
          id: string
          is_makeup: boolean | null
          max_score: number | null
          notes: string | null
          organization_id: string | null
          original_grade_id: string | null
          percentage: number | null
          rank_in_class: number | null
          score: number | null
          session_id: string | null
          student_id: string | null
          subject: string
          teacher_id: string | null
          term_period: string | null
          updated_at: string | null
        }
        Insert: {
          academic_year_id?: string | null
          appreciation?: string | null
          assessment_type?: string | null
          class_id?: string | null
          coefficient?: number | null
          created_at?: string | null
          graded_at?: string | null
          id?: string
          is_makeup?: boolean | null
          max_score?: number | null
          notes?: string | null
          organization_id?: string | null
          original_grade_id?: string | null
          percentage?: number | null
          rank_in_class?: number | null
          score?: number | null
          session_id?: string | null
          student_id?: string | null
          subject: string
          teacher_id?: string | null
          term_period?: string | null
          updated_at?: string | null
        }
        Update: {
          academic_year_id?: string | null
          appreciation?: string | null
          assessment_type?: string | null
          class_id?: string | null
          coefficient?: number | null
          created_at?: string | null
          graded_at?: string | null
          id?: string
          is_makeup?: boolean | null
          max_score?: number | null
          notes?: string | null
          organization_id?: string | null
          original_grade_id?: string | null
          percentage?: number | null
          rank_in_class?: number | null
          score?: number | null
          session_id?: string | null
          student_id?: string | null
          subject?: string
          teacher_id?: string | null
          term_period?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grades_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_original_grade_id_fkey"
            columns: ["original_grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          organization_id: string | null
          phone_primary: string
          phone_secondary: string | null
          profession: string | null
          relationship: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          organization_id?: string | null
          phone_primary: string
          phone_secondary?: string | null
          profession?: string | null
          relationship: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          organization_id?: string | null
          phone_primary?: string
          phone_secondary?: string | null
          profession?: string | null
          relationship?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardians_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardians_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_favorites: {
        Row: {
          created_at: string
          guide_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          guide_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          guide_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_favorites_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_progress: {
        Row: {
          completed_at: string | null
          completed_steps: number[] | null
          created_at: string
          current_step: number | null
          guide_id: string
          id: string
          is_completed: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_steps?: number[] | null
          created_at?: string
          current_step?: number | null
          guide_id: string
          id?: string
          is_completed?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_steps?: number[] | null
          created_at?: string
          current_step?: number | null
          guide_id?: string
          id?: string
          is_completed?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_progress_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_steps: {
        Row: {
          content: string
          created_at: string
          guide_id: string
          id: string
          image_url: string | null
          step_number: number
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content: string
          created_at?: string
          guide_id: string
          id?: string
          image_url?: string | null
          step_number: number
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          guide_id?: string
          id?: string
          image_url?: string | null
          step_number?: number
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guide_steps_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      guides: {
        Row: {
          author_id: string | null
          category: string | null
          content: string
          created_at: string
          description: string | null
          difficulty: string | null
          estimated_time_minutes: number | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          meta_description: string | null
          meta_title: string | null
          organization_id: string | null
          published_at: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content: string
          created_at?: string
          description?: string | null
          difficulty?: string | null
          estimated_time_minutes?: number | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          organization_id?: string | null
          published_at?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string
          created_at?: string
          description?: string | null
          difficulty?: string | null
          estimated_time_minutes?: number | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          organization_id?: string | null
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "guides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          document_type: string | null
          due_date: string
          enrollment_id: string | null
          id: string
          invoice_number: string
          issue_date: string | null
          items: Json | null
          notes: string | null
          organization_id: string | null
          pdf_url: string | null
          status: string | null
          student_id: string | null
          tax_amount: number | null
          total_amount: number
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          document_type?: string | null
          due_date: string
          enrollment_id?: string | null
          id?: string
          invoice_number: string
          issue_date?: string | null
          items?: Json | null
          notes?: string | null
          organization_id?: string | null
          pdf_url?: string | null
          status?: string | null
          student_id?: string | null
          tax_amount?: number | null
          total_amount: number
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          document_type?: string | null
          due_date?: string
          enrollment_id?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string | null
          items?: Json | null
          notes?: string | null
          organization_id?: string | null
          pdf_url?: string | null
          status?: string | null
          student_id?: string | null
          tax_amount?: number | null
          total_amount?: number
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      jury_candidates: {
        Row: {
          created_at: string | null
          decision_date: string | null
          decision_notes: string | null
          evaluation_details: Json | null
          final_score: number | null
          id: string
          jury_id: string
          session_id: string | null
          status: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          decision_date?: string | null
          decision_notes?: string | null
          evaluation_details?: Json | null
          final_score?: number | null
          id?: string
          jury_id: string
          session_id?: string | null
          status?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          decision_date?: string | null
          decision_notes?: string | null
          evaluation_details?: Json | null
          final_score?: number | null
          id?: string
          jury_id?: string
          session_id?: string | null
          status?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jury_candidates_jury_id_fkey"
            columns: ["jury_id"]
            isOneToOne: false
            referencedRelation: "certification_juries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jury_candidates_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jury_candidates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      jury_minutes: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          decisions: Json | null
          file_hash: string | null
          file_url: string | null
          id: string
          jury_id: string
          metadata: Json | null
          signed_at: string | null
          signed_by: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          decisions?: Json | null
          file_hash?: string | null
          file_url?: string | null
          id?: string
          jury_id: string
          metadata?: Json | null
          signed_at?: string | null
          signed_by?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          decisions?: Json | null
          file_hash?: string | null
          file_url?: string | null
          id?: string
          jury_id?: string
          metadata?: Json | null
          signed_at?: string | null
          signed_by?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jury_minutes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jury_minutes_jury_id_fkey"
            columns: ["jury_id"]
            isOneToOne: false
            referencedRelation: "certification_juries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jury_minutes_signed_by_fkey"
            columns: ["signed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_access_tokens: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string
          id: string
          is_active: boolean | null
          last_used_at: string | null
          max_uses: number | null
          organization_id: string
          session_id: string | null
          student_id: string
          token: string
          updated_at: string | null
          use_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          max_uses?: number | null
          organization_id: string
          session_id?: string | null
          student_id: string
          token: string
          updated_at?: string | null
          use_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          max_uses?: number | null
          organization_id?: string
          session_id?: string | null
          student_id?: string
          token?: string
          updated_at?: string | null
          use_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "learner_access_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_access_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_access_tokens_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_access_tokens_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_documents: {
        Row: {
          created_at: string
          description: string | null
          document_id: string | null
          downloaded_at: string | null
          file_url: string
          id: string
          notified: boolean | null
          notified_at: string | null
          organization_id: string
          sent_at: string
          sent_by: string | null
          student_id: string
          title: string
          type: string | null
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_id?: string | null
          downloaded_at?: string | null
          file_url: string
          id?: string
          notified?: boolean | null
          notified_at?: string | null
          organization_id: string
          sent_at?: string
          sent_by?: string | null
          student_id: string
          title: string
          type?: string | null
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          document_id?: string | null
          downloaded_at?: string | null
          file_url?: string
          id?: string
          notified?: boolean | null
          notified_at?: string | null
          organization_id?: string
          sent_at?: string
          sent_by?: string | null
          student_id?: string
          title?: string
          type?: string | null
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learner_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_documents_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_portfolio_entries: {
        Row: {
          attachments: Json | null
          created_at: string | null
          evaluated_at: string | null
          evaluated_by: string | null
          field_id: string
          grade: string | null
          id: string
          max_score: number | null
          portfolio_id: string
          score: number | null
          section_id: string
          teacher_comment: string | null
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          evaluated_at?: string | null
          evaluated_by?: string | null
          field_id: string
          grade?: string | null
          id?: string
          max_score?: number | null
          portfolio_id: string
          score?: number | null
          section_id: string
          teacher_comment?: string | null
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          evaluated_at?: string | null
          evaluated_by?: string | null
          field_id?: string
          grade?: string | null
          id?: string
          max_score?: number | null
          portfolio_id?: string
          score?: number | null
          section_id?: string
          teacher_comment?: string | null
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_portfolio_entries_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_portfolio_entries_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "learning_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_portfolio_signatures: {
        Row: {
          id: string
          ip_address: string | null
          portfolio_id: string
          signature_data: string | null
          signed_at: string | null
          signer_id: string | null
          signer_name: string | null
          signer_role: string | null
          signer_type: string
          user_agent: string | null
        }
        Insert: {
          id?: string
          ip_address?: string | null
          portfolio_id: string
          signature_data?: string | null
          signed_at?: string | null
          signer_id?: string | null
          signer_name?: string | null
          signer_role?: string | null
          signer_type: string
          user_agent?: string | null
        }
        Update: {
          id?: string
          ip_address?: string | null
          portfolio_id?: string
          signature_data?: string | null
          signed_at?: string | null
          signer_id?: string | null
          signer_name?: string | null
          signer_role?: string | null
          signer_type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_portfolio_signatures_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "learning_portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_portfolio_signatures_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_portfolio_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          formation_id: string | null
          header_logo_url: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          organization_id: string | null
          primary_color: string | null
          secondary_color: string | null
          template_structure: Json
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          formation_id?: string | null
          header_logo_url?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          organization_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          template_structure?: Json
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          formation_id?: string | null
          header_logo_url?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          organization_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          template_structure?: Json
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_portfolio_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_portfolios: {
        Row: {
          completed_at: string | null
          content: Json
          created_at: string | null
          id: string
          is_visible_to_student: boolean | null
          last_modified_by: string | null
          organization_id: string | null
          pdf_generated_at: string | null
          pdf_url: string | null
          progress_percentage: number | null
          session_id: string | null
          started_at: string | null
          status: string | null
          student_comments: string | null
          student_id: string
          teacher_notes: string | null
          template_id: string
          updated_at: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          completed_at?: string | null
          content?: Json
          created_at?: string | null
          id?: string
          is_visible_to_student?: boolean | null
          last_modified_by?: string | null
          organization_id?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          progress_percentage?: number | null
          session_id?: string | null
          started_at?: string | null
          status?: string | null
          student_comments?: string | null
          student_id: string
          teacher_notes?: string | null
          template_id: string
          updated_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          completed_at?: string | null
          content?: Json
          created_at?: string | null
          id?: string
          is_visible_to_student?: boolean | null
          last_modified_by?: string | null
          organization_id?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          progress_percentage?: number | null
          session_id?: string | null
          started_at?: string | null
          status?: string | null
          student_comments?: string | null
          student_id?: string
          teacher_notes?: string | null
          template_id?: string
          updated_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_portfolios_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_portfolios_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_portfolios_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_portfolios_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "learning_portfolio_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_portfolios_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          completion_percentage: number | null
          id: string
          is_completed: boolean | null
          last_accessed_at: string | null
          lesson_id: string
          started_at: string | null
          student_id: string
          time_spent_minutes: number | null
        }
        Insert: {
          completed_at?: string | null
          completion_percentage?: number | null
          id?: string
          is_completed?: boolean | null
          last_accessed_at?: string | null
          lesson_id: string
          started_at?: string | null
          student_id: string
          time_spent_minutes?: number | null
        }
        Update: {
          completed_at?: string | null
          completion_percentage?: number | null
          id?: string
          is_completed?: boolean | null
          last_accessed_at?: string | null
          lesson_id?: string
          started_at?: string | null
          student_id?: string
          time_spent_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          attachments: Json | null
          content: string | null
          course_id: string
          created_at: string
          description: string | null
          id: string
          is_preview: boolean | null
          is_required: boolean | null
          lesson_type: string | null
          order_index: number
          resources: Json | null
          section_id: string | null
          slug: string
          title: string
          updated_at: string
          video_duration_minutes: number | null
          video_url: string | null
        }
        Insert: {
          attachments?: Json | null
          content?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_preview?: boolean | null
          is_required?: boolean | null
          lesson_type?: string | null
          order_index: number
          resources?: Json | null
          section_id?: string | null
          slug: string
          title: string
          updated_at?: string
          video_duration_minutes?: number | null
          video_url?: string | null
        }
        Update: {
          attachments?: Json | null
          content?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_preview?: boolean | null
          is_required?: boolean | null
          lesson_type?: string | null
          order_index?: number
          resources?: Json | null
          section_id?: string | null
          slug?: string
          title?: string
          updated_at?: string
          video_duration_minutes?: number | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "course_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_entity_mappings: {
        Row: {
          created_at: string
          entity_type: string
          external_entity_data: Json | null
          external_entity_id: string
          id: string
          integration_id: string
          last_synced_at: string
          local_entity_id: string
          sync_direction: string | null
          sync_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          external_entity_data?: Json | null
          external_entity_id: string
          id?: string
          integration_id: string
          last_synced_at?: string
          local_entity_id: string
          sync_direction?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          external_entity_data?: Json | null
          external_entity_id?: string
          id?: string
          integration_id?: string
          last_synced_at?: string
          local_entity_id?: string
          sync_direction?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_entity_mappings_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "lms_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_integrations: {
        Row: {
          access_token: string | null
          api_key: string | null
          api_secret: string | null
          api_url: string
          auto_sync: boolean | null
          client_id: string | null
          client_secret: string | null
          created_at: string
          created_by: string | null
          default_course_category: string | null
          default_role: string | null
          id: string
          is_active: boolean | null
          is_test_mode: boolean | null
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          metadata: Json | null
          organization_id: string
          password: string | null
          provider: string
          refresh_token: string | null
          sync_courses: boolean | null
          sync_enrollments: boolean | null
          sync_frequency: string | null
          sync_grades: boolean | null
          sync_students: boolean | null
          token_expires_at: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          access_token?: string | null
          api_key?: string | null
          api_secret?: string | null
          api_url: string
          auto_sync?: boolean | null
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          created_by?: string | null
          default_course_category?: string | null
          default_role?: string | null
          id?: string
          is_active?: boolean | null
          is_test_mode?: boolean | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          metadata?: Json | null
          organization_id: string
          password?: string | null
          provider: string
          refresh_token?: string | null
          sync_courses?: boolean | null
          sync_enrollments?: boolean | null
          sync_frequency?: string | null
          sync_grades?: boolean | null
          sync_students?: boolean | null
          token_expires_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          access_token?: string | null
          api_key?: string | null
          api_secret?: string | null
          api_url?: string
          auto_sync?: boolean | null
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          created_by?: string | null
          default_course_category?: string | null
          default_role?: string | null
          id?: string
          is_active?: boolean | null
          is_test_mode?: boolean | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          metadata?: Json | null
          organization_id?: string
          password?: string | null
          provider?: string
          refresh_token?: string | null
          sync_courses?: boolean | null
          sync_enrollments?: boolean | null
          sync_frequency?: string | null
          sync_grades?: boolean | null
          sync_students?: boolean | null
          token_expires_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lms_integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_sync_logs: {
        Row: {
          completed_at: string | null
          created_by: string | null
          duration_ms: number | null
          entities_created: number | null
          entities_deleted: number | null
          entities_failed: number | null
          entities_skipped: number | null
          entities_synced: number | null
          entities_updated: number | null
          entity_type: string | null
          error_message: string | null
          id: string
          integration_id: string
          started_at: string
          status: string
          sync_data: Json | null
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          created_by?: string | null
          duration_ms?: number | null
          entities_created?: number | null
          entities_deleted?: number | null
          entities_failed?: number | null
          entities_skipped?: number | null
          entities_synced?: number | null
          entities_updated?: number | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          integration_id: string
          started_at?: string
          status: string
          sync_data?: Json | null
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          created_by?: string | null
          duration_ms?: number | null
          entities_created?: number | null
          entities_deleted?: number | null
          entities_failed?: number | null
          entities_skipped?: number | null
          entities_synced?: number | null
          entities_updated?: number | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          integration_id?: string
          started_at?: string
          status?: string
          sync_data?: Json | null
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_sync_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "lms_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_notifications: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          message_id: string | null
          notification_type: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message_id?: string | null
          notification_type?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message_id?: string | null
          notification_type?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_notifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_notifications_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json | null
          content: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          message_type: string | null
          reactions: Json | null
          reply_to_id: string | null
          sender_id: string | null
          student_sender_id: string | null
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          message_type?: string | null
          reactions?: Json | null
          reply_to_id?: string | null
          sender_id?: string | null
          student_sender_id?: string | null
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          message_type?: string | null
          reactions?: Json | null
          reply_to_id?: string | null
          sender_id?: string | null
          student_sender_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_student_sender_id_fkey"
            columns: ["student_sender_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      mobile_money_configs: {
        Row: {
          api_key: string | null
          api_secret: string | null
          api_url: string | null
          callback_url: string | null
          created_at: string
          id: string
          is_active: boolean | null
          is_test_mode: boolean | null
          merchant_code: string | null
          merchant_id: string | null
          metadata: Json | null
          organization_id: string
          provider: string
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          api_url?: string | null
          callback_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_test_mode?: boolean | null
          merchant_code?: string | null
          merchant_id?: string | null
          metadata?: Json | null
          organization_id: string
          provider: string
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          api_url?: string | null
          callback_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_test_mode?: boolean | null
          merchant_code?: string | null
          merchant_id?: string | null
          metadata?: Json | null
          organization_id?: string
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mobile_money_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mobile_money_transactions: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          error_message: string | null
          external_transaction_id: string | null
          failed_at: string | null
          id: string
          initiated_at: string | null
          invoice_id: string
          organization_id: string
          payment_id: string | null
          phone_number: string
          provider: string
          request_data: Json | null
          response_data: Json | null
          status: string
          transaction_id: string | null
          updated_at: string
          webhook_data: Json | null
          webhook_received: boolean | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          error_message?: string | null
          external_transaction_id?: string | null
          failed_at?: string | null
          id?: string
          initiated_at?: string | null
          invoice_id: string
          organization_id: string
          payment_id?: string | null
          phone_number: string
          provider: string
          request_data?: Json | null
          response_data?: Json | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          webhook_data?: Json | null
          webhook_received?: boolean | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          error_message?: string | null
          external_transaction_id?: string | null
          failed_at?: string | null
          id?: string
          initiated_at?: string | null
          invoice_id?: string
          organization_id?: string
          payment_id?: string | null
          phone_number?: string
          provider?: string
          request_data?: Json | null
          response_data?: Json | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          webhook_data?: Json | null
          webhook_received?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "mobile_money_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobile_money_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobile_money_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      normal_patterns: {
        Row: {
          calculated_at: string
          confidence_level: number | null
          expires_at: string | null
          id: string
          organization_id: string
          pattern_data: Json
          pattern_type: string
          reference_period_end: string
          reference_period_start: string
          sample_size: number | null
        }
        Insert: {
          calculated_at?: string
          confidence_level?: number | null
          expires_at?: string | null
          id?: string
          organization_id: string
          pattern_data: Json
          pattern_type: string
          reference_period_end: string
          reference_period_start: string
          sample_size?: number | null
        }
        Update: {
          calculated_at?: string
          confidence_level?: number | null
          expires_at?: string | null
          id?: string
          organization_id?: string
          pattern_data?: Json
          pattern_type?: string
          reference_period_end?: string
          reference_period_start?: string
          sample_size?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "normal_patterns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string
          organization_id: string | null
          read: boolean | null
          read_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message: string
          organization_id?: string | null
          read?: boolean | null
          read_at?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string
          organization_id?: string | null
          read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      of_document_signatures: {
        Row: {
          created_at: string
          document_id: string
          id: string
          ip_address: unknown
          location: Json | null
          signature_image: string | null
          signature_method: string | null
          signed_at: string
          signer_email: string
          signer_id: string | null
          signer_name: string
          signer_role: string | null
          signer_type: string
          user_agent: string | null
          verification_code: string | null
          verification_method: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          ip_address?: unknown
          location?: Json | null
          signature_image?: string | null
          signature_method?: string | null
          signed_at?: string
          signer_email: string
          signer_id?: string | null
          signer_name: string
          signer_role?: string | null
          signer_type: string
          user_agent?: string | null
          verification_code?: string | null
          verification_method?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          ip_address?: unknown
          location?: Json | null
          signature_image?: string | null
          signature_method?: string | null
          signed_at?: string
          signer_email?: string
          signer_id?: string | null
          signer_name?: string
          signer_role?: string | null
          signer_type?: string
          user_agent?: string | null
          verification_code?: string | null
          verification_method?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "of_document_signatures_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "of_generated_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_document_signatures_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      of_document_templates: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          description: string | null
          document_type: string
          id: string
          is_default: boolean | null
          name: string
          organization_id: string
          status: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_type: string
          id?: string
          is_default?: boolean | null
          name: string
          organization_id: string
          status?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_type?: string
          id?: string
          is_default?: boolean | null
          name?: string
          organization_id?: string
          status?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "of_document_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_document_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      of_generated_documents: {
        Row: {
          content: string
          created_at: string
          document_type: string
          entity_id: string | null
          entity_type: string | null
          file_path: string | null
          generated_at: string | null
          generated_by: string | null
          generated_data: Json | null
          id: string
          metadata: Json | null
          notes: string | null
          organization_id: string
          program_id: string | null
          requires_signature: boolean | null
          sent_at: string | null
          sent_to: string[] | null
          session_id: string | null
          signature_data: Json | null
          signed_at: string | null
          status: string | null
          student_id: string | null
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          document_type: string
          entity_id?: string | null
          entity_type?: string | null
          file_path?: string | null
          generated_at?: string | null
          generated_by?: string | null
          generated_data?: Json | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          organization_id: string
          program_id?: string | null
          requires_signature?: boolean | null
          sent_at?: string | null
          sent_to?: string[] | null
          session_id?: string | null
          signature_data?: Json | null
          signed_at?: string | null
          status?: string | null
          student_id?: string | null
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          document_type?: string
          entity_id?: string | null
          entity_type?: string | null
          file_path?: string | null
          generated_at?: string | null
          generated_by?: string | null
          generated_data?: Json | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          organization_id?: string
          program_id?: string | null
          requires_signature?: boolean | null
          sent_at?: string | null
          sent_to?: string[] | null
          session_id?: string | null
          signature_data?: Json | null
          signed_at?: string | null
          status?: string | null
          student_id?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "of_generated_documents_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_generated_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_generated_documents_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_generated_documents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_generated_documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_generated_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "of_document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      opco_configurations: {
        Row: {
          api_endpoint: string | null
          api_key: string | null
          api_secret: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sync_date: string | null
          opco_code: string | null
          opco_name: string
          organization_id: string
          siret_number: string
          sync_frequency: string | null
          updated_at: string | null
        }
        Insert: {
          api_endpoint?: string | null
          api_key?: string | null
          api_secret?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_date?: string | null
          opco_code?: string | null
          opco_name: string
          organization_id: string
          siret_number: string
          sync_frequency?: string | null
          updated_at?: string | null
        }
        Update: {
          api_endpoint?: string | null
          api_key?: string | null
          api_secret?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_date?: string | null
          opco_code?: string | null
          opco_name?: string
          organization_id?: string
          siret_number?: string
          sync_frequency?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opco_configurations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      opco_conventions: {
        Row: {
          convention_number: string
          convention_type: string
          created_at: string | null
          end_date: string | null
          funding_rate: number | null
          id: string
          max_funding_amount: number | null
          notes: string | null
          opco_config_id: string
          organization_id: string
          remaining_funding_amount: number | null
          start_date: string
          status: string | null
          updated_at: string | null
          used_funding_amount: number | null
        }
        Insert: {
          convention_number: string
          convention_type: string
          created_at?: string | null
          end_date?: string | null
          funding_rate?: number | null
          id?: string
          max_funding_amount?: number | null
          notes?: string | null
          opco_config_id: string
          organization_id: string
          remaining_funding_amount?: number | null
          start_date: string
          status?: string | null
          updated_at?: string | null
          used_funding_amount?: number | null
        }
        Update: {
          convention_number?: string
          convention_type?: string
          created_at?: string | null
          end_date?: string | null
          funding_rate?: number | null
          id?: string
          max_funding_amount?: number | null
          notes?: string | null
          opco_config_id?: string
          organization_id?: string
          remaining_funding_amount?: number | null
          start_date?: string
          status?: string | null
          updated_at?: string | null
          used_funding_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opco_conventions_opco_config_id_fkey"
            columns: ["opco_config_id"]
            isOneToOne: false
            referencedRelation: "opco_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opco_conventions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      opco_declarations: {
        Row: {
          approved_funding: number | null
          convention_id: string | null
          created_at: string | null
          created_by: string
          declaration_date: string
          declaration_period_end: string
          declaration_period_start: string
          declaration_type: string
          id: string
          metadata: Json | null
          opco_config_id: string
          opco_reference: string | null
          organization_id: string
          paid_funding: number | null
          payment_date: string | null
          rejection_reason: string | null
          requested_funding: number | null
          status: string | null
          submission_date: string | null
          total_amount: number | null
          total_hours: number | null
          total_trainees: number | null
          updated_at: string | null
          validation_date: string | null
        }
        Insert: {
          approved_funding?: number | null
          convention_id?: string | null
          created_at?: string | null
          created_by: string
          declaration_date: string
          declaration_period_end: string
          declaration_period_start: string
          declaration_type: string
          id?: string
          metadata?: Json | null
          opco_config_id: string
          opco_reference?: string | null
          organization_id: string
          paid_funding?: number | null
          payment_date?: string | null
          rejection_reason?: string | null
          requested_funding?: number | null
          status?: string | null
          submission_date?: string | null
          total_amount?: number | null
          total_hours?: number | null
          total_trainees?: number | null
          updated_at?: string | null
          validation_date?: string | null
        }
        Update: {
          approved_funding?: number | null
          convention_id?: string | null
          created_at?: string | null
          created_by?: string
          declaration_date?: string
          declaration_period_end?: string
          declaration_period_start?: string
          declaration_type?: string
          id?: string
          metadata?: Json | null
          opco_config_id?: string
          opco_reference?: string | null
          organization_id?: string
          paid_funding?: number | null
          payment_date?: string | null
          rejection_reason?: string | null
          requested_funding?: number | null
          status?: string | null
          submission_date?: string | null
          total_amount?: number | null
          total_hours?: number | null
          total_trainees?: number | null
          updated_at?: string | null
          validation_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opco_declarations_convention_id_fkey"
            columns: ["convention_id"]
            isOneToOne: false
            referencedRelation: "opco_conventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opco_declarations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opco_declarations_opco_config_id_fkey"
            columns: ["opco_config_id"]
            isOneToOne: false
            referencedRelation: "opco_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opco_declarations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      opco_funding_requests: {
        Row: {
          approval_date: string | null
          approved_amount: number | null
          convention_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          metadata: Json | null
          opco_config_id: string
          opco_reference: string | null
          organization_id: string
          paid_amount: number | null
          payment_date: string | null
          rejection_reason: string | null
          request_number: string | null
          request_type: string
          requested_amount: number
          status: string | null
          submission_date: string | null
          title: string
          training_id: string | null
          updated_at: string | null
        }
        Insert: {
          approval_date?: string | null
          approved_amount?: number | null
          convention_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          metadata?: Json | null
          opco_config_id: string
          opco_reference?: string | null
          organization_id: string
          paid_amount?: number | null
          payment_date?: string | null
          rejection_reason?: string | null
          request_number?: string | null
          request_type: string
          requested_amount: number
          status?: string | null
          submission_date?: string | null
          title: string
          training_id?: string | null
          updated_at?: string | null
        }
        Update: {
          approval_date?: string | null
          approved_amount?: number | null
          convention_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          opco_config_id?: string
          opco_reference?: string | null
          organization_id?: string
          paid_amount?: number | null
          payment_date?: string | null
          rejection_reason?: string | null
          request_number?: string | null
          request_type?: string
          requested_amount?: number
          status?: string | null
          submission_date?: string | null
          title?: string
          training_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opco_funding_requests_convention_id_fkey"
            columns: ["convention_id"]
            isOneToOne: false
            referencedRelation: "opco_conventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opco_funding_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opco_funding_requests_opco_config_id_fkey"
            columns: ["opco_config_id"]
            isOneToOne: false
            referencedRelation: "opco_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opco_funding_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opco_funding_requests_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          brand_color: string | null
          city: string | null
          code: string
          country: string
          created_at: string | null
          currency: string
          email: string | null
          id: string
          language: string
          logo_url: string | null
          name: string
          organization_type: string | null
          phone: string | null
          qualiopi_certificate_url: string | null
          settings: Json | null
          subscription_status: string | null
          subscription_tier: string | null
          timezone: string
          type: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          brand_color?: string | null
          city?: string | null
          code: string
          country?: string
          created_at?: string | null
          currency?: string
          email?: string | null
          id?: string
          language?: string
          logo_url?: string | null
          name: string
          organization_type?: string | null
          phone?: string | null
          qualiopi_certificate_url?: string | null
          settings?: Json | null
          subscription_status?: string | null
          subscription_tier?: string | null
          timezone?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          brand_color?: string | null
          city?: string | null
          code?: string
          country?: string
          created_at?: string | null
          currency?: string
          email?: string | null
          id?: string
          language?: string
          logo_url?: string | null
          name?: string
          organization_type?: string | null
          phone?: string | null
          qualiopi_certificate_url?: string | null
          settings?: Json | null
          subscription_status?: string | null
          subscription_tier?: string | null
          timezone?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_reminder_settings: {
        Row: {
          created_at: string
          email_enabled: boolean | null
          email_template: string | null
          enabled: boolean | null
          id: string
          max_reminders_per_invoice: number | null
          organization_id: string
          overdue_reminder_days: number[] | null
          reminder_days: number[] | null
          send_time: string | null
          sms_enabled: boolean | null
          sms_template: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean | null
          email_template?: string | null
          enabled?: boolean | null
          id?: string
          max_reminders_per_invoice?: number | null
          organization_id: string
          overdue_reminder_days?: number[] | null
          reminder_days?: number[] | null
          send_time?: string | null
          sms_enabled?: boolean | null
          sms_template?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean | null
          email_template?: string | null
          enabled?: boolean | null
          id?: string
          max_reminders_per_invoice?: number | null
          organization_id?: string
          overdue_reminder_days?: number[] | null
          reminder_days?: number[] | null
          send_time?: string | null
          sms_enabled?: boolean | null
          sms_template?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminder_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminders: {
        Row: {
          created_at: string
          created_by: string | null
          days_offset: number
          error_message: string | null
          id: string
          invoice_id: string
          message_content: string | null
          metadata: Json | null
          method: string
          organization_id: string
          recipient_email: string | null
          recipient_phone: string | null
          reminder_type: string
          sent_at: string | null
          status: string
          student_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          days_offset: number
          error_message?: string | null
          id?: string
          invoice_id: string
          message_content?: string | null
          metadata?: Json | null
          method: string
          organization_id: string
          recipient_email?: string | null
          recipient_phone?: string | null
          reminder_type: string
          sent_at?: string | null
          status?: string
          student_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          days_offset?: number
          error_message?: string | null
          id?: string
          invoice_id?: string
          message_content?: string | null
          metadata?: Json | null
          method?: string
          organization_id?: string
          recipient_email?: string | null
          recipient_phone?: string | null
          reminder_type?: string
          sent_at?: string | null
          status?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          id: string
          invoice_id: string | null
          metadata: Json | null
          organization_id: string | null
          paid_at: string | null
          payment_method: string
          payment_provider: string | null
          receipt_url: string | null
          status: string | null
          student_id: string | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          organization_id?: string | null
          paid_at?: string | null
          payment_method: string
          payment_provider?: string | null
          receipt_url?: string | null
          status?: string | null
          student_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          organization_id?: string | null
          paid_at?: string | null
          payment_method?: string
          payment_provider?: string | null
          receipt_url?: string | null
          status?: string | null
          student_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      pinned_messages: {
        Row: {
          conversation_id: string
          id: string
          message_id: string
          pinned_at: string
          pinned_by: string | null
        }
        Insert: {
          conversation_id: string
          id?: string
          message_id: string
          pinned_at?: string
          pinned_by?: string | null
        }
        Update: {
          conversation_id?: string
          id?: string
          message_id?: string
          pinned_at?: string
          pinned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pinned_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_alerts: {
        Row: {
          acknowledged_at: string | null
          alert_type: string
          created_at: string
          dropout_prediction_id: string | null
          id: string
          message: string
          organization_id: string
          recommended_actions: Json | null
          resolved_at: string | null
          session_id: string | null
          severity: string | null
          status: string | null
          student_id: string | null
          success_prediction_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          alert_type: string
          created_at?: string
          dropout_prediction_id?: string | null
          id?: string
          message: string
          organization_id: string
          recommended_actions?: Json | null
          resolved_at?: string | null
          session_id?: string | null
          severity?: string | null
          status?: string | null
          student_id?: string | null
          success_prediction_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          alert_type?: string
          created_at?: string
          dropout_prediction_id?: string | null
          id?: string
          message?: string
          organization_id?: string
          recommended_actions?: Json | null
          resolved_at?: string | null
          session_id?: string | null
          severity?: string | null
          status?: string | null
          student_id?: string | null
          success_prediction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prediction_alerts_dropout_prediction_id_fkey"
            columns: ["dropout_prediction_id"]
            isOneToOne: false
            referencedRelation: "dropout_predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_alerts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_alerts_success_prediction_id_fkey"
            columns: ["success_prediction_id"]
            isOneToOne: false
            referencedRelation: "success_rate_predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_features: {
        Row: {
          calculation_method: string | null
          created_at: string
          data_source: string | null
          description: string | null
          feature_name: string
          feature_type: string
          id: string
          is_active: boolean | null
          updated_at: string
        }
        Insert: {
          calculation_method?: string | null
          created_at?: string
          data_source?: string | null
          description?: string | null
          feature_name: string
          feature_type: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Update: {
          calculation_method?: string | null
          created_at?: string
          data_source?: string | null
          description?: string | null
          feature_name?: string
          feature_type?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      predictive_analytics_reports: {
        Row: {
          detailed_data: Json | null
          filters: Json | null
          generated_at: string
          generated_by: string | null
          id: string
          organization_id: string
          period_end: string
          period_start: string
          report_type: string
          summary_stats: Json | null
          visualizations: Json | null
        }
        Insert: {
          detailed_data?: Json | null
          filters?: Json | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          organization_id: string
          period_end: string
          period_start: string
          report_type: string
          summary_stats?: Json | null
          visualizations?: Json | null
        }
        Update: {
          detailed_data?: Json | null
          filters?: Json | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          organization_id?: string
          period_end?: string
          period_start?: string
          report_type?: string
          summary_stats?: Json | null
          visualizations?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "predictive_analytics_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      predictive_models: {
        Row: {
          accuracy: number | null
          algorithm: string
          created_at: string
          deployed_at: string | null
          f1_score: number | null
          feature_importance: Json | null
          hyperparameters: Json | null
          id: string
          is_production: boolean | null
          mae: number | null
          model_name: string
          model_type: string
          model_version: string
          mse: number | null
          organization_id: string | null
          precision_score: number | null
          r2_score: number | null
          recall_score: number | null
          status: string | null
          test_samples: number | null
          trained_at: string | null
          training_date_range_end: string | null
          training_date_range_start: string | null
          training_samples: number | null
          updated_at: string
          validation_samples: number | null
        }
        Insert: {
          accuracy?: number | null
          algorithm: string
          created_at?: string
          deployed_at?: string | null
          f1_score?: number | null
          feature_importance?: Json | null
          hyperparameters?: Json | null
          id?: string
          is_production?: boolean | null
          mae?: number | null
          model_name: string
          model_type: string
          model_version: string
          mse?: number | null
          organization_id?: string | null
          precision_score?: number | null
          r2_score?: number | null
          recall_score?: number | null
          status?: string | null
          test_samples?: number | null
          trained_at?: string | null
          training_date_range_end?: string | null
          training_date_range_start?: string | null
          training_samples?: number | null
          updated_at?: string
          validation_samples?: number | null
        }
        Update: {
          accuracy?: number | null
          algorithm?: string
          created_at?: string
          deployed_at?: string | null
          f1_score?: number | null
          feature_importance?: Json | null
          hyperparameters?: Json | null
          id?: string
          is_production?: boolean | null
          mae?: number | null
          model_name?: string
          model_type?: string
          model_version?: string
          mse?: number | null
          organization_id?: string | null
          precision_score?: number | null
          r2_score?: number | null
          recall_score?: number | null
          status?: string | null
          test_samples?: number | null
          trained_at?: string | null
          training_date_range_end?: string | null
          training_date_range_start?: string | null
          training_samples?: number | null
          updated_at?: string
          validation_samples?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "predictive_models_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          accounting_product_config: string | null
          category: string | null
          certification_modalities: string | null
          code: string
          competence_domains: string | null
          cpf_code: string | null
          created_at: string | null
          description: string | null
          duration_days: number | null
          duration_unit: string | null
          edof_export_fields: Json | null
          eligible_cpf: boolean | null
          execution_follow_up: string | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          learner_profile: string | null
          modalities: string | null
          name: string
          organization_id: string
          pedagogical_objectives: string | null
          photo_url: string | null
          program_version: string | null
          public_description: string | null
          public_image_url: string | null
          published_online: boolean | null
          quality: string | null
          subtitle: string | null
          training_action_type: string | null
          training_content: string | null
          updated_at: string | null
          version_date: string | null
        }
        Insert: {
          accounting_product_config?: string | null
          category?: string | null
          certification_modalities?: string | null
          code: string
          competence_domains?: string | null
          cpf_code?: string | null
          created_at?: string | null
          description?: string | null
          duration_days?: number | null
          duration_unit?: string | null
          edof_export_fields?: Json | null
          eligible_cpf?: boolean | null
          execution_follow_up?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          learner_profile?: string | null
          modalities?: string | null
          name: string
          organization_id: string
          pedagogical_objectives?: string | null
          photo_url?: string | null
          program_version?: string | null
          public_description?: string | null
          public_image_url?: string | null
          published_online?: boolean | null
          quality?: string | null
          subtitle?: string | null
          training_action_type?: string | null
          training_content?: string | null
          updated_at?: string | null
          version_date?: string | null
        }
        Update: {
          accounting_product_config?: string | null
          category?: string | null
          certification_modalities?: string | null
          code?: string
          competence_domains?: string | null
          cpf_code?: string | null
          created_at?: string | null
          description?: string | null
          duration_days?: number | null
          duration_unit?: string | null
          edof_export_fields?: Json | null
          eligible_cpf?: boolean | null
          execution_follow_up?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          learner_profile?: string | null
          modalities?: string | null
          name?: string
          organization_id?: string
          pedagogical_objectives?: string | null
          photo_url?: string | null
          program_version?: string | null
          public_description?: string | null
          public_image_url?: string | null
          published_online?: boolean | null
          quality?: string | null
          subtitle?: string | null
          training_action_type?: string | null
          training_content?: string | null
          updated_at?: string | null
          version_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_organization_id_fkey1"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      public_catalog_settings: {
        Row: {
          about_content: string | null
          about_image_url: string | null
          about_title: string | null
          accent_color: string | null
          background_color: string | null
          contact_address: string | null
          contact_email: string | null
          contact_phone: string | null
          cover_image_url: string | null
          created_at: string | null
          custom_domain: string | null
          favicon_url: string | null
          footer_image_url: string | null
          footer_links: Json | null
          footer_text: string | null
          google_analytics_id: string | null
          google_tag_manager_id: string | null
          hero_button_link: string | null
          hero_button_text: string | null
          hero_description: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          is_enabled: boolean | null
          logo_url: string | null
          meta_description: string | null
          meta_image_url: string | null
          meta_title: string | null
          organization_id: string
          primary_color: string | null
          secondary_color: string | null
          show_contact_form: boolean | null
          site_description: string | null
          site_keywords: string[] | null
          site_title: string | null
          social_links: Json | null
          text_color: string | null
          updated_at: string | null
        }
        Insert: {
          about_content?: string | null
          about_image_url?: string | null
          about_title?: string | null
          accent_color?: string | null
          background_color?: string | null
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          custom_domain?: string | null
          favicon_url?: string | null
          footer_image_url?: string | null
          footer_links?: Json | null
          footer_text?: string | null
          google_analytics_id?: string | null
          google_tag_manager_id?: string | null
          hero_button_link?: string | null
          hero_button_text?: string | null
          hero_description?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          is_enabled?: boolean | null
          logo_url?: string | null
          meta_description?: string | null
          meta_image_url?: string | null
          meta_title?: string | null
          organization_id: string
          primary_color?: string | null
          secondary_color?: string | null
          show_contact_form?: boolean | null
          site_description?: string | null
          site_keywords?: string[] | null
          site_title?: string | null
          social_links?: Json | null
          text_color?: string | null
          updated_at?: string | null
        }
        Update: {
          about_content?: string | null
          about_image_url?: string | null
          about_title?: string | null
          accent_color?: string | null
          background_color?: string | null
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          custom_domain?: string | null
          favicon_url?: string | null
          footer_image_url?: string | null
          footer_links?: Json | null
          footer_text?: string | null
          google_analytics_id?: string | null
          google_tag_manager_id?: string | null
          hero_button_link?: string | null
          hero_button_text?: string | null
          hero_description?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          is_enabled?: boolean | null
          logo_url?: string | null
          meta_description?: string | null
          meta_image_url?: string | null
          meta_title?: string | null
          organization_id?: string
          primary_color?: string | null
          secondary_color?: string | null
          show_contact_form?: boolean | null
          site_description?: string | null
          site_keywords?: string[] | null
          site_title?: string | null
          social_links?: Json | null
          text_color?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_catalog_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      public_enrollments: {
        Row: {
          address: string | null
          admin_notes: string | null
          candidate_notes: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          metadata: Json | null
          organization_id: string
          phone: string | null
          postal_code: string | null
          processed_at: string | null
          processed_by: string | null
          public_formation_id: string
          session_id: string | null
          site_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          candidate_notes?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          metadata?: Json | null
          organization_id: string
          phone?: string | null
          postal_code?: string | null
          processed_at?: string | null
          processed_by?: string | null
          public_formation_id: string
          session_id?: string | null
          site_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          candidate_notes?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          metadata?: Json | null
          organization_id?: string
          phone?: string | null
          postal_code?: string | null
          processed_at?: string | null
          processed_by?: string | null
          public_formation_id?: string
          session_id?: string | null
          site_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_enrollments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_enrollments_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_enrollments_public_formation_id_fkey"
            columns: ["public_formation_id"]
            isOneToOne: false
            referencedRelation: "public_formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_enrollments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_enrollments_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      public_formations: {
        Row: {
          allow_online_registration: boolean | null
          available_at_sites: string[] | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          formation_id: string | null
          gallery_images: string[] | null
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          max_participants: number | null
          metadata: Json | null
          min_participants: number | null
          organization_id: string
          program_id: string | null
          public_description: string | null
          public_duration_days: number | null
          public_duration_hours: number | null
          public_objectives: string | null
          public_prerequisites: string | null
          public_price: number | null
          public_price_label: string | null
          public_title: string
          published_at: string | null
          registration_deadline: string | null
          seo_description: string | null
          seo_keywords: string[] | null
          seo_title: string | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          allow_online_registration?: boolean | null
          available_at_sites?: string[] | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          formation_id?: string | null
          gallery_images?: string[] | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          max_participants?: number | null
          metadata?: Json | null
          min_participants?: number | null
          organization_id: string
          program_id?: string | null
          public_description?: string | null
          public_duration_days?: number | null
          public_duration_hours?: number | null
          public_objectives?: string | null
          public_prerequisites?: string | null
          public_price?: number | null
          public_price_label?: string | null
          public_title: string
          published_at?: string | null
          registration_deadline?: string | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_online_registration?: boolean | null
          available_at_sites?: string[] | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          formation_id?: string | null
          gallery_images?: string[] | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          max_participants?: number | null
          metadata?: Json | null
          min_participants?: number | null
          organization_id?: string
          program_id?: string | null
          public_description?: string | null
          public_duration_days?: number | null
          public_duration_hours?: number | null
          public_objectives?: string | null
          public_prerequisites?: string | null
          public_price?: number | null
          public_price_label?: string | null
          public_title?: string
          published_at?: string | null
          registration_deadline?: string | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_formations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_formations_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_formations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_formations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      push_devices: {
        Row: {
          app_version: string | null
          created_at: string
          device_model: string | null
          device_name: string | null
          device_token: string
          device_type: string
          id: string
          is_active: boolean | null
          language: string | null
          last_notification_at: string | null
          notification_count: number | null
          organization_id: string | null
          os_version: string | null
          platform: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          device_model?: string | null
          device_name?: string | null
          device_token: string
          device_type: string
          id?: string
          is_active?: boolean | null
          language?: string | null
          last_notification_at?: string | null
          notification_count?: number | null
          organization_id?: string | null
          os_version?: string | null
          platform?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          device_model?: string | null
          device_name?: string | null
          device_token?: string
          device_type?: string
          id?: string
          is_active?: boolean | null
          language?: string | null
          last_notification_at?: string | null
          notification_count?: number | null
          organization_id?: string | null
          os_version?: string | null
          platform?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_devices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notification_campaigns: {
        Row: {
          body: string
          created_at: string
          created_by: string
          data: Json | null
          description: string | null
          failed_count: number | null
          id: string
          name: string
          organization_id: string
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number | null
          status: string | null
          target_audience: string | null
          target_user_ids: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          data?: Json | null
          description?: string | null
          failed_count?: number | null
          id?: string
          name: string
          organization_id: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          target_audience?: string | null
          target_user_ids?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          data?: Json | null
          description?: string | null
          failed_count?: number | null
          id?: string
          name?: string
          organization_id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          target_audience?: string | null
          target_user_ids?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_notification_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notification_logs: {
        Row: {
          action: string
          campaign_id: string | null
          created_at: string
          device_id: string | null
          error_message: string | null
          id: string
          notification_id: string | null
          provider_response: Json | null
          status_code: number | null
        }
        Insert: {
          action: string
          campaign_id?: string | null
          created_at?: string
          device_id?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string | null
          provider_response?: Json | null
          status_code?: number | null
        }
        Update: {
          action?: string
          campaign_id?: string | null
          created_at?: string
          device_id?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string | null
          provider_response?: Json | null
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "push_notification_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "push_notification_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_notification_logs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "push_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_notification_logs_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "push_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notification_preferences: {
        Row: {
          created_at: string
          enable_announcements: boolean | null
          enable_attendance: boolean | null
          enable_documents: boolean | null
          enable_evaluations: boolean | null
          enable_events: boolean | null
          enable_messages: boolean | null
          enable_payments: boolean | null
          enable_reminders: boolean | null
          id: string
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enable_announcements?: boolean | null
          enable_attendance?: boolean | null
          enable_documents?: boolean | null
          enable_evaluations?: boolean | null
          enable_events?: boolean | null
          enable_messages?: boolean | null
          enable_payments?: boolean | null
          enable_reminders?: boolean | null
          id?: string
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enable_announcements?: boolean | null
          enable_attendance?: boolean | null
          enable_documents?: boolean | null
          enable_evaluations?: boolean | null
          enable_events?: boolean | null
          enable_messages?: boolean | null
          enable_payments?: boolean | null
          enable_reminders?: boolean | null
          id?: string
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_notification_templates: {
        Row: {
          body_template: string
          created_at: string
          data_template: Json | null
          id: string
          is_active: boolean | null
          name: string
          notification_type: string
          organization_id: string | null
          priority: string | null
          sound: string | null
          title_template: string
          updated_at: string
        }
        Insert: {
          body_template: string
          created_at?: string
          data_template?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          notification_type: string
          organization_id?: string | null
          priority?: string | null
          sound?: string | null
          title_template: string
          updated_at?: string
        }
        Update: {
          body_template?: string
          created_at?: string
          data_template?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          notification_type?: string
          organization_id?: string | null
          priority?: string | null
          sound?: string | null
          title_template?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_notification_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notifications: {
        Row: {
          badge: number | null
          body: string
          category: string | null
          clicked_at: string | null
          created_at: string
          data: Json | null
          delivered_at: string | null
          device_id: string | null
          error_message: string | null
          id: string
          notification_type: string
          priority: string | null
          sent_at: string | null
          sound: string | null
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          badge?: number | null
          body: string
          category?: string | null
          clicked_at?: string | null
          created_at?: string
          data?: Json | null
          delivered_at?: string | null
          device_id?: string | null
          error_message?: string | null
          id?: string
          notification_type: string
          priority?: string | null
          sent_at?: string | null
          sound?: string | null
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          badge?: number | null
          body?: string
          category?: string | null
          clicked_at?: string | null
          created_at?: string
          data?: Json | null
          delivered_at?: string | null
          device_id?: string | null
          error_message?: string | null
          id?: string
          notification_type?: string
          priority?: string | null
          sent_at?: string | null
          sound?: string | null
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_notifications_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "push_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_code_scans: {
        Row: {
          accuracy: number | null
          device_info: Json | null
          id: string
          ip_address: unknown
          is_valid: boolean | null
          latitude: number | null
          longitude: number | null
          metadata: Json | null
          qr_code_id: string
          scan_token: string
          scanned_at: string
          session_id: string
          student_id: string
          validation_error: string | null
        }
        Insert: {
          accuracy?: number | null
          device_info?: Json | null
          id?: string
          ip_address?: unknown
          is_valid?: boolean | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          qr_code_id: string
          scan_token: string
          scanned_at?: string
          session_id: string
          student_id: string
          validation_error?: string | null
        }
        Update: {
          accuracy?: number | null
          device_info?: Json | null
          id?: string
          ip_address?: unknown
          is_valid?: boolean | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          qr_code_id?: string
          scan_token?: string
          scanned_at?: string
          session_id?: string
          student_id?: string
          validation_error?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_code_scans_qr_code_id_fkey"
            columns: ["qr_code_id"]
            isOneToOne: false
            referencedRelation: "session_qr_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_code_scans_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_code_scans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      qualiopi_indicators: {
        Row: {
          category: string
          compliance_rate: number | null
          created_at: string | null
          description: string | null
          id: string
          indicator_code: string
          indicator_name: string
          last_evaluation_date: string | null
          next_evaluation_date: string | null
          notes: string | null
          organization_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          compliance_rate?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          indicator_code: string
          indicator_name: string
          last_evaluation_date?: string | null
          next_evaluation_date?: string | null
          notes?: string | null
          organization_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          compliance_rate?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          indicator_code?: string
          indicator_name?: string
          last_evaluation_date?: string | null
          next_evaluation_date?: string | null
          notes?: string | null
          organization_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qualiopi_indicators_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json | null
          completed_at: string | null
          correct_answers: number | null
          id: string
          is_passed: boolean | null
          quiz_id: string
          score: number | null
          started_at: string
          student_id: string
          time_taken_minutes: number | null
          total_questions: number | null
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          correct_answers?: number | null
          id?: string
          is_passed?: boolean | null
          quiz_id: string
          score?: number | null
          started_at?: string
          student_id: string
          time_taken_minutes?: number | null
          total_questions?: number | null
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          correct_answers?: number | null
          id?: string
          is_passed?: boolean | null
          quiz_id?: string
          score?: number | null
          started_at?: string
          student_id?: string
          time_taken_minutes?: number | null
          total_questions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string | null
          created_at: string
          explanation: string | null
          id: string
          options: Json | null
          order_index: number
          points: number | null
          question_text: string
          question_type: string | null
          quiz_id: string
          updated_at: string
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json | null
          order_index: number
          points?: number | null
          question_text: string
          question_type?: string | null
          quiz_id: string
          updated_at?: string
        }
        Update: {
          correct_answer?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json | null
          order_index?: number
          points?: number | null
          question_text?: string
          question_type?: string | null
          quiz_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_results: {
        Row: {
          answers: Json | null
          attempt_number: number | null
          completed_at: string | null
          id: string
          max_score: number
          metadata: Json | null
          passed: boolean
          percentage: number
          quiz_id: string
          score: number
          started_at: string | null
          student_id: string
          time_spent: number | null
        }
        Insert: {
          answers?: Json | null
          attempt_number?: number | null
          completed_at?: string | null
          id?: string
          max_score: number
          metadata?: Json | null
          passed: boolean
          percentage: number
          quiz_id: string
          score: number
          started_at?: string | null
          student_id: string
          time_spent?: number | null
        }
        Update: {
          answers?: Json | null
          attempt_number?: number | null
          completed_at?: string | null
          id?: string
          max_score?: number
          metadata?: Json | null
          passed?: boolean
          percentage?: number
          quiz_id?: string
          score?: number
          started_at?: string | null
          student_id?: string
          time_spent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          lesson_id: string | null
          max_attempts: number | null
          passing_score: number | null
          show_results_immediately: boolean | null
          shuffle_questions: boolean | null
          time_limit_minutes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          lesson_id?: string | null
          max_attempts?: number | null
          passing_score?: number | null
          show_results_immediately?: boolean | null
          shuffle_questions?: boolean | null
          time_limit_minutes?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          lesson_id?: string | null
          max_attempts?: number | null
          passing_score?: number | null
          show_results_immediately?: boolean | null
          shuffle_questions?: boolean | null
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_actions: {
        Row: {
          action_details: Json | null
          action_type: string
          created_at: string
          id: string
          recommendation_id: string
          user_id: string
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          created_at?: string
          id?: string
          recommendation_id: string
          user_id: string
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          created_at?: string
          id?: string
          recommendation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_actions_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_feedback: {
        Row: {
          created_at: string
          feedback_text: string | null
          id: string
          recommendation_id: string
          user_id: string
          was_accurate: boolean | null
          was_actionable: boolean | null
          was_helpful: boolean | null
        }
        Insert: {
          created_at?: string
          feedback_text?: string | null
          id?: string
          recommendation_id: string
          user_id: string
          was_accurate?: boolean | null
          was_actionable?: boolean | null
          was_helpful?: boolean | null
        }
        Update: {
          created_at?: string
          feedback_text?: string | null
          id?: string
          recommendation_id?: string
          user_id?: string
          was_accurate?: boolean | null
          was_actionable?: boolean | null
          was_helpful?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_feedback_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_types: {
        Row: {
          category: string
          code: string
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: string | null
          updated_at: string
        }
        Insert: {
          category: string
          code: string
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          acknowledged_at: string | null
          confidence_score: number | null
          created_at: string
          description: string
          dismissed_at: string | null
          expires_at: string | null
          id: string
          impact_score: number | null
          organization_id: string
          recommendation_type_id: string
          resolved_at: string | null
          source_data: Json | null
          status: string | null
          suggested_action: string | null
          target_id: string | null
          target_type: string
          title: string
          urgency_score: number | null
          user_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          confidence_score?: number | null
          created_at?: string
          description: string
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          impact_score?: number | null
          organization_id: string
          recommendation_type_id: string
          resolved_at?: string | null
          source_data?: Json | null
          status?: string | null
          suggested_action?: string | null
          target_id?: string | null
          target_type: string
          title: string
          urgency_score?: number | null
          user_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          confidence_score?: number | null
          created_at?: string
          description?: string
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          impact_score?: number | null
          organization_id?: string
          recommendation_type_id?: string
          resolved_at?: string | null
          source_data?: Json | null
          status?: string | null
          suggested_action?: string | null
          target_id?: string | null
          target_type?: string
          title?: string
          urgency_score?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_recommendation_type_id_fkey"
            columns: ["recommendation_type_id"]
            isOneToOne: false
            referencedRelation: "recommendation_types"
            referencedColumns: ["id"]
          },
        ]
      }
      report_card_subjects: {
        Row: {
          appreciation: string | null
          average_score: number | null
          coefficient: number | null
          created_at: string
          id: string
          rank_in_subject: number | null
          report_card_id: string
          subject: string
          subject_average: number | null
          teacher_comment: string | null
          total_students_in_subject: number | null
        }
        Insert: {
          appreciation?: string | null
          average_score?: number | null
          coefficient?: number | null
          created_at?: string
          id?: string
          rank_in_subject?: number | null
          report_card_id: string
          subject: string
          subject_average?: number | null
          teacher_comment?: string | null
          total_students_in_subject?: number | null
        }
        Update: {
          appreciation?: string | null
          average_score?: number | null
          coefficient?: number | null
          created_at?: string
          id?: string
          rank_in_subject?: number | null
          report_card_id?: string
          subject?: string
          subject_average?: number | null
          teacher_comment?: string | null
          total_students_in_subject?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "report_card_subjects_report_card_id_fkey"
            columns: ["report_card_id"]
            isOneToOne: false
            referencedRelation: "report_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      report_cards: {
        Row: {
          academic_year_id: string | null
          appreciation: string | null
          class_average: number | null
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          overall_average: number | null
          overall_rank: number | null
          parent_comment: string | null
          principal_comment: string | null
          published_at: string | null
          published_by: string | null
          session_id: string | null
          status: string | null
          student_id: string
          term_period: string
          total_students: number | null
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          appreciation?: string | null
          class_average?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          overall_average?: number | null
          overall_rank?: number | null
          parent_comment?: string | null
          principal_comment?: string | null
          published_at?: string | null
          published_by?: string | null
          session_id?: string | null
          status?: string | null
          student_id: string
          term_period: string
          total_students?: number | null
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          appreciation?: string | null
          class_average?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          overall_average?: number | null
          overall_rank?: number | null
          parent_comment?: string | null
          principal_comment?: string | null
          published_at?: string | null
          published_by?: string | null
          session_id?: string | null
          status?: string | null
          student_id?: string
          term_period?: string
          total_students?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_cards_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          order_index: number | null
          organization_id: string
          parent_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_index?: number | null
          organization_id: string
          parent_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_index?: number | null
          organization_id?: string
          parent_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "resource_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_collections: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          name: string
          organization_id: string
          resource_count: number | null
          updated_at: string
          user_id: string
          view_count: number | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          name: string
          organization_id: string
          resource_count?: number | null
          updated_at?: string
          user_id: string
          view_count?: number | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          name?: string
          organization_id?: string
          resource_count?: number | null
          updated_at?: string
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_collections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_edited: boolean | null
          parent_id: string | null
          resource_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_edited?: boolean | null
          parent_id?: string | null
          resource_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_edited?: boolean | null
          parent_id?: string | null
          resource_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "resource_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_comments_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "educational_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_downloads: {
        Row: {
          downloaded_at: string
          id: string
          ip_address: unknown
          resource_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          downloaded_at?: string
          id?: string
          ip_address?: unknown
          resource_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          downloaded_at?: string
          id?: string
          ip_address?: unknown
          resource_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_downloads_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "educational_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_favorites: {
        Row: {
          created_at: string
          id: string
          resource_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          resource_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          resource_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_favorites_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "educational_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number | null
          resource_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number | null
          resource_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number | null
          resource_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_ratings_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "educational_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_versions: {
        Row: {
          changelog: string | null
          created_at: string
          created_by: string | null
          file_size_bytes: number | null
          file_url: string
          id: string
          resource_id: string
          version_number: string
        }
        Insert: {
          changelog?: string | null
          created_at?: string
          created_by?: string | null
          file_size_bytes?: number | null
          file_url: string
          id?: string
          resource_id: string
          version_number: string
        }
        Update: {
          changelog?: string | null
          created_at?: string
          created_by?: string | null
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          resource_id?: string
          version_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_versions_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "educational_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_views: {
        Row: {
          id: string
          ip_address: unknown
          resource_id: string
          user_agent: string | null
          user_id: string | null
          view_duration_seconds: number | null
          viewed_at: string
        }
        Insert: {
          id?: string
          ip_address?: unknown
          resource_id: string
          user_agent?: string | null
          user_id?: string | null
          view_duration_seconds?: number | null
          viewed_at?: string
        }
        Update: {
          id?: string
          ip_address?: unknown
          resource_id?: string
          user_agent?: string | null
          user_id?: string | null
          view_duration_seconds?: number | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_views_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "educational_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_assessments: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          identified_at: string
          impact: string
          likelihood: string
          next_review_date: string | null
          organization_id: string
          owner_id: string | null
          resolved_at: string | null
          risk_id: string
          risk_level: string
          target_resolution_date: string | null
          title: string
          treatment_plan: string | null
          treatment_status: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          identified_at?: string
          impact: string
          likelihood: string
          next_review_date?: string | null
          organization_id: string
          owner_id?: string | null
          resolved_at?: string | null
          risk_id: string
          risk_level: string
          target_resolution_date?: string | null
          title: string
          treatment_plan?: string | null
          treatment_status?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          identified_at?: string
          impact?: string
          likelihood?: string
          next_review_date?: string | null
          organization_id?: string
          owner_id?: string | null
          resolved_at?: string | null
          risk_id?: string
          risk_level?: string
          target_resolution_date?: string | null
          title?: string
          treatment_plan?: string | null
          treatment_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rncp_certifications: {
        Row: {
          certification_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          level: string | null
          metadata: Json | null
          organization_id: string
          program_id: string | null
          registration_date: string | null
          rncp_code: string | null
          rs_code: string | null
          sector: string | null
          skills_accredited: string | null
          title: string
          updated_at: string | null
          validity_end_date: string | null
          validity_start_date: string | null
        }
        Insert: {
          certification_type: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          metadata?: Json | null
          organization_id: string
          program_id?: string | null
          registration_date?: string | null
          rncp_code?: string | null
          rs_code?: string | null
          sector?: string | null
          skills_accredited?: string | null
          title: string
          updated_at?: string | null
          validity_end_date?: string | null
          validity_start_date?: string | null
        }
        Update: {
          certification_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          metadata?: Json | null
          organization_id?: string
          program_id?: string | null
          registration_date?: string | null
          rncp_code?: string | null
          rs_code?: string | null
          sector?: string | null
          skills_accredited?: string | null
          title?: string
          updated_at?: string | null
          validity_end_date?: string | null
          validity_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rncp_certifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rncp_certifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rncp_certifications_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_document_sends: {
        Row: {
          created_at: string | null
          document_id: string
          error_message: string | null
          id: string
          message: string | null
          metadata: Json | null
          organization_id: string
          recipient_ids: string[] | null
          recipient_type: string
          scheduled_at: string
          send_via: string[] | null
          sent_at: string | null
          session_id: string | null
          status: string
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_id: string
          error_message?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          organization_id: string
          recipient_ids?: string[] | null
          recipient_type: string
          scheduled_at: string
          send_via?: string[] | null
          sent_at?: string | null
          session_id?: string | null
          status?: string
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string
          error_message?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          organization_id?: string
          recipient_ids?: string[] | null
          recipient_type?: string
          scheduled_at?: string
          send_via?: string[] | null
          sent_at?: string | null
          session_id?: string | null
          status?: string
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_document_sends_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_document_sends_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_document_sends_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_notifications: {
        Row: {
          created_at: string | null
          error_message: string | null
          formation_id: string | null
          id: string
          message: string
          metadata: Json | null
          organization_id: string
          recipient_id: string | null
          recipient_type: string
          scheduled_at: string
          sent_at: string | null
          session_id: string | null
          status: string
          subject: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          formation_id?: string | null
          id?: string
          message: string
          metadata?: Json | null
          organization_id: string
          recipient_id?: string | null
          recipient_type: string
          scheduled_at: string
          sent_at?: string | null
          session_id?: string | null
          status?: string
          subject?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          formation_id?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          organization_id?: string
          recipient_id?: string | null
          recipient_type?: string
          scheduled_at?: string
          sent_at?: string | null
          session_id?: string | null
          status?: string
          subject?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_notifications_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_notifications_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audits: {
        Row: {
          audit_id: string
          audit_type: string
          auditor_name: string | null
          auditor_organization: string | null
          compliance_percentage: number | null
          created_at: string
          critical_findings_count: number | null
          end_date: string | null
          findings_count: number | null
          framework: string | null
          id: string
          organization_id: string
          overall_score: number | null
          report_url: string | null
          start_date: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audit_id: string
          audit_type: string
          auditor_name?: string | null
          auditor_organization?: string | null
          compliance_percentage?: number | null
          created_at?: string
          critical_findings_count?: number | null
          end_date?: string | null
          findings_count?: number | null
          framework?: string | null
          id?: string
          organization_id: string
          overall_score?: number | null
          report_url?: string | null
          start_date: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audit_id?: string
          audit_type?: string
          auditor_name?: string | null
          auditor_organization?: string | null
          compliance_percentage?: number | null
          created_at?: string
          critical_findings_count?: number | null
          end_date?: string | null
          findings_count?: number | null
          framework?: string | null
          id?: string
          organization_id?: string
          overall_score?: number | null
          report_url?: string | null
          start_date?: string
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_audits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      security_controls: {
        Row: {
          category: string | null
          compliance_status: string | null
          control_id: string
          created_at: string
          description: string | null
          evidence_description: string | null
          evidence_required: boolean | null
          framework: string
          id: string
          implementation_status: string | null
          last_assessed_at: string | null
          next_assessment_date: string | null
          organization_id: string | null
          risk_level: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          compliance_status?: string | null
          control_id: string
          created_at?: string
          description?: string | null
          evidence_description?: string | null
          evidence_required?: boolean | null
          framework: string
          id?: string
          implementation_status?: string | null
          last_assessed_at?: string | null
          next_assessment_date?: string | null
          organization_id?: string | null
          risk_level?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          compliance_status?: string | null
          control_id?: string
          created_at?: string
          description?: string | null
          evidence_description?: string | null
          evidence_required?: boolean | null
          framework?: string
          id?: string
          implementation_status?: string | null
          last_assessed_at?: string | null
          next_assessment_date?: string | null
          organization_id?: string | null
          risk_level?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_controls_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      security_incidents: {
        Row: {
          affected_systems: string[] | null
          affected_users_count: number | null
          assigned_to: string | null
          category: string
          created_at: string
          data_breach: boolean | null
          description: string | null
          detected_at: string
          id: string
          incident_id: string
          organization_id: string
          personal_data_affected: boolean | null
          reported_at: string | null
          reported_by: string | null
          reported_to_authorities: boolean | null
          resolution: string | null
          resolved_at: string | null
          root_cause: string | null
          severity: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          affected_systems?: string[] | null
          affected_users_count?: number | null
          assigned_to?: string | null
          category: string
          created_at?: string
          data_breach?: boolean | null
          description?: string | null
          detected_at: string
          id?: string
          incident_id: string
          organization_id: string
          personal_data_affected?: boolean | null
          reported_at?: string | null
          reported_by?: string | null
          reported_to_authorities?: boolean | null
          resolution?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          severity: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          affected_systems?: string[] | null
          affected_users_count?: number | null
          assigned_to?: string | null
          category?: string
          created_at?: string
          data_breach?: boolean | null
          description?: string | null
          detected_at?: string
          id?: string
          incident_id?: string
          organization_id?: string
          personal_data_affected?: boolean | null
          reported_at?: string | null
          reported_by?: string | null
          reported_to_authorities?: boolean | null
          resolution?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          severity?: string
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      security_policies: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          category: string
          code: string
          content: string
          created_at: string
          description: string | null
          effective_date: string | null
          id: string
          iso27001_control: string | null
          organization_id: string | null
          review_date: string | null
          soc2_control: string | null
          status: string | null
          title: string
          updated_at: string
          version: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category: string
          code: string
          content: string
          created_at?: string
          description?: string | null
          effective_date?: string | null
          id?: string
          iso27001_control?: string | null
          organization_id?: string | null
          review_date?: string | null
          soc2_control?: string | null
          status?: string | null
          title: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          code?: string
          content?: string
          created_at?: string
          description?: string | null
          effective_date?: string | null
          id?: string
          iso27001_control?: string | null
          organization_id?: string | null
          review_date?: string | null
          soc2_control?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      security_training: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          organization_id: string | null
          required_for_all: boolean | null
          required_roles: string[] | null
          title: string
          training_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          required_for_all?: boolean | null
          required_roles?: string[] | null
          title: string
          training_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          required_for_all?: boolean | null
          required_roles?: string[] | null
          title?: string
          training_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_training_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      security_training_records: {
        Row: {
          completed_at: string | null
          completion_percentage: number | null
          created_at: string
          expires_at: string | null
          id: string
          score: number | null
          started_at: string | null
          status: string | null
          training_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          score?: number | null
          started_at?: string | null
          status?: string | null
          training_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          score?: number | null
          started_at?: string | null
          status?: string | null
          training_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_training_records_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "security_training"
            referencedColumns: ["id"]
          },
        ]
      }
      session_charges: {
        Row: {
          amount: number
          category_id: string | null
          charge_date: string
          created_at: string
          created_by: string | null
          currency: string
          description: string
          id: string
          notes: string | null
          organization_id: string
          paid_at: string | null
          payment_method: string | null
          payment_status: string | null
          receipt_url: string | null
          session_id: string
          updated_at: string
          vendor: string | null
          vendor_invoice_date: string | null
          vendor_invoice_number: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          charge_date?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description: string
          id?: string
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          receipt_url?: string | null
          session_id: string
          updated_at?: string
          vendor?: string | null
          vendor_invoice_date?: string | null
          vendor_invoice_number?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          charge_date?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          id?: string
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          receipt_url?: string | null
          session_id?: string
          updated_at?: string
          vendor?: string | null
          vendor_invoice_date?: string | null
          vendor_invoice_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_charges_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "charge_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_charges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_charges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_charges_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_courses: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          course_id: string
          created_at: string | null
          due_date: string | null
          id: string
          is_required: boolean | null
          session_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          course_id: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_required?: boolean | null
          session_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          course_id?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_required?: boolean | null
          session_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_courses_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_courses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_programs: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          program_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          program_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          program_id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_programs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_programs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_qr_codes: {
        Row: {
          allowed_radius_meters: number | null
          created_at: string
          created_by: string | null
          current_scans: number | null
          expires_at: string
          id: string
          is_active: boolean | null
          max_scans: number | null
          qr_code_data: string
          qr_code_token: string
          require_location: boolean | null
          session_id: string
          updated_at: string
        }
        Insert: {
          allowed_radius_meters?: number | null
          created_at?: string
          created_by?: string | null
          current_scans?: number | null
          expires_at: string
          id?: string
          is_active?: boolean | null
          max_scans?: number | null
          qr_code_data: string
          qr_code_token: string
          require_location?: boolean | null
          session_id: string
          updated_at?: string
        }
        Update: {
          allowed_radius_meters?: number | null
          created_at?: string
          created_by?: string | null
          current_scans?: number | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          max_scans?: number | null
          qr_code_data?: string
          qr_code_token?: string
          require_location?: boolean | null
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_qr_codes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_slots: {
        Row: {
          capacity_max: number | null
          created_at: string
          date: string
          end_time: string
          id: string
          location: string | null
          notes: string | null
          session_id: string
          start_time: string
          teacher_id: string | null
          time_slot: string
          updated_at: string
        }
        Insert: {
          capacity_max?: number | null
          created_at?: string
          date: string
          end_time: string
          id?: string
          location?: string | null
          notes?: string | null
          session_id: string
          start_time: string
          teacher_id?: string | null
          time_slot: string
          updated_at?: string
        }
        Update: {
          capacity_max?: number | null
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          location?: string | null
          notes?: string | null
          session_id?: string
          start_time?: string
          teacher_id?: string | null
          time_slot?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_slots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_slots_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      session_teachers: {
        Row: {
          created_at: string | null
          hourly_rate: number | null
          id: string
          is_primary: boolean | null
          notes: string | null
          role: string | null
          session_id: string | null
          teacher_id: string | null
          total_hours: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          hourly_rate?: number | null
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          role?: string | null
          session_id?: string | null
          teacher_id?: string | null
          total_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          hourly_rate?: number | null
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          role?: string | null
          session_id?: string | null
          teacher_id?: string | null
          total_hours?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_teachers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_teachers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      session_timeout_rules: {
        Row: {
          absolute_timeout_minutes: number | null
          allow_multiple_devices: boolean | null
          created_at: string
          created_by: string | null
          id: string
          idle_timeout_minutes: number | null
          is_active: boolean | null
          max_concurrent_sessions: number | null
          notify_on_new_device: boolean | null
          notify_on_suspicious_activity: boolean | null
          organization_id: string
          require_device_verification: boolean | null
          updated_at: string
        }
        Insert: {
          absolute_timeout_minutes?: number | null
          allow_multiple_devices?: boolean | null
          created_at?: string
          created_by?: string | null
          id?: string
          idle_timeout_minutes?: number | null
          is_active?: boolean | null
          max_concurrent_sessions?: number | null
          notify_on_new_device?: boolean | null
          notify_on_suspicious_activity?: boolean | null
          organization_id: string
          require_device_verification?: boolean | null
          updated_at?: string
        }
        Update: {
          absolute_timeout_minutes?: number | null
          allow_multiple_devices?: boolean | null
          created_at?: string
          created_by?: string | null
          id?: string
          idle_timeout_minutes?: number | null
          is_active?: boolean | null
          max_concurrent_sessions?: number | null
          notify_on_new_device?: boolean | null
          notify_on_suspicious_activity?: boolean | null
          organization_id?: string
          require_device_verification?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_timeout_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          capacity_max: number | null
          created_at: string | null
          end_date: string
          end_time: string | null
          formation_id: string | null
          id: string
          location: string | null
          name: string
          organization_id: string | null
          start_date: string
          start_time: string | null
          status: string
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          capacity_max?: number | null
          created_at?: string | null
          end_date: string
          end_time?: string | null
          formation_id?: string | null
          id?: string
          location?: string | null
          name: string
          organization_id?: string | null
          start_date: string
          start_time?: string | null
          status?: string
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          capacity_max?: number | null
          created_at?: string | null
          end_date?: string
          end_time?: string | null
          formation_id?: string | null
          id?: string
          location?: string | null
          name?: string
          organization_id?: string | null
          start_date?: string
          start_time?: string | null
          status?: string
          teacher_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_requests: {
        Row: {
          created_at: string | null
          document_id: string
          expires_at: string | null
          id: string
          last_reminder_sent_at: string | null
          message: string | null
          organization_id: string
          recipient_email: string
          recipient_id: string | null
          recipient_name: string
          recipient_type: string
          reminder_count: number | null
          reminder_frequency: string | null
          requester_id: string
          requires_notarization: boolean | null
          signature_id: string | null
          signature_token: string
          signed_at: string | null
          status: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_id: string
          expires_at?: string | null
          id?: string
          last_reminder_sent_at?: string | null
          message?: string | null
          organization_id: string
          recipient_email: string
          recipient_id?: string | null
          recipient_name: string
          recipient_type: string
          reminder_count?: number | null
          reminder_frequency?: string | null
          requester_id: string
          requires_notarization?: boolean | null
          signature_id?: string | null
          signature_token: string
          signed_at?: string | null
          status?: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string
          expires_at?: string | null
          id?: string
          last_reminder_sent_at?: string | null
          message?: string | null
          organization_id?: string
          recipient_email?: string
          recipient_id?: string | null
          recipient_name?: string
          recipient_type?: string
          reminder_count?: number | null
          reminder_frequency?: string | null
          requester_id?: string
          requires_notarization?: boolean | null
          signature_id?: string | null
          signature_token?: string
          signed_at?: string | null
          status?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_requests_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_requests_signature_id_fkey"
            columns: ["signature_id"]
            isOneToOne: false
            referencedRelation: "document_signatures"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          address: string | null
          city: string | null
          code: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_headquarters: boolean | null
          latitude: number | null
          longitude: number | null
          metadata: Json | null
          name: string
          organization_id: string
          phone: string | null
          postal_code: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_headquarters?: boolean | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          name: string
          organization_id: string
          phone?: string | null
          postal_code?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_headquarters?: boolean | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          name?: string
          organization_id?: string
          phone?: string | null
          postal_code?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_configurations: {
        Row: {
          attribute_mapping: Json | null
          auto_provisioning: boolean | null
          created_at: string
          created_by: string | null
          default_role: string | null
          domain: string | null
          id: string
          is_active: boolean | null
          is_test_mode: boolean | null
          last_sync_at: string | null
          metadata: Json | null
          name: string
          oauth_authorization_url: string | null
          oauth_client_id: string | null
          oauth_client_secret: string | null
          oauth_scopes: string[] | null
          oauth_token_url: string | null
          oauth_userinfo_url: string | null
          organization_id: string
          provider: string
          saml_certificate: string | null
          saml_entity_id: string | null
          saml_metadata_url: string | null
          saml_sso_url: string | null
          updated_at: string
        }
        Insert: {
          attribute_mapping?: Json | null
          auto_provisioning?: boolean | null
          created_at?: string
          created_by?: string | null
          default_role?: string | null
          domain?: string | null
          id?: string
          is_active?: boolean | null
          is_test_mode?: boolean | null
          last_sync_at?: string | null
          metadata?: Json | null
          name: string
          oauth_authorization_url?: string | null
          oauth_client_id?: string | null
          oauth_client_secret?: string | null
          oauth_scopes?: string[] | null
          oauth_token_url?: string | null
          oauth_userinfo_url?: string | null
          organization_id: string
          provider: string
          saml_certificate?: string | null
          saml_entity_id?: string | null
          saml_metadata_url?: string | null
          saml_sso_url?: string | null
          updated_at?: string
        }
        Update: {
          attribute_mapping?: Json | null
          auto_provisioning?: boolean | null
          created_at?: string
          created_by?: string | null
          default_role?: string | null
          domain?: string | null
          id?: string
          is_active?: boolean | null
          is_test_mode?: boolean | null
          last_sync_at?: string | null
          metadata?: Json | null
          name?: string
          oauth_authorization_url?: string | null
          oauth_client_id?: string | null
          oauth_client_secret?: string | null
          oauth_scopes?: string[] | null
          oauth_token_url?: string | null
          oauth_userinfo_url?: string | null
          organization_id?: string
          provider?: string
          saml_certificate?: string | null
          saml_entity_id?: string | null
          saml_metadata_url?: string | null
          saml_sso_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sso_configurations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_login_logs: {
        Row: {
          created_at: string
          error_message: string | null
          external_user_id: string | null
          id: string
          ip_address: unknown
          sso_config_id: string
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          external_user_id?: string | null
          id?: string
          ip_address?: unknown
          sso_config_id: string
          success: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          external_user_id?: string | null
          id?: string
          ip_address?: unknown
          sso_config_id?: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sso_login_logs_sso_config_id_fkey"
            columns: ["sso_config_id"]
            isOneToOne: false
            referencedRelation: "sso_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_user_mappings: {
        Row: {
          created_at: string
          external_attributes: Json | null
          external_email: string
          external_user_id: string
          id: string
          last_synced_at: string
          sso_config_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          external_attributes?: Json | null
          external_email: string
          external_user_id: string
          id?: string
          last_synced_at?: string
          sso_config_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          external_attributes?: Json | null
          external_email?: string
          external_user_id?: string
          id?: string
          last_synced_at?: string
          sso_config_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sso_user_mappings_sso_config_id_fkey"
            columns: ["sso_config_id"]
            isOneToOne: false
            referencedRelation: "sso_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      student_features: {
        Row: {
          calculated_at: string
          feature_id: string
          feature_value: number | null
          feature_value_text: string | null
          formation_id: string | null
          id: string
          session_id: string | null
          student_id: string
          valid_until: string | null
        }
        Insert: {
          calculated_at?: string
          feature_id: string
          feature_value?: number | null
          feature_value_text?: string | null
          formation_id?: string | null
          id?: string
          session_id?: string | null
          student_id: string
          valid_until?: string | null
        }
        Update: {
          calculated_at?: string
          feature_id?: string
          feature_value?: number | null
          feature_value_text?: string | null
          formation_id?: string | null
          id?: string
          session_id?: string | null
          student_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_features_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "prediction_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_features_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_features_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_guardians: {
        Row: {
          created_at: string | null
          guardian_id: string | null
          id: string
          is_primary: boolean | null
          student_id: string | null
        }
        Insert: {
          created_at?: string | null
          guardian_id?: string | null
          id?: string
          is_primary?: boolean | null
          student_id?: string | null
        }
        Update: {
          created_at?: string | null
          guardian_id?: string | null
          id?: string
          is_primary?: boolean | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_guardians_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardians_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          city: string | null
          class_id: string | null
          country: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          enrollment_date: string | null
          first_name: string
          gender: string | null
          id: string
          last_name: string
          organization_id: string | null
          phone: string | null
          photo_url: string | null
          postal_code: string | null
          status: string | null
          student_number: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          class_id?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          enrollment_date?: string | null
          first_name: string
          gender?: string | null
          id?: string
          last_name: string
          organization_id?: string | null
          phone?: string | null
          photo_url?: string | null
          postal_code?: string | null
          status?: string | null
          student_number: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          class_id?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          enrollment_date?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string
          organization_id?: string | null
          phone?: string | null
          photo_url?: string | null
          postal_code?: string | null
          status?: string | null
          student_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_statistics: {
        Row: {
          academic_year_id: string | null
          assessment_type: string | null
          calculated_at: string
          id: string
          max_score: number | null
          mean_score: number | null
          median_score: number | null
          min_score: number | null
          mode_score: number | null
          organization_id: string
          pass_rate: number | null
          q1_score: number | null
          q3_score: number | null
          session_id: string | null
          std_deviation: number | null
          subject: string
          term_period: string | null
          total_students: number | null
        }
        Insert: {
          academic_year_id?: string | null
          assessment_type?: string | null
          calculated_at?: string
          id?: string
          max_score?: number | null
          mean_score?: number | null
          median_score?: number | null
          min_score?: number | null
          mode_score?: number | null
          organization_id: string
          pass_rate?: number | null
          q1_score?: number | null
          q3_score?: number | null
          session_id?: string | null
          std_deviation?: number | null
          subject: string
          term_period?: string | null
          total_students?: number | null
        }
        Update: {
          academic_year_id?: string | null
          assessment_type?: string | null
          calculated_at?: string
          id?: string
          max_score?: number | null
          mean_score?: number | null
          median_score?: number | null
          min_score?: number | null
          mode_score?: number | null
          organization_id?: string
          pass_rate?: number | null
          q1_score?: number | null
          q3_score?: number | null
          session_id?: string | null
          std_deviation?: number | null
          subject?: string
          term_period?: string | null
          total_students?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_statistics_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_statistics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_statistics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      success_rate_predictions: {
        Row: {
          actual_grade: number | null
          actual_success_rate: number | null
          confidence_level: number | null
          expires_at: string | null
          formation_id: string | null
          id: string
          input_features: Json | null
          model_id: string | null
          organization_id: string
          predicted_grade: number | null
          predicted_success_rate: number
          prediction_date: string
          risk_category: string | null
          risk_factors: Json | null
          session_id: string | null
          student_id: string | null
          validated_at: string | null
          was_accurate: boolean | null
        }
        Insert: {
          actual_grade?: number | null
          actual_success_rate?: number | null
          confidence_level?: number | null
          expires_at?: string | null
          formation_id?: string | null
          id?: string
          input_features?: Json | null
          model_id?: string | null
          organization_id: string
          predicted_grade?: number | null
          predicted_success_rate: number
          prediction_date?: string
          risk_category?: string | null
          risk_factors?: Json | null
          session_id?: string | null
          student_id?: string | null
          validated_at?: string | null
          was_accurate?: boolean | null
        }
        Update: {
          actual_grade?: number | null
          actual_success_rate?: number | null
          confidence_level?: number | null
          expires_at?: string | null
          formation_id?: string | null
          id?: string
          input_features?: Json | null
          model_id?: string | null
          organization_id?: string
          predicted_grade?: number | null
          predicted_success_rate?: number
          prediction_date?: string
          risk_category?: string | null
          risk_factors?: Json | null
          session_id?: string | null
          student_id?: string | null
          validated_at?: string | null
          was_accurate?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "success_rate_predictions_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "success_rate_predictions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "predictive_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "success_rate_predictions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "success_rate_predictions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      support_auto_assignment_rules: {
        Row: {
          assign_to_role: string | null
          assign_to_user_id: string | null
          category_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          order_index: number | null
          organization_id: string
          priority: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          assign_to_role?: string | null
          assign_to_user_id?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          order_index?: number | null
          organization_id: string
          priority?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          assign_to_role?: string | null
          assign_to_user_id?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          order_index?: number | null
          organization_id?: string
          priority?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_auto_assignment_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "support_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_auto_assignment_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          order_index: number | null
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_index?: number | null
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_index?: number | null
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_response_templates: {
        Row: {
          category_id: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          subject: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          subject?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          subject?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_response_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "support_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_response_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string
          id: string
          is_internal: boolean | null
          is_read: boolean | null
          message_type: string | null
          read_at: string | null
          ticket_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          is_read?: boolean | null
          message_type?: string | null
          read_at?: string | null
          ticket_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          is_read?: boolean | null
          message_type?: string | null
          read_at?: string | null
          ticket_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          is_private: boolean | null
          ticket_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_private?: boolean | null
          ticket_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_private?: boolean | null
          ticket_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_notes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number | null
          ticket_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number | null
          ticket_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number | null
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_ratings_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          category_id: string | null
          closed_at: string | null
          created_at: string
          description: string
          first_response_at: string | null
          id: string
          metadata: Json | null
          organization_id: string
          priority: string | null
          resolved_at: string | null
          status: string | null
          subject: string
          tags: string[] | null
          ticket_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          category_id?: string | null
          closed_at?: string | null
          created_at?: string
          description: string
          first_response_at?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject: string
          tags?: string[] | null
          ticket_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          category_id?: string | null
          closed_at?: string | null
          created_at?: string
          description?: string
          first_response_at?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string
          tags?: string[] | null
          ticket_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "support_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          bio: string | null
          created_at: string
          employee_number: string | null
          hire_date: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          specialization: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          employee_number?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          specialization?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          employee_number?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          specialization?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      template_activity_log: {
        Row: {
          action_details: Json | null
          action_type: string
          changes: Json | null
          created_at: string | null
          id: string
          template_id: string
          user_id: string
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          template_id: string
          user_id: string
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_activity_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      template_approvals: {
        Row: {
          approved_at: string | null
          approver_id: string
          comment: string | null
          created_at: string | null
          id: string
          status: string
          template_id: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approver_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          status?: string
          template_id: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approver_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          status?: string
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_approvals_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_archives: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          archived_content: Json
          archived_version_number: number
          created_at: string | null
          id: string
          is_permanent: boolean | null
          retention_until: string | null
          storage_location: string | null
          template_id: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          archived_content: Json
          archived_version_number: number
          created_at?: string | null
          id?: string
          is_permanent?: boolean | null
          retention_until?: string | null
          storage_location?: string | null
          template_id: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          archived_content?: Json
          archived_version_number?: number
          created_at?: string | null
          id?: string
          is_permanent?: boolean | null
          retention_until?: string | null
          storage_location?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_archives_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_archives_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_audit_log: {
        Row: {
          action: string
          action_details: Json | null
          after_state: Json | null
          before_state: Json | null
          created_at: string | null
          id: string
          ip_address: string | null
          resource_id: string
          resource_type: string | null
          session_id: string | null
          template_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          action_details?: Json | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          resource_id: string
          resource_type?: string | null
          session_id?: string | null
          template_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          action_details?: Json | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          resource_id?: string
          resource_type?: string | null
          session_id?: string | null
          template_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_audit_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      template_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          parent_comment_id: string | null
          position: Json | null
          resolved: boolean | null
          template_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          parent_comment_id?: string | null
          position?: Json | null
          resolved?: boolean | null
          template_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          parent_comment_id?: string | null
          position?: Json | null
          resolved?: boolean | null
          template_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "template_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_comments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      template_encryption: {
        Row: {
          created_at: string | null
          encrypted_at: string | null
          encrypted_content: Json | null
          encryption_algorithm: string
          encryption_key_id: string
          id: string
          is_encrypted: boolean | null
          template_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          encrypted_at?: string | null
          encrypted_content?: Json | null
          encryption_algorithm?: string
          encryption_key_id: string
          id?: string
          is_encrypted?: boolean | null
          template_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          encrypted_at?: string | null
          encrypted_content?: Json | null
          encryption_algorithm?: string
          encryption_key_id?: string
          id?: string
          is_encrypted?: boolean | null
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_encryption_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: true
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_external_data_links: {
        Row: {
          cache_key_template: string | null
          created_at: string | null
          data_source_id: string
          execution_order: number | null
          id: string
          is_required: boolean | null
          template_id: string
          variable_mapping: Json
        }
        Insert: {
          cache_key_template?: string | null
          created_at?: string | null
          data_source_id: string
          execution_order?: number | null
          id?: string
          is_required?: boolean | null
          template_id: string
          variable_mapping: Json
        }
        Update: {
          cache_key_template?: string | null
          created_at?: string | null
          data_source_id?: string
          execution_order?: number | null
          id?: string
          is_required?: boolean | null
          template_id?: string
          variable_mapping?: Json
        }
        Relationships: [
          {
            foreignKeyName: "template_external_data_links_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "external_data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_external_data_links_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_gdpr_compliance: {
        Row: {
          consent_obtained_at: string | null
          consent_required: boolean | null
          contains_personal_data: boolean | null
          created_at: string | null
          data_categories: string[] | null
          data_processing_purposes: string[] | null
          data_subject_rights: Json | null
          id: string
          legal_basis: string | null
          retention_period_days: number | null
          template_id: string
          third_parties: string[] | null
          third_party_sharing: boolean | null
          updated_at: string | null
        }
        Insert: {
          consent_obtained_at?: string | null
          consent_required?: boolean | null
          contains_personal_data?: boolean | null
          created_at?: string | null
          data_categories?: string[] | null
          data_processing_purposes?: string[] | null
          data_subject_rights?: Json | null
          id?: string
          legal_basis?: string | null
          retention_period_days?: number | null
          template_id: string
          third_parties?: string[] | null
          third_party_sharing?: boolean | null
          updated_at?: string | null
        }
        Update: {
          consent_obtained_at?: string | null
          consent_required?: boolean | null
          contains_personal_data?: boolean | null
          created_at?: string | null
          data_categories?: string[] | null
          data_processing_purposes?: string[] | null
          data_subject_rights?: Json | null
          id?: string
          legal_basis?: string | null
          retention_period_days?: number | null
          template_id?: string
          third_parties?: string[] | null
          third_party_sharing?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_gdpr_compliance_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: true
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_library: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          download_count: number | null
          featured: boolean | null
          id: string
          organization_id: string
          preview_image_url: string | null
          rating_average: number | null
          rating_count: number | null
          tags: string[] | null
          template_id: string
          updated_at: string | null
          visibility: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          featured?: boolean | null
          id?: string
          organization_id: string
          preview_image_url?: string | null
          rating_average?: number | null
          rating_count?: number | null
          tags?: string[] | null
          template_id: string
          updated_at?: string | null
          visibility?: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          featured?: boolean | null
          id?: string
          organization_id?: string
          preview_image_url?: string | null
          rating_average?: number | null
          rating_count?: number | null
          tags?: string[] | null
          template_id?: string
          updated_at?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_library_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_library_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: true
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_library_downloads: {
        Row: {
          downloaded_at: string | null
          downloaded_by_organization_id: string
          downloaded_by_user_id: string | null
          id: string
          library_template_id: string
        }
        Insert: {
          downloaded_at?: string | null
          downloaded_by_organization_id: string
          downloaded_by_user_id?: string | null
          id?: string
          library_template_id: string
        }
        Update: {
          downloaded_at?: string | null
          downloaded_by_organization_id?: string
          downloaded_by_user_id?: string | null
          id?: string
          library_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_library_downloads_downloaded_by_organization_id_fkey"
            columns: ["downloaded_by_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_library_downloads_downloaded_by_user_id_fkey"
            columns: ["downloaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_library_downloads_library_template_id_fkey"
            columns: ["library_template_id"]
            isOneToOne: false
            referencedRelation: "template_library"
            referencedColumns: ["id"]
          },
        ]
      }
      template_library_ratings: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          library_template_id: string
          rated_by_organization_id: string
          rated_by_user_id: string | null
          rating: number
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          library_template_id: string
          rated_by_organization_id: string
          rated_by_user_id?: string | null
          rating: number
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          library_template_id?: string
          rated_by_organization_id?: string
          rated_by_user_id?: string | null
          rating?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_library_ratings_library_template_id_fkey"
            columns: ["library_template_id"]
            isOneToOne: false
            referencedRelation: "template_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_library_ratings_rated_by_organization_id_fkey"
            columns: ["rated_by_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_library_ratings_rated_by_user_id_fkey"
            columns: ["rated_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      template_notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          notification_type: string
          read: boolean | null
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          notification_type: string
          read?: boolean | null
          template_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          notification_type?: string
          read?: boolean | null
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_notifications_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      template_organization_shares: {
        Row: {
          created_at: string | null
          id: string
          permission: string
          shared_by_organization_id: string
          shared_with_organization_id: string
          template_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission?: string
          shared_by_organization_id: string
          shared_with_organization_id: string
          template_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          permission?: string
          shared_by_organization_id?: string
          shared_with_organization_id?: string
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_organization_shares_shared_by_organization_id_fkey"
            columns: ["shared_by_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_organization_shares_shared_with_organization_id_fkey"
            columns: ["shared_with_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_organization_shares_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_permissions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          granted_at: string | null
          granted_by: string
          id: string
          permission_type: string
          role: string | null
          template_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by: string
          id?: string
          permission_type: string
          role?: string | null
          template_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string
          id?: string
          permission_type?: string
          role?: string | null
          template_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_permissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      template_shares: {
        Row: {
          created_at: string | null
          id: string
          permission: string
          shared_by_user_id: string
          shared_with_user_id: string
          template_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission?: string
          shared_by_user_id: string
          shared_with_user_id: string
          template_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          permission?: string
          shared_by_user_id?: string
          shared_with_user_id?: string
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_shares_shared_by_user_id_fkey"
            columns: ["shared_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_shares_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_shares_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_approved: boolean | null
          parent_id: string | null
          timestamp_seconds: number | null
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_approved?: boolean | null
          parent_id?: string | null
          timestamp_seconds?: number | null
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_approved?: boolean | null
          parent_id?: string | null
          timestamp_seconds?: number | null
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tutorial_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutorial_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "tutorial_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_favorites: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_favorites_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "tutorial_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_modules: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          order_index: number | null
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_index?: number | null
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_index?: number | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      tutorial_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          timestamp_seconds: number | null
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          timestamp_seconds?: number | null
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          timestamp_seconds?: number | null
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_notes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "tutorial_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_playlist_videos: {
        Row: {
          added_at: string
          id: string
          order_index: number | null
          playlist_id: string
          video_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          order_index?: number | null
          playlist_id: string
          video_id: string
        }
        Update: {
          added_at?: string
          id?: string
          order_index?: number | null
          playlist_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_playlist_videos_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "tutorial_playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutorial_playlist_videos_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "tutorial_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_playlists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          updated_at: string
          user_id: string
          video_count: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string
          user_id: string
          video_count?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
          video_count?: number | null
        }
        Relationships: []
      }
      tutorial_progress: {
        Row: {
          completed_at: string | null
          completion_percentage: number | null
          id: string
          is_completed: boolean | null
          last_watched_at: string
          started_at: string
          user_id: string
          video_id: string
          watched_seconds: number | null
        }
        Insert: {
          completed_at?: string | null
          completion_percentage?: number | null
          id?: string
          is_completed?: boolean | null
          last_watched_at?: string
          started_at?: string
          user_id: string
          video_id: string
          watched_seconds?: number | null
        }
        Update: {
          completed_at?: string | null
          completion_percentage?: number | null
          id?: string
          is_completed?: boolean | null
          last_watched_at?: string
          started_at?: string
          user_id?: string
          video_id?: string
          watched_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "tutorial_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_videos: {
        Row: {
          completion_count: number | null
          created_at: string
          description: string | null
          difficulty_level: string | null
          duration_seconds: number | null
          id: string
          is_published: boolean | null
          module_id: string
          order_index: number | null
          published_at: string | null
          slug: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_type: string | null
          video_url: string
          view_count: number | null
        }
        Insert: {
          completion_count?: number | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          duration_seconds?: number | null
          id?: string
          is_published?: boolean | null
          module_id: string
          order_index?: number | null
          published_at?: string | null
          slug: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_type?: string | null
          video_url: string
          view_count?: number | null
        }
        Update: {
          completion_count?: number | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          duration_seconds?: number | null
          id?: string
          is_published?: boolean | null
          module_id?: string
          order_index?: number | null
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_type?: string | null
          video_url?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_videos_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "tutorial_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_2fa: {
        Row: {
          backup_codes: string[] | null
          created_at: string
          id: string
          is_enabled: boolean | null
          is_verified: boolean | null
          last_used_at: string | null
          method: string | null
          phone_number: string | null
          secret: string
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          is_verified?: boolean | null
          last_used_at?: string | null
          method?: string | null
          phone_number?: string | null
          secret: string
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          is_verified?: boolean | null
          last_used_at?: string | null
          method?: string | null
          phone_number?: string | null
          secret?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_2fa_attempts: {
        Row: {
          code: string
          created_at: string
          id: string
          ip_address: unknown
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          ip_address?: unknown
          success: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_2fa_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: unknown
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_calendar_preferences: {
        Row: {
          created_at: string
          day_end_hour: number | null
          day_start_hour: number | null
          default_reminder_minutes: number | null
          default_view: string | null
          id: string
          show_weekends: boolean | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_end_hour?: number | null
          day_start_hour?: number | null
          default_reminder_minutes?: number | null
          default_view?: string | null
          id?: string
          show_weekends?: boolean | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_end_hour?: number | null
          day_start_hour?: number | null
          default_reminder_minutes?: number | null
          default_view?: string | null
          id?: string
          show_weekends?: boolean | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          granted: boolean
          granted_at: string
          granted_by: string | null
          id: string
          organization_id: string
          permission_id: string
          user_id: string
        }
        Insert: {
          granted?: boolean
          granted_at?: string
          granted_by?: string | null
          id?: string
          organization_id: string
          permission_id: string
          user_id: string
        }
        Update: {
          granted?: boolean
          granted_at?: string
          granted_by?: string | null
          id?: string
          organization_id?: string
          permission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          expires_at: string | null
          id: string
          organization_id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          expires_at?: string | null
          id?: string
          organization_id: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          expires_at?: string | null
          id?: string
          organization_id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_session_history: {
        Row: {
          action: string
          created_at: string
          device_name: string | null
          device_type: string | null
          id: string
          ip_address: unknown
          reason: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          device_name?: string | null
          device_type?: string | null
          id?: string
          ip_address?: unknown
          reason?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          device_name?: string | null
          device_type?: string | null
          id?: string
          ip_address?: unknown
          reason?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_session_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          device_id: string | null
          device_name: string | null
          device_type: string | null
          expires_at: string
          id: string
          ip_address: unknown
          is_active: boolean | null
          is_current: boolean | null
          last_activity_at: string
          metadata: Json | null
          refresh_token: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          device_id?: string | null
          device_name?: string | null
          device_type?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          is_current?: boolean | null
          last_activity_at?: string
          metadata?: Json | null
          refresh_token?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          device_id?: string | null
          device_name?: string | null
          device_type?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          is_current?: boolean | null
          last_activity_at?: string
          metadata?: Json | null
          refresh_token?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          last_login_at: string | null
          organization_id: string | null
          permissions: Json | null
          phone: string | null
          role: string
          theme_preference: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean | null
          last_login_at?: string | null
          organization_id?: string | null
          permissions?: Json | null
          phone?: string | null
          role: string
          theme_preference?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          organization_id?: string | null
          permissions?: Json | null
          phone?: string | null
          role?: string
          theme_preference?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      verified_devices: {
        Row: {
          created_at: string
          device_id: string
          device_name: string
          device_type: string | null
          id: string
          ip_address: unknown
          is_trusted: boolean | null
          last_used_at: string
          user_agent: string | null
          user_id: string
          verified_at: string
        }
        Insert: {
          created_at?: string
          device_id: string
          device_name: string
          device_type?: string | null
          id?: string
          ip_address?: unknown
          is_trusted?: boolean | null
          last_used_at?: string
          user_agent?: string | null
          user_id: string
          verified_at?: string
        }
        Update: {
          created_at?: string
          device_id?: string
          device_name?: string
          device_type?: string | null
          id?: string
          ip_address?: unknown
          is_trusted?: boolean | null
          last_used_at?: string
          user_agent?: string | null
          user_id?: string
          verified_at?: string
        }
        Relationships: []
      }
      videoconference_integrations: {
        Row: {
          access_token: string | null
          account_id: string | null
          api_key: string | null
          api_secret: string | null
          auto_create_meetings: boolean | null
          auto_send_invites: boolean | null
          client_id: string | null
          client_secret: string | null
          created_at: string
          created_by: string | null
          default_meeting_settings: Json | null
          id: string
          include_students: boolean | null
          include_teachers: boolean | null
          is_active: boolean | null
          is_test_mode: boolean | null
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          metadata: Json | null
          organization_id: string
          provider: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          api_key?: string | null
          api_secret?: string | null
          auto_create_meetings?: boolean | null
          auto_send_invites?: boolean | null
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          created_by?: string | null
          default_meeting_settings?: Json | null
          id?: string
          include_students?: boolean | null
          include_teachers?: boolean | null
          is_active?: boolean | null
          is_test_mode?: boolean | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          metadata?: Json | null
          organization_id: string
          provider: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          api_key?: string | null
          api_secret?: string | null
          auto_create_meetings?: boolean | null
          auto_send_invites?: boolean | null
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          created_by?: string | null
          default_meeting_settings?: Json | null
          id?: string
          include_students?: boolean | null
          include_teachers?: boolean | null
          is_active?: boolean | null
          is_test_mode?: boolean | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          metadata?: Json | null
          organization_id?: string
          provider?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "videoconference_integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      videoconference_meeting_logs: {
        Row: {
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          id: string
          integration_id: string
          meeting_data: Json | null
          meeting_mapping_id: string
          participant_count: number | null
          recording_url: string | null
          session_id: string
          started_at: string | null
          transcript_url: string | null
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          integration_id: string
          meeting_data?: Json | null
          meeting_mapping_id: string
          participant_count?: number | null
          recording_url?: string | null
          session_id: string
          started_at?: string | null
          transcript_url?: string | null
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          integration_id?: string
          meeting_data?: Json | null
          meeting_mapping_id?: string
          participant_count?: number | null
          recording_url?: string | null
          session_id?: string
          started_at?: string | null
          transcript_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videoconference_meeting_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "videoconference_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videoconference_meeting_logs_meeting_mapping_id_fkey"
            columns: ["meeting_mapping_id"]
            isOneToOne: false
            referencedRelation: "videoconference_meeting_mappings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videoconference_meeting_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      videoconference_meeting_mappings: {
        Row: {
          created_at: string
          external_meeting_data: Json | null
          external_meeting_id: string
          id: string
          integration_id: string
          join_url: string | null
          last_synced_at: string
          meeting_password: string | null
          meeting_url: string | null
          session_id: string
          start_url: string | null
          status: string | null
          sync_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_meeting_data?: Json | null
          external_meeting_id: string
          id?: string
          integration_id: string
          join_url?: string | null
          last_synced_at?: string
          meeting_password?: string | null
          meeting_url?: string | null
          session_id: string
          start_url?: string | null
          status?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_meeting_data?: Json | null
          external_meeting_id?: string
          id?: string
          integration_id?: string
          join_url?: string | null
          last_synced_at?: string
          meeting_password?: string | null
          meeting_url?: string | null
          session_id?: string
          start_url?: string | null
          status?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "videoconference_meeting_mappings_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "videoconference_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videoconference_meeting_mappings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_old_template_versions: { Args: never; Returns: undefined }
      auto_correct_evaluation_responses: {
        Args: { p_instance_id: string }
        Returns: number
      }
      calculate_accessibility_compliance_rate: {
        Args: { org_id: string }
        Returns: number
      }
      calculate_bpf_metrics: {
        Args: { org_id: string; year_val: number }
        Returns: Json
      }
      calculate_cashflow: {
        Args: {
          p_end_date: string
          p_organization_id: string
          p_start_date: string
        }
        Returns: {
          cashflow: number
          cumulative_cashflow: number
          expenses: number
          period_date: string
          revenue: number
        }[]
      }
      calculate_evaluation_score: {
        Args: { p_instance_id: string }
        Returns: {
          correct_count: number
          max_score: number
          percentage: number
          total_questions: number
          total_score: number
        }[]
      }
      calculate_qualiopi_compliance_rate: {
        Args: { org_id: string }
        Returns: number
      }
      calculate_recommendation_priority: {
        Args: { p_confidence: number; p_impact: number; p_urgency: number }
        Returns: number
      }
      calculate_revenue_forecast: {
        Args: { p_months_ahead?: number; p_organization_id: string }
        Returns: {
          confidence_level: number
          forecast_month: string
          forecasted_revenue: number
        }[]
      }
      calculate_risk_category: { Args: { p_score: number }; Returns: string }
      calculate_risk_level: {
        Args: { impact_val: string; likelihood_val: string }
        Returns: string
      }
      calculate_session_charges_total: {
        Args: { p_session_id: string }
        Returns: {
          charge_count: number
          paid_amount: number
          pending_amount: number
          total_amount: number
        }[]
      }
      calculate_subject_statistics: {
        Args: {
          p_academic_year_id?: string
          p_assessment_type?: string
          p_organization_id: string
          p_session_id?: string
          p_subject: string
          p_term_period?: string
        }
        Returns: {
          max_score: number
          mean_score: number
          median_score: number
          min_score: number
          mode_score: number
          pass_rate: number
          q1_score: number
          q3_score: number
          std_deviation: number
          total_students: number
        }[]
      }
      can_learner_access_certificate_via_email: {
        Args: { p_certificate_student_id: string; p_learner_student_id: string }
        Returns: boolean
      }
      can_learner_access_course: {
        Args: { p_course_id: string }
        Returns: boolean
      }
      can_learner_access_formation: {
        Args: { p_formation_id: string }
        Returns: boolean
      }
      can_learner_access_lesson: {
        Args: { p_lesson_id: string }
        Returns: boolean
      }
      can_learner_access_program: {
        Args: { p_program_id: string }
        Returns: boolean
      }
      can_learner_access_quiz: { Args: { p_quiz_id: string }; Returns: boolean }
      cleanup_expired_2fa_sessions: { Args: never; Returns: undefined }
      cleanup_expired_archives: { Args: never; Returns: undefined }
      cleanup_expired_external_data_cache: { Args: never; Returns: undefined }
      cleanup_expired_qr_codes: { Args: never; Returns: undefined }
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      create_default_email_templates_for_organization: {
        Args: { org_id: string }
        Returns: undefined
      }
      create_organization_for_user: {
        Args: {
          org_code: string
          org_country?: string
          org_currency?: string
          org_language?: string
          org_name: string
          org_timezone?: string
          org_type?: string
          user_id?: string
        }
        Returns: string
      }
      create_todo_reminder_notification: {
        Args: { todo_id: string }
        Returns: string
      }
      expire_attendance_requests: { Args: never; Returns: undefined }
      expire_signature_requests: { Args: never; Returns: undefined }
      extract_template_variables: {
        Args: { template_content: string }
        Returns: string[]
      }
      generate_2fa_backup_codes: { Args: { count?: number }; Returns: string[] }
      generate_bulk_learner_access_tokens: {
        Args: {
          p_expires_in_days?: number
          p_max_uses?: number
          p_session_id: string
        }
        Returns: {
          access_url: string
          student_id: string
          student_name: string
          token: string
        }[]
      }
      generate_certificate_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: { org_id: string }; Returns: string }
      generate_learner_access_token: {
        Args: {
          p_expires_in_days?: number
          p_max_uses?: number
          p_session_id?: string
          p_student_id: string
        }
        Returns: {
          access_url: string
          expires_at: string
          token: string
        }[]
      }
      generate_monthly_bpf_snapshot: {
        Args: { month_date: string; org_id: string }
        Returns: undefined
      }
      generate_report_card: {
        Args: {
          p_academic_year_id?: string
          p_session_id: string
          p_student_id: string
          p_term_period: string
        }
        Returns: string
      }
      generate_student_number: {
        Args: { acad_year: string; org_id: string }
        Returns: string
      }
      generate_ticket_number: { Args: never; Returns: string }
      get_calendar_events: {
        Args: {
          p_end_date: string
          p_organization_id: string
          p_start_date: string
          p_user_id?: string
        }
        Returns: {
          all_day: boolean
          category: string
          color: string
          description: string
          end_date: string
          end_time: string
          event_id: string
          event_type: string
          linked_id: string
          priority: string
          start_date: string
          start_time: string
          status: string
          title: string
        }[]
      }
      get_invoices_needing_reminders: {
        Args: { p_organization_id?: string }
        Returns: {
          currency: string
          days_overdue: number
          days_until_due: number
          due_date: string
          guardian_email: string
          guardian_phone: string
          invoice_id: string
          invoice_number: string
          organization_id: string
          status: string
          student_email: string
          student_id: string
          student_phone: string
          total_amount: number
        }[]
      }
      get_learner_student: { Args: { p_student_id: string }; Returns: Json }
      get_learner_student_id: { Args: never; Returns: string }
      get_next_version_number: {
        Args: { p_template_id: string }
        Returns: number
      }
      get_student_active_accommodations: {
        Args: { student_id_param: string }
        Returns: {
          accommodation_id: string
          accommodation_type: string
          category: string
          completion_rate: number
          end_date: string
          start_date: string
          status: string
          title: string
        }[]
      }
      get_student_documents: {
        Args: { student_id_param: string }
        Returns: {
          document_type: string
          file_path: string
          generated_at: string
          id: string
          signed_at: string
          status: string
          title: string
        }[]
      }
      get_unread_notifications_count: { Args: never; Returns: number }
      get_user_name: { Args: { p_user_id: string }; Returns: Json }
      get_user_organization_id: { Args: never; Returns: string }
      get_user_permissions: {
        Args: { p_organization_id: string; p_user_id: string }
        Returns: {
          category: string
          permission_code: string
          permission_name: string
          source: string
        }[]
      }
      get_user_role: { Args: never; Returns: string }
      has_reminder_been_sent: {
        Args: {
          p_days_offset: number
          p_invoice_id: string
          p_method: string
          p_reminder_type: string
        }
        Returns: boolean
      }
      increment_faq_view_count: {
        Args: { faq_uuid: string }
        Returns: undefined
      }
      increment_guide_view_count: {
        Args: { guide_uuid: string }
        Returns: undefined
      }
      init_default_charge_categories: {
        Args: { p_organization_id: string }
        Returns: undefined
      }
      insert_default_email_template_if_not_exists: {
        Args: {
          p_body_html: string
          p_body_text: string
          p_description: string
          p_email_type: string
          p_name: string
          p_org_id: string
          p_subject: string
        }
        Returns: undefined
      }
      insert_student_message: {
        Args: {
          p_content: string
          p_conversation_id: string
          p_student_id: string
        }
        Returns: Json
      }
      is_conversation_participant: {
        Args: {
          p_conversation_id: string
          p_student_id?: string
          p_user_id?: string
        }
        Returns: boolean
      }
      is_related_entity_student: {
        Args: { p_related_entity_id: string; p_student_id: string }
        Returns: boolean
      }
      is_student_conversation_participant: {
        Args: { p_conversation_id: string; p_student_id: string }
        Returns: boolean
      }
      is_student_enrolled_in_session: {
        Args: { p_session_id: string; p_student_id: string }
        Returns: boolean
      }
      learner_organization_id: { Args: never; Returns: string }
      learner_student_id: { Args: never; Returns: string }
      replace_template_variables: {
        Args: { template_content: string; variable_data: Json }
        Returns: string
      }
      revoke_learner_access_token: {
        Args: { p_token: string }
        Returns: boolean
      }
      sync_user_from_auth: { Args: { user_id: string }; Returns: Json }
      sync_user_on_create: { Args: { user_id: string }; Returns: Json }
      user_has_permission: {
        Args: {
          p_organization_id: string
          p_permission_code: string
          p_user_id: string
        }
        Returns: boolean
      }
      user_organization_id: { Args: never; Returns: string }
      validate_learner_access_token: {
        Args: { p_token: string }
        Returns: {
          error_message: string
          is_valid: boolean
          organization_id: string
          session_id: string
          student_email: string
          student_first_name: string
          student_id: string
          student_last_name: string
        }[]
      }
    }
    Enums: {
      document_type:
        | "convention"
        | "facture"
        | "devis"
        | "convocation"
        | "contrat"
        | "attestation_reussite"
        | "certificat_scolarite"
        | "releve_notes"
        | "attestation_entree"
        | "reglement_interieur"
        | "cgv"
        | "programme"
        | "attestation_assiduite"
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
      document_type: [
        "convention",
        "facture",
        "devis",
        "convocation",
        "contrat",
        "attestation_reussite",
        "certificat_scolarite",
        "releve_notes",
        "attestation_entree",
        "reglement_interieur",
        "cgv",
        "programme",
        "attestation_assiduite",
      ],
    },
  },
} as const
