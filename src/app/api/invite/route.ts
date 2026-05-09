import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  orgId?: string;
  email?: string;
  role?: "member" | "admin";
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const orgId = body.orgId?.trim();
  const email = body.email?.trim().toLowerCase();
  const role = body.role === "admin" ? "admin" : "member";

  if (!orgId || !email) {
    return NextResponse.json({ error: "orgId and email are required." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  // Confirm caller is owner/admin of this org.
  const { data: callerMembership } = await supabase
    .from("members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  const callerRole = (callerMembership as { role?: string } | null)?.role;
  if (callerRole !== "owner" && callerRole !== "admin") {
    return NextResponse.json({ error: "Only owners or admins can invite." }, { status: 403 });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .maybeSingle();
  const orgName = (org as { name?: string } | null)?.name ?? "your workspace";

  // Upsert the invitation row. Reset accepted_at/declined_at so a previously
  // declined invite can be re-issued.
  const { error: invErr } = await supabase
    .from("invitations")
    .upsert(
      {
        org_id: orgId,
        email,
        role,
        invited_by: user.id,
        accepted_at: null,
        declined_at: null,
      } as never,
      { onConflict: "org_id,email" }
    );
  if (invErr) {
    return NextResponse.json({ error: invErr.message }, { status: 400 });
  }

  // Send notification email. NEVER auto-attach: the invitee must explicitly
  // accept on /invitations, regardless of whether they already have an account.
  const admin = createAdminClient();
  const base = siteUrl() ?? new URL(request.url).origin;
  const redirectTo = `${base}/auth/callback?next=${encodeURIComponent("/invitations")}`;
  const fallbackLink = `${base}/login?next=${encodeURIComponent("/invitations")}&email=${encodeURIComponent(email)}`;

  let emailed = false;
  let alreadyExisted = false;

  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { invited_to_org: orgName },
  });

  if (!inviteErr) {
    emailed = true;
  } else {
    const msg = inviteErr.message?.toLowerCase() ?? "";
    const isExisting =
      msg.includes("already") || msg.includes("registered") || msg.includes("exists");

    if (!isExisting) {
      return NextResponse.json({
        ok: true,
        emailed: false,
        alreadyExisted: false,
        inviteLink: fallbackLink,
        warning: `Invitation saved, but email could not be sent: ${inviteErr.message}`,
      });
    }

    alreadyExisted = true;

    // Existing user: try to send a magic-link login email so they land on
    // /invitations next. If SMTP isn't configured this will fail silently —
    // the inviter still has the fallback link to share manually.
    try {
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo },
      } as never);
      emailed = true;
    } catch {
      // Ignored — the link below works whether or not the email arrived.
    }
  }

  return NextResponse.json({
    ok: true,
    emailed,
    alreadyExisted,
    inviteLink: fallbackLink,
    message: alreadyExisted
      ? `${email} already has an account. They'll see the invitation on the Invitations page next time they log in — share the link below if you want them to act now.`
      : emailed
      ? `Invitation email sent to ${email}. They'll see the workspace after they log in and accept.`
      : `Invitation saved. Share the link below with ${email} to get them in.`,
  });
}
