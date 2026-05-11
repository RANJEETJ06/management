import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { TeamManager } from "./team-manager";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const { user, orgId, role } = await requireOrg();
  const supabase = createClient();

  // Members + their auth.users info come via separate queries; the simplest
  // membership listing uses the members table with the user's email pulled
  // from auth metadata if you wire it up later. For now we show user_id only
  // and rely on invitations for the human-readable address.
  const [{ data: members }, { data: invitations }] = await Promise.all([
    supabase
      .from("members")
      .select("user_id, role, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true }),
    supabase
      .from("invitations")
      .select("id, email, role, accepted_at, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
  ]);

  const canManage = role === "owner" || role === "admin";

  return (
    <div>
      <PageHeader
        title="Team"
        description="Invite teammates by email or share the invite link directly. They'll join your workspace as soon as they log in."
      />
      <TeamManager
        orgId={orgId}
        currentUserId={user.id}
        canManage={canManage}
        members={members ?? []}
        invitations={invitations ?? []}
      />
    </div>
  );
}
