"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import type { Category } from "@/lib/types";

type CategoryRow = Pick<Category, "id" | "name" | "parent_id">;

export function CategoriesManager({
  orgId,
  initial,
}: {
  orgId: string;
  initial: CategoryRow[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [rows, setRows] = useState<CategoryRow[]>(initial);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    setBusy(true);
    const { data, error } = await supabase
      .from("categories")
      .insert({ org_id: orgId, name: name.trim() } as any)//any added for production
      .select("id, name, parent_id")
      .single();
    setBusy(false);
    if (error || !data) {
      setError(error?.message ?? "Could not save");
      return;
    }
    setRows((r) => [...r, data].sort((a, b) => a.name.localeCompare(b.name)));
    setName("");
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this category? Items tagged with it will be untagged.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setRows((r) => r.filter((row) => row.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-xl">
      <Card>
        <CardContent className="p-4">
          <form onSubmit={add} className="flex gap-2">
            <Input
              placeholder="New category (e.g. Leafy greens)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button type="submit" disabled={busy}>
              Add
            </Button>
          </form>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No categories yet.</p>
      ) : (
        <div className="rounded-md border bg-card divide-y">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between px-4 py-2">
              <span className="text-sm">{row.name}</span>
              <Button variant="ghost" size="icon" onClick={() => remove(row.id)} aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
