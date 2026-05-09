"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SEED_CATEGORIES = ["Vegetables", "Fruits", "Grains", "Spices", "Dairy"];

export function CreateWorkspaceForm() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [seed, setSeed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data: orgId, error: rpcErr } = await supabase.rpc("create_workspace", {
      workspace_name: name.trim() || "My workspace",
    } as never);

    if (rpcErr || !orgId) {
      setError(rpcErr?.message || "Could not create workspace.");
      setLoading(false);
      return;
    }

    if (seed) {
      await supabase
        .from("categories")
        .insert(
          SEED_CATEGORIES.map((cat) => ({
            org_id: orgId as unknown as string,
            name: cat,
          })) as never
        );
    }

    // Flip the active-workspace cookie to the new org so the dashboard
    // immediately reflects it.
    await fetch("/api/workspace/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    });

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name">Workspace name</Label>
        <Input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sunrise Traders"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={seed}
          onChange={(e) => setSeed(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        Seed default categories (Vegetables, Fruits, Grains, …)
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-between gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create workspace"}
        </Button>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
