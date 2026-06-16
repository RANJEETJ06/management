import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Download, Lock, Phone, MapPin, Building2 } from "lucide-react";
import { FEATURE_FLOORS } from "@/lib/levels";
import type { Account } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: { q?: string; tag?: string };
}) {
  const { orgId, level } = await requireOrg();
  if (level < FEATURE_FLOORS.accounts) redirect("/dashboard");
  const supabase = createClient();

  let query = supabase
    .from("accounts")
    .select("*")
    .eq("org_id", orgId)
    .order("name", { ascending: true })
    .limit(200);

  if (searchParams.q) {
    const q = searchParams.q.replace(/[%_]/g, "\\$&");
    query = query.or(`name.ilike.%${q}%,industry.ilike.%${q}%,locality.ilike.%${q}%`);
  }
  if (searchParams.tag) query = query.contains("tags", [searchParams.tag]);

  const { data: accounts } = await query;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        description="Companies and organizations you do business with."
        action={
          <>
            <Button asChild variant="outline">
              <a href="/api/export/accounts">
                <Download className="h-4 w-4" /> Export
              </a>
            </Button>
            <Button asChild>
              <Link href="/accounts/new">
                <Plus className="h-4 w-4" /> Add account
              </Link>
            </Button>
          </>
        }
      />

      <form className="flex flex-col gap-2 sm:flex-row">
        <input
          name="q"
          placeholder="Search name, industry, locality…"
          defaultValue={searchParams.q ?? ""}
          className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <input
          name="tag"
          placeholder="Tag"
          defaultValue={searchParams.tag ?? ""}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-40"
        />
        <Button type="submit" variant="secondary" className="w-full sm:w-auto">
          Filter
        </Button>
      </form>

      {(accounts?.length ?? 0) === 0 ? (
        <EmptyState
          title="No accounts yet"
          description="Create a company profile to group its contacts and track purchase history."
          action={
            <Button asChild>
              <Link href="/accounts/new">Add account</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts!.map((a: Account) => (
            <Link key={a.id} href={`/accounts/${a.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium">{a.name}</span>
                      {a.min_level > FEATURE_FLOORS.accounts && (
                        <Lock className="h-3.5 w-3.5 shrink-0 text-gold" aria-label="Director-only" />
                      )}
                    </div>
                    {a.industry && <Badge variant="secondary">{a.industry}</Badge>}
                  </div>
                  {a.locality && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {a.locality}
                    </div>
                  )}
                  {a.phone && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" /> {a.phone}
                    </div>
                  )}
                  {a.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {a.tags.slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
