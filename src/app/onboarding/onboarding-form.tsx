"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SEED_CATEGORIES = ["Vegetables", "Fruits", "Grains", "Spices", "Dairy"];

export function OnboardingForm({
  defaultName,
  userEmail,
}: {
  defaultName: string;
  userEmail: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState(defaultName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Session expired. Please log in again.");
      setLoading(false);
      return;
    }

    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .insert({ name: name.trim() || `${userEmail.split("@")[0]}'s workspace`, owner_id: user.id })
      .select("id")
      .single();

    if (orgErr || !org) {
      setError(orgErr?.message || "Could not create workspace.");
      setLoading(false);
      return;
    }

    const { error: memErr } = await supabase
      .from("members")
      .insert({ org_id: org.id, user_id: user.id, role: "owner" });

    if (memErr) {
      setError(memErr.message);
      setLoading(false);
      return;
    }

    // Seed default categories so the user has something to tag against.
    await supabase.from("categories").insert(
      SEED_CATEGORIES.map((cat) => ({ org_id: org.id, name: cat }))
    );

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name">Business name</Label>
        <Input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sunrise Traders"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Setting up…" : "Create workspace"}
      </Button>
    </form>
  );
}
