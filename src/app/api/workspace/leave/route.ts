import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clearActiveOrgCookie } from "@/lib/active-org";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { orgId } = (await request.json().catch(() => ({}))) as { orgId?: string };
  if (!orgId) {
    return NextResponse.json({ error: "orgId is required." }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: membership } = await supabase
    .from("members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .maybeSingle<{ role: string }>();

  if (!membership) {
    return NextResponse.json(
      { error: "You are not a member of that workspace." },
      { status: 403 }
    );
  }
  if (membership.role === "owner") {
    return NextResponse.json(
      { error: "Owners can't leave their own workspace." },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("members")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  clearActiveOrgCookie();
  return NextResponse.json({ ok: true });
}
