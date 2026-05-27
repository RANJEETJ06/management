import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, relativeDate } from "@/lib/utils";
import { Plus, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { orgId, role } = await requireOrg();
  const isMember = role === "member";
  const supabase = createClient();

  const today = new Date().toISOString().slice(0, 10);

  const [{ count: contactCount }, { count: interactionCount }, openDealsRes, recent, followUps] =
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
        .select("id, occurred_on, summary, contact_id, location, status, contacts(name)")
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

      <div className={`grid gap-4 ${isMember ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        <Stat label="Contacts" value={contactCount ?? 0} href="/contacts" />
        <Stat label="Interactions" value={interactionCount ?? 0} href="/interactions" />
        {!isMember && (
          <Stat label="Open deals" value={openDealsRes.count ?? 0} href="/deals" />
        )}
      </div>

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
                      {relativeDate(row.occurred_on)}
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
      </div>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="group">
      <Card className="transition-shadow group-hover:shadow-md">
        <CardContent className="p-5">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-3xl font-semibold mt-1">{value}</div>
        </CardContent>
      </Card>
    </Link>
  );
}
