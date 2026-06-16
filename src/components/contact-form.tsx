"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SensitivityField } from "@/components/sensitivity-field";
import type { Contact, ContactType } from "@/lib/types";

export function ContactForm({
  orgId,
  initial,
  userLevel = 1,
}: {
  orgId: string;
  initial?: Contact;
  userLevel?: number;
}) {
  const router = useRouter();
  const supabase = createClient();
  const editing = Boolean(initial);

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    type: (initial?.type ?? "supplier") as ContactType,
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    locality: initial?.locality ?? "",
    address: initial?.address ?? "",
    notes: initial?.notes ?? "",
    min_level: initial?.min_level ?? 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const contactsTable = supabase.from("contacts") as any;

    const payload = {
      ...form,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      locality: form.locality.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
    };

    if (editing) {
      const { error } = await contactsTable.update(payload).eq("id", initial!.id);
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push(`/contacts/${initial!.id}`);
    } else {
      const { data, error } = await contactsTable
        .insert({ ...payload, org_id: orgId })
        .select("id")
        .single();
      if (error || !data) {
        setError(error?.message || "Could not save");
        setLoading(false);
        return;
      }
      router.push(`/contacts/${(data as { id: string }).id}`);
    }
    router.refresh();
  }

  async function remove() {
    if (!editing) return;
    if (!confirm("Delete this contact? Linked interactions and deals will keep their record.")) return;
    setLoading(true);
    const { error } = await (supabase.from("contacts") as any).delete().eq("id", initial!.id);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/contacts");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="type">Type</Label>
          <Select
            id="type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as ContactType })}
          >
            <option value="supplier">Supplier</option>
            <option value="buyer">Buyer</option>
            <option value="partner">Partner</option>
            <option value="other">Other</option>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="locality">Locality</Label>
          <Input
            id="locality"
            placeholder="e.g. Azadpur, Koyambedu"
            value={form.locality}
            onChange={(e) => setForm({ ...form, locality: e.target.value })}
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            rows={4}
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
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col sm:flex-row gap-2">
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? "Saving…" : editing ? "Save changes" : "Add contact"}
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
