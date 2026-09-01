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
      ledger: {
        Row: {
          created_at: string
          delta: number
          id: string
          profile_id: string
          reason: string
          ref_id: string | null
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          profile_id: string
          reason: string
          ref_id?: string | null
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          profile_id?: string
          reason?: string
          ref_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile_balances"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ledger_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      markets: {
        Row: {
          category: string
          closes_at: string
          created_at: string
          description: string
          id: string
          resolution_criteria: string
          resolved_outcome: string | null
          status: string
          title: string
        }
        Insert: {
          category: string
          closes_at: string
          created_at?: string
          description?: string
          id?: string
          resolution_criteria?: string
          resolved_outcome?: string | null
          status?: string
          title: string
        }
        Update: {
          category?: string
          closes_at?: string
          created_at?: string
          description?: string
          id?: string
          resolution_criteria?: string
          resolved_outcome?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      outcomes: {
        Row: {
          created_at: string
          id: string
          market_id: string
          name: string
          pool: number
        }
        Insert: {
          created_at?: string
          id?: string
          market_id: string
          name: string
          pool?: number
        }
        Update: {
          created_at?: string
          id?: string
          market_id?: string
          name?: string
          pool?: number
        }
        Relationships: [
          {
            foreignKeyName: "outcomes_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          created_at: string
          id: string
          market_id: string
          outcome_id: string
          profile_id: string
          stake: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          market_id: string
          outcome_id: string
          profile_id: string
          stake: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          market_id?: string
          outcome_id?: string
          profile_id?: string
          stake?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile_balances"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "positions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          role: string
          status: string
          username: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          role?: string
          status?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          role?: string
          status?: string
          username?: string | null
        }
        Relationships: []
      }
      admin_actions: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          reason: string
          summary: string
          target: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          reason: string
          summary: string
          target: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          reason?: string
          summary?: string
          target?: string
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard: {
        Row: {
          balance: number | null
          profile_id: string | null
          username: string | null
        }
        Relationships: []
      }
      profile_balances: {
        Row: {
          balance: number | null
          profile_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      ensure_current_profile: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      place_bet: {
        Args: {
          p_outcome_id: string
          p_stake: number
        }
        Returns: Json
      }
      create_market: {
        Args: {
          p_category: string
          p_closes_at: string
          p_description: string
          p_no_pool: number
          p_resolution_criteria: string
          p_title: string
          p_yes_pool: number
        }
        Returns: Json
      }
      update_market: {
        Args: {
          p_category: string
          p_closes_at: string
          p_description: string
          p_market_id: string
          p_resolution_criteria: string
          p_title: string
        }
        Returns: Json
      }
      set_market_status: {
        Args: {
          p_market_id: string
          p_reason: string
          p_status: string
        }
        Returns: Json
      }
      override_market_odds: {
        Args: {
          p_market_id: string
          p_reason: string
          p_yes_percent: number
        }
        Returns: Json
      }
      resolve_market: {
        Args: {
          p_market_id: string
          p_reason: string
          p_winning_outcome: string
        }
        Returns: Json
      }
      void_market: {
        Args: {
          p_market_id: string
          p_reason: string
        }
        Returns: Json
      }
      delete_market: {
        Args: {
          p_market_id: string
        }
        Returns: Json
      }
      refund_position: {
        Args: {
          p_position_id: string
          p_reason: string
        }
        Returns: Json
      }
      adjust_user_balance: {
        Args: {
          p_delta: number
          p_reason: string
          p_user_id: string
        }
        Returns: Json
      }
      set_user_status: {
        Args: {
          p_reason: string
          p_status: string
          p_user_id: string
        }
        Returns: Json
      }
      set_user_role: {
        Args: {
          p_reason: string
          p_role: string
          p_user_id: string
        }
        Returns: Json
      }
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
