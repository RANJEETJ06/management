import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ContactForm } from "@/components/contact-form";

export default async function EditContactPage({ params }: { params: { id: string } }) {
  const { orgId } = await requireOrg();
  const supabase = createClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!contact) notFound();

  return (
    <div>
      <PageHeader title={`Edit ${contact.name}`} />
      <ContactForm orgId={orgId} initial={contact} />
    </div>
  );
}
