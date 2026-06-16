import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { listOrgMembers } from "@/lib/members";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { AutomationManager } from "@/components/automation-manager";
import type { AutomationRule } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AutomationSettingsPage() {
  const { orgId, role } = await requireOrg();
  if (role === "member") redirect("/dashboard");
  const supabase = createClient();

  const [{ data: rules }, members] = await Promise.all([
    supabase
      .from("automation_rules")
      .select("kind, enabled, config")
      .eq("org_id", orgId)
      .returns<AutomationRule[]>(),
    listOrgMembers(orgId),
  ]);

  const initial: Record<string, { enabled: boolean; config: Record<string, string> }> = {};
  for (const r of rules ?? []) initial[r.kind] = { enabled: r.enabled, config: r.config ?? {} };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflow automation"
        description="Turn on built-in rules. Changes apply to everyone's records in this workspace."
        action={
          <Button asChild variant="outline">
            <Link href="/settings">
              <ArrowLeft className="h-4 w-4" /> Settings
            </Link>
          </Button>
        }
      />
      <AutomationManager
        orgId={orgId}
        initial={initial}
        members={members.map((m) => ({ user_id: m.user_id, email: m.email }))}
      />
    </div>
  );
}
