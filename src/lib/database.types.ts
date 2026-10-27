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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          amount_ils: number
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          customer_id: string
          grow_process_id: string | null
          grow_transaction_id: string | null
          id: string
          installments: number
          offer_id: string
          paid_at: string | null
          receipt_url: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          voucher_path: string | null
          voucher_ready_at: string | null
        }
        Insert: {
          amount_ils: number
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_id: string
          grow_process_id?: string | null
          grow_transaction_id?: string | null
          id?: string
          installments?: number
          offer_id: string
          paid_at?: string | null
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          voucher_path?: string | null
          voucher_ready_at?: string | null
        }
        Update: {
          amount_ils?: number
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_id?: string
          grow_process_id?: string | null
          grow_transaction_id?: string | null
          id?: string
          installments?: number
          offer_id?: string
          paid_at?: string | null
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          voucher_path?: string | null
          voucher_ready_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          board_basis: Database["public"]["Enums"]["board_basis"]
          cancellation_policy: string | null
          check_in: string
          check_out: string
          city: string
          country: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          first_viewed_at: string | null
          free_cancellation_until: string | null
          highlights: string[]
          hotel_name: string
          id: string
          images: string[]
          market_price_ils: number | null
          market_price_source: string | null
          parent_offer_id: string | null
          price_ils: number
          public_token: string
          request_id: string
          room_type: string
          sent_at: string | null
          stars: number | null
          status: Database["public"]["Enums"]["offer_status"]
          updated_at: string
        }
        Insert: {
          board_basis: Database["public"]["Enums"]["board_basis"]
          cancellation_policy?: string | null
          check_in: string
          check_out: string
          city: string
          country: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          first_viewed_at?: string | null
          free_cancellation_until?: string | null
          highlights?: string[]
          hotel_name: string
          id?: string
          images?: string[]
          market_price_ils?: number | null
          market_price_source?: string | null
          parent_offer_id?: string | null
          price_ils: number
          public_token?: string
          request_id: string
          room_type: string
          sent_at?: string | null
          stars?: number | null
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Update: {
          board_basis?: Database["public"]["Enums"]["board_basis"]
          cancellation_policy?: string | null
          check_in?: string
          check_out?: string
          city?: string
          country?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          first_viewed_at?: string | null
          free_cancellation_until?: string | null
          highlights?: string[]
          hotel_name?: string
          id?: string
          images?: string[]
          market_price_ils?: number | null
          market_price_source?: string | null
          parent_offer_id?: string | null
          price_ils?: number
          public_token?: string
          request_id?: string
          room_type?: string
          sent_at?: string | null
          stars?: number | null
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_parent_offer_id_fkey"
            columns: ["parent_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          booking_id: string | null
          error: string | null
          event_key: string
          id: number
          payload: Json
          processed_at: string | null
          provider: string
          received_at: string
        }
        Insert: {
          booking_id?: string | null
          error?: string | null
          event_key: string
          id?: never
          payload: Json
          processed_at?: string | null
          provider?: string
          received_at?: string
        }
        Update: {
          booking_id?: string | null
          error?: string | null
          event_key?: string
          id?: never
          payload?: Json
          processed_at?: string | null
          provider?: string
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          adults: number
          board_basis: Database["public"]["Enums"]["board_basis"] | null
          check_in: string
          check_out: string
          children_ages: number[]
          contact_name: string
          contact_phone: string
          created_at: string
          customer_id: string
          destination: string
          flexible_days: number
          hotel_name: string | null
          id: string
          min_stars: number | null
          notes: string | null
          room_setup: Database["public"]["Enums"]["room_setup"]
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          vacation_styles: Database["public"]["Enums"]["vacation_style"][]
        }
        Insert: {
          adults: number
          board_basis?: Database["public"]["Enums"]["board_basis"] | null
          check_in: string
          check_out: string
          children_ages?: number[]
          contact_name: string
          contact_phone: string
          created_at?: string
          customer_id?: string
          destination: string
          flexible_days?: number
          hotel_name?: string | null
          id?: string
          min_stars?: number | null
          notes?: string | null
          room_setup?: Database["public"]["Enums"]["room_setup"]
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          vacation_styles?: Database["public"]["Enums"]["vacation_style"][]
        }
        Update: {
          adults?: number
          board_basis?: Database["public"]["Enums"]["board_basis"] | null
          check_in?: string
          check_out?: string
          children_ages?: number[]
          contact_name?: string
          contact_phone?: string
          created_at?: string
          customer_id?: string
          destination?: string
          flexible_days?: number
          hotel_name?: string | null
          id?: string
          min_stars?: number | null
          notes?: string | null
          room_setup?: Database["public"]["Enums"]["room_setup"]
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          vacation_styles?: Database["public"]["Enums"]["vacation_style"][]
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      travelers: {
        Row: {
          booking_id: string
          created_at: string
          full_name_en: string | null
          id: string
          is_child: boolean
          passport_path: string | null
          passport_uploaded_at: string | null
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          full_name_en?: string | null
          id?: string
          is_child?: boolean
          passport_path?: string | null
          passport_uploaded_at?: string | null
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          full_name_en?: string | null
          id?: string
          is_child?: boolean
          passport_path?: string | null
          passport_uploaded_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "travelers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      get_offer: { Args: { p_token: string }; Returns: Json }
      get_offer_preview: { Args: { p_token: string }; Returns: Json }
      start_booking: { Args: { p_offer_id: string }; Returns: string }
      submit_booking_details: {
        Args: { p_booking_id: string }
        Returns: undefined
      }
    }
    Enums: {
      board_basis: "RO" | "BB" | "HB" | "FB" | "AI"
      booking_status:
        | "awaiting_passports"
        | "awaiting_payment"
        | "paid"
        | "voucher_ready"
        | "cancelled"
      offer_status: "draft" | "sent" | "accepted" | "withdrawn"
      request_status: "new" | "in_progress" | "offered" | "closed" | "cancelled"
      room_setup: "one_room" | "connecting" | "suite"
      user_role: "customer" | "admin" | "owner"
      vacation_style: "resort" | "city" | "adults_only" | "family"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      board_basis: ["RO", "BB", "HB", "FB", "AI"],
      booking_status: [
        "awaiting_passports",
        "awaiting_payment",
        "paid",
        "voucher_ready",
        "cancelled",
      ],
      offer_status: ["draft", "sent", "accepted", "withdrawn"],
      request_status: ["new", "in_progress", "offered", "closed", "cancelled"],
      room_setup: ["one_room", "connecting", "suite"],
      user_role: ["customer", "admin", "owner"],
      vacation_style: ["resort", "city", "adults_only", "family"],
    },
  },
} as const
