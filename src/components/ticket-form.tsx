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
import { TICKET_PRIORITIES, TICKET_STATUSES, slaDueFrom } from "@/lib/tickets";
import { FEATURE_FLOORS } from "@/lib/levels";
import type { Ticket, TicketPriority, TicketStatus } from "@/lib/types";

export type AssigneeOption = { user_id: string; email: string };

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function TicketForm({
  orgId,
  initial,
  userLevel = FEATURE_FLOORS.tickets,
  members,
  contacts,
  accounts,
  defaultContactId,
}: {
  orgId: string;
  initial?: Ticket;
  userLevel?: number;
  members: AssigneeOption[];
  contacts: { id: string; name: string }[];
  accounts: { id: string; name: string }[];
  defaultContactId?: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const editing = Boolean(initial);

  const [form, setForm] = useState({
    subject: initial?.subject ?? "",
    description: initial?.description ?? "",
    status: (initial?.status ?? "open") as TicketStatus,
    priority: (initial?.priority ?? "normal") as TicketPriority,
    contact_id: initial?.contact_id ?? defaultContactId ?? "",
    account_id: initial?.account_id ?? "",
    assignee_id: initial?.assignee_id ?? "",
    sla_due_at: toLocalInput(initial?.sla_due_at ?? null),
    min_level: initial?.min_level ?? FEATURE_FLOORS.tickets,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const table = supabase.from("tickets") as any;

    const payload = {
      subject: form.subject.trim(),
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      contact_id: form.contact_id || null,
      account_id: form.account_id || null,
      assignee_id: form.assignee_id || null,
      sla_due_at: form.sla_due_at
        ? new Date(form.sla_due_at).toISOString()
        : slaDueFrom(form.priority),
      resolved_at:
        form.status === "resolved" || form.status === "closed"
          ? initial?.resolved_at ?? new Date().toISOString()
          : null,
      min_level: form.min_level,
    };

    if (editing) {
      const { error } = await table.update(payload).eq("id", initial!.id);
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push(`/tickets/${initial!.id}`);
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
      router.push(`/tickets/${(data as { id: string }).id}`);
    }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="subject">Subject *</Label>
          <Input
            id="subject"
            required
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as TicketStatus })}
          >
            {TICKET_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="priority">Priority</Label>
          <Select
            id="priority"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value as TicketPriority })}
          >
            {TICKET_PRIORITIES.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label} · {p.hours}h SLA
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="contact">Contact</Label>
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
          <Label htmlFor="account">Account</Label>
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
          <Label htmlFor="sla">SLA due</Label>
          <Input
            id="sla"
            type="datetime-local"
            value={form.sla_due_at}
            onChange={(e) => setForm({ ...form, sla_due_at: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">Leave blank to auto-set from priority.</p>
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <SensitivityField
          className="space-y-1 sm:col-span-2"
          userLevel={userLevel}
          floor={FEATURE_FLOORS.tickets}
          value={form.min_level}
          onChange={(min_level) => setForm({ ...form, min_level })}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? "Saving…" : editing ? "Save changes" : "Create ticket"}
        </Button>
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
