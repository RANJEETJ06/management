import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InvitationActions } from "./invitation-actions";

export const dynamic = "force-dynamic";

type Pending = {
  id: string;
  org_id: string;
  org_name: string;
  email: string;
  role: string;
  invited_by: string;
  created_at: string;
};

export default async function InvitationsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.rpc("my_pending_invitations").returns<Pending[]>();
  const pending = data ?? [];

  // If they have at least one workspace already, give them a way back to it.
  const { data: members } = await supabase
    .from("members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1);
  const hasWorkspace = (members ?? []).length > 0;

  return (
    <div className="min-h-screen flex items-start justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100 px-4 py-10">
      <div className="w-full max-w-xl space-y-4">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Invitations</CardTitle>
            <CardDescription>
              {pending.length === 0
                ? "You have no pending invitations."
                : `You've been invited to ${pending.length} workspace${pending.length === 1 ? "" : "s"}. Accept the ones you want to join.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {hasWorkspace ? (
                  <Link className="text-primary hover:underline" href="/dashboard">
                    Go to dashboard →
                  </Link>
                ) : (
                  <Link className="text-primary hover:underline" href="/onboarding">
                    Create your own workspace →
                  </Link>
                )}
              </div>
            ) : (
              <ul className="divide-y">
                {pending.map((inv) => (
                  <li key={inv.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{inv.org_name}</div>
                      <div className="text-xs text-muted-foreground">
                        Invited as <span className="font-medium">{inv.role}</span>
                      </div>
                    </div>
                    <InvitationActions invitationId={inv.id} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {pending.length > 0 && (
          <div className="text-sm text-center text-muted-foreground">
            Or{" "}
            <Link className="text-primary hover:underline" href={hasWorkspace ? "/dashboard" : "/onboarding"}>
              {hasWorkspace ? "go to dashboard" : "create your own workspace"}
            </Link>
            .
          </div>
        )}
      </div>
    </div>
  );
}
