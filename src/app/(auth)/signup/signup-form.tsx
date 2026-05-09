"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { siteUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const router = useRouter();
  const supabase = createClient();
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"password" | "google" | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const redirectTo = `${siteUrl()}/auth/callback?next=${encodeURIComponent("/onboarding?business=" + encodeURIComponent(businessName))}`;

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading("password");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: { business_name: businessName },
      },
    });

    setLoading(null);
    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      // Email confirmation disabled in Supabase project — go straight to onboarding.
      router.push(`/onboarding?business=${encodeURIComponent(businessName)}`);
      router.refresh();
    } else {
      setInfo("Check your email to confirm your account.");
    }
  }

  async function signUpWithGoogle() {
    setError("");
    setLoading("google");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setError(error.message);
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={signUpWithGoogle}
        disabled={loading !== null}
      >
        Continue with Google
      </Button>

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <form onSubmit={signUp} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="business">Business / workspace name</Label>
          <Input
            id="business"
            placeholder="Acme Traders"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {info && <p className="text-sm text-emerald-700">{info}</p>}

        <Button type="submit" className="w-full" disabled={loading !== null}>
          {loading === "password" ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </div>
  );
}
