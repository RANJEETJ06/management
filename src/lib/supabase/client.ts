"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        name: "sb-auth",
        lifetime: 60 * 60 * 24 * 7,
        domain: undefined,
        path: "/",
        sameSite: "lax",
        secure: true,
      },
    }
  );
}
