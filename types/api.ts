export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          reason: string
          summary: string
          target: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          reason?: string
          summary: string
          target: string
          target_id?: string | null
          target_type?: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          reason?: string
          summary?: string
          target?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profile_balances"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          deleted_at: string | null
          deleted_by: string | null
          description: string
          id: string
          resolution_criteria: string
          resolved_at: string | null
          resolved_outcome_id: string | null
          status: string
          title: string
        }
        Insert: {
          category: string
          closes_at: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          id?: string
          resolution_criteria?: string
          resolved_at?: string | null
          resolved_outcome_id?: string | null
          status?: string
          title: string
        }
        Update: {
          category?: string
          closes_at?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          id?: string
          resolution_criteria?: string
          resolved_at?: string | null
          resolved_outcome_id?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "markets_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profile_balances"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "markets_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "markets_resolved_outcome_id_fkey"
            columns: ["resolved_outcome_id"]
            isOneToOne: false
            referencedRelation: "outcomes"
            referencedColumns: ["id"]
          },
        ]
      }
      outcomes: {
        Row: {
          created_at: string
          id: string
          liquidity: number
          market_id: string
          name: string
          pool: number
          wager_pool: number
        }
        Insert: {
          created_at?: string
          id?: string
          liquidity?: number
          market_id: string
          name: string
          pool?: number
          wager_pool?: number
        }
        Update: {
          created_at?: string
          id?: string
          liquidity?: number
          market_id?: string
          name?: string
          pool?: number
          wager_pool?: number
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
          entry_probability: number
          id: string
          market_id: string
          outcome_id: string
          payout: number | null
          profile_id: string
          settled_at: string | null
          stake: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entry_probability?: number
          id?: string
          market_id: string
          outcome_id: string
          payout?: number | null
          profile_id: string
          settled_at?: string | null
          stake: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entry_probability?: number
          id?: string
          market_id?: string
          outcome_id?: string
          payout?: number | null
          profile_id?: string
          settled_at?: string | null
          stake?: number
          status?: string
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
    }
    Views: {
      profile_balances: {
        Row: {
          balance: number | null
          profile_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_adjust_credits: {
        Args: {
          p_delta: number
          p_profile_id: string
          p_reason: string
          p_request_id: string
        }
        Returns: number
      }
      admin_create_market: {
        Args: {
          p_category: string
          p_closes_at: string
          p_description: string
          p_resolution_criteria: string
          p_title: string
          p_yes_percentage?: number
        }
        Returns: string
      }
      admin_delete_market: {
        Args: { p_market_id: string; p_reason: string }
        Returns: undefined
      }
      admin_override_odds: {
        Args: {
          p_market_id: string
          p_reason: string
          p_yes_percentage: number
        }
        Returns: undefined
      }
      admin_refund_bet: {
        Args: { p_position_id: string; p_reason: string }
        Returns: undefined
      }
      admin_resolve_market: {
        Args: { p_market_id: string; p_outcome_name: string }
        Returns: undefined
      }
      admin_set_market_betting: {
        Args: { p_market_id: string; p_open: boolean }
        Returns: undefined
      }
      admin_set_user_role: {
        Args: { p_profile_id: string; p_reason: string; p_role: string }
        Returns: undefined
      }
      admin_set_user_status: {
        Args: { p_profile_id: string; p_reason: string; p_status: string }
        Returns: undefined
      }
      admin_update_market: {
        Args: {
          p_category: string
          p_closes_at: string
          p_description: string
          p_market_id: string
          p_resolution_criteria: string
          p_title: string
        }
        Returns: undefined
      }
      admin_void_market: {
        Args: { p_market_id: string; p_reason: string }
        Returns: undefined
      }
      get_leaderboard: {
        Args: never
        Returns: {
          is_current_user: boolean
          profile_id: string
          rank: number
          settled_count: number
          settled_profit: number
          username: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      place_bet: {
        Args: { p_outcome_id: string; p_stake: number }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
