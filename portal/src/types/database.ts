export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      maf_projects: {
        Row: {
          id: string
          name: string
          path: string
          description: string | null
          status: 'active' | 'paused' | 'completed' | 'archived'
          current_wave: number | null
          config: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          path: string
          description?: string | null
          status?: 'active' | 'paused' | 'completed' | 'archived'
          current_wave?: number | null
          config?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          path?: string
          description?: string | null
          status?: 'active' | 'paused' | 'completed' | 'archived'
          current_wave?: number | null
          config?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      maf_stories: {
        Row: {
          id: string
          pipeline_id: string | null
          wave_number: number
          story_id: string
          title: string
          status: string
          gate: number
          agent_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pipeline_id?: string | null
          wave_number: number
          story_id: string
          title: string
          status?: string
          gate?: number
          agent_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pipeline_id?: string | null
          wave_number?: number
          story_id?: string
          title?: string
          status?: string
          gate?: number
          agent_type?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      maf_waves: {
        Row: {
          id: string
          project_id: string
          wave_number: number
          status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused'
          current_gate: number
          started_at: string | null
          completed_at: string | null
          config: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          wave_number: number
          status?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused'
          current_gate?: number
          started_at?: string | null
          completed_at?: string | null
          config?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          wave_number?: number
          status?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused'
          current_gate?: number
          started_at?: string | null
          completed_at?: string | null
          config?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      maf_audit_log: {
        Row: {
          id: string
          project_id: string | null
          wave_number: number | null
          gate: number | null
          agent: string | null
          action: string
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id?: string | null
          wave_number?: number | null
          gate?: number | null
          agent?: string | null
          action: string
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string | null
          wave_number?: number | null
          gate?: number | null
          agent?: string | null
          action?: string
          details?: Json | null
          created_at?: string
        }
      }
      maf_analysis_reports: {
        Row: {
          id: string
          project_id: string
          report_type: string
          report_data: Json
          readiness_score: number
          total_gaps: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          report_type: string
          report_data: Json
          readiness_score?: number
          total_gaps?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          report_type?: string
          report_data?: Json
          readiness_score?: number
          total_gaps?: number
          created_at?: string
          updated_at?: string
        }
      }
      maf_project_config: {
        Row: {
          id: string
          project_id: string
          config: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          config: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          config?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Project = Database['public']['Tables']['maf_projects']['Row']
export type Story = Database['public']['Tables']['maf_stories']['Row']
export type Wave = Database['public']['Tables']['maf_waves']['Row']
export type AuditLog = Database['public']['Tables']['maf_audit_log']['Row']
