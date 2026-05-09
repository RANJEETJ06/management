"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import type {
  Channel,
  Category,
  Contact,
  Interaction,
  InteractionItem,
  InteractionStatus,
} from "@/lib/types";

type LineItem = {
  id?: string;
  category_id: string | null;
  item_name: string;
  quantity: string;
  unit: string;
  price_per_unit: string;
  notes: string;
};

const emptyItem = (): LineItem => ({
  category_id: null,
  item_name: "",
  quantity: "",
  unit: "kg",
  price_per_unit: "",
  notes: "",
});

export function InteractionForm({
  orgId,
  contacts,
  categories,
  initial,
  initialItems,
  defaultContactId,
}: {
  orgId: string;
  contacts: Pick<Contact, "id" | "name" | "type">[];
  categories: Pick<Category, "id" | "name">[];
  initial?: Interaction;
  initialItems?: InteractionItem[];
  defaultContactId?: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const editing = Boolean(initial);

  const [form, setForm] = useState({
    contact_id: initial?.contact_id ?? defaultContactId ?? "",
    occurred_on: initial?.occurred_on ?? new Date().toISOString().slice(0, 10),
    location: initial?.location ?? "",
    channel: (initial?.channel ?? "in_person") as Channel,
    summary: initial?.summary ?? "",
    follow_up_on: initial?.follow_up_on ?? "",
    status: (initial?.status ?? "open") as InteractionStatus,
  });

  const [items, setItems] = useState<LineItem[]>(
    initialItems && initialItems.length > 0
      ? initialItems.map((i) => ({
          id: i.id,
          category_id: i.category_id,
          item_name: i.item_name ?? "",
          quantity: i.quantity != null ? String(i.quantity) : "",
          unit: i.unit ?? "kg",
          price_per_unit: i.price_per_unit != null ? String(i.price_per_unit) : "",
          notes: i.notes ?? "",
        }))
      : [emptyItem()]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }
  function removeItem(idx: number) {
    setItems((prev) => (prev.length === 1 ? [emptyItem()] : prev.filter((_, i) => i !== idx)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      contact_id: form.contact_id || null,
      occurred_on: form.occurred_on,
      location: form.location.trim() || null,
      channel: form.channel,
      summary: form.summary.trim(),
      follow_up_on: form.follow_up_on || null,
      status: form.status,
    };

    let interactionId: string;

    if (editing) {
      const { error } = await supabase.from("interactions").update(payload).eq("id", initial!.id);
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      interactionId = initial!.id;
      // Replace items: easiest correct approach for MVP.
      await supabase.from("interaction_items").delete().eq("interaction_id", interactionId);
    } else {
      const { data, error } = await supabase
        .from("interactions")
        .insert({ ...payload, org_id: orgId })
        .select("id")
        .single();
      if (error || !data) {
        setError(error?.message || "Could not save");
        setLoading(false);
        return;
      }
      interactionId = data.id;
    }

    const itemsToInsert = items
      .filter((it) => it.category_id || it.item_name.trim() || it.quantity || it.notes.trim())
      .map((it) => ({
        interaction_id: interactionId,
        category_id: it.category_id || null,
        item_name: it.item_name.trim() || null,
        quantity: it.quantity ? Number(it.quantity) : null,
        unit: it.unit.trim() || null,
        price_per_unit: it.price_per_unit ? Number(it.price_per_unit) : null,
        notes: it.notes.trim() || null,
      }));

    if (itemsToInsert.length > 0) {
      const { error: itemErr } = await supabase.from("interaction_items").insert(itemsToInsert);
      if (itemErr) {
        setError(itemErr.message);
        setLoading(false);
        return;
      }
    }

    router.push(`/interactions/${interactionId}`);
    router.refresh();
  }

  async function remove() {
    if (!editing) return;
    if (!confirm("Delete this interaction? This cannot be undone.")) return;
    setLoading(true);
    const { error } = await supabase.from("interactions").delete().eq("id", initial!.id);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/interactions");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-6 max-w-3xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="contact">Contact</Label>
          <Select
            id="contact"
            value={form.contact_id}
            onChange={(e) => setForm({ ...form, contact_id: e.target.value })}
          >
            <option value="">— No contact —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type})
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="occurred_on">Date *</Label>
          <Input
            id="occurred_on"
            type="date"
            required
            value={form.occurred_on}
            onChange={(e) => setForm({ ...form, occurred_on: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="channel">Channel</Label>
          <Select
            id="channel"
            value={form.channel}
            onChange={(e) => setForm({ ...form, channel: e.target.value as Channel })}
          >
            <option value="in_person">In person</option>
            <option value="phone">Phone</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="other">Other</option>
          </Select>
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            placeholder="e.g. Azadpur mandi, his shop, market"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="summary">What was discussed *</Label>
          <Textarea
            id="summary"
            required
            rows={5}
            placeholder="e.g. Discussed sourcing tomatoes — he says he can supply 200kg/week at ₹18/kg, will confirm next week."
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="follow_up_on">Follow-up date</Label>
          <Input
            id="follow_up_on"
            type="date"
            value={form.follow_up_on}
            onChange={(e) => setForm({ ...form, follow_up_on: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as InteractionStatus })}
          >
            <option value="open">Open</option>
            <option value="followed_up">Followed up</option>
            <option value="closed">Closed</option>
            <option value="dropped">Dropped</option>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Items discussed</h3>
          <Button type="button" variant="ghost" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4" /> Add row
          </Button>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="rounded-md border p-3 grid gap-2 sm:grid-cols-12">
              <div className="sm:col-span-3">
                <Label className="text-xs">Category</Label>
                <Select
                  value={item.category_id ?? ""}
                  onChange={(e) => updateItem(idx, { category_id: e.target.value || null })}
                >
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="sm:col-span-3">
                <Label className="text-xs">Item</Label>
                <Input
                  value={item.item_name}
                  onChange={(e) => updateItem(idx, { item_name: e.target.value })}
                  placeholder="Tomato, Apple…"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                />
              </div>
              <div className="sm:col-span-1">
                <Label className="text-xs">Unit</Label>
                <Input
                  value={item.unit}
                  onChange={(e) => updateItem(idx, { unit: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Price/unit</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={item.price_per_unit}
                  onChange={(e) => updateItem(idx, { price_per_unit: e.target.value })}
                />
              </div>
              <div className="sm:col-span-1 flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(idx)}
                  aria-label="Remove row"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : editing ? "Save changes" : "Log interaction"}
        </Button>
        {editing && (
          <Button type="button" variant="destructive" onClick={remove} disabled={loading}>
            Delete
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
