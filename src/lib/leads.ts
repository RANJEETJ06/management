// Single source of truth for the lead/opportunity pipeline: the stages from the
// spec (New → Qualified → Proposal → Negotiation → Won/Lost), their forecast
// probabilities, board accents, and the lead-source vocabulary.

import type { LeadSource, LeadStatus } from "@/lib/types";

export type LeadStageMeta = {
  key: LeadStatus;
  label: string;
  /** Probability the deal closes from this stage — used for weighted forecast. */
  probability: number;
  accent: string;
};

export const LEAD_STAGES: LeadStageMeta[] = [
  { key: "new", label: "New", probability: 0.1, accent: "border-t-gold" },
  { key: "qualified", label: "Qualified", probability: 0.3, accent: "border-t-primary/50" },
  { key: "proposal", label: "Proposal", probability: 0.5, accent: "border-t-primary/70" },
  { key: "negotiation", label: "Negotiation", probability: 0.75, accent: "border-t-primary" },
  { key: "won", label: "Won", probability: 1, accent: "border-t-primary" },
  { key: "lost", label: "Lost", probability: 0, accent: "border-t-destructive/60" },
];

/** Stages still in flight (excludes the terminal won/lost). */
export const OPEN_LEAD_STAGES: LeadStatus[] = ["new", "qualified", "proposal", "negotiation"];

export function stageMeta(status: LeadStatus): LeadStageMeta {
  return LEAD_STAGES.find((s) => s.key === status) ?? LEAD_STAGES[0];
}

export const LEAD_SOURCES: { key: LeadSource; label: string }[] = [
  { key: "web", label: "Website" },
  { key: "referral", label: "Referral" },
  { key: "cold_call", label: "Cold call" },
  { key: "event", label: "Event" },
  { key: "social", label: "Social" },
  { key: "email", label: "Email" },
  { key: "other", label: "Other" },
];

export function sourceLabel(source: LeadSource): string {
  return LEAD_SOURCES.find((s) => s.key === source)?.label ?? source;
}

/** Rough temperature label from a 0–100 score. */
export function scoreBand(score: number): { label: string; variant: "muted" | "warn" | "danger" } {
  if (score >= 70) return { label: "Hot", variant: "danger" };
  if (score >= 40) return { label: "Warm", variant: "warn" };
  return { label: "Cold", variant: "muted" };
}
