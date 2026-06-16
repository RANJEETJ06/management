import { notFound, redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { listOrgMembers } from "@/lib/members";
import { PageHeader } from "@/components/page-header";
import { TicketForm } from "@/components/ticket-form";
import { FEATURE_FLOORS } from "@/lib/levels";
import type { Ticket } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditTicketPage({ params }: { params: { id: string } }) {
  const { orgId, level } = await requireOrg();
  if (level < FEATURE_FLOORS.tickets) redirect("/dashboard");
  const supabase = createClient();

  const [{ data: ticket }, { data: contacts }, { data: accounts }, members] = await Promise.all([
    supabase.from("tickets").select("*").eq("id", params.id).eq("org_id", orgId).maybeSingle<Ticket>(),
    supabase.from("contacts").select("id, name").eq("org_id", orgId).order("name").limit(1000),
    supabase.from("accounts").select("id, name").eq("org_id", orgId).order("name").limit(500),
    listOrgMembers(orgId),
  ]);

  if (!ticket) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ticket`} description={ticket.subject} />
      <TicketForm
        orgId={orgId}
        initial={ticket}
        userLevel={level}
        members={members.map((m) => ({ user_id: m.user_id, email: m.email }))}
        contacts={(contacts ?? []) as { id: string; name: string }[]}
        accounts={(accounts ?? []) as { id: string; name: string }[]}
      />
    </div>
  );
}
