import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { FEATURE_FLOORS } from "@/lib/levels";
import { EmailTemplatesManager, type TemplateRow } from "@/components/email-templates-manager";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const { orgId, level } = await requireOrg();
  if (level < FEATURE_FLOORS.communications) redirect("/dashboard");
  const supabase = createClient();

  const { data } = await supabase
    .from("email_templates")
    .select("id, name, subject, body")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email templates"
        description="Reusable messages you can drop into a communication."
        action={
          <Button asChild variant="outline">
            <Link href="/communications">
              <ArrowLeft className="h-4 w-4" /> Communications
            </Link>
          </Button>
        }
      />
      <EmailTemplatesManager orgId={orgId} initial={(data ?? []) as TemplateRow[]} />
    </div>
  );
}
