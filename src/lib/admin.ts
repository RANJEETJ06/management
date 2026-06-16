// Static metadata for the Phase 5 admin/settings screens: which automations
// exist and how they're configured, which integration providers are offered,
// and how the product's named roles map onto Lupin's role + clearance model.

import type { AutomationKind, IntegrationCategory } from "@/lib/types";

export type AutomationConfigField = { key: string; label: string; type: "assignee" | "days" };

export const AUTOMATION_RULES: {
  kind: AutomationKind;
  title: string;
  description: string;
  config: AutomationConfigField[];
}[] = [
  {
    kind: "auto_assign_leads",
    title: "Auto-assign new leads",
    description:
      "When a lead is created without an owner, assign it automatically — to a chosen teammate, or whoever created it.",
    config: [{ key: "assignee_id", label: "Default owner", type: "assignee" }],
  },
  {
    kind: "followup_on_won",
    title: "Follow-up task when a lead is won",
    description: "Create a follow-up activity whenever a lead moves to Won.",
    config: [{ key: "days", label: "Days until follow-up", type: "days" }],
  },
  {
    kind: "followup_on_ticket_resolved",
    title: "Check-in task when a ticket is resolved",
    description: "Create a check-in activity whenever a support ticket is resolved.",
    config: [{ key: "days", label: "Days until check-in", type: "days" }],
  },
  {
    kind: "autopay_deals",
    title: "Mark deals paid when fully settled",
    description: "When a deal's paid amount reaches its total, advance it to Paid automatically.",
    config: [],
  },
];

export type IntegrationField = { key: string; label: string; secret?: boolean };

export const INTEGRATION_PROVIDERS: {
  category: IntegrationCategory;
  provider: string;
  label: string;
  description: string;
  fields: IntegrationField[];
}[] = [
  {
    category: "email",
    provider: "email_smtp",
    label: "Email (SMTP / Resend)",
    description: "Send templated emails and sync replies.",
    fields: [
      { key: "from", label: "From address" },
      { key: "api_key", label: "API key", secret: true },
    ],
  },
  {
    category: "whatsapp",
    provider: "whatsapp_cloud",
    label: "WhatsApp Business",
    description: "Send and log WhatsApp messages.",
    fields: [
      { key: "phone_id", label: "Phone number ID" },
      { key: "token", label: "Access token", secret: true },
    ],
  },
  {
    category: "payments",
    provider: "payments_gateway",
    label: "Payments (Razorpay / Stripe)",
    description: "Reconcile payments against deals.",
    fields: [
      { key: "key_id", label: "Key ID" },
      { key: "key_secret", label: "Key secret", secret: true },
    ],
  },
  {
    category: "accounting",
    provider: "accounting",
    label: "Accounting (Tally / QuickBooks)",
    description: "Push invoices and sync ledgers.",
    fields: [{ key: "endpoint", label: "Sync endpoint" }],
  },
  {
    category: "erp",
    provider: "erp",
    label: "ERP",
    description: "Exchange orders and inventory with your ERP.",
    fields: [
      { key: "endpoint", label: "API endpoint" },
      { key: "api_key", label: "API key", secret: true },
    ],
  },
  {
    category: "calendar",
    provider: "calendar",
    label: "Calendar (Google / Outlook)",
    description: "Two-way sync meetings and reminders.",
    fields: [{ key: "calendar_id", label: "Calendar ID" }],
  },
];

// ---- Named roles → role + clearance, with a permission matrix ---------------
export type Permission = "view" | "create" | "update" | "delete" | "export";

export const PERMISSIONS: { key: Permission; label: string }[] = [
  { key: "view", label: "View" },
  { key: "create", label: "Create" },
  { key: "update", label: "Update" },
  { key: "delete", label: "Delete" },
  { key: "export", label: "Export" },
];

export const NAMED_ROLES: {
  name: string;
  basis: string;
  perms: Permission[];
}[] = [
  { name: "Super Admin", basis: "Owner · clearance L5", perms: ["view", "create", "update", "delete", "export"] },
  { name: "Admin", basis: "Admin role · L4–5", perms: ["view", "create", "update", "delete", "export"] },
  { name: "Manager", basis: "Admin role · L4", perms: ["view", "create", "update", "export"] },
  { name: "Sales Rep", basis: "Member role · L2–3", perms: ["view", "create", "update"] },
  { name: "Support Agent", basis: "Member role · L3", perms: ["view", "create", "update"] },
];
