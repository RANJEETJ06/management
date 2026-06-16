import { notFound, redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { listOrgMembers } from "@/lib/members";
import { PageHeader } from "@/components/page-header";
import { LeadForm } from "@/components/lead-form";
import { FEATURE_FLOORS } from "@/lib/levels";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditLeadPage({ params }: { params: { id: string } }) {
  const { orgId, level } = await requireOrg();
  if (level < FEATURE_FLOORS.leads) redirect("/dashboard");
  const supabase = createClient();

  const [{ data: lead }, { data: contacts }, { data: accounts }, members] = await Promise.all([
    supabase.from("leads").select("*").eq("id", params.id).eq("org_id", orgId).maybeSingle<Lead>(),
    supabase.from("contacts").select("id, name").eq("org_id", orgId).order("name").limit(500),
    supabase.from("accounts").select("id, name").eq("org_id", orgId).order("name").limit(500),
    listOrgMembers(orgId),
  ]);

  if (!lead) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${lead.name}`} description="Update this lead." />
      <LeadForm
        orgId={orgId}
        initial={lead}
        userLevel={level}
        members={members.map((m) => ({ user_id: m.user_id, email: m.email }))}
        contacts={(contacts ?? []) as { id: string; name: string }[]}
        accounts={(accounts ?? []) as { id: string; name: string }[]}
      />
    </div>
  );
}
