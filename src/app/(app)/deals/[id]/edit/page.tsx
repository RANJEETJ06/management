import { notFound, redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { DealForm } from "@/components/deal-form";
import { listOrgMembers } from "@/lib/members";

export default async function EditDealPage({ params }: { params: { id: string } }) {
  const { user, orgId, role, level } = await requireOrg();
  if (role === "member") redirect(`/deals/${params.id}`);
  const supabase = createClient();

  const [{ data: deal }, { data: items }, { data: contacts }, { data: categories }, allMembers] =
    await Promise.all([
      supabase.from("deals").select("*").eq("id", params.id).eq("org_id", orgId).maybeSingle(),
      supabase.from("deal_items").select("*").eq("deal_id", params.id),
      supabase.from("contacts").select("id, name, type").eq("org_id", orgId).order("name"),
      supabase.from("categories").select("id, name").eq("org_id", orgId).order("name"),
      listOrgMembers(orgId),
    ]);

  if (!deal) notFound();
  const members = allMembers.filter((m) => m.user_id !== user.id);

  return (
    <div>
      <PageHeader title="Edit deal" />
      <DealForm
        orgId={orgId}
        contacts={contacts ?? []}
        categories={categories ?? []}
        initial={deal}
        initialItems={items ?? []}
        userLevel={level}
        members={members}
      />
    </div>
  );
}
