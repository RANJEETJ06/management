import { requireOrg } from "@/lib/org";
import { PageHeader } from "@/components/page-header";
import { ContactForm } from "@/components/contact-form";

export default async function NewContactPage() {
  const { orgId, level } = await requireOrg();
  return (
    <div>
      <PageHeader title="Add contact" description="New supplier, buyer, or partner." />
      <ContactForm orgId={orgId} userLevel={level} />
    </div>
  );
}
