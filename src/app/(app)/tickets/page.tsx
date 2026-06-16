import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { listOrgMembers } from "@/lib/members";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Lock, User } from "lucide-react";
import { FEATURE_FLOORS } from "@/lib/levels";
import {
  TICKET_STATUSES,
  ticketPriorityMeta,
  ticketStatusMeta,
  slaState,
} from "@/lib/tickets";
import type { Ticket } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const { orgId, level } = await requireOrg();
  if (level < FEATURE_FLOORS.tickets) redirect("/dashboard");
  const supabase = createClient();

  let query = supabase
    .from("tickets")
    .select(
      "id, subject, status, priority, sla_due_at, assignee_id, min_level, contacts(name)"
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(200);

  const status = searchParams.status;
  if (status && TICKET_STATUSES.some((s) => s.key === status)) {
    query = query.eq("status", status as Ticket["status"]);
  }

  const [{ data: rows }, members] = await Promise.all([query, listOrgMembers(orgId)]);
  const emailById = new Map(members.map((m) => [m.user_id, m.email]));
  const tickets = (rows ?? []) as any[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tickets"
        description="Customer support requests — track status, priority, and SLA."
        action={
          <>
            <Button asChild variant="outline">
              <Link href="/knowledge">
                <BookOpen className="h-4 w-4" /> Knowledge base
              </Link>
            </Button>
            <Button asChild>
              <Link href="/tickets/new">
                <Plus className="h-4 w-4" /> New ticket
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        <StatusChip active={!status} href="/tickets" label="All" />
        {TICKET_STATUSES.map((s) => (
          <StatusChip
            key={s.key}
            active={status === s.key}
            href={`/tickets?status=${s.key}`}
            label={s.label}
          />
        ))}
      </div>

      {tickets.length === 0 ? (
        <EmptyState
          title="No tickets"
          description="Log a customer issue to start tracking it through to resolution."
          action={
            <Button asChild>
              <Link href="/tickets/new">New ticket</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-1.5">
          {tickets.map((t) => {
            const pri = ticketPriorityMeta(t.priority);
            const st = ticketStatusMeta(t.status);
            const sla = slaState(t.status, t.sla_due_at);
            return (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="flex items-center justify-between gap-3 rounded-md border bg-card p-3 transition-colors hover:bg-accent/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {t.min_level > FEATURE_FLOORS.tickets && (
                      <Lock className="h-3 w-3 shrink-0 text-gold" />
                    )}
                    <span className="truncate font-medium">{t.subject}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {t.contacts?.name && (
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" /> {t.contacts.name}
                      </span>
                    )}
                    {t.assignee_id && <span>{emailById.get(t.assignee_id) ?? "—"}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {sla && <Badge variant={sla.variant}>{sla.label}</Badge>}
                  <Badge variant={pri.variant}>{pri.label}</Badge>
                  <Badge variant={st.variant}>{st.label}</Badge>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusChip({ active, href, label }: { active: boolean; href: string; label: string }) {
  return (
    <Link
      href={href}
      className={
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
        (active
          ? "border-primary bg-primary/[0.08] text-primary"
          : "text-muted-foreground hover:bg-accent")
      }
    >
      {label}
    </Link>
  );
}
