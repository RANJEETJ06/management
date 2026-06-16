// Pure aggregation helpers for the reports page and the CSV export route.
// Callers fetch rows (RLS-scoped) and pass them in; these functions never touch
// the network so the page and the export endpoint stay in lock-step.

import { stageMeta } from "@/lib/leads";
import type { LeadSource, LeadStatus, TicketStatus } from "@/lib/types";

export type MonthBucket = { key: string; label: string };

export function lastMonths(n: number): MonthBucket[] {
  const now = new Date();
  const out: MonthBucket[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en", { month: "short" }),
    });
  }
  return out;
}

export const monthKey = (isoDate: string) => isoDate.slice(0, 7);

// ---- Sales -----------------------------------------------------------------
export type DealRow = {
  deal_date: string;
  direction: "buy" | "sell";
  status: string;
  amount_total: number | null;
  amount_paid: number | null;
  currency?: string | null;
  created_by?: string | null;
};

export type SalesMonth = { key: string; label: string; sell: number; buy: number };

export function salesByMonth(deals: DealRow[], months: MonthBucket[]): SalesMonth[] {
  const idx = new Map(months.map((m, i) => [m.key, i]));
  const rows: SalesMonth[] = months.map((m) => ({ ...m, sell: 0, buy: 0 }));
  for (const d of deals) {
    const i = idx.get(monthKey(d.deal_date));
    if (i == null) continue;
    rows[i][d.direction] += d.amount_total ?? 0;
  }
  return rows;
}

// ---- Revenue ---------------------------------------------------------------
export type RevenueMonth = { key: string; label: string; collected: number; billed: number };

export function revenueByMonth(deals: DealRow[], months: MonthBucket[]): RevenueMonth[] {
  const idx = new Map(months.map((m, i) => [m.key, i]));
  const rows: RevenueMonth[] = months.map((m) => ({ ...m, collected: 0, billed: 0 }));
  for (const d of deals) {
    if (d.direction !== "sell" || d.status === "cancelled") continue;
    const i = idx.get(monthKey(d.deal_date));
    if (i == null) continue;
    rows[i].collected += d.amount_paid ?? 0;
    rows[i].billed += d.amount_total ?? 0;
  }
  return rows;
}

export function revenueSummary(deals: DealRow[]) {
  let collected = 0;
  let outstanding = 0;
  let salesTotal = 0;
  for (const d of deals) {
    if (d.status === "cancelled") continue;
    const total = d.amount_total ?? 0;
    const paid = d.amount_paid ?? 0;
    if (d.direction === "sell") {
      salesTotal += total;
      collected += paid;
      outstanding += Math.max(0, total - paid);
    }
  }
  return { collected, outstanding, salesTotal };
}

// ---- Leads / conversion ----------------------------------------------------
export type LeadRow = {
  status: LeadStatus;
  source: LeadSource;
  est_value: number | null;
  assignee_id?: string | null;
};

export function leadFunnel(leads: LeadRow[]) {
  const byStage: Record<LeadStatus, number> = {
    new: 0,
    qualified: 0,
    proposal: 0,
    negotiation: 0,
    won: 0,
    lost: 0,
  };
  const bySource = new Map<LeadSource, { count: number; value: number }>();
  let weightedForecast = 0;
  for (const l of leads) {
    byStage[l.status] += 1;
    const s = bySource.get(l.source) ?? { count: 0, value: 0 };
    s.count += 1;
    s.value += l.est_value ?? 0;
    bySource.set(l.source, s);
    if (l.status !== "won" && l.status !== "lost") {
      weightedForecast += (l.est_value ?? 0) * stageMeta(l.status).probability;
    }
  }
  const won = byStage.won;
  const lost = byStage.lost;
  const total = leads.length;
  const decided = won + lost;
  return {
    byStage,
    bySource: Array.from(bySource.entries()).map(([source, v]) => ({ source, ...v })),
    won,
    lost,
    total,
    winRate: decided ? Math.round((won / decided) * 100) : 0,
    conversionRate: total ? Math.round((won / total) * 100) : 0,
    weightedForecast,
  };
}

// ---- Customer growth -------------------------------------------------------
export type GrowthMonth = { key: string; label: string; contacts: number; accounts: number };

export function growthByMonth(
  contacts: { created_at: string }[],
  accounts: { created_at: string }[],
  months: MonthBucket[]
): GrowthMonth[] {
  const idx = new Map(months.map((m, i) => [m.key, i]));
  const rows: GrowthMonth[] = months.map((m) => ({ ...m, contacts: 0, accounts: 0 }));
  for (const c of contacts) {
    const i = idx.get(monthKey(c.created_at));
    if (i != null) rows[i].contacts += 1;
  }
  for (const a of accounts) {
    const i = idx.get(monthKey(a.created_at));
    if (i != null) rows[i].accounts += 1;
  }
  return rows;
}

// ---- Team performance ------------------------------------------------------
export type TeamMember = { user_id: string; email: string };
export type TeamTicketRow = { status: TicketStatus; assignee_id: string | null };

export type TeamRow = {
  user_id: string;
  email: string;
  dealsCount: number;
  dealsValue: number;
  leadsWon: number;
  ticketsResolved: number;
};

export function teamPerformance(
  deals: DealRow[],
  leads: LeadRow[],
  tickets: TeamTicketRow[],
  members: TeamMember[]
): TeamRow[] {
  const rows = new Map<string, TeamRow>();
  for (const m of members) {
    rows.set(m.user_id, {
      user_id: m.user_id,
      email: m.email,
      dealsCount: 0,
      dealsValue: 0,
      leadsWon: 0,
      ticketsResolved: 0,
    });
  }
  const get = (id: string | null | undefined) => (id ? rows.get(id) : undefined);

  for (const d of deals) {
    if (d.status === "cancelled") continue;
    const r = get(d.created_by);
    if (r) {
      r.dealsCount += 1;
      r.dealsValue += d.amount_total ?? 0;
    }
  }
  for (const l of leads) {
    if (l.status === "won") {
      const r = get(l.assignee_id);
      if (r) r.leadsWon += 1;
    }
  }
  for (const t of tickets) {
    if (t.status === "resolved" || t.status === "closed") {
      const r = get(t.assignee_id);
      if (r) r.ticketsResolved += 1;
    }
  }
  return Array.from(rows.values()).sort((a, b) => b.dealsValue - a.dealsValue);
}
