import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, relativeDate } from "@/lib/utils";
import { Plus, Download, Lock } from "lucide-react";
import type { InteractionStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<InteractionStatus, "warn" | "success" | "muted" | "danger"> = {
  open: "warn",
  followed_up: "success",
  closed: "muted",
  dropped: "danger",
};

export default async function InteractionsPage({
  searchParams,
}: {
  searchParams: { q?: string; from?: string; to?: string; contact?: string; status?: string };
}) {
  const { orgId } = await requireOrg();
  const supabase = createClient();

  let query = supabase
    .from("interactions")
    .select("id, created_at, occurred_on, summary, location, status, follow_up_on, min_level, contact_id, contacts(name, locality)")
    .eq("org_id", orgId)
    .order("occurred_on", { ascending: false })
    .limit(200);

  if (searchParams.from) query = query.gte("occurred_on", searchParams.from);
  if (searchParams.to) query = query.lte("occurred_on", searchParams.to);
  if (searchParams.contact) query = query.eq("contact_id", searchParams.contact);
  if (
    searchParams.status &&
    ["open", "followed_up", "closed", "dropped"].includes(searchParams.status)
  ) {
    query = query.eq("status", searchParams.status);
  }
  if (searchParams.q) {
    // Strip PostgREST `.or()` structural chars, then escape LIKE wildcards.
    const q = searchParams.q.replace(/[,()]/g, " ").replace(/[%_]/g, "\\$&");
    query = query.or(`summary.ilike.%${q}%,location.ilike.%${q}%`);
  }

  const { data: rows } = await query;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interactions"
        description="Diary of conversations and meetings."
        action={
          <>
            <Button asChild variant="outline">
              <a href="/api/export/interactions">
                <Download className="h-4 w-4" /> Export
              </a>
            </Button>
            <Button asChild>
              <Link href="/interactions/new">
                <Plus className="h-4 w-4" /> Log interaction
              </Link>
            </Button>
          </>
        }
      />

      <form className="grid gap-2 sm:grid-cols-5">
        <input
          name="q"
          placeholder="Search summary, location…"
          defaultValue={searchParams.q ?? ""}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:col-span-2"
        />
        <input
          name="from"
          type="date"
          defaultValue={searchParams.from ?? ""}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        />
        <input
          name="to"
          type="date"
          defaultValue={searchParams.to ?? ""}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        />
        <select
          name="status"
          defaultValue={searchParams.status ?? ""}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Any status</option>
          <option value="open">Open</option>
          <option value="followed_up">Followed up</option>
          <option value="closed">Closed</option>
          <option value="dropped">Dropped</option>
        </select>
        <Button
          type="submit"
          variant="secondary"
          className="w-full sm:col-span-5 sm:w-auto sm:justify-self-start"
        >
          Filter
        </Button>
      </form>

      {(rows?.length ?? 0) === 0 ? (
        <EmptyState
          title="No interactions yet"
          description="Log your first conversation to start building history."
          action={
            <Button asChild>
              <Link href="/interactions/new">Log interaction</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {rows!.map((row: any) => (
            <Link key={row.id} href={`/interactions/${row.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate flex items-center gap-1.5">
                        {row.min_level > 1 && (
                          <Lock className="h-3.5 w-3.5 shrink-0 text-gold" aria-label="Restricted" />
                        )}
                        <span className="truncate">
                          {row.contacts?.name || "(no contact)"}
                          {row.contacts?.locality && (
                            <span className="text-muted-foreground font-normal"> · {row.contacts.locality}</span>
                          )}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-2 mt-1">{row.summary}</div>
                      {row.location && (
                        <div className="text-xs text-muted-foreground mt-1">📍 {row.location}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-medium">{formatDate(row.occurred_on)}</div>
                      <div className="text-xs text-muted-foreground">{relativeDate(row.created_at)}</div>
                      <Badge variant={STATUS_BADGE[row.status as InteractionStatus]} className="mt-1">
                        {row.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
