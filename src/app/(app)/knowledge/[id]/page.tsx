import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pencil, Lock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { FEATURE_FLOORS, sensitivityTag } from "@/lib/levels";
import type { KbArticle } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ArticlePage({ params }: { params: { id: string } }) {
  const { orgId, level, role } = await requireOrg();
  if (level < FEATURE_FLOORS.tickets) redirect("/dashboard");
  const canEdit = role !== "member";
  const supabase = createClient();

  const { data: article } = await supabase
    .from("kb_articles")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", orgId)
    .maybeSingle<KbArticle>();

  if (!article) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={article.title}
        description={`Updated ${formatDate(article.updated_at.slice(0, 10))}`}
        action={
          canEdit && (
            <Button asChild variant="outline">
              <Link href={`/knowledge/${article.id}/edit`}>
                <Pencil className="h-4 w-4" /> Edit
              </Link>
            </Button>
          )
        }
      />

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            {!article.published && <Badge variant="muted">Draft</Badge>}
            {article.min_level > FEATURE_FLOORS.tickets && (
              <Badge variant="warn" className="gap-1">
                <Lock className="h-3 w-3" /> {sensitivityTag(article.min_level)}
              </Badge>
            )}
            {article.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground"
              >
                {t}
              </span>
            ))}
          </div>
          <article className="whitespace-pre-wrap text-sm leading-relaxed">
            {article.body || <span className="text-muted-foreground">No content yet.</span>}
          </article>
        </CardContent>
      </Card>
    </div>
  );
}
