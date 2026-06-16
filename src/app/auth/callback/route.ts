import { createClient } from "@/lib/supabase/server";
import { safeRelativePath } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");
  // Sanitize: `next` is attacker-controllable in the link, so only allow
  // same-site paths — never an absolute/protocol-relative URL.
  const next = safeRelativePath(requestUrl.searchParams.get("next"), "/dashboard");

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Why: on Netlify, `request.url` resolves to the deploy-specific permalink
  // (e.g. <hash>--micromanagement.netlify.app), so redirects built against it
  // send the browser to a different origin where the session cookie isn't
  // present. Anchor the redirect to NEXT_PUBLIC_SITE_URL so we stay on the
  // canonical domain.
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? requestUrl.origin;
  return NextResponse.redirect(new URL(next, base));
}
