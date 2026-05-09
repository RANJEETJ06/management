import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setActiveOrgCookie } from "@/lib/active-org";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { invitationId } = (await request.json().catch(() => ({}))) as {
    invitationId?: string;
  };
  if (!invitationId) {
    return NextResponse.json({ error: "invitationId is required." }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: orgId, error } = await supabase.rpc("accept_invitation", {
    p_invitation_id: invitationId,
  } as never);

  if (error || !orgId) {
    return NextResponse.json(
      { error: error?.message ?? "Could not accept invitation." },
      { status: 400 }
    );
  }

  setActiveOrgCookie(orgId as unknown as string);

  return NextResponse.json({ ok: true, orgId });
}
