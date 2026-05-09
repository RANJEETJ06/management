import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { DealForm } from "@/components/deal-form";

export default async function NewDealPage() {
  const { orgId } = await requireOrg();
  const supabase = createClient();
  const [{ data: contacts }, { data: categories }] = await Promise.all([
    supabase.from("contacts").select("id, name, type").eq("org_id", orgId).order("name"),
    supabase.from("categories").select("id, name").eq("org_id", orgId).order("name"),
  ]);

  return (
    <div>
      <PageHeader title="New deal" description="Record a firm purchase or sale." />
      <DealForm orgId={orgId} contacts={contacts ?? []} categories={categories ?? []} />
    </div>
  );
}
