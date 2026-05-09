import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setActiveOrgCookie } from "@/lib/active-org";

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

  // Verify membership before flipping the cookie.
  const { data: membership } = await supabase
    .from("members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { error: "You are not a member of that workspace." },
      { status: 403 }
    );
  }

  setActiveOrgCookie(orgId);
  return NextResponse.json({ ok: true, orgId });
}
