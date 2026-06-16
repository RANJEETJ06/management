import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type OrgMember = {
  user_id: string;
  email: string;
  role: string;
  level: number;
};

/**
 * List the members of an org with a human-readable label (email). Emails live
 * in auth.users, so we resolve them with the service-role admin client. If the
 * service key isn't configured we fall back to a shortened user id so the
 * picker still works (just less friendly).
 */
export async function listOrgMembers(orgId: string): Promise<OrgMember[]> {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("members")
    .select("user_id, role, level")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  const members = (rows ?? []) as { user_id: string; role: string; level: number }[];

  let admin: ReturnType<typeof createAdminClient> | null = null;
  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }

  const out: OrgMember[] = [];
  for (const m of members) {
    let email = `${m.user_id.slice(0, 8)}…`;
    if (admin) {
      try {
        const { data } = await admin.auth.admin.getUserById(m.user_id);
        if (data?.user?.email) email = data.user.email;
      } catch {
        // keep the fallback label
      }
    }
    out.push({ user_id: m.user_id, email, role: m.role, level: m.level });
  }
  return out;
}
