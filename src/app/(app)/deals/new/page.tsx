import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { DealForm } from "@/components/deal-form";
import { listOrgMembers } from "@/lib/members";

export default async function NewDealPage() {
  const { user, orgId, role, level } = await requireOrg();
  if (role === "member") redirect("/deals");
  const supabase = createClient();
  const [{ data: contacts }, { data: categories }, allMembers] = await Promise.all([
    supabase.from("contacts").select("id, name, type").eq("org_id", orgId).order("name"),
    supabase.from("categories").select("id, name").eq("org_id", orgId).order("name"),
    listOrgMembers(orgId),
  ]);
  const members = allMembers.filter((m) => m.user_id !== user.id);

  return (
    <div>
      <PageHeader title="New deal" description="Record a firm purchase or sale." />
      <DealForm
        orgId={orgId}
        contacts={contacts ?? []}
        categories={categories ?? []}
        userLevel={level}
        members={members}
      />
    </div>
  );
}
