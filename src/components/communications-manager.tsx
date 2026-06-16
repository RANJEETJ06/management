"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SensitivityField } from "@/components/sensitivity-field";
import { COMM_CHANNELS, COMM_DIRECTIONS, channelLabel } from "@/lib/activities";
import { FEATURE_FLOORS } from "@/lib/levels";
import { cn } from "@/lib/utils";
import {
  Mail,
  MessageSquare,
  MessageCircle,
  Phone,
  MessagesSquare,
  CircleEllipsis,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Plus,
  User,
  Send,
} from "lucide-react";
import type { CommChannel, CommDirection } from "@/lib/types";

export type CommContact = { id: string; name: string; email: string | null; phone: string | null };
export type CommTemplate = { id: string; name: string; subject: string | null; body: string };

export type CommRow = {
  id: string;
  channel: CommChannel;
  direction: CommDirection;
  subject: string | null;
  body: string | null;
  contact_id: string | null;
  occurred_at: string;
  min_level: number;
  contact_name: string | null;
};

const CHANNEL_ICON: Record<CommChannel, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: MessageCircle,
  call: Phone,
  chat: MessagesSquare,
  other: CircleEllipsis,
};

function localNow(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CommunicationsManager({
  orgId,
  userLevel,
  initialComms,
  contacts,
  templates,
}: {
  orgId: string;
  userLevel: number;
  initialComms: CommRow[];
  contacts: CommContact[];
  templates: CommTemplate[];
}) {
  const supabase = createClient();
  const [comms, setComms] = useState(initialComms);
  const [filter, setFilter] = useState<"all" | CommChannel>("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [draft, setDraft] = useState({
    channel: "email" as CommChannel,
    direction: "outbound" as CommDirection,
    subject: "",
    body: "",
    contact_id: "",
    occurred_at: localNow(),
    min_level: FEATURE_FLOORS.communications as number,
  });

  const selectedContact = contacts.find((c) => c.id === draft.contact_id) ?? null;

  const shown = useMemo(
    () => (filter === "all" ? comms : comms.filter((c) => c.channel === filter)),
    [comms, filter]
  );

  function applyTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setDraft((d) => ({ ...d, subject: t.subject ?? d.subject, body: t.body || d.body }));
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.subject.trim() && !draft.body.trim()) {
      setError("Add a subject or a message to log.");
      return;
    }
    setBusy(true);
    setError("");
    const payload = {
      org_id: orgId,
      channel: draft.channel,
      direction: draft.direction,
      subject: draft.subject.trim() || null,
      body: draft.body.trim() || null,
      contact_id: draft.contact_id || null,
      occurred_at: draft.occurred_at ? new Date(draft.occurred_at).toISOString() : new Date().toISOString(),
      min_level: draft.min_level,
    };
    const { data, error } = await (supabase.from("communications") as any)
      .insert(payload)
      .select("id, channel, direction, subject, body, contact_id, occurred_at, min_level")
      .single();
    setBusy(false);
    if (error || !data) {
      setError(error?.message ?? "Could not log communication.");
      return;
    }
    const contact_name = contacts.find((c) => c.id === data.contact_id)?.name ?? null;
    setComms((cs) => [{ ...(data as any), contact_name }, ...cs]);
    setDraft((d) => ({ ...d, subject: "", body: "", occurred_at: localNow() }));
  }

  async function remove(id: string) {
    const prev = comms;
    setComms((cs) => cs.filter((c) => c.id !== id));
    const { error } = await (supabase.from("communications") as any).delete().eq("id", id);
    if (error) {
      setError(error.message);
      setComms(prev);
    }
  }

  const composeLinks = buildComposeLinks(selectedContact, draft.subject, draft.body);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <form onSubmit={add} className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <Select
                value={draft.channel}
                onChange={(e) => setDraft({ ...draft, channel: e.target.value as CommChannel })}
              >
                {COMM_CHANNELS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </Select>
              <Select
                value={draft.direction}
                onChange={(e) => setDraft({ ...draft, direction: e.target.value as CommDirection })}
              >
                {COMM_DIRECTIONS.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </Select>
              <Select
                value={draft.contact_id}
                onChange={(e) => setDraft({ ...draft, contact_id: e.target.value })}
              >
                <option value="">— Link a contact —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>

            {templates.length > 0 && (
              <Select defaultValue="" onChange={(e) => e.target.value && applyTemplate(e.target.value)}>
                <option value="">— Insert a template —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            )}

            <Input
              placeholder="Subject"
              value={draft.subject}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            />
            <Textarea
              rows={3}
              placeholder="What was said…"
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">When</span>
                <Input
                  type="datetime-local"
                  value={draft.occurred_at}
                  onChange={(e) => setDraft({ ...draft, occurred_at: e.target.value })}
                />
              </div>
            </div>

            <SensitivityField
              userLevel={userLevel}
              floor={FEATURE_FLOORS.communications}
              value={draft.min_level}
              onChange={(min_level) => setDraft({ ...draft, min_level })}
            />

            {composeLinks.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border bg-surface/60 p-2">
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Send className="h-3.5 w-3.5" /> Reach out:
                </span>
                {composeLinks.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={busy}>
                <Plus className="h-4 w-4" /> {busy ? "Logging…" : "Log communication"}
              </Button>
            </div>
          </form>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-1.5">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" />
        {COMM_CHANNELS.map((c) => (
          <FilterChip
            key={c.key}
            active={filter === c.key}
            onClick={() => setFilter(c.key)}
            label={c.label}
          />
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">No communications logged yet.</p>
      ) : (
        <div className="space-y-1.5">
          {shown.map((c) => {
            const Icon = CHANNEL_ICON[c.channel];
            return (
              <div key={c.id} className="group flex items-start gap-3 rounded-md border bg-card p-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {c.direction === "inbound" ? (
                      <ArrowDownLeft className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="truncate text-sm font-medium">
                      {c.subject || channelLabel(c.channel)}
                    </span>
                  </div>
                  {c.body && (
                    <div className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{c.body}</div>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{formatWhen(c.occurred_at)}</span>
                    <Badge variant="muted">{channelLabel(c.channel)}</Badge>
                    {c.contact_name && c.contact_id && (
                      <Link
                        href={`/contacts/${c.contact_id}`}
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        <User className="h-3 w-3" /> {c.contact_name}
                      </Link>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => remove(c.id)}
                  aria-label="Delete"
                  className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active ? "border-primary bg-primary/[0.08] text-primary" : "text-muted-foreground hover:bg-accent"
      )}
    >
      {label}
    </button>
  );
}

function buildComposeLinks(
  contact: CommContact | null,
  subject: string,
  body: string
): { label: string; href: string }[] {
  if (!contact) return [];
  const links: { label: string; href: string }[] = [];
  const subj = encodeURIComponent(subject);
  const text = encodeURIComponent(body);
  if (contact.email) {
    links.push({ label: "Email", href: `mailto:${contact.email}?subject=${subj}&body=${text}` });
  }
  if (contact.phone) {
    const digits = contact.phone.replace(/[^\d]/g, "");
    links.push({ label: "WhatsApp", href: `https://wa.me/${digits}?text=${text}` });
    links.push({ label: "SMS", href: `sms:${contact.phone}?body=${text}` });
    links.push({ label: "Call", href: `tel:${contact.phone}` });
  }
  return links;
}
