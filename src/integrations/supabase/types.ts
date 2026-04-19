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
      catalysts: {
        Row: {
          company_id: string
          confidence: string
          created_at: string
          event_date: string
          id: string
          notes: string
          signal_type: string
          source_url: string
          title: string
          type: string
        }
        Insert: {
          company_id: string
          confidence?: string
          created_at?: string
          event_date?: string
          id?: string
          notes?: string
          signal_type?: string
          source_url?: string
          title: string
          type?: string
        }
        Update: {
          company_id?: string
          confidence?: string
          created_at?: string
          event_date?: string
          id?: string
          notes?: string
          signal_type?: string
          source_url?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalysts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          cash_runway: number
          catalyst_date: string
          country: string
          country_code: string
          created_at: string
          description: string
          id: string
          insider_ownership: number
          institutional_flow: string
          latitude: number | null
          longitude: number | null
          market_cap: string
          market_cap_tier: string
          name: string
          next_catalyst: string
          scout_score: number
          sector: string
          updated_at: string
        }
        Insert: {
          cash_runway?: number
          catalyst_date?: string
          country: string
          country_code?: string
          created_at?: string
          description?: string
          id?: string
          insider_ownership?: number
          institutional_flow?: string
          latitude?: number | null
          longitude?: number | null
          market_cap?: string
          market_cap_tier?: string
          name: string
          next_catalyst?: string
          scout_score?: number
          sector: string
          updated_at?: string
        }
        Update: {
          cash_runway?: number
          catalyst_date?: string
          country?: string
          country_code?: string
          created_at?: string
          description?: string
          id?: string
          insider_ownership?: number
          institutional_flow?: string
          latitude?: number | null
          longitude?: number | null
          market_cap?: string
          market_cap_tier?: string
          name?: string
          next_catalyst?: string
          scout_score?: number
          sector?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_enrichment: {
        Row: {
          company_id: string
          data: Json
          id: string
          last_updated_at: string
          source: string
        }
        Insert: {
          company_id: string
          data?: Json
          id?: string
          last_updated_at?: string
          source?: string
        }
        Update: {
          company_id?: string
          data?: Json
          id?: string
          last_updated_at?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_enrichment_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      country_context: {
        Row: {
          country: string
          country_code: string | null
          flag_emoji: string
          id: string
          latitude: number | null
          longitude: number | null
          regime_status: string
          risk_tag: string
          updated_at: string
        }
        Insert: {
          country: string
          country_code?: string | null
          flag_emoji?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          regime_status?: string
          risk_tag?: string
          updated_at?: string
        }
        Update: {
          country?: string
          country_code?: string | null
          flag_emoji?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          regime_status?: string
          risk_tag?: string
          updated_at?: string
        }
        Relationships: []
      }
      feature_requests: {
        Row: {
          created_at: string
          description: string
          id: string
          priority: Database["public"]["Enums"]["feature_request_priority"]
          status: Database["public"]["Enums"]["feature_request_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["feature_request_priority"]
          status?: Database["public"]["Enums"]["feature_request_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["feature_request_priority"]
          status?: Database["public"]["Enums"]["feature_request_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      phantom_portfolio: {
        Row: {
          company_id: string
          created_at: string
          current_price: number
          entry_date: string
          entry_price: number
          id: string
          updated_at: string
          weight: number
        }
        Insert: {
          company_id: string
          created_at?: string
          current_price?: number
          entry_date?: string
          entry_price?: number
          id?: string
          updated_at?: string
          weight?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          current_price?: number
          entry_date?: string
          entry_price?: number
          id?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "phantom_portfolio_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          timezone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          timezone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          timezone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          category: string
          created_at: string
          file_type: string
          file_url: string
          id: string
          published_at: string
          storage_path: string | null
          summary: string
          tag: string
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          file_type?: string
          file_url?: string
          id?: string
          published_at?: string
          storage_path?: string | null
          summary?: string
          tag?: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          file_type?: string
          file_url?: string
          id?: string
          published_at?: string
          storage_path?: string | null
          summary?: string
          tag?: string
          title?: string
        }
        Relationships: []
      }
      scout_score_history: {
        Row: {
          company_id: string
          id: string
          recorded_at: string
          score: number
        }
        Insert: {
          company_id: string
          id?: string
          recorded_at?: string
          score?: number
        }
        Update: {
          company_id?: string
          id?: string
          recorded_at?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "scout_score_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      signals: {
        Row: {
          analyst_tag: string
          company_id: string
          confidence: string
          created_at: string
          id: string
          is_public: boolean
          published_at: string
          summary: string
        }
        Insert: {
          analyst_tag?: string
          company_id: string
          confidence?: string
          created_at?: string
          id?: string
          is_public?: boolean
          published_at?: string
          summary: string
        }
        Update: {
          analyst_tag?: string
          company_id?: string
          confidence?: string
          created_at?: string
          id?: string
          is_public?: boolean
          published_at?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "signals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          payment_provider: string
          plan: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          payment_provider: string
          plan: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          payment_provider?: string
          plan?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_watchlist: {
        Row: {
          company_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_watchlist_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      feature_request_priority: "low" | "medium" | "high"
      feature_request_status:
        | "new"
        | "in_review"
        | "accepted"
        | "rejected"
        | "done"
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
      app_role: ["admin", "moderator", "user"],
      feature_request_priority: ["low", "medium", "high"],
      feature_request_status: [
        "new",
        "in_review",
        "accepted",
        "rejected",
        "done",
      ],
    },
  },
} as const
