import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { listOrgMembers } from "@/lib/members";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TicketWorkspace, type CommentRow } from "@/components/ticket-workspace";
import { FEATURE_FLOORS, sensitivityTag } from "@/lib/levels";
import { formatDate } from "@/lib/utils";
import { Pencil, Lock, User, Building2, FolderOpen } from "lucide-react";
import type { Ticket, TicketComment } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const { orgId, level, role } = await requireOrg();
  if (level < FEATURE_FLOORS.tickets) redirect("/dashboard");
  const canEdit = role !== "member";
  const supabase = createClient();

  const { data: ticket } = await supabase
    .from("tickets")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", orgId)
    .maybeSingle<Ticket>();

  if (!ticket) notFound();

  const [{ data: comments }, members, contactRes, accountRes] = await Promise.all([
    supabase
      .from("ticket_comments")
      .select("id, body, created_by, created_at")
      .eq("ticket_id", params.id)
      .order("created_at", { ascending: true })
      .returns<TicketComment[]>(),
    listOrgMembers(orgId),
    ticket.contact_id
      ? supabase.from("contacts").select("id, name").eq("id", ticket.contact_id).maybeSingle()
      : Promise.resolve({ data: null }),
    ticket.account_id
      ? supabase.from("accounts").select("id, name").eq("id", ticket.account_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const contact = contactRes.data as { id: string; name: string } | null;
  const account = accountRes.data as { id: string; name: string } | null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={ticket.subject}
        description={`Opened ${formatDate(ticket.created_at.slice(0, 10))}`}
        action={
          <>
            {canEdit && (
              <Button asChild variant="outline">
                <Link href={`/tickets/${ticket.id}/edit`}>
                  <Pencil className="h-4 w-4" /> Edit
                </Link>
              </Button>
            )}
            {canEdit && (
              <Button asChild variant="outline">
                <Link href={`/documents?ticket=${ticket.id}`}>
                  <FolderOpen className="h-4 w-4" /> Attach document
                </Link>
              </Button>
            )}
          </>
        }
      />

      <Card>
        <CardContent className="space-y-3 p-5">
          {ticket.min_level > FEATURE_FLOORS.tickets && (
            <Badge variant="warn" className="gap-1">
              <Lock className="h-3 w-3" /> Restricted · {sensitivityTag(ticket.min_level)}
            </Badge>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {contact && (
              <Link
                href={`/contacts/${contact.id}`}
                className="inline-flex items-center gap-1 hover:underline"
              >
                <User className="h-4 w-4 text-muted-foreground" /> {contact.name}
              </Link>
            )}
            {account && (
              <Link
                href={`/accounts/${account.id}`}
                className="inline-flex items-center gap-1 hover:underline"
              >
                <Building2 className="h-4 w-4 text-muted-foreground" /> {account.name}
              </Link>
            )}
          </div>
          {ticket.description && (
            <p className="whitespace-pre-wrap border-t pt-3 text-sm">{ticket.description}</p>
          )}
        </CardContent>
      </Card>

      <TicketWorkspace
        ticketId={ticket.id}
        canEdit={canEdit}
        status={ticket.status}
        priority={ticket.priority}
        assigneeId={ticket.assignee_id}
        slaDueAt={ticket.sla_due_at}
        members={members.map((m) => ({ user_id: m.user_id, email: m.email }))}
        initialComments={(comments ?? []) as CommentRow[]}
      />
    </div>
  );
}
