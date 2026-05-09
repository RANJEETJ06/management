import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resolveActiveOrg, type Membership } from "@/lib/active-org";

/**
 * Returns { user, orgId, role, memberships } for the current request.
 *
 * Redirects:
 *   - /login        if not authenticated
 *   - /invitations  if no membership but at least one pending invitation exists
 *   - /onboarding   if no memberships and no invitations
 */
export async function requireOrg(): Promise<{
  user: { id: string; email: string | null };
  orgId: string;
  role: string;
  memberships: Membership[];
}> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { activeOrgId, activeRole, memberships } = await resolveActiveOrg(user.id);

  if (!activeOrgId) {
    // No memberships — see if a pending invitation is waiting for them.
    const { data: pending } = await supabase
      .rpc("my_pending_invitations")
      .returns<unknown[]>();
    if (pending && pending.length > 0) redirect("/invitations");
    redirect("/onboarding");
  }

  return {
    user: { id: user.id, email: user.email ?? null },
    orgId: activeOrgId,
    role: activeRole ?? "member",
    memberships,
  };
}
