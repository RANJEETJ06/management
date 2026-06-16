import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { listOrgMembers } from "@/lib/members";
import { PageHeader } from "@/components/page-header";
import { LeadForm } from "@/components/lead-form";
import { FEATURE_FLOORS } from "@/lib/levels";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  const { orgId, level } = await requireOrg();
  if (level < FEATURE_FLOORS.leads) redirect("/dashboard");
  const supabase = createClient();

  const [{ data: contacts }, { data: accounts }, members] = await Promise.all([
    supabase.from("contacts").select("id, name").eq("org_id", orgId).order("name").limit(500),
    supabase.from("accounts").select("id, name").eq("org_id", orgId).order("name").limit(500),
    listOrgMembers(orgId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="New lead" description="Capture a sales opportunity." />
      <LeadForm
        orgId={orgId}
        userLevel={level}
        members={members.map((m) => ({ user_id: m.user_id, email: m.email }))}
        contacts={(contacts ?? []) as { id: string; name: string }[]}
        accounts={(accounts ?? []) as { id: string; name: string }[]}
      />
    </div>
  );
}
