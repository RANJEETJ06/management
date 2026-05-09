import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const ACTIVE_ORG_COOKIE = "active_org_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export type Membership = { org_id: string; role: string; org_name: string };

/**
 * Resolve the active workspace for the current user.
 *
 *   1. Read `active_org_id` cookie. If set AND the user is still a member, use it.
 *   2. Otherwise pick their oldest membership.
 *   3. Otherwise return null — caller must redirect to /invitations or /onboarding.
 *
 * Also returns every workspace the user belongs to so callers can render a
 * switcher without a second round-trip.
 */
export async function resolveActiveOrg(userId: string): Promise<{
  activeOrgId: string | null;
  activeRole: string | null;
  memberships: Membership[];
}> {
  const supabase = createClient();

  const { data: rows } = await supabase
    .from("members")
    .select("org_id, role, organizations(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const memberships: Membership[] = (rows ?? []).map((r: any) => ({
    org_id: r.org_id,
    role: r.role,
    org_name: r.organizations?.name ?? "Workspace",
  }));

  if (memberships.length === 0) {
    return { activeOrgId: null, activeRole: null, memberships };
  }

  const cookieOrg = cookies().get(ACTIVE_ORG_COOKIE)?.value;
  const fromCookie = memberships.find((m) => m.org_id === cookieOrg);
  const chosen = fromCookie ?? memberships[0];

  return {
    activeOrgId: chosen.org_id,
    activeRole: chosen.role,
    memberships,
  };
}

/**
 * Set the active-workspace cookie. Server actions and route handlers can
 * call this; server components cannot mutate cookies, so layouts/pages must
 * not.
 */
export function setActiveOrgCookie(orgId: string) {
  cookies().set({
    name: ACTIVE_ORG_COOKIE,
    value: orgId,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearActiveOrgCookie() {
  cookies().set({
    name: ACTIVE_ORG_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  });
}

export const ACTIVE_ORG_COOKIE_NAME = ACTIVE_ORG_COOKIE;
