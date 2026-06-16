import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { PageHeader } from "@/components/page-header";
import { AccountForm } from "@/components/account-form";
import { FEATURE_FLOORS } from "@/lib/levels";

export const dynamic = "force-dynamic";

export default async function NewAccountPage() {
  const { orgId, level } = await requireOrg();
  if (level < FEATURE_FLOORS.accounts) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <PageHeader title="New account" description="Add a company or organization." />
      <AccountForm orgId={orgId} userLevel={level} />
    </div>
  );
}
