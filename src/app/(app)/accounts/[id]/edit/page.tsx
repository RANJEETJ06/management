import { notFound, redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { AccountForm } from "@/components/account-form";
import { FEATURE_FLOORS } from "@/lib/levels";
import type { Account } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditAccountPage({ params }: { params: { id: string } }) {
  const { orgId, level } = await requireOrg();
  if (level < FEATURE_FLOORS.accounts) redirect("/dashboard");
  const supabase = createClient();

  const { data: account } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", orgId)
    .maybeSingle<Account>();

  if (!account) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${account.name}`} description="Update this account." />
      <AccountForm orgId={orgId} initial={account} userLevel={level} />
    </div>
  );
}
