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
    return NextResponse.json(
      { error: "orgId and email are required." },
      { status: 400 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Confirm caller is owner/admin of this org. RLS would also block the insert,
  // but we check up-front so we can return a clear 403.
  const { data: callerMembership } = await supabase
    .from("members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  const callerRole = (callerMembership as { role?: string } | null)?.role;
  if (callerRole !== "owner" && callerRole !== "admin") {
    return NextResponse.json(
      { error: "Only owners or admins can invite." },
      { status: 403 }
    );
  }

  // Org name — used in the success message and in the email subject (when sent
  // via Supabase auth, the email comes from your project's branded template).
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .maybeSingle();
  const orgName = (org as { name?: string } | null)?.name ?? "your workspace";

  // Upsert the invitation row. Unique key (org_id, email) — if a pending invite
  // already exists, refresh its role and timestamp.
  const { error: invErr } = await supabase
    .from("invitations")
    .upsert(
      {
        org_id: orgId,
        email,
        role,
        invited_by: user.id,
        accepted_at: null,
      } as never,
      { onConflict: "org_id,email" }
    );
  if (invErr) {
    return NextResponse.json({ error: invErr.message }, { status: 400 });
  }

  // Now try to deliver. Two paths:
  //   1. Brand-new email -> auth.admin.inviteUserByEmail() creates the user and
  //      sends Supabase's invite email. When they confirm, the on_auth_user_created
  //      trigger auto-attaches them to the org.
  //   2. Email already has an account -> the trigger never fires for them again,
  //      so we add them to public.members directly via the admin client.
  const admin = createAdminClient();
  const base = siteUrl() ?? new URL(request.url).origin;
  const redirectTo = `${base}/auth/callback?next=${encodeURIComponent("/dashboard")}`;
  const fallbackLink = `${base}/login?email=${encodeURIComponent(email)}`;

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
      msg.includes("already") ||
      msg.includes("registered") ||
      msg.includes("exists");

    if (!isExisting) {
      // Real failure (rate limit, SMTP not configured, etc). Don't fail the
      // whole request — the row is in place and the inviter can share the link.
      return NextResponse.json({
        ok: true,
        emailed: false,
        alreadyExisted: false,
        inviteLink: fallbackLink,
        warning: `Invitation saved, but email could not be sent: ${inviteErr.message}`,
      });
    }

    alreadyExisted = true;

    // Look up the user_id and attach them right now.
    const { data: existingUserId, error: lookupErr } = await admin.rpc(
      "find_user_id_by_email",
      { p_email: email } as never
    );

    if (!lookupErr && existingUserId) {
      const { error: memberErr } = await admin.from("members").upsert(
        {
          org_id: orgId,
          user_id: existingUserId as unknown as string,
          role,
        } as never,
        { onConflict: "org_id,user_id" }
      );

      if (!memberErr) {
        await admin
          .from("invitations")
          .update({ accepted_at: new Date().toISOString() } as never)
          .eq("org_id", orgId)
          .eq("email", email);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    emailed,
    alreadyExisted,
    inviteLink: fallbackLink,
    message: alreadyExisted
      ? `${email} already had an account — they've been added to ${orgName}. Share the link below so they can log in.`
      : emailed
      ? `Invitation email sent to ${email}. They'll join ${orgName} after confirming.`
      : `Invitation saved. Share the link below with ${email} to get them in.`,
  });
}
