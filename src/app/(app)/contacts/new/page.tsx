import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ContactForm } from "@/components/contact-form";

export const dynamic = "force-dynamic";

export default async function NewContactPage({
  searchParams,
}: {
  searchParams: { account?: string };
}) {
  const { orgId, level } = await requireOrg();
  const supabase = createClient();

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name")
    .eq("org_id", orgId)
    .order("name", { ascending: true })
    .limit(500);

  return (
    <div>
      <PageHeader title="Add contact" description="New supplier, buyer, or partner." />
      <ContactForm
        orgId={orgId}
        userLevel={level}
        accounts={(accounts ?? []) as { id: string; name: string }[]}
        defaultAccountId={searchParams.account}
      />
    </div>
  );
}
