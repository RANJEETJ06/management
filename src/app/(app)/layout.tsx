import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveActiveOrg } from "@/lib/active-org";
import { Nav } from "@/components/nav";
import type { PendingInvitation } from "@/lib/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { activeOrgId, activeRole, memberships } = await resolveActiveOrg(user.id);

  if (!activeOrgId) {
    // No memberships — see if any pending invitation is waiting.
    const { data: pending } = await supabase.rpc("my_pending_invitations");
    if (((pending ?? []) as PendingInvitation[]).length > 0) redirect("/invitations");
    redirect("/onboarding");
  }

  // Pending-invitation count for the switcher badge.
  const { data: pendingRows } = await supabase.rpc("my_pending_invitations");
  const pendingCount = ((pendingRows ?? []) as PendingInvitation[]).length;

  return (
    <div className="min-h-screen">
      <Nav
        memberships={memberships}
        activeOrgId={activeOrgId}
        activeRole={activeRole ?? "member"}
        pendingCount={pendingCount}
        userEmail={user.email ?? ""}
      />
      <main className="md:pl-64">
        <div className="container max-w-6xl px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
