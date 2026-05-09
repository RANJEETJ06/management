import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { InteractionForm } from "@/components/interaction-form";

export default async function EditInteractionPage({ params }: { params: { id: string } }) {
  const { orgId } = await requireOrg();
  const supabase = createClient();

  const [{ data: row }, { data: items }, { data: contacts }, { data: categories }] = await Promise.all([
    supabase.from("interactions").select("*").eq("id", params.id).eq("org_id", orgId).maybeSingle(),
    supabase.from("interaction_items").select("*").eq("interaction_id", params.id),
    supabase.from("contacts").select("id, name, type").eq("org_id", orgId).order("name"),
    supabase.from("categories").select("id, name").eq("org_id", orgId).order("name"),
  ]);

  if (!row) notFound();

  return (
    <div>
      <PageHeader title="Edit interaction" />
      <InteractionForm
        orgId={orgId}
        contacts={contacts ?? []}
        categories={categories ?? []}
        initial={row}
        initialItems={items ?? []}
      />
    </div>
  );
}
