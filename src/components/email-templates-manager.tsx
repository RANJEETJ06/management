"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Pencil, X } from "lucide-react";

export type TemplateRow = { id: string; name: string; subject: string | null; body: string };

export function EmailTemplatesManager({
  orgId,
  initial,
}: {
  orgId: string;
  initial: TemplateRow[];
}) {
  const supabase = createClient();
  const [templates, setTemplates] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", subject: "", body: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setEditingId(null);
    setForm({ name: "", subject: "", body: "" });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Give the template a name.");
      return;
    }
    setBusy(true);
    setError("");
    const payload = {
      name: form.name.trim(),
      subject: form.subject.trim() || null,
      body: form.body,
    };
    if (editingId) {
      const { error } = await (supabase.from("email_templates") as any)
        .update(payload)
        .eq("id", editingId);
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      setTemplates((ts) => ts.map((t) => (t.id === editingId ? { ...t, ...payload } : t)));
    } else {
      const { data, error } = await (supabase.from("email_templates") as any)
        .insert({ ...payload, org_id: orgId })
        .select("id, name, subject, body")
        .single();
      if (error || !data) {
        setError(error?.message ?? "Could not save template.");
        setBusy(false);
        return;
      }
      setTemplates((ts) => [data as TemplateRow, ...ts]);
    }
    setBusy(false);
    reset();
  }

  function edit(t: TemplateRow) {
    setEditingId(t.id);
    setForm({ name: t.name, subject: t.subject ?? "", body: t.body });
  }

  async function remove(id: string) {
    if (!confirm("Delete this template?")) return;
    const prev = templates;
    setTemplates((ts) => ts.filter((t) => t.id !== id));
    if (editingId === id) reset();
    const { error } = await (supabase.from("email_templates") as any).delete().eq("id", id);
    if (error) {
      setError(error.message);
      setTemplates(prev);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardContent className="p-4">
          <form onSubmit={save} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {editingId ? "Edit template" : "New template"}
              </h2>
              {editingId && (
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" /> Cancel
                </button>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="t-name">Name *</Label>
              <Input
                id="t-name"
                placeholder="e.g. Quotation follow-up"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="t-subject">Subject</Label>
              <Input
                id="t-subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="t-body">Body</Label>
              <Textarea
                id="t-body"
                rows={6}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={busy}>
                <Plus className="h-4 w-4" /> {busy ? "Saving…" : editingId ? "Save" : "Add template"}
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2 lg:col-span-3">
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No templates yet — create one to reuse when logging communications.
          </p>
        ) : (
          templates.map((t) => (
            <div key={t.id} className="group rounded-md border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{t.name}</div>
                  {t.subject && (
                    <div className="text-sm text-muted-foreground">{t.subject}</div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => edit(t)}
                    aria-label="Edit"
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(t.id)}
                    aria-label="Delete"
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {t.body && (
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {t.body}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
