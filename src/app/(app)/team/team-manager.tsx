"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Member = { user_id: string; role: string; created_at: string };
type Invitation = {
  id: string;
  email: string;
  role: string;
  accepted_at: string | null;
  created_at: string;
};

export function TeamManager({
  orgId,
  canManage,
  members,
  invitations,
}: {
  orgId: string;
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
  const [info, setInfo] = useState("");

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setBusy(true);
    const { error } = await supabase
      .from("invitations")
      .insert({ org_id: orgId, email: email.trim().toLowerCase(), role, invited_by: user.id } as any); //any added for production
    setBusy(false);

    if (error) {
      setError(error.message);
      return;
    }
    setInfo(
      `Invited ${email}. Ask them to sign up at this site with that email — they'll join automatically.`
    );
    setEmail("");
    router.refresh();
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

  return (
    <div className="space-y-6 max-w-2xl">
      {canManage && (
        <Card>
          <CardContent className="p-4">
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
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
            {info && <p className="text-sm text-emerald-700 mt-2">{info}</p>}
          </CardContent>
        </Card>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Members ({members.length})</h2>
        <div className="rounded-md border bg-card divide-y">
          {members.map((m) => (
            <div key={m.user_id} className="px-4 py-2 flex items-center justify-between text-sm">
              <span className="font-mono text-xs text-muted-foreground truncate">{m.user_id}</span>
              <Badge variant="secondary">{m.role}</Badge>
            </div>
          ))}
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
