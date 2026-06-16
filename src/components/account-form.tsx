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
import { CustomFieldsEditor } from "@/components/custom-fields-editor";
import { FEATURE_FLOORS } from "@/lib/levels";
import type { Account, CustomFields } from "@/lib/types";

export function AccountForm({
  orgId,
  initial,
  userLevel = FEATURE_FLOORS.accounts,
}: {
  orgId: string;
  initial?: Account;
  userLevel?: number;
}) {
  const router = useRouter();
  const supabase = createClient();
  const editing = Boolean(initial);

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    website: initial?.website ?? "",
    industry: initial?.industry ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    locality: initial?.locality ?? "",
    address: initial?.address ?? "",
    size: initial?.size ?? "",
    annual_revenue: initial?.annual_revenue != null ? String(initial.annual_revenue) : "",
    notes: initial?.notes ?? "",
    min_level: initial?.min_level ?? FEATURE_FLOORS.accounts,
  });
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [customFields, setCustomFields] = useState<CustomFields>(initial?.custom_fields ?? {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const accountsTable = supabase.from("accounts") as any;

    const payload = {
      name: form.name.trim(),
      website: form.website.trim() || null,
      industry: form.industry.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      locality: form.locality.trim() || null,
      address: form.address.trim() || null,
      size: form.size.trim() || null,
      annual_revenue: form.annual_revenue ? Number(form.annual_revenue) : null,
      notes: form.notes.trim() || null,
      min_level: form.min_level,
      tags,
      custom_fields: customFields,
    };

    if (editing) {
      const { error } = await accountsTable.update(payload).eq("id", initial!.id);
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push(`/accounts/${initial!.id}`);
    } else {
      const { data, error } = await accountsTable
        .insert({ ...payload, org_id: orgId })
        .select("id")
        .single();
      if (error || !data) {
        setError(error?.message || "Could not save");
        setLoading(false);
        return;
      }
      router.push(`/accounts/${(data as { id: string }).id}`);
    }
    router.refresh();
  }

  async function remove() {
    if (!editing) return;
    if (!confirm("Delete this account? Linked contacts will keep their record but lose the company link."))
      return;
    setLoading(true);
    const { error } = await (supabase.from("accounts") as any).delete().eq("id", initial!.id);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/accounts");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="name">Company name *</Label>
          <Input
            id="name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="industry">Industry</Label>
          <Input
            id="industry"
            placeholder="e.g. Wholesale produce"
            value={form.industry}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            placeholder="https://"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
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
            value={form.locality}
            onChange={(e) => setForm({ ...form, locality: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="size">Company size</Label>
          <Input
            id="size"
            placeholder="e.g. 1-10, 200+"
            value={form.size}
            onChange={(e) => setForm({ ...form, size: e.target.value })}
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

        <div className="space-y-1">
          <Label htmlFor="annual_revenue">Annual revenue</Label>
          <Input
            id="annual_revenue"
            type="number"
            step="0.01"
            value={form.annual_revenue}
            onChange={(e) => setForm({ ...form, annual_revenue: e.target.value })}
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label>Tags</Label>
          <TagInput value={tags} onChange={setTags} placeholder="key-account, north-region…" />
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

        <div className="sm:col-span-2">
          <CustomFieldsEditor value={customFields} onChange={setCustomFields} />
        </div>

        <SensitivityField
          className="space-y-1 sm:col-span-2"
          userLevel={userLevel}
          floor={FEATURE_FLOORS.accounts}
          value={form.min_level}
          onChange={(min_level) => setForm({ ...form, min_level })}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? "Saving…" : editing ? "Save changes" : "Add account"}
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
