import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Lock, BookOpen } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { FEATURE_FLOORS } from "@/lib/levels";
import type { KbArticle } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: { q?: string; tag?: string };
}) {
  const { orgId, level } = await requireOrg();
  if (level < FEATURE_FLOORS.tickets) redirect("/dashboard");
  const supabase = createClient();

  let query = supabase
    .from("kb_articles")
    .select("id, title, tags, published, updated_at, min_level")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (searchParams.q) {
    const q = searchParams.q.replace(/[%_]/g, "\\$&");
    query = query.ilike("title", `%${q}%`);
  }
  if (searchParams.tag) query = query.contains("tags", [searchParams.tag]);

  const { data: articles } = await query.returns<KbArticle[]>();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge base"
        description="Internal how-tos and answers for the team."
        action={
          <Button asChild>
            <Link href="/knowledge/new">
              <Plus className="h-4 w-4" /> New article
            </Link>
          </Button>
        }
      />

      <form className="flex flex-col gap-2 sm:flex-row">
        <input
          name="q"
          placeholder="Search titles…"
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

      {(articles?.length ?? 0) === 0 ? (
        <EmptyState
          title="No articles yet"
          description="Capture a repeatable answer once and reuse it across the team."
          action={
            <Button asChild>
              <Link href="/knowledge/new">New article</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {articles!.map((a) => (
            <Link key={a.id} href={`/knowledge/${a.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium">{a.title}</span>
                      {a.min_level > FEATURE_FLOORS.tickets && (
                        <Lock className="h-3.5 w-3.5 shrink-0 text-gold" />
                      )}
                    </div>
                    {!a.published && <Badge variant="muted">Draft</Badge>}
                  </div>
                  {a.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
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
                  <div className="text-xs text-muted-foreground">
                    Updated {formatDate(a.updated_at.slice(0, 10))}
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
