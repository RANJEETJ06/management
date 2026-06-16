"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SensitivityField } from "@/components/sensitivity-field";
import { TagInput } from "@/components/tag-input";
import { FEATURE_FLOORS } from "@/lib/levels";
import type { KbArticle } from "@/lib/types";

export function KbArticleForm({
  orgId,
  initial,
  userLevel = FEATURE_FLOORS.tickets,
}: {
  orgId: string;
  initial?: KbArticle;
  userLevel?: number;
}) {
  const router = useRouter();
  const supabase = createClient();
  const editing = Boolean(initial);

  const [form, setForm] = useState({
    title: initial?.title ?? "",
    body: initial?.body ?? "",
    published: initial?.published ?? true,
    min_level: initial?.min_level ?? FEATURE_FLOORS.tickets,
  });
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const table = supabase.from("kb_articles") as any;
    const payload = {
      title: form.title.trim(),
      body: form.body,
      published: form.published,
      tags,
      min_level: form.min_level,
    };

    if (editing) {
      const { error } = await table.update(payload).eq("id", initial!.id);
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push(`/knowledge/${initial!.id}`);
    } else {
      const { data, error } = await table
        .insert({ ...payload, org_id: orgId })
        .select("id")
        .single();
      if (error || !data) {
        setError(error?.message || "Could not save");
        setLoading(false);
        return;
      }
      router.push(`/knowledge/${(data as { id: string }).id}`);
    }
    router.refresh();
  }

  async function remove() {
    if (!editing) return;
    if (!confirm("Delete this article?")) return;
    setLoading(true);
    const { error } = await (supabase.from("kb_articles") as any).delete().eq("id", initial!.id);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/knowledge");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4">
      <div className="space-y-1">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="body">Body</Label>
        <Textarea
          id="body"
          rows={12}
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
        />
      </div>

      <div className="space-y-1">
        <Label>Tags</Label>
        <TagInput value={tags} onChange={setTags} placeholder="how-to, billing, returns…" />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.published}
          onChange={(e) => setForm({ ...form, published: e.target.checked })}
          className="h-4 w-4 rounded border-input"
        />
        Published (visible to the team)
      </label>

      <SensitivityField
        userLevel={userLevel}
        floor={FEATURE_FLOORS.tickets}
        value={form.min_level}
        onChange={(min_level) => setForm({ ...form, min_level })}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? "Saving…" : editing ? "Save changes" : "Publish article"}
        </Button>
        {editing && (
          <Button
            type="button"
            variant="destructive"
            onClick={remove}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Delete
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
