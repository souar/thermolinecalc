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
      component_supplier_prices: {
        Row: {
          component_id: string
          cost_per_unit: number
          created_at: string
          id: string
          is_preferred: boolean
          lead_time_days: number | null
          notes: string | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          component_id: string
          cost_per_unit: number
          created_at?: string
          id?: string
          is_preferred?: boolean
          lead_time_days?: number | null
          notes?: string | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          component_id?: string
          cost_per_unit?: number
          created_at?: string
          id?: string
          is_preferred?: boolean
          lead_time_days?: number | null
          notes?: string | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "component_supplier_prices_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_supplier_prices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      components: {
        Row: {
          active: boolean
          cost_per_unit: number
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["component_kind"]
          m2_per_unit: number | null
          manufacturing_stage: string | null
          name: string
          notes: string | null
          panel_height: number | null
          panel_width: number | null
          primary_supplier_id: string | null
          sku: string | null
          time_minutes_per_unit: number | null
          unit: string
          updated_at: string
          updated_by: string | null
          weight_per_m2: number | null
        }
        Insert: {
          active?: boolean
          cost_per_unit?: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind: Database["public"]["Enums"]["component_kind"]
          m2_per_unit?: number | null
          manufacturing_stage?: string | null
          name: string
          notes?: string | null
          panel_height?: number | null
          panel_width?: number | null
          primary_supplier_id?: string | null
          sku?: string | null
          time_minutes_per_unit?: number | null
          unit: string
          updated_at?: string
          updated_by?: string | null
          weight_per_m2?: number | null
        }
        Update: {
          active?: boolean
          cost_per_unit?: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["component_kind"]
          m2_per_unit?: number | null
          manufacturing_stage?: string | null
          name?: string
          notes?: string | null
          panel_height?: number | null
          panel_width?: number | null
          primary_supplier_id?: string | null
          sku?: string | null
          time_minutes_per_unit?: number | null
          unit?: string
          updated_at?: string
          updated_by?: string | null
          weight_per_m2?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "components_primary_supplier_id_fkey"
            columns: ["primary_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      install_time_defaults: {
        Row: {
          id: string
          label: string
          minutes_per_panel: number
          section_key: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          label: string
          minutes_per_panel?: number
          section_key: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          label?: string
          minutes_per_panel?: number
          section_key?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          name: string
          notes: string | null
          reference: string | null
          reference_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          name: string
          notes?: string | null
          reference?: string | null
          reference_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          name?: string
          notes?: string | null
          reference?: string | null
          reference_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      lining_pricing: {
        Row: {
          component_cost: number | null
          cost_per_m2: number
          id: string
          labour_cost_per_panel: number | null
          lining_type: string
          panel_height: number
          panel_width: number
          updated_at: string
          updated_by: string | null
          weight_per_m2: number | null
        }
        Insert: {
          component_cost?: number | null
          cost_per_m2?: number
          id?: string
          labour_cost_per_panel?: number | null
          lining_type: string
          panel_height: number
          panel_width: number
          updated_at?: string
          updated_by?: string | null
          weight_per_m2?: number | null
        }
        Update: {
          component_cost?: number | null
          cost_per_m2?: number
          id?: string
          labour_cost_per_panel?: number | null
          lining_type?: string
          panel_height?: number
          panel_width?: number
          updated_at?: string
          updated_by?: string | null
          weight_per_m2?: number | null
        }
        Relationships: []
      }
      lining_results: {
        Row: {
          apex_width: number | null
          breakdown_json: Json | null
          created_at: string
          gable_panels: number
          gables_m2: number
          id: string
          roof_m2: number
          roof_panels: number
          spec_id: string
          total_cost: number | null
          total_m2: number
          total_weight_kg: number | null
          walls_m2: number
          walls_panels: number
        }
        Insert: {
          apex_width?: number | null
          breakdown_json?: Json | null
          created_at?: string
          gable_panels: number
          gables_m2: number
          id?: string
          roof_m2: number
          roof_panels: number
          spec_id: string
          total_cost?: number | null
          total_m2: number
          total_weight_kg?: number | null
          walls_m2: number
          walls_panels: number
        }
        Update: {
          apex_width?: number | null
          breakdown_json?: Json | null
          created_at?: string
          gable_panels?: number
          gables_m2?: number
          id?: string
          roof_m2?: number
          roof_panels?: number
          spec_id?: string
          total_cost?: number | null
          total_m2?: number
          total_weight_kg?: number | null
          walls_m2?: number
          walls_panels?: number
        }
        Relationships: [
          {
            foreignKeyName: "lining_results_spec_id_fkey"
            columns: ["spec_id"]
            isOneToOne: false
            referencedRelation: "marquee_specs"
            referencedColumns: ["id"]
          },
        ]
      }
      lining_variant_components: {
        Row: {
          component_id: string
          created_at: string
          id: string
          notes: string | null
          panel_m2: number | null
          qty_per_m2: number
          sections: string[] | null
          sort_order: number
          updated_at: string
          variant_id: string
        }
        Insert: {
          component_id: string
          created_at?: string
          id?: string
          notes?: string | null
          panel_m2?: number | null
          qty_per_m2?: number
          sections?: string[] | null
          sort_order?: number
          updated_at?: string
          variant_id: string
        }
        Update: {
          component_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          panel_m2?: number | null
          qty_per_m2?: number
          sections?: string[] | null
          sort_order?: number
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lining_variant_components_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lining_variant_components_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "lining_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      lining_variants: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          default_panel_height: number | null
          default_panel_width: number | null
          description: string | null
          id: string
          name: string
          notes: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          default_panel_height?: number | null
          default_panel_width?: number | null
          description?: string | null
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          default_panel_height?: number | null
          default_panel_width?: number | null
          description?: string | null
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      marquee_specs: {
        Row: {
          apex_override: number | null
          bay_size: number
          created_at: string
          created_by: string | null
          eave_height: number
          id: string
          job_id: string
          length: number
          line_apex: boolean
          line_gable_triangles: boolean
          line_gable_walls: boolean
          line_roof: boolean
          line_walls: boolean
          lining_type: string
          pitch_deg: number
          roof_overhang_enabled: boolean
          wall_floor_seal_enabled: boolean
          width: number
        }
        Insert: {
          apex_override?: number | null
          bay_size?: number
          created_at?: string
          created_by?: string | null
          eave_height: number
          id?: string
          job_id: string
          length: number
          line_apex?: boolean
          line_gable_triangles?: boolean
          line_gable_walls?: boolean
          line_roof?: boolean
          line_walls?: boolean
          lining_type: string
          pitch_deg: number
          roof_overhang_enabled?: boolean
          wall_floor_seal_enabled?: boolean
          width: number
        }
        Update: {
          apex_override?: number | null
          bay_size?: number
          created_at?: string
          created_by?: string | null
          eave_height?: number
          id?: string
          job_id?: string
          length?: number
          line_apex?: boolean
          line_gable_triangles?: boolean
          line_gable_walls?: boolean
          line_roof?: boolean
          line_walls?: boolean
          lining_type?: string
          pitch_deg?: number
          roof_overhang_enabled?: boolean
          wall_floor_seal_enabled?: boolean
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "marquee_specs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean
          address: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          id: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      component_kind: "sleeve" | "material" | "labour"
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
      component_kind: ["sleeve", "material", "labour"],
    },
  },
} as const
