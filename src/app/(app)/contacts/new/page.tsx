import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { PageHeader } from "@/components/page-header";
import { ContactForm } from "@/components/contact-form";

export default async function NewContactPage() {
  const { orgId, role } = await requireOrg();
  if (role === "member") redirect("/contacts");
  return (
    <div>
      <PageHeader title="Add contact" description="New supplier, buyer, or partner." />
      <ContactForm orgId={orgId} />
    </div>
  );
}
