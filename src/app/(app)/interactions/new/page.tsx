import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { InteractionForm } from "@/components/interaction-form";

export default async function NewInteractionPage({
  searchParams,
}: {
  searchParams: { contact?: string };
}) {
  const { orgId } = await requireOrg();
  const supabase = createClient();

  const [{ data: contacts }, { data: categories }] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, name, type")
      .eq("org_id", orgId)
      .order("name", { ascending: true }),
    supabase
      .from("categories")
      .select("id, name")
      .eq("org_id", orgId)
      .order("name", { ascending: true }),
  ]);

  return (
    <div>
      <PageHeader title="Log interaction" description="A diary entry for a conversation or meeting." />
      <InteractionForm
        orgId={orgId}
        contacts={contacts ?? []}
        categories={categories ?? []}
        defaultContactId={searchParams.contact}
      />
    </div>
  );
}
