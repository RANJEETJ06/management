// Hand-written type definitions for the Supabase schema.
// You can replace this with `supabase gen types typescript` output later
// to keep types in sync with migrations automatically.

export type ContactType = "supplier" | "buyer" | "partner" | "other";
export type Channel = "in_person" | "phone" | "whatsapp" | "email" | "other";
export type InteractionStatus = "open" | "followed_up" | "closed" | "dropped";
export type DealDirection = "buy" | "sell";
export type DealStatus = "pending" | "confirmed" | "delivered" | "paid" | "cancelled";
export type PaymentStatus = "unpaid" | "partial" | "paid";
export type MemberRole = "owner" | "admin" | "member";

export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Member {
  org_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
}

export interface Invitation {
  id: string;
  org_id: string;
  email: string;
  role: Exclude<MemberRole, "owner">;
  invited_by: string;
  accepted_at: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  org_id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  org_id: string;
  name: string;
  type: ContactType;
  phone: string | null;
  email: string | null;
  locality: string | null;
  address: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  org_id: string;
  contact_id: string | null;
  occurred_on: string;
  location: string | null;
  channel: Channel | null;
  summary: string;
  follow_up_on: string | null;
  status: InteractionStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InteractionItem {
  id: string;
  interaction_id: string;
  category_id: string | null;
  item_name: string | null;
  quantity: number | null;
  unit: string | null;
  price_per_unit: number | null;
  notes: string | null;
  created_at: string;
}

export interface Deal {
  id: string;
  org_id: string;
  contact_id: string;
  direction: DealDirection;
  deal_date: string;
  delivery_on: string | null;
  status: DealStatus;
  payment_status: PaymentStatus;
  amount_total: number | null;
  amount_paid: number;
  currency: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealItem {
  id: string;
  deal_id: string;
  category_id: string | null;
  item_name: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  line_total: number;
  notes: string | null;
}

type Insert<T, Required extends keyof T = never> = Partial<T> & Pick<T, Required>;
type Update<T> = Partial<T>;

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: Insert<Organization, "name" | "owner_id">;
        Update: Update<Organization>;
      };
      members: {
        Row: Member;
        Insert: Insert<Member, "org_id" | "user_id">;
        Update: Update<Member>;
      };
      invitations: {
        Row: Invitation;
        Insert: Insert<Invitation, "org_id" | "email" | "invited_by">;
        Update: Update<Invitation>;
      };
      categories: {
        Row: Category;
        Insert: Insert<Category, "org_id" | "name">;
        Update: Update<Category>;
      };
      contacts: {
        Row: Contact;
        Insert: Insert<Contact, "org_id" | "name">;
        Update: Update<Contact>;
      };
      interactions: {
        Row: Interaction;
        Insert: Insert<Interaction, "org_id" | "summary">;
        Update: Update<Interaction>;
      };
      interaction_items: {
        Row: InteractionItem;
        Insert: Insert<InteractionItem, "interaction_id">;
        Update: Update<InteractionItem>;
      };
      deals: {
        Row: Deal;
        Insert: Insert<Deal, "org_id" | "contact_id" | "direction">;
        Update: Update<Deal>;
      };
      deal_items: {
        Row: DealItem;
        Insert: Insert<DealItem, "deal_id" | "item_name" | "quantity" | "price_per_unit">;
        Update: Update<DealItem>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_org_id: { Args: Record<string, never>; Returns: string | null };
      is_member_of: { Args: { target_org: string }; Returns: boolean };
      create_workspace: { Args: { workspace_name: string }; Returns: string };
    };
  };
}
