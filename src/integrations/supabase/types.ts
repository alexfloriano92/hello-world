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
      analytics_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          referrer: string | null
          session_id: string | null
          store_id: string
          user_agent: string | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          referrer?: string | null
          session_id?: string | null
          store_id: string
          user_agent?: string | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          referrer?: string | null
          session_id?: string | null
          store_id?: string
          user_agent?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          changes: Json
          created_at: string
          entity: string
          entity_id: string
          id: string
          store_id: string
          summary: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          changes?: Json
          created_at?: string
          entity: string
          entity_id: string
          id?: string
          store_id: string
          summary?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          changes?: Json
          created_at?: string
          entity?: string
          entity_id?: string
          id?: string
          store_id?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          image_url: string
          prompt: string | null
          store_id: string
          template: string
          title: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_url: string
          prompt?: string | null
          store_id: string
          template?: string
          title: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string
          prompt?: string | null
          store_id?: string
          template?: string
          title?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banners_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banners_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          content: string
          created_at: string
          id: string
          kind: string
          lead_id: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          kind?: string
          lead_id: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          kind?: string
          lead_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          created_at: string
          email: string | null
          id: string
          lost_reason: string | null
          message: string | null
          name: string
          next_followup: string | null
          notes: string | null
          phone: string | null
          source: string
          status: string
          store_id: string
          updated_at: string
          vehicle_id: string | null
          won_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lost_reason?: string | null
          message?: string | null
          name: string
          next_followup?: string | null
          notes?: string | null
          phone?: string | null
          source?: string
          status?: string
          store_id: string
          updated_at?: string
          vehicle_id?: string | null
          won_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lost_reason?: string | null
          message?: string | null
          name?: string
          next_followup?: string | null
          notes?: string | null
          phone?: string | null
          source?: string
          status?: string
          store_id?: string
          updated_at?: string
          vehicle_id?: string | null
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_requests: {
        Row: {
          admin_notes: string | null
          amount_brl: number
          created_at: string
          cycle: Database["public"]["Enums"]["billing_cycle"]
          id: string
          plan: Database["public"]["Enums"]["plan_tier"]
          proof_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount_brl: number
          created_at?: string
          cycle?: Database["public"]["Enums"]["billing_cycle"]
          id?: string
          plan: Database["public"]["Enums"]["plan_tier"]
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount_brl?: number
          created_at?: string
          cycle?: Database["public"]["Enums"]["billing_cycle"]
          id?: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_id: string | null
          content: string
          cover_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published_at: string | null
          slug: string
          store_id: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug: string
          store_id: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          store_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["store_role"]
          store_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["store_role"]
          store_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["store_role"]
          store_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_invites_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["store_role"]
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["store_role"]
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["store_role"]
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_members_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          about_text: string | null
          accent_color: string | null
          address: string | null
          city: string | null
          created_at: string
          cta_text: string | null
          custom_domain: string | null
          custom_domain_token: string | null
          custom_domain_verified: boolean
          feeds_enabled: boolean
          font_body: string | null
          font_display: string | null
          hero_headline: string | null
          hero_subheadline: string | null
          id: string
          logo_url: string | null
          name: string
          neutral_color: string | null
          onboarded: boolean
          owner_id: string
          phone: string | null
          plan: Database["public"]["Enums"]["plan_tier"]
          primary_color: string | null
          published: boolean
          secondary_color: string | null
          slug: string
          state: string | null
          style_tag: string | null
          tagline: string | null
          updated_at: string
          whatsapp: string | null
          whatsapp_api_enabled: boolean
          whatsapp_api_token: string | null
          whatsapp_phone_id: string | null
        }
        Insert: {
          about_text?: string | null
          accent_color?: string | null
          address?: string | null
          city?: string | null
          created_at?: string
          cta_text?: string | null
          custom_domain?: string | null
          custom_domain_token?: string | null
          custom_domain_verified?: boolean
          feeds_enabled?: boolean
          font_body?: string | null
          font_display?: string | null
          hero_headline?: string | null
          hero_subheadline?: string | null
          id?: string
          logo_url?: string | null
          name: string
          neutral_color?: string | null
          onboarded?: boolean
          owner_id: string
          phone?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          primary_color?: string | null
          published?: boolean
          secondary_color?: string | null
          slug: string
          state?: string | null
          style_tag?: string | null
          tagline?: string | null
          updated_at?: string
          whatsapp?: string | null
          whatsapp_api_enabled?: boolean
          whatsapp_api_token?: string | null
          whatsapp_phone_id?: string | null
        }
        Update: {
          about_text?: string | null
          accent_color?: string | null
          address?: string | null
          city?: string | null
          created_at?: string
          cta_text?: string | null
          custom_domain?: string | null
          custom_domain_token?: string | null
          custom_domain_verified?: boolean
          feeds_enabled?: boolean
          font_body?: string | null
          font_display?: string | null
          hero_headline?: string | null
          hero_subheadline?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          neutral_color?: string | null
          onboarded?: boolean
          owner_id?: string
          phone?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          primary_color?: string | null
          published?: boolean
          secondary_color?: string | null
          slug?: string
          state?: string | null
          style_tag?: string | null
          tagline?: string | null
          updated_at?: string
          whatsapp?: string | null
          whatsapp_api_enabled?: boolean
          whatsapp_api_token?: string | null
          whatsapp_phone_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan: Database["public"]["Enums"]["plan_tier"]
          status: Database["public"]["Enums"]["sub_status"]
          store_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
          vehicle_limit: number
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          status?: Database["public"]["Enums"]["sub_status"]
          store_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
          vehicle_limit?: number
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          status?: Database["public"]["Enums"]["sub_status"]
          store_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
          vehicle_limit?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          id: string
          plan_snapshot: string | null
          priority: string
          status: string
          store_id: string | null
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_snapshot?: string | null
          priority?: string
          status?: string
          store_id?: string | null
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_snapshot?: string | null
          priority?: string
          status?: string
          store_id?: string | null
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          content: string
          created_at: string
          from_admin: boolean
          id: string
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          from_admin?: boolean
          id?: string
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          from_admin?: boolean
          id?: string
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          brand: string | null
          color: string | null
          created_at: string
          description: string | null
          featured: boolean
          fuel: string | null
          id: string
          km: number | null
          model: string | null
          photos: Json
          price: number | null
          sold: boolean
          store_id: string
          title: string
          transmission: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          brand?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          fuel?: string | null
          id?: string
          km?: number | null
          model?: string | null
          photos?: Json
          price?: number | null
          sold?: boolean
          store_id: string
          title: string
          transmission?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          brand?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          fuel?: string | null
          id?: string
          km?: number | null
          model?: string | null
          photos?: Json
          price?: number | null
          sold?: boolean
          store_id?: string
          title?: string
          transmission?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          body: string
          created_at: string
          error: string | null
          id: string
          lead_id: string | null
          provider_message_id: string | null
          status: string
          store_id: string
          to_phone: string
        }
        Insert: {
          body: string
          created_at?: string
          error?: string | null
          id?: string
          lead_id?: string | null
          provider_message_id?: string | null
          status?: string
          store_id: string
          to_phone: string
        }
        Update: {
          body?: string
          created_at?: string
          error?: string | null
          id?: string
          lead_id?: string | null
          provider_message_id?: string | null
          status?: string
          store_id?: string
          to_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_store_invite: {
        Args: { _token: string }
        Returns: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["store_role"]
          store_id: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "store_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_audit_filters: { Args: never; Returns: Json }
      admin_list_audit: {
        Args: {
          _action?: string
          _actor_id?: string
          _entity?: string
          _from?: string
          _limit?: number
          _offset?: number
          _search?: string
          _to?: string
        }
        Returns: Json
      }
      admin_list_stores: {
        Args: never
        Returns: {
          created_at: string
          id: string
          leads_count: number
          name: string
          owner_email: string
          owner_id: string
          published: boolean
          slug: string
          updated_at: string
          vehicles_count: number
        }[]
      }
      admin_list_subscriptions: {
        Args: never
        Returns: {
          created_at: string
          current_period_end: string
          id: string
          plan: Database["public"]["Enums"]["plan_tier"]
          status: Database["public"]["Enums"]["sub_status"]
          updated_at: string
          user_email: string
          user_id: string
          vehicle_limit: number
        }[]
      }
      admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_admin: boolean
          last_sign_in_at: string
          leads_count: number
          plan: Database["public"]["Enums"]["plan_tier"]
          stores_count: number
          sub_status: Database["public"]["Enums"]["sub_status"]
          vehicles_count: number
        }[]
      }
      admin_overview: { Args: never; Returns: Json }
      admin_update_subscription: {
        Args: {
          _current_period_end: string
          _plan: Database["public"]["Enums"]["plan_tier"]
          _status: Database["public"]["Enums"]["sub_status"]
          _user_id: string
          _vehicle_limit: number
        }
        Returns: {
          created_at: string
          current_period_end: string | null
          id: string
          plan: Database["public"]["Enums"]["plan_tier"]
          status: Database["public"]["Enums"]["sub_status"]
          store_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
          vehicle_limit: number
        }
        SetofOptions: {
          from: "*"
          to: "subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      audit_actor_name: { Args: { _uid: string }; Returns: string }
      confirm_payment_request: {
        Args: { _notes?: string; _request_id: string }
        Returns: {
          admin_notes: string | null
          amount_brl: number
          created_at: string
          cycle: Database["public"]["Enums"]["billing_cycle"]
          id: string
          plan: Database["public"]["Enums"]["plan_tier"]
          proof_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        SetofOptions: {
          from: "*"
          to: "payment_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_store_access: {
        Args: { _store_id: string; _user_id: string }
        Returns: boolean
      }
      jsonb_diff: { Args: { _new: Json; _old: Json }; Returns: Json }
      plan_has_feature: {
        Args: { _feature: string; _user_id: string }
        Returns: boolean
      }
      reject_payment_request: {
        Args: { _notes?: string; _request_id: string }
        Returns: {
          admin_notes: string | null
          amount_brl: number
          created_at: string
          cycle: Database["public"]["Enums"]["billing_cycle"]
          id: string
          plan: Database["public"]["Enums"]["plan_tier"]
          proof_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        SetofOptions: {
          from: "*"
          to: "payment_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_store_by_host: {
        Args: { _host: string }
        Returns: {
          id: string
          slug: string
        }[]
      }
      set_subscription_plan: {
        Args: { _period_end?: string; _plan: string; _user_id: string }
        Returns: undefined
      }
      store_owner_has_feature: {
        Args: { _feature: string; _store_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      billing_cycle: "monthly" | "yearly"
      payment_status: "pending" | "confirmed" | "rejected"
      plan_tier: "free" | "starter" | "pro" | "premium"
      store_role: "owner" | "admin" | "editor" | "viewer"
      sub_status: "active" | "trialing" | "past_due" | "canceled" | "incomplete"
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
      app_role: ["admin", "user"],
      billing_cycle: ["monthly", "yearly"],
      payment_status: ["pending", "confirmed", "rejected"],
      plan_tier: ["free", "starter", "pro", "premium"],
      store_role: ["owner", "admin", "editor", "viewer"],
      sub_status: ["active", "trialing", "past_due", "canceled", "incomplete"],
    },
  },
} as const
