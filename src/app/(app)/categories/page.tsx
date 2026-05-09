import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { CategoriesManager } from "./categories-manager";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const { orgId, role } = await requireOrg();
  const canEdit = role !== "member";
  const supabase = createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, parent_id")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Tags you can apply to interactions and deals (vegetables, fruits, etc.)."
      />
      <CategoriesManager orgId={orgId} initial={categories ?? []} canEdit={canEdit} />
    </div>
  );
}
