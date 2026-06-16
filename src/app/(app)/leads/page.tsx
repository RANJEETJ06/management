import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { listOrgMembers } from "@/lib/members";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { FEATURE_FLOORS } from "@/lib/levels";
import {
  LEAD_STAGES,
  OPEN_LEAD_STAGES,
  scoreBand,
  sourceLabel,
  stageMeta,
} from "@/lib/leads";
import { Plus, Download, Columns3, Table2, Lock } from "lucide-react";
import { LeadsBoard, type BoardLead } from "./leads-board";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { view?: string };
}) {
  const { orgId, level } = await requireOrg();
  if (level < FEATURE_FLOORS.leads) redirect("/dashboard");
  const supabase = createClient();

  const [{ data: rows }, members] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, name, company, status, source, score, est_value, currency, assignee_id, min_level"
      )
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(400)
      .returns<Lead[]>(),
    listOrgMembers(orgId),
  ]);

  const leads = rows ?? [];
  const emailById = new Map(members.map((m) => [m.user_id, m.email]));
  const currency = leads.find((l) => l.currency)?.currency ?? "INR";

  // Forecast & win/loss analysis.
  let weightedForecast = 0;
  let openPipeline = 0;
  let wonValue = 0;
  let wonCount = 0;
  let lostCount = 0;
  for (const l of leads) {
    const v = l.est_value ?? 0;
    if (OPEN_LEAD_STAGES.includes(l.status)) {
      openPipeline += v;
      weightedForecast += v * stageMeta(l.status).probability;
    } else if (l.status === "won") {
      wonValue += v;
      wonCount += 1;
    } else if (l.status === "lost") {
      lostCount += 1;
    }
  }
  const decided = wonCount + lostCount;
  const winRate = decided ? Math.round((wonCount / decided) * 100) : 0;

  const view = searchParams.view === "table" ? "table" : "board";

  const boardLeads: BoardLead[] = leads.map((l) => ({
    id: l.id,
    name: l.name,
    company: l.company,
    status: l.status,
    score: l.score,
    est_value: l.est_value,
    currency: l.currency,
    source: l.source,
    min_level: l.min_level,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Your sales pipeline — from first contact to won or lost."
        action={
          <>
            <Button asChild variant="outline">
              <a href="/api/export/leads">
                <Download className="h-4 w-4" /> Export
              </a>
            </Button>
            <Button asChild>
              <Link href="/leads/new">
                <Plus className="h-4 w-4" /> New lead
              </Link>
            </Button>
          </>
        }
      />

      {leads.length === 0 ? (
        <EmptyState
          title="No leads yet"
          description="Capture your first lead to start tracking the sales pipeline and forecast."
          action={
            <Button asChild>
              <Link href="/leads/new">New lead</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Weighted forecast" value={formatCurrency(weightedForecast, currency)} />
            <Metric label="Open pipeline" value={formatCurrency(openPipeline, currency)} />
            <Metric label="Won (value)" value={formatCurrency(wonValue, currency)} />
            <Metric label="Win rate" value={`${winRate}%`} sub={`${wonCount}W · ${lostCount}L`} />
          </div>

          <div className="flex items-center gap-1 rounded-md border bg-surface/60 p-1 w-fit">
            <ViewTab active={view === "board"} href="/leads?view=board" icon={Columns3} label="Board" />
            <ViewTab active={view === "table"} href="/leads?view=table" icon={Table2} label="Table" />
          </div>

          {view === "board" ? (
            <LeadsBoard initialLeads={boardLeads} />
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <div className="hidden grid-cols-12 gap-2 border-b bg-muted/50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid">
                <div className="col-span-4">Lead</div>
                <div className="col-span-2">Source</div>
                <div className="col-span-2">Stage</div>
                <div className="col-span-1">Score</div>
                <div className="col-span-3 text-right">Value · Owner</div>
              </div>
              <div className="divide-y">
                {leads.map((l) => {
                  const band = scoreBand(l.score);
                  return (
                    <Link
                      key={l.id}
                      href={`/leads/${l.id}`}
                      className="grid grid-cols-2 gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-accent/40 sm:grid-cols-12 sm:items-center"
                    >
                      <div className="col-span-2 min-w-0 sm:col-span-4">
                        <div className="flex items-center gap-1.5 font-medium">
                          {l.min_level > 5 && <Lock className="h-3 w-3 shrink-0 text-gold" />}
                          <span className="truncate">{l.name}</span>
                        </div>
                        {l.company && (
                          <div className="truncate text-xs text-muted-foreground">{l.company}</div>
                        )}
                      </div>
                      <div className="col-span-1 text-xs text-muted-foreground sm:col-span-2">
                        {sourceLabel(l.source)}
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <Badge variant="secondary">{stageMeta(l.status).label}</Badge>
                      </div>
                      <div className="col-span-1 sm:col-span-1">
                        <Badge variant={band.variant}>{l.score}</Badge>
                      </div>
                      <div className="col-span-1 text-right sm:col-span-3">
                        <div className="font-medium tnum">
                          {formatCurrency(l.est_value, l.currency)}
                        </div>
                        {l.assignee_id && (
                          <div className="truncate text-xs text-muted-foreground">
                            {emailById.get(l.assignee_id) ?? "—"}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
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

function ViewTab({
  active,
  href,
  icon: Icon,
  label,
}: {
  active: boolean;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={
        "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors " +
        (active
          ? "bg-card text-foreground shadow-xs"
          : "text-muted-foreground hover:text-foreground")
      }
    >
      <Icon className="h-4 w-4" /> {label}
    </Link>
  );
}
