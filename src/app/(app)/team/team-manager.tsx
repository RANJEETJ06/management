"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Copy, Check } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Member = { user_id: string; role: string; created_at: string };
type Invitation = {
  id: string;
  email: string;
  role: string;
  accepted_at: string | null;
  created_at: string;
};

type LastInvite = {
  email: string;
  message: string;
  inviteLink: string;
  emailed: boolean;
  alreadyExisted: boolean;
};

export function TeamManager({
  orgId,
  currentUserId,
  canManage,
  members,
  invitations,
}: {
  orgId: string;
  currentUserId: string;
  canManage: boolean;
  members: Member[];
  invitations: Invitation[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [last, setLast] = useState<LastInvite | null>(null);
  const [copied, setCopied] = useState(false);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLast(null);
    setCopied(false);
    setBusy(true);

    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, email: email.trim(), role }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Could not send invitation.");
        return;
      }
      setLast({
        email: email.trim(),
        message: data.message ?? "Invitation saved.",
        inviteLink: data.inviteLink,
        emailed: !!data.emailed,
        alreadyExisted: !!data.alreadyExisted,
      });
      setEmail("");
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!last?.inviteLink) return;
    try {
      await navigator.clipboard.writeText(last.inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be blocked in older mobile browsers — fall back to
      // selecting the link text so the user can long-press → copy.
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this invitation?")) return;
    const { error } = await supabase.from("invitations").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function removeMember(userId: string) {
    if (!confirm("Remove this member from the workspace? They'll lose access immediately.")) return;
    const { error } = await supabase
      .from("members")
      .delete()
      .eq("org_id", orgId)
      .eq("user_id", userId);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {canManage && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <form onSubmit={invite} className="flex flex-col sm:flex-row gap-2">
              <Input
                type="email"
                placeholder="teammate@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value as "member" | "admin")}
                className="sm:w-32"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </Select>
              <Button type="submit" disabled={busy}>
                {busy ? "Sending…" : "Invite"}
              </Button>
            </form>

            <p className="text-xs text-muted-foreground">
              <strong>Members</strong> can view all data but can&apos;t add or
              edit. <strong>Admins</strong> can edit data and invite more people.
            </p>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {last && (
              <div className="rounded-md border bg-emerald-50 border-emerald-200 p-3 space-y-2">
                <p className="text-sm text-emerald-900">{last.message}</p>
                <div className="flex items-stretch gap-2">
                  <Input
                    readOnly
                    value={last.inviteLink}
                    onFocus={(e) => e.currentTarget.select()}
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={copyLink}
                    aria-label="Copy invite link"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Copy link
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-emerald-900/80">
                  {last.emailed
                    ? "Tip: if the email doesn't arrive (spam folder, typo), share this link directly over WhatsApp or SMS."
                    : last.alreadyExisted
                    ? "They already have an account — share this link so they can log in and see the workspace."
                    : "Email delivery isn't configured yet — share this link directly with them."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Members ({members.length})</h2>
        <div className="rounded-md border bg-card divide-y">
          {members.map((m) => {
            const isSelf = m.user_id === currentUserId;
            const isOwner = m.role === "owner";
            const canRemove = canManage && !isSelf && !isOwner;
            return (
              <div key={m.user_id} className="px-4 py-2 flex items-center justify-between text-sm gap-2">
                <span className="font-mono text-xs text-muted-foreground truncate">
                  {m.user_id}
                  {isSelf && <span className="ml-2 not-italic text-foreground/60">(you)</span>}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{m.role}</Badge>
                  {canRemove && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMember(m.user_id)}
                      aria-label="Remove member"
                      title="Remove member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Invitations</h2>
        {invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending invitations.</p>
        ) : (
          <div className="rounded-md border bg-card divide-y">
            {invitations.map((inv) => (
              <div key={inv.id} className="px-4 py-2 flex items-center justify-between text-sm gap-2">
                <div className="min-w-0">
                  <div className="truncate">{inv.email}</div>
                  <div className="text-xs text-muted-foreground">
                    Invited {formatDate(inv.created_at)} · {inv.role}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {inv.accepted_at ? (
                    <Badge variant="success">Accepted</Badge>
                  ) : (
                    <Badge variant="warn">Pending</Badge>
                  )}
                  {canManage && !inv.accepted_at && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => revoke(inv.id)}
                      aria-label="Revoke"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
