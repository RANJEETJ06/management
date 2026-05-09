import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Returns { user, orgId } for the current request.
 * Redirects to /login if not authenticated, or /onboarding if user has no org.
 */
export async function requireOrg() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: members } = await supabase
    .from("members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);

  const membership = members?.[0];
  if (!membership) redirect("/onboarding");

  return { user, orgId: membership.org_id, role: membership.role };
}
