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
export type TaskStatus = "open" | "done";
export type TaskPriority = "low" | "normal" | "high";
export type ActivityType = "task" | "call" | "meeting" | "follow_up" | "note";
export type CommChannel = "email" | "sms" | "whatsapp" | "call" | "chat" | "other";
export type CommDirection = "inbound" | "outbound";
export type TicketStatus = "open" | "pending" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type DocType = "contract" | "invoice" | "quotation" | "proposal" | "other";
export type AutomationKind =
  | "auto_assign_leads"
  | "followup_on_won"
  | "followup_on_ticket_resolved"
  | "autopay_deals";
export type IntegrationCategory =
  | "email"
  | "whatsapp"
  | "payments"
  | "accounting"
  | "erp"
  | "calendar";
export type IntegrationStatus = "connected" | "disconnected";
export type LeadSource =
  | "web"
  | "referral"
  | "cold_call"
  | "event"
  | "social"
  | "email"
  | "other";
export type LeadStatus =
  | "new"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

/** Free-form social/web handles stored on contacts & accounts (jsonb). */
export interface SocialLinks {
  website?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  whatsapp?: string;
}

/** Arbitrary user-defined key/value pairs stored as jsonb. */
export type CustomFields = Record<string, string>;

/** Clearance / sensitivity levels. 5 = highest (sees everything), 1 = lowest. */
export type Level = 1 | 2 | 3 | 4 | 5;

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
  level: number;
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

export interface Account {
  id: string;
  org_id: string;
  name: string;
  website: string | null;
  industry: string | null;
  phone: string | null;
  email: string | null;
  locality: string | null;
  address: string | null;
  size: string | null;
  annual_revenue: number | null;
  notes: string | null;
  tags: string[];
  custom_fields: CustomFields;
  min_level: number;
  created_by: string | null;
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
  account_id: string | null;
  title: string | null;
  tags: string[];
  social: SocialLinks;
  custom_fields: CustomFields;
  min_level: number;
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
  min_level: number;
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
  min_level: number;
  shared_with: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  org_id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  source: LeadSource;
  status: LeadStatus;
  score: number;
  est_value: number | null;
  currency: string;
  assignee_id: string | null;
  contact_id: string | null;
  account_id: string | null;
  converted_contact_id: string | null;
  converted_at: string | null;
  notes: string | null;
  min_level: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  org_id: string;
  title: string;
  notes: string | null;
  due_on: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: ActivityType;
  remind_at: string | null;
  contact_id: string | null;
  deal_id: string | null;
  lead_id: string | null;
  assignee_id: string | null;
  min_level: number;
  shared_with: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Communication {
  id: string;
  org_id: string;
  channel: CommChannel;
  direction: CommDirection;
  subject: string | null;
  body: string | null;
  contact_id: string | null;
  deal_id: string | null;
  lead_id: string | null;
  occurred_at: string;
  min_level: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  org_id: string;
  name: string;
  subject: string | null;
  body: string;
  min_level: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  org_id: string;
  subject: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  contact_id: string | null;
  account_id: string | null;
  assignee_id: string | null;
  sla_due_at: string | null;
  resolved_at: string | null;
  min_level: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  body: string;
  created_by: string | null;
  created_at: string;
}

export interface KbArticle {
  id: string;
  org_id: string;
  title: string;
  body: string;
  tags: string[];
  published: boolean;
  min_level: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  org_id: string;
  name: string;
  doc_type: DocType;
  contact_id: string | null;
  account_id: string | null;
  deal_id: string | null;
  ticket_id: string | null;
  notes: string | null;
  min_level: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version: number;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_by: string | null;
  created_at: string;
}

export interface AutomationRule {
  id: string;
  org_id: string;
  kind: AutomationKind;
  enabled: boolean;
  config: Record<string, string>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Integration {
  id: string;
  org_id: string;
  provider: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  config: Record<string, string>;
  connected_at: string | null;
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

export interface PendingInvitation {
  id: string;
  org_id: string;
  org_name: string;
  email: string;
  role: string;
  invited_by: string;
  created_at: string;
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
      accounts: {
        Row: Account;
        Insert: Insert<Account, "org_id" | "name">;
        Update: Update<Account>;
      };
      contacts: {
        Row: Contact;
        Insert: Insert<Contact, "org_id" | "name">;
        Update: Update<Contact>;
      };
      leads: {
        Row: Lead;
        Insert: Insert<Lead, "org_id" | "name">;
        Update: Update<Lead>;
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
      tasks: {
        Row: Task;
        Insert: Insert<Task, "org_id" | "title">;
        Update: Update<Task>;
      };
      communications: {
        Row: Communication;
        Insert: Insert<Communication, "org_id">;
        Update: Update<Communication>;
      };
      email_templates: {
        Row: EmailTemplate;
        Insert: Insert<EmailTemplate, "org_id" | "name">;
        Update: Update<EmailTemplate>;
      };
      tickets: {
        Row: Ticket;
        Insert: Insert<Ticket, "org_id" | "subject">;
        Update: Update<Ticket>;
      };
      ticket_comments: {
        Row: TicketComment;
        Insert: Insert<TicketComment, "ticket_id" | "body">;
        Update: Update<TicketComment>;
      };
      kb_articles: {
        Row: KbArticle;
        Insert: Insert<KbArticle, "org_id" | "title">;
        Update: Update<KbArticle>;
      };
      documents: {
        Row: Document;
        Insert: Insert<Document, "org_id" | "name">;
        Update: Update<Document>;
      };
      document_versions: {
        Row: DocumentVersion;
        Insert: Insert<DocumentVersion, "document_id" | "storage_path" | "file_name">;
        Update: Update<DocumentVersion>;
      };
      automation_rules: {
        Row: AutomationRule;
        Insert: Insert<AutomationRule, "org_id" | "kind">;
        Update: Update<AutomationRule>;
      };
      integrations: {
        Row: Integration;
        Insert: Insert<Integration, "org_id" | "provider" | "category">;
        Update: Update<Integration>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_org_id: { Args: Record<string, never>; Returns: string | null };
      current_level: { Args: { target_org: string }; Returns: number };
      is_member_of: { Args: { target_org: string }; Returns: boolean };
      create_workspace: { Args: { workspace_name: string }; Returns: string };
      my_pending_invitations: {
        Args: Record<string, never>;
        Returns: PendingInvitation[];
      };
    };
  };
}
