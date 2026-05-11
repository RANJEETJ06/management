"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Why client-side: Netlify deploy preview URLs change per deploy and can't be
// pre-registered in Supabase Redirect URLs. A server route also has flaky
// cookie behaviour on serverless cold starts. Exchanging in the browser uses
// the PKCE code_verifier already stored in cookies and writes the session to
// cookies the SSR helpers can read on the next request.
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const next = params.get("next") || "/dashboard";

    if (!code) {
      router.replace("/login");
      return;
    }

    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setError(error.message);
        return;
      }
      router.replace(next);
      router.refresh();
    });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {error ? (
        <div className="max-w-sm space-y-3 text-center">
          <p className="text-sm text-destructive">Sign-in failed: {error}</p>
          <a href="/login" className="text-sm text-primary underline">
            Back to sign in
          </a>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      )}
    </div>
  );
}
