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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      birth_data: {
        Row: {
          birthdate: string
          birthplace: string
          birthtime: string | null
          chart_facts: Json | null
          latitude: number | null
          longitude: number | null
          name: string
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          birthdate: string
          birthplace: string
          birthtime?: string | null
          chart_facts?: Json | null
          latitude?: number | null
          longitude?: number | null
          name: string
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          birthdate?: string
          birthplace?: string
          birthtime?: string | null
          chart_facts?: Json | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "birth_data_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          chat_date: string
          content: string
          created_at: string
          experts: Json | null
          id: string
          oracle: Json | null
          role: string
          user_id: string
        }
        Insert: {
          chat_date: string
          content: string
          created_at?: string
          experts?: Json | null
          id?: string
          oracle?: Json | null
          role: string
          user_id: string
        }
        Update: {
          chat_date?: string
          content?: string
          created_at?: string
          experts?: Json | null
          id?: string
          oracle?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_reading_cache: {
        Row: {
          cache_key: string
          content: Json
          created_at: string
          reading_date: string
        }
        Insert: {
          cache_key: string
          content: Json
          created_at?: string
          reading_date: string
        }
        Update: {
          cache_key?: string
          content?: Json
          created_at?: string
          reading_date?: string
        }
        Relationships: []
      }
      daily_streaks: {
        Row: {
          current_streak: number
          last_completed_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_completed_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_completed_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      engine_runs: {
        Row: {
          attempt: number | null
          created_at: string
          duration_ms: number | null
          error: string | null
          expert_id: string | null
          id: string
          meta: Json | null
          model: string | null
          ok: boolean
          phase: string
          route: string
          tradition_id: string | null
          user_id: string | null
        }
        Insert: {
          attempt?: number | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          expert_id?: string | null
          id?: string
          meta?: Json | null
          model?: string | null
          ok: boolean
          phase: string
          route: string
          tradition_id?: string | null
          user_id?: string | null
        }
        Update: {
          attempt?: number | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          expert_id?: string | null
          id?: string
          meta?: Json | null
          model?: string | null
          ok?: boolean
          phase?: string
          route?: string
          tradition_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profile_summaries: {
        Row: {
          at_glance: string
          birth_data_hash: string
          generated_at: string
          tradition_id: string
          user_id: string
        }
        Insert: {
          at_glance: string
          birth_data_hash: string
          generated_at?: string
          tradition_id: string
          user_id: string
        }
        Update: {
          at_glance?: string
          birth_data_hash?: string
          generated_at?: string
          tradition_id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          platform: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          platform?: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          platform?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      readings: {
        Row: {
          created_at: string
          id: string
          input: Json
          kind: string
          output: Json
          reading_date: string
          total_duration_ms: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          input: Json
          kind: string
          output: Json
          reading_date: string
          total_duration_ms?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          input?: Json
          kind?: string
          output?: Json
          reading_date?: string
          total_duration_ms?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "readings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tapestry_entries: {
        Row: {
          body: string | null
          created_at: string
          entry_date: string
          id: string
          mood: string | null
          reading_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          entry_date: string
          id?: string
          mood?: string | null
          reading_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          entry_date?: string
          id?: string
          mood?: string | null
          reading_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tapestry_entries_reading_id_fkey"
            columns: ["reading_id"]
            isOneToOne: false
            referencedRelation: "readings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapestry_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
