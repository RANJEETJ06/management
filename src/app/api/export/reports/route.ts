import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { listOrgMembers } from "@/lib/members";
import { csvResponse, dateStampedName, toCsv, type CsvCell } from "@/lib/csv";
import { FEATURE_FLOORS } from "@/lib/levels";
import { sourceLabel } from "@/lib/leads";
import {
  lastMonths,
  salesByMonth,
  revenueByMonth,
  leadFunnel,
  growthByMonth,
  teamPerformance,
  type DealRow,
  type LeadRow,
} from "@/lib/reports";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { orgId, level } = await requireOrg();
  if (level < FEATURE_FLOORS.pipeline) return new Response("Forbidden", { status: 403 });
  const supabase = createClient();
  const type = new URL(req.url).searchParams.get("type") ?? "sales";
  const months = lastMonths(6);

  const since = new Date();
  since.setMonth(since.getMonth() - 11);
  const sinceDate = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, "0")}-01`;

  let headers: string[] = [];
  let rows: CsvCell[][] = [];
  let base = "report";

  if (type === "sales") {
    const { data } = await supabase
      .from("deals")
      .select("deal_date, direction, status, amount_total, amount_paid")
      .eq("org_id", orgId)
      .gte("deal_date", sinceDate)
      .limit(3000);
    headers = ["Month", "Sales", "Purchases"];
    rows = salesByMonth((data ?? []) as DealRow[], months).map((m) => [m.label, m.sell, m.buy]);
    base = "sales-report";
  } else if (type === "revenue") {
    const { data } = await supabase
      .from("deals")
      .select("deal_date, direction, status, amount_total, amount_paid")
      .eq("org_id", orgId)
      .gte("deal_date", sinceDate)
      .limit(3000);
    headers = ["Month", "Collected", "Billed"];
    rows = revenueByMonth((data ?? []) as DealRow[], months).map((m) => [
      m.label,
      m.collected,
      m.billed,
    ]);
    base = "revenue-report";
  } else if (type === "leads") {
    const { data } = await supabase
      .from("leads")
      .select("status, source, est_value, assignee_id")
      .eq("org_id", orgId)
      .limit(3000);
    headers = ["Source", "Leads", "Estimated value"];
    rows = leadFunnel((data ?? []) as LeadRow[]).bySource.map((s) => [
      sourceLabel(s.source),
      s.count,
      s.value,
    ]);
    base = "leads-report";
  } else if (type === "growth") {
    const [c, a] = await Promise.all([
      supabase.from("contacts").select("created_at").eq("org_id", orgId).limit(5000),
      supabase.from("accounts").select("created_at").eq("org_id", orgId).limit(5000),
    ]);
    headers = ["Month", "New contacts", "New accounts"];
    rows = growthByMonth(
      (c.data ?? []) as { created_at: string }[],
      (a.data ?? []) as { created_at: string }[],
      months
    ).map((m) => [m.label, m.contacts, m.accounts]);
    base = "growth-report";
  } else if (type === "team") {
    const [d, l, t, members] = await Promise.all([
      supabase
        .from("deals")
        .select("deal_date, direction, status, amount_total, amount_paid, created_by")
        .eq("org_id", orgId)
        .gte("deal_date", sinceDate)
        .limit(3000),
      supabase.from("leads").select("status, source, est_value, assignee_id").eq("org_id", orgId).limit(3000),
      supabase.from("tickets").select("status, assignee_id").eq("org_id", orgId).limit(3000),
      listOrgMembers(orgId),
    ]);
    headers = ["Member", "Deals", "Deal value", "Leads won", "Tickets resolved"];
    rows = teamPerformance(
      (d.data ?? []) as DealRow[],
      (l.data ?? []) as LeadRow[],
      (t.data ?? []) as { status: any; assignee_id: string | null }[],
      members.map((m) => ({ user_id: m.user_id, email: m.email }))
    ).map((r) => [r.email, r.dealsCount, r.dealsValue, r.leadsWon, r.ticketsResolved]);
    base = "team-report";
  } else {
    return new Response("Unknown report type", { status: 400 });
  }

  return csvResponse(dateStampedName(base), toCsv(headers, rows));
}
