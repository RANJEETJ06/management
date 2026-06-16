import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { PageHeader } from "@/components/page-header";
import { KbArticleForm } from "@/components/kb-article-form";
import { FEATURE_FLOORS } from "@/lib/levels";

export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  const { orgId, level } = await requireOrg();
  if (level < FEATURE_FLOORS.tickets) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <PageHeader title="New article" description="Add to the knowledge base." />
      <KbArticleForm orgId={orgId} userLevel={level} />
    </div>
  );
}
