import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { IntegrationsManager } from "@/components/integrations-manager";
import type { Integration } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function IntegrationsSettingsPage() {
  const { orgId, role } = await requireOrg();
  if (role === "member") redirect("/dashboard");
  const supabase = createClient();

  const { data: rows } = await supabase
    .from("integrations")
    .select("provider, status, config")
    .eq("org_id", orgId)
    .returns<Integration[]>();

  const initial: Record<string, { status: "connected" | "disconnected"; config: Record<string, string> }> = {};
  for (const r of rows ?? []) initial[r.provider] = { status: r.status, config: r.config ?? {} };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Connect Lupin to your email, messaging, payments, accounting, ERP, and calendar."
        action={
          <Button asChild variant="outline">
            <Link href="/settings">
              <ArrowLeft className="h-4 w-4" /> Settings
            </Link>
          </Button>
        }
      />
      <IntegrationsManager orgId={orgId} initial={initial} />
    </div>
  );
}
