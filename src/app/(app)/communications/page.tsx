import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { FEATURE_FLOORS } from "@/lib/levels";
import {
  CommunicationsManager,
  type CommRow,
  type CommContact,
  type CommTemplate,
} from "@/components/communications-manager";

export const dynamic = "force-dynamic";

export default async function CommunicationsPage() {
  const { orgId, level } = await requireOrg();
  if (level < FEATURE_FLOORS.communications) redirect("/dashboard");
  const supabase = createClient();

  const [{ data: comms }, { data: contacts }, { data: templates }] = await Promise.all([
    supabase
      .from("communications")
      .select(
        "id, channel, direction, subject, body, contact_id, occurred_at, min_level, contacts(name)"
      )
      .eq("org_id", orgId)
      .order("occurred_at", { ascending: false })
      .limit(200),
    supabase
      .from("contacts")
      .select("id, name, email, phone")
      .eq("org_id", orgId)
      .order("name", { ascending: true })
      .limit(1000),
    supabase
      .from("email_templates")
      .select("id, name, subject, body")
      .eq("org_id", orgId)
      .order("name", { ascending: true })
      .limit(200),
  ]);

  const rows: CommRow[] = (comms ?? []).map((c: any) => ({
    id: c.id,
    channel: c.channel,
    direction: c.direction,
    subject: c.subject,
    body: c.body,
    contact_id: c.contact_id,
    occurred_at: c.occurred_at,
    min_level: c.min_level ?? FEATURE_FLOORS.communications,
    contact_name: c.contacts?.name ?? null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Communications"
        description="Log emails, calls, and messages — and reach out with one tap."
        action={
          <Button asChild variant="outline">
            <Link href="/communications/templates">
              <FileText className="h-4 w-4" /> Templates
            </Link>
          </Button>
        }
      />
      <CommunicationsManager
        orgId={orgId}
        userLevel={level}
        initialComms={rows}
        contacts={(contacts ?? []) as CommContact[]}
        templates={(templates ?? []) as CommTemplate[]}
      />
    </div>
  );
}
