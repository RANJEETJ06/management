import { notFound, redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { KbArticleForm } from "@/components/kb-article-form";
import { FEATURE_FLOORS } from "@/lib/levels";
import type { KbArticle } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditArticlePage({ params }: { params: { id: string } }) {
  const { orgId, level } = await requireOrg();
  if (level < FEATURE_FLOORS.tickets) redirect("/dashboard");
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
      <PageHeader title={`Edit article`} description={article.title} />
      <KbArticleForm orgId={orgId} initial={article} userLevel={level} />
    </div>
  );
}
