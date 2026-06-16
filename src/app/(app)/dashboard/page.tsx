import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, relativeDate } from "@/lib/utils";
import { FEATURE_FLOORS } from "@/lib/levels";
import { OPEN_LEAD_STAGES, stageMeta } from "@/lib/leads";
import {
  Plus,
  ArrowRight,
  ArrowUpRight,
  Users,
  CalendarClock,
  Receipt,
  Wallet,
  Target,
} from "lucide-react";
import type { LeadStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

type InsightDeal = {
  deal_date: string;
  direction: "buy" | "sell";
  status: string;
  amount_total: number | null;
  amount_paid: number;
  currency: string;
};

export default async function DashboardPage() {
  const { orgId, role, level } = await requireOrg();
  const isMember = role === "member";
  const isDirector = level >= FEATURE_FLOORS.leads;
  const supabase = createClient();

  const today = new Date().toISOString().slice(0, 10);

  // Director-only lead pipeline snapshot (forecast + open count).
  const leadRows: { status: LeadStatus; est_value: number | null }[] = isDirector
    ? ((
        await supabase.from("leads").select("status, est_value").eq("org_id", orgId).limit(500)
      ).data ?? [])
    : [];
  let openLeadsCount = 0;
  let weightedForecast = 0;
  let openPipeline = 0;
  for (const l of leadRows) {
    if (OPEN_LEAD_STAGES.includes(l.status)) {
      openLeadsCount += 1;
      openPipeline += l.est_value ?? 0;
      weightedForecast += (l.est_value ?? 0) * stageMeta(l.status).probability;
    }
  }

  const insightDeals: InsightDeal[] = isMember
    ? []
    : (
        (
          await supabase
            .from("deals")
            .select("deal_date, direction, status, amount_total, amount_paid, currency")
            .eq("org_id", orgId)
            .order("deal_date", { ascending: false })
            .limit(500)
        ).data ?? []
      ).map((d: any) => ({
        deal_date: d.deal_date,
        direction: d.direction,
        status: d.status,
        amount_total: d.amount_total,
        amount_paid: d.amount_paid ?? 0,
        currency: d.currency ?? "INR",
      }));

  const [
    { count: contactCount },
    { count: interactionCount },
    openDealsRes,
    recent,
    followUps,
    dueTasks,
  ] =
    await Promise.all([
      supabase.from("contacts").select("id", { count: "exact", head: true }).eq("org_id", orgId),
      supabase.from("interactions").select("id", { count: "exact", head: true }).eq("org_id", orgId),
      isMember
        ? Promise.resolve({ count: 0 })
        : supabase
            .from("deals")
            .select("id", { count: "exact", head: true })
            .eq("org_id", orgId)
            .in("status", ["pending", "confirmed"]),
      supabase
        .from("interactions")
        .select("id, created_at, summary, contact_id, location, status, contacts(name)")
        .eq("org_id", orgId)
        .order("occurred_on", { ascending: false })
        .limit(5),
      supabase
        .from("interactions")
        .select("id, follow_up_on, summary, contact_id, contacts(name)")
        .eq("org_id", orgId)
        .eq("status", "open")
        .not("follow_up_on", "is", null)
        .lte("follow_up_on", new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10))
        .order("follow_up_on", { ascending: true })
        .limit(5),
      supabase
        .from("tasks")
        .select("id, title, due_on, priority, contact_id, contacts(name)")
        .eq("org_id", orgId)
        .eq("status", "open")
        .not("due_on", "is", null)
        .lte("due_on", new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10))
        .order("due_on", { ascending: true })
        .limit(6),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your business at a glance."
        action={
          <Button asChild>
            <Link href="/interactions/new">
              <Plus className="h-4 w-4" /> Log interaction
            </Link>
          </Button>
        }
      />

      <div
        className={`grid gap-4 ${
          isMember
            ? "sm:grid-cols-2"
            : isDirector
              ? "sm:grid-cols-2 lg:grid-cols-4"
              : "sm:grid-cols-3"
        }`}
      >
        <Stat label="Contacts" value={contactCount ?? 0} href="/contacts" icon={Users} />
        <Stat label="Interactions" value={interactionCount ?? 0} href="/interactions" icon={CalendarClock} />
        {!isMember && (
          <Stat label="Open deals" value={openDealsRes.count ?? 0} href="/deals" icon={Receipt} />
        )}
        {isDirector && (
          <Stat label="Open leads" value={openLeadsCount} href="/leads" icon={Target} />
        )}
      </div>

      {isDirector && leadRows.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-soft text-[hsl(34_72%_30%)]">
                  <Target className="h-4 w-4" />
                </span>
                <div>
                  <div className="eyebrow">Weighted pipeline forecast</div>
                  <div className="font-display text-2xl font-semibold tracking-tight tnum">
                    {formatCurrency(weightedForecast, "INR")}
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Open pipeline:{" "}
                <span className="font-medium text-foreground tnum">
                  {formatCurrency(openPipeline, "INR")}
                </span>
                {" · "}
                <Link href="/leads" className="text-primary hover:underline">
                  View leads
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isMember && insightDeals.length > 0 && <Insights deals={insightDeals} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent interactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(recent.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No interactions yet. Log your first one.</p>
            ) : (
              recent.data!.map((row: any) => (
                <Link
                  key={row.id}
                  href={`/interactions/${row.id}`}
                  className="block rounded-md p-3 hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium truncate">
                      {row.contacts?.name || "(no contact)"}
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {relativeDate(row.created_at)}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-2">{row.summary}</div>
                  {row.location && (
                    <div className="text-xs text-muted-foreground mt-1">📍 {row.location}</div>
                  )}
                </Link>
              ))
            )}
            <Link
              href="/interactions"
              className="text-sm text-primary inline-flex items-center gap-1 hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Follow-ups (next 7 days)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(followUps.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing on your plate.</p>
            ) : (
              followUps.data!.map((row: any) => {
                const overdue = row.follow_up_on < today;
                return (
                  <Link
                    key={row.id}
                    href={`/interactions/${row.id}`}
                    className="block rounded-md p-3 hover:bg-accent/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium truncate">
                        {row.contacts?.name || "(no contact)"}
                      </div>
                      <Badge variant={overdue ? "danger" : "warn"}>
                        {formatDate(row.follow_up_on, "PP")}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-1">{row.summary}</div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Tasks due soon</CardTitle>
            <Link
              href="/tasks"
              className="text-sm text-primary inline-flex items-center gap-1 hover:underline"
            >
              All tasks <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {(dueTasks.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks due in the next 7 days.</p>
            ) : (
              dueTasks.data!.map((t: any) => {
                const overdue = t.due_on < today;
                return (
                  <Link
                    key={t.id}
                    href="/tasks"
                    className="flex items-center justify-between gap-3 rounded-md p-2.5 hover:bg-accent/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{t.title}</div>
                      {t.contacts?.name && (
                        <div className="text-xs text-muted-foreground truncate">
                          {t.contacts.name}
                        </div>
                      )}
                    </div>
                    <Badge variant={overdue ? "danger" : "warn"}>
                      {formatDate(t.due_on, "PP")}
                    </Badge>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Insights({ deals }: { deals: InsightDeal[] }) {
  const currency = deals[0]?.currency ?? "INR";

  // Last 6 month buckets.
  const now = new Date();
  const months: { key: string; label: string; sell: number; buy: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en", { month: "short" }),
      sell: 0,
      buy: 0,
    });
  }
  const monthIndex = new Map(months.map((m, i) => [m.key, i]));

  const stageSums: Record<string, number> = {};
  let outstanding = 0;
  for (const d of deals) {
    const total = d.amount_total ?? 0;
    const mk = d.deal_date.slice(0, 7);
    const mi = monthIndex.get(mk);
    if (mi != null) months[mi][d.direction] += total;
    stageSums[d.status] = (stageSums[d.status] ?? 0) + total;
    if (d.status !== "cancelled") outstanding += Math.max(0, total - (d.amount_paid ?? 0));
  }

  const maxMonth = Math.max(1, ...months.flatMap((m) => [m.sell, m.buy]));
  const stages = ["pending", "confirmed", "delivered", "paid"];
  const maxStage = Math.max(1, ...stages.map((s) => stageSums[s] ?? 0));
  const sellTotal = months.reduce((s, m) => s + m.sell, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Sales vs purchases · last 6 months</CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Sales
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-gold" /> Purchases
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex h-44 items-end justify-between gap-2">
            {months.map((m) => (
              <div key={m.key} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-36 w-full items-end justify-center gap-1">
                  <div
                    className="w-1/2 max-w-[1.4rem] rounded-t bg-primary transition-all"
                    style={{ height: `${(m.sell / maxMonth) * 100}%` }}
                    title={formatCurrency(m.sell, currency)}
                  />
                  <div
                    className="w-1/2 max-w-[1.4rem] rounded-t bg-gold transition-all"
                    style={{ height: `${(m.buy / maxMonth) * 100}%` }}
                    title={formatCurrency(m.buy, currency)}
                  />
                </div>
                <div className="text-[0.7rem] text-muted-foreground">{m.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="eyebrow">Outstanding</div>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-soft text-[hsl(34_72%_30%)]">
                <Wallet className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 font-display text-3xl font-semibold tnum tracking-tight">
              {formatCurrency(outstanding, currency)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Unpaid balance across active deals.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline value by stage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {stages.map((s) => {
              const v = stageSums[s] ?? 0;
              return (
                <div key={s}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="capitalize text-muted-foreground">{s}</span>
                    <span className="tnum font-medium">{formatCurrency(v, currency)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/80"
                      style={{ width: `${(v / maxStage) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="pt-1 text-xs text-muted-foreground">
              6-month sales total:{" "}
              <span className="font-medium text-foreground tnum">
                {formatCurrency(sellTotal, currency)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  icon: Icon,
}: {
  label: string;
  value: number;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link href={href} className="group">
      <Card className="relative overflow-hidden group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-300">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="eyebrow">{label}</div>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="h-4 w-4" />
            </span>
          </div>
          <div className="font-display text-4xl font-semibold mt-2 tnum tracking-tight">
            {value}
          </div>
          <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
            View all <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
