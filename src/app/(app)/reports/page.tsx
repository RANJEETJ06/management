import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { listOrgMembers } from "@/lib/members";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { FEATURE_FLOORS } from "@/lib/levels";
import { sourceLabel, LEAD_STAGES } from "@/lib/leads";
import {
  lastMonths,
  monthKey,
  salesByMonth,
  revenueByMonth,
  revenueSummary,
  leadFunnel,
  growthByMonth,
  teamPerformance,
  type DealRow,
  type LeadRow,
} from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const { orgId, level } = await requireOrg();
  if (level < FEATURE_FLOORS.pipeline) redirect("/dashboard");
  const supabase = createClient();

  const since = new Date();
  since.setMonth(since.getMonth() - 11);
  const sinceDate = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, "0")}-01`;

  const [dealsR, leadsR, contactsR, accountsR, ticketsR, members] = await Promise.all([
    supabase
      .from("deals")
      .select("deal_date, direction, status, amount_total, amount_paid, currency, created_by")
      .eq("org_id", orgId)
      .gte("deal_date", sinceDate)
      .limit(3000),
    supabase.from("leads").select("status, source, est_value, assignee_id").eq("org_id", orgId).limit(3000),
    supabase.from("contacts").select("created_at").eq("org_id", orgId).limit(5000),
    supabase.from("accounts").select("created_at").eq("org_id", orgId).limit(5000),
    supabase.from("tickets").select("status, assignee_id").eq("org_id", orgId).limit(3000),
    listOrgMembers(orgId),
  ]);

  const deals = (dealsR.data ?? []) as DealRow[];
  const leads = (leadsR.data ?? []) as LeadRow[];
  const contacts = (contactsR.data ?? []) as { created_at: string }[];
  const accounts = (accountsR.data ?? []) as { created_at: string }[];
  const tickets = (ticketsR.data ?? []) as { status: any; assignee_id: string | null }[];

  const currency = deals.find((d) => d.currency)?.currency ?? "INR";
  const months = lastMonths(6);

  const sales = salesByMonth(deals, months);
  const revenue = revenueByMonth(deals, months);
  const revSummary = revenueSummary(deals);
  const funnel = leadFunnel(leads);
  const growth = growthByMonth(contacts, accounts, months);
  const team = teamPerformance(
    deals,
    leads,
    tickets.map((t) => ({ status: t.status, assignee_id: t.assignee_id })),
    members.map((m) => ({ user_id: m.user_id, email: m.email }))
  );

  const thisMonth = lastMonths(1)[0].key;
  const newCustomers = contacts.filter((c) => monthKey(c.created_at) === thisMonth).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Sales, leads, revenue, growth, and team performance at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Revenue collected" value={formatCurrency(revSummary.collected, currency)} />
        <Kpi label="Outstanding" value={formatCurrency(revSummary.outstanding, currency)} />
        <Kpi label="Lead win rate" value={`${funnel.winRate}%`} sub={`${funnel.won}W · ${funnel.lost}L`} />
        <Kpi label="New customers (mo)" value={String(newCustomers)} />
      </div>

      <ReportCard
        title="Sales vs purchases · 6 months"
        exportType="sales"
      >
        <DualBars
          data={sales.map((m) => ({ label: m.label, a: m.sell, b: m.buy }))}
          aLabel="Sales"
          bLabel="Purchases"
          format={(n) => formatCurrency(n, currency)}
        />
      </ReportCard>

      <ReportCard title="Revenue · collected vs billed · 6 months" exportType="revenue">
        <DualBars
          data={revenue.map((m) => ({ label: m.label, a: m.collected, b: m.billed }))}
          aLabel="Collected"
          bLabel="Billed"
          format={(n) => formatCurrency(n, currency)}
        />
      </ReportCard>

      <ReportCard title="Lead funnel & conversion" exportType="leads">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2.5">
            {LEAD_STAGES.map((s) => {
              const count = funnel.byStage[s.key];
              const max = Math.max(1, ...LEAD_STAGES.map((x) => funnel.byStage[x.key]));
              return (
                <div key={s.key}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-medium tnum">{count}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/80"
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="pt-1 text-xs text-muted-foreground">
              Conversion (won / all): <span className="font-medium text-foreground">{funnel.conversionRate}%</span>
              {" · "}Weighted forecast:{" "}
              <span className="font-medium text-foreground tnum">
                {formatCurrency(funnel.weightedForecast, currency)}
              </span>
            </div>
          </div>
          <div>
            <div className="eyebrow mb-2">By source</div>
            <div className="space-y-1.5">
              {funnel.bySource.length === 0 ? (
                <p className="text-sm text-muted-foreground">No leads yet.</p>
              ) : (
                funnel.bySource
                  .sort((a, b) => b.count - a.count)
                  .map((s) => (
                    <div key={s.source} className="flex items-center justify-between text-sm">
                      <span>{sourceLabel(s.source)}</span>
                      <span className="text-muted-foreground tnum">
                        {s.count} · {formatCurrency(s.value, currency)}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </ReportCard>

      <ReportCard title="Customer growth · 6 months" exportType="growth">
        <DualBars
          data={growth.map((m) => ({ label: m.label, a: m.contacts, b: m.accounts }))}
          aLabel="New contacts"
          bLabel="New accounts"
          format={(n) => String(n)}
        />
      </ReportCard>

      <ReportCard title="Team performance" exportType="team">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Member</th>
                <th className="py-2 pr-3 text-right font-medium">Deals</th>
                <th className="py-2 pr-3 text-right font-medium">Deal value</th>
                <th className="py-2 pr-3 text-right font-medium">Leads won</th>
                <th className="py-2 text-right font-medium">Tickets resolved</th>
              </tr>
            </thead>
            <tbody>
              {team.map((r) => (
                <tr key={r.user_id} className="border-b last:border-0">
                  <td className="max-w-[14rem] truncate py-2 pr-3">{r.email}</td>
                  <td className="py-2 pr-3 text-right tnum">{r.dealsCount}</td>
                  <td className="py-2 pr-3 text-right tnum">{formatCurrency(r.dealsValue, currency)}</td>
                  <td className="py-2 pr-3 text-right tnum">{r.leadsWon}</td>
                  <td className="py-2 text-right tnum">{r.ticketsResolved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportCard>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="eyebrow">{label}</div>
        <div className="mt-1 font-display text-2xl font-semibold tracking-tight tnum">{value}</div>
        {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function ReportCard({
  title,
  exportType,
  children,
}: {
  title: string;
  exportType: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/export/reports?type=${exportType}`}>
            <Download className="h-4 w-4" /> CSV
          </a>
        </Button>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function DualBars({
  data,
  aLabel,
  bLabel,
  format,
}: {
  data: { label: string; a: number; b: number }[];
  aLabel: string;
  bLabel: string;
  format: (n: number) => string;
}) {
  const max = Math.max(1, ...data.flatMap((d) => [d.a, d.b]));
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> {aLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-gold" /> {bLabel}
        </span>
      </div>
      <div className="flex h-44 items-end justify-between gap-2">
        {data.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-36 w-full items-end justify-center gap-1">
              <div
                className="w-1/2 max-w-[1.4rem] rounded-t bg-primary transition-all"
                style={{ height: `${(d.a / max) * 100}%` }}
                title={format(d.a)}
              />
              <div
                className="w-1/2 max-w-[1.4rem] rounded-t bg-gold transition-all"
                style={{ height: `${(d.b / max) * 100}%` }}
                title={format(d.b)}
              />
            </div>
            <div className="text-[0.7rem] text-muted-foreground">{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
