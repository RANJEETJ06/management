// Support-desk vocabulary + SLA helpers shared by the tickets pages.

import type { DocType, TicketPriority, TicketStatus } from "@/lib/types";

type BadgeVariant = "muted" | "default" | "success" | "warn" | "danger" | "secondary";

export const TICKET_STATUSES: { key: TicketStatus; label: string; variant: BadgeVariant }[] = [
  { key: "open", label: "Open", variant: "warn" },
  { key: "pending", label: "Pending", variant: "secondary" },
  { key: "resolved", label: "Resolved", variant: "success" },
  { key: "closed", label: "Closed", variant: "muted" },
];

export const OPEN_TICKET_STATUSES: TicketStatus[] = ["open", "pending"];

export function ticketStatusMeta(s: TicketStatus) {
  return TICKET_STATUSES.find((x) => x.key === s) ?? TICKET_STATUSES[0];
}

export const TICKET_PRIORITIES: {
  key: TicketPriority;
  label: string;
  hours: number;
  variant: BadgeVariant;
}[] = [
  { key: "low", label: "Low", hours: 168, variant: "muted" },
  { key: "normal", label: "Normal", hours: 72, variant: "default" },
  { key: "high", label: "High", hours: 24, variant: "warn" },
  { key: "urgent", label: "Urgent", hours: 4, variant: "danger" },
];

export function ticketPriorityMeta(p: TicketPriority) {
  return TICKET_PRIORITIES.find((x) => x.key === p) ?? TICKET_PRIORITIES[1];
}

/** Default SLA deadline (ISO) for a priority, measured from `fromISO` (or now). */
export function slaDueFrom(priority: TicketPriority, fromISO?: string): string {
  const base = fromISO ? new Date(fromISO) : new Date();
  const due = new Date(base.getTime() + ticketPriorityMeta(priority).hours * 3600_000);
  return due.toISOString();
}

export type SlaState = { label: string; variant: BadgeVariant } | null;

/** SLA status for an open ticket; null once resolved/closed or with no deadline. */
export function slaState(
  status: TicketStatus,
  slaDueAt: string | null,
  now: Date = new Date()
): SlaState {
  if (!slaDueAt || status === "resolved" || status === "closed") return null;
  const due = new Date(slaDueAt).getTime();
  const diffH = (due - now.getTime()) / 3600_000;
  if (diffH < 0) return { label: "SLA breached", variant: "danger" };
  if (diffH < 8) return { label: "Due soon", variant: "warn" };
  return { label: "On track", variant: "success" };
}

export const DOC_TYPES: { key: DocType; label: string }[] = [
  { key: "contract", label: "Contract" },
  { key: "invoice", label: "Invoice" },
  { key: "quotation", label: "Quotation" },
  { key: "proposal", label: "Proposal" },
  { key: "other", label: "Other" },
];

export function docTypeLabel(t: DocType): string {
  return DOC_TYPES.find((x) => x.key === t)?.label ?? t;
}

export function formatBytes(n: number | null): string {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
