"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  ticketPriorityMeta,
  ticketStatusMeta,
  slaState,
} from "@/lib/tickets";
import { MessageSquare } from "lucide-react";
import type { TicketPriority, TicketStatus } from "@/lib/types";

export type CommentRow = {
  id: string;
  body: string;
  created_by: string | null;
  created_at: string;
};
type Member = { user_id: string; email: string };

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TicketWorkspace({
  ticketId,
  canEdit,
  status,
  priority,
  assigneeId,
  slaDueAt,
  members,
  initialComments,
}: {
  ticketId: string;
  canEdit: boolean;
  status: TicketStatus;
  priority: TicketPriority;
  assigneeId: string | null;
  slaDueAt: string | null;
  members: Member[];
  initialComments: CommentRow[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [s, setS] = useState<TicketStatus>(status);
  const [p, setP] = useState<TicketPriority>(priority);
  const [a, setA] = useState(assigneeId ?? "");
  const [comments, setComments] = useState(initialComments);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const emailById = new Map(members.map((m) => [m.user_id, m.email]));
  const sla = slaState(s, slaDueAt);

  async function patch(changes: Record<string, unknown>) {
    const { error } = await (supabase.from("tickets") as any).update(changes).eq("id", ticketId);
    if (error) setError(error.message);
    else router.refresh();
  }

  function changeStatus(next: TicketStatus) {
    setS(next);
    patch({
      status: next,
      resolved_at: next === "resolved" || next === "closed" ? new Date().toISOString() : null,
    });
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    setError("");
    const { data, error } = await (supabase.from("ticket_comments") as any)
      .insert({ ticket_id: ticketId, body: draft.trim() })
      .select("id, body, created_by, created_at")
      .single();
    setBusy(false);
    if (error || !data) {
      setError(error?.message ?? "Could not add comment.");
      return;
    }
    setComments((cs) => [...cs, data as CommentRow]);
    setDraft("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {canEdit ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={s} onChange={(e) => changeStatus(e.target.value as TicketStatus)}>
              {TICKET_STATUSES.map((x) => (
                <option key={x.key} value={x.key}>
                  {x.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Priority</Label>
            <Select
              value={p}
              onChange={(e) => {
                setP(e.target.value as TicketPriority);
                patch({ priority: e.target.value });
              }}
            >
              {TICKET_PRIORITIES.map((x) => (
                <option key={x.key} value={x.key}>
                  {x.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Assigned to</Label>
            <Select
              value={a}
              onChange={(e) => {
                setA(e.target.value);
                patch({ assignee_id: e.target.value || null });
              }}
            >
              <option value="">— Unassigned —</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.email}
                </option>
              ))}
            </Select>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={ticketStatusMeta(s).variant}>{ticketStatusMeta(s).label}</Badge>
          <Badge variant={ticketPriorityMeta(p).variant}>{ticketPriorityMeta(p).label}</Badge>
          {a && <span className="text-sm text-muted-foreground">{emailById.get(a) ?? "Assigned"}</span>}
        </div>
      )}

      {sla && (
        <div className="text-sm">
          SLA: <Badge variant={sla.variant}>{sla.label}</Badge>
          {slaDueAt && (
            <span className="ml-2 text-muted-foreground">due {when(slaDueAt)}</span>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <MessageSquare className="h-4 w-4" /> Comments
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground tnum">
            {comments.length}
          </span>
        </h2>

        <div className="space-y-2">
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="rounded-md border bg-card p-3">
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {(c.created_by && emailById.get(c.created_by)) || "Teammate"}
                </span>
                <span>{when(c.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{c.body}</p>
            </div>
          ))}
        </div>

        {canEdit && (
          <form onSubmit={addComment} className="space-y-2">
            <Textarea
              rows={3}
              placeholder="Add a comment…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={busy || !draft.trim()}>
                {busy ? "Posting…" : "Comment"}
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
