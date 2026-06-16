import { notFound, redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ContactForm } from "@/components/contact-form";
import { Contact } from "@/lib/types";

export default async function EditContactPage({ params }: { params: { id: string } }) {
  const { orgId, role, level } = await requireOrg();
  if (role === "member") redirect(`/contacts/${params.id}`);
  const supabase = createClient();

  const [{ data: contact }, { data: accounts }] = await Promise.all([
    supabase
      .from("contacts")
      .select("*")
      .eq("id", params.id)
      .eq("org_id", orgId)
      .maybeSingle<Contact>(),
    supabase
      .from("accounts")
      .select("id, name")
      .eq("org_id", orgId)
      .order("name", { ascending: true })
      .limit(500),
  ]);

  if (!contact) notFound();

  return (
    <div>
      <PageHeader title={`Edit ${contact.name}`} />
      <ContactForm
        orgId={orgId}
        initial={contact}
        userLevel={level}
        accounts={(accounts ?? []) as { id: string; name: string }[]}
      />
    </div>
  );
}
