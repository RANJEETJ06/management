"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SensitivityField } from "@/components/sensitivity-field";
import { ShareWithField, type ShareMember } from "@/components/share-with-field";
import { Trash2, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type {
  Category,
  Contact,
  Deal,
  DealDirection,
  DealItem,
  DealStatus,
  PaymentStatus,
} from "@/lib/types";

type Line = {
  id?: string;
  category_id: string | null;
  item_name: string;
  quantity: string;
  unit: string;
  price_per_unit: string;
  notes: string;
};

const emptyLine = (): Line => ({
  category_id: null,
  item_name: "",
  quantity: "",
  unit: "kg",
  price_per_unit: "",
  notes: "",
});

export function DealForm({
  orgId,
  contacts,
  categories,
  initial,
  initialItems,
  userLevel = 1,
  members = [],
}: {
  orgId: string;
  contacts: Pick<Contact, "id" | "name" | "type">[];
  categories: Pick<Category, "id" | "name">[];
  initial?: Deal;
  initialItems?: DealItem[];
  userLevel?: number;
  members?: ShareMember[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const editing = Boolean(initial);

  const [form, setForm] = useState({
    contact_id: initial?.contact_id ?? "",
    direction: (initial?.direction ?? "buy") as DealDirection,
    deal_date: initial?.deal_date ?? new Date().toISOString().slice(0, 10),
    delivery_on: initial?.delivery_on ?? "",
    status: (initial?.status ?? "pending") as DealStatus,
    payment_status: (initial?.payment_status ?? "unpaid") as PaymentStatus,
    amount_paid: initial?.amount_paid != null ? String(initial.amount_paid) : "0",
    currency: initial?.currency ?? "INR",
    notes: initial?.notes ?? "",
    min_level: initial?.min_level ?? 1,
  });
  const [sharedWith, setSharedWith] = useState<string[]>(initial?.shared_with ?? []);

  const [lines, setLines] = useState<Line[]>(
    initialItems && initialItems.length > 0
      ? initialItems.map((i) => ({
          id: i.id,
          category_id: i.category_id,
          item_name: i.item_name,
          quantity: String(i.quantity),
          unit: i.unit,
          price_per_unit: String(i.price_per_unit),
          notes: i.notes ?? "",
        }))
      : [emptyLine()]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const total = useMemo(
    () =>
      lines.reduce((sum, l) => {
        const q = Number(l.quantity || 0);
        const p = Number(l.price_per_unit || 0);
        return sum + (Number.isFinite(q) && Number.isFinite(p) ? q * p : 0);
      }, 0),
    [lines]
  );

  function update(idx: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.contact_id) {
      setError("Pick a contact for this deal.");
      return;
    }
    const validLines = lines.filter(
      (l) => l.item_name.trim() && Number(l.quantity) > 0 && Number(l.price_per_unit) >= 0
    );
    if (validLines.length === 0) {
      setError("Add at least one item with a quantity and price.");
      return;
    }

    setLoading(true);
    const dealsTable = supabase.from("deals") as any;
    const dealItemsTable = supabase.from("deal_items") as any;

    const payload = {
      contact_id: form.contact_id,
      direction: form.direction,
      deal_date: form.deal_date,
      delivery_on: form.delivery_on || null,
      status: form.status,
      payment_status: form.payment_status,
      amount_total: total,
      amount_paid: Number(form.amount_paid || 0),
      currency: form.currency,
      notes: form.notes.trim() || null,
      min_level: form.min_level,
      shared_with: form.min_level > 1 ? sharedWith : [],
    };

    let dealId: string;
    if (editing) {
      const { error } = await dealsTable.update(payload).eq("id", initial!.id);
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      dealId = initial!.id;
      await dealItemsTable.delete().eq("deal_id", dealId);
    } else {
      const { data, error } = await dealsTable
        .insert({ ...payload, org_id: orgId })
        .select("id")
        .single();
      if (error || !data) {
        setError(error?.message || "Could not save");
        setLoading(false);
        return;
      }
      dealId = (data as { id: string }).id;
    }

    const { error: itemErr } = await dealItemsTable.insert(
      validLines.map((l) => ({
        deal_id: dealId,
        category_id: l.category_id || null,
        item_name: l.item_name.trim(),
        quantity: Number(l.quantity),
        unit: l.unit.trim() || "kg",
        price_per_unit: Number(l.price_per_unit),
        notes: l.notes.trim() || null,
      }))
    );

    if (itemErr) {
      setError(itemErr.message);
      setLoading(false);
      return;
    }

    router.push(`/deals/${dealId}`);
    router.refresh();
  }

  async function remove() {
    if (!editing) return;
    if (!confirm("Delete this deal?")) return;
    setLoading(true);
    const { error } = await (supabase.from("deals") as any).delete().eq("id", initial!.id);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/deals");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-6 max-w-3xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Direction</Label>
          <Select
            value={form.direction}
            onChange={(e) => setForm({ ...form, direction: e.target.value as DealDirection })}
          >
            <option value="buy">Buying (purchase)</option>
            <option value="sell">Selling (sale)</option>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Contact *</Label>
          <Select
            required
            value={form.contact_id}
            onChange={(e) => setForm({ ...form, contact_id: e.target.value })}
          >
            <option value="">— Select —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type})
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Deal date *</Label>
          <Input
            type="date"
            required
            value={form.deal_date}
            onChange={(e) => setForm({ ...form, deal_date: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label>Delivery date</Label>
          <Input
            type="date"
            value={form.delivery_on}
            onChange={(e) => setForm({ ...form, delivery_on: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label>Status</Label>
          <Select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as DealStatus })}
          >
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="delivered">Delivered</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Payment</Label>
          <Select
            value={form.payment_status}
            onChange={(e) => setForm({ ...form, payment_status: e.target.value as PaymentStatus })}
          >
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Amount paid</Label>
          <Input
            type="number"
            step="0.01"
            value={form.amount_paid}
            onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label>Currency</Label>
          <Input
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label>Notes</Label>
          <Textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        <SensitivityField
          className="space-y-1 sm:col-span-2"
          userLevel={userLevel}
          value={form.min_level}
          onChange={(min_level) => setForm({ ...form, min_level })}
        />

        <ShareWithField
          className="space-y-1 sm:col-span-2"
          members={members}
          value={sharedWith}
          onChange={setSharedWith}
          minLevel={form.min_level}
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold">Items</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setLines([...lines, emptyLine()])}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" /> Add row
          </Button>
        </div>

        <div className="space-y-3">
          {lines.map((l, idx) => (
            <div key={idx} className="rounded-md border p-3 grid gap-2 sm:grid-cols-12">
              <div className="sm:col-span-3">
                <Label className="text-xs">Category</Label>
                <Select
                  value={l.category_id ?? ""}
                  onChange={(e) => update(idx, { category_id: e.target.value || null })}
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
                <Label className="text-xs">Item *</Label>
                <Input
                  required
                  value={l.item_name}
                  onChange={(e) => update(idx, { item_name: e.target.value })}
                  placeholder="Tomato, Mango…"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Qty *</Label>
                <Input
                  required
                  type="number"
                  step="0.001"
                  value={l.quantity}
                  onChange={(e) => update(idx, { quantity: e.target.value })}
                />
              </div>
              <div className="sm:col-span-1">
                <Label className="text-xs">Unit</Label>
                <Input value={l.unit} onChange={(e) => update(idx, { unit: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Price/unit *</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  value={l.price_per_unit}
                  onChange={(e) => update(idx, { price_per_unit: e.target.value })}
                />
              </div>
              <div className="sm:col-span-1 flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setLines((prev) =>
                      prev.length === 1 ? [emptyLine()] : prev.filter((_, i) => i !== idx)
                    )
                  }
                  aria-label="Remove row"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-right text-sm">
          <span className="text-muted-foreground">Total: </span>
          <span className="font-semibold">{formatCurrency(total, form.currency)}</span>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col sm:flex-row gap-2">
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? "Saving…" : editing ? "Save changes" : "Create deal"}
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
