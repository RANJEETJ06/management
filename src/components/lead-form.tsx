"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SensitivityField } from "@/components/sensitivity-field";
import { LEAD_SOURCES, LEAD_STAGES, scoreBand } from "@/lib/leads";
import { FEATURE_FLOORS } from "@/lib/levels";
import type { Lead, LeadSource, LeadStatus } from "@/lib/types";

export type AssigneeOption = { user_id: string; email: string };

export function LeadForm({
  orgId,
  initial,
  userLevel = FEATURE_FLOORS.leads,
  members,
  contacts,
  accounts,
}: {
  orgId: string;
  initial?: Lead;
  userLevel?: number;
  members: AssigneeOption[];
  contacts: { id: string; name: string }[];
  accounts: { id: string; name: string }[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const editing = Boolean(initial);

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    company: initial?.company ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    source: (initial?.source ?? "web") as LeadSource,
    status: (initial?.status ?? "new") as LeadStatus,
    score: initial?.score != null ? String(initial.score) : "0",
    est_value: initial?.est_value != null ? String(initial.est_value) : "",
    currency: initial?.currency ?? "INR",
    assignee_id: initial?.assignee_id ?? "",
    contact_id: initial?.contact_id ?? "",
    account_id: initial?.account_id ?? "",
    notes: initial?.notes ?? "",
    min_level: initial?.min_level ?? FEATURE_FLOORS.leads,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const score = Math.max(0, Math.min(100, Number(form.score) || 0));
  const band = scoreBand(score);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const leadsTable = supabase.from("leads") as any;

    const payload = {
      name: form.name.trim(),
      company: form.company.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      source: form.source,
      status: form.status,
      score,
      est_value: form.est_value ? Number(form.est_value) : null,
      currency: form.currency.trim() || "INR",
      assignee_id: form.assignee_id || null,
      contact_id: form.contact_id || null,
      account_id: form.account_id || null,
      notes: form.notes.trim() || null,
      min_level: form.min_level,
    };

    if (editing) {
      const { error } = await leadsTable.update(payload).eq("id", initial!.id);
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push(`/leads/${initial!.id}`);
    } else {
      const { data, error } = await leadsTable
        .insert({ ...payload, org_id: orgId })
        .select("id")
        .single();
      if (error || !data) {
        setError(error?.message || "Could not save");
        setLoading(false);
        return;
      }
      router.push(`/leads/${(data as { id: string }).id}`);
    }
    router.refresh();
  }

  async function remove() {
    if (!editing) return;
    if (!confirm("Delete this lead?")) return;
    setLoading(true);
    const { error } = await (supabase.from("leads") as any).delete().eq("id", initial!.id);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/leads");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="name">Lead name *</Label>
          <Input
            id="name"
            required
            placeholder="Person or opportunity title"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="source">Source</Label>
          <Select
            id="source"
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value as LeadSource })}
          >
            {LEAD_SOURCES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
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
          <Label htmlFor="status">Stage</Label>
          <Select
            id="status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}
          >
            {LEAD_STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="score">
            Score{" "}
            <Badge variant={band.variant} className="ml-1">
              {band.label}
            </Badge>
          </Label>
          <Input
            id="score"
            type="number"
            min={0}
            max={100}
            value={form.score}
            onChange={(e) => setForm({ ...form, score: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="est_value">Estimated value</Label>
          <Input
            id="est_value"
            type="number"
            step="0.01"
            value={form.est_value}
            onChange={(e) => setForm({ ...form, est_value: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="currency">Currency</Label>
          <Input
            id="currency"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="assignee">Assigned to</Label>
          <Select
            id="assignee"
            value={form.assignee_id}
            onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}
          >
            <option value="">— Unassigned —</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.email}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="contact">Linked contact</Label>
          <Select
            id="contact"
            value={form.contact_id}
            onChange={(e) => setForm({ ...form, contact_id: e.target.value })}
          >
            <option value="">— None —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="account">Linked account</Label>
          <Select
            id="account"
            value={form.account_id}
            onChange={(e) => setForm({ ...form, account_id: e.target.value })}
          >
            <option value="">— None —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
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
          floor={FEATURE_FLOORS.leads}
          value={form.min_level}
          onChange={(min_level) => setForm({ ...form, min_level })}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? "Saving…" : editing ? "Save changes" : "Add lead"}
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
