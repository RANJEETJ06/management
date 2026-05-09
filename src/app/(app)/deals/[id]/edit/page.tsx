import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { DealForm } from "@/components/deal-form";

export default async function EditDealPage({ params }: { params: { id: string } }) {
  const { orgId } = await requireOrg();
  const supabase = createClient();

  const [{ data: deal }, { data: items }, { data: contacts }, { data: categories }] = await Promise.all([
    supabase.from("deals").select("*").eq("id", params.id).eq("org_id", orgId).maybeSingle(),
    supabase.from("deal_items").select("*").eq("deal_id", params.id),
    supabase.from("contacts").select("id, name, type").eq("org_id", orgId).order("name"),
    supabase.from("categories").select("id, name").eq("org_id", orgId).order("name"),
  ]);

  if (!deal) notFound();

  return (
    <div>
      <PageHeader title="Edit deal" />
      <DealForm
        orgId={orgId}
        contacts={contacts ?? []}
        categories={categories ?? []}
        initial={deal}
        initialItems={items ?? []}
      />
    </div>
  );
}
