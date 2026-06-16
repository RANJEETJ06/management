import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { FEATURE_FLOORS } from "@/lib/levels";
import {
  DocumentsManager,
  type DocCard,
  type DocVersion,
} from "@/components/documents-manager";
import type { Document, DocumentVersion } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: { contact?: string; account?: string; deal?: string; ticket?: string };
}) {
  const { orgId, level } = await requireOrg();
  if (level < FEATURE_FLOORS.documents) redirect("/dashboard");
  const supabase = createClient();

  const { data: docRows } = await supabase
    .from("documents")
    .select("id, name, doc_type, contact_id, account_id, deal_id, ticket_id, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<Document[]>();

  const docs = docRows ?? [];
  const ids = docs.map((d) => d.id);

  let versions: DocumentVersion[] = [];
  if (ids.length) {
    const { data: vRows } = await supabase
      .from("document_versions")
      .select("document_id, version, storage_path, file_name, mime_type, size_bytes")
      .in("document_id", ids)
      .order("version", { ascending: false })
      .returns<DocumentVersion[]>();
    versions = vRows ?? [];
  }

  const latestByDoc = new Map<string, DocVersion>();
  const countByDoc = new Map<string, number>();
  for (const v of versions) {
    countByDoc.set(v.document_id, (countByDoc.get(v.document_id) ?? 0) + 1);
    // versions are ordered version-desc, so the first seen per doc is the latest
    if (!latestByDoc.has(v.document_id)) {
      latestByDoc.set(v.document_id, {
        version: v.version,
        storage_path: v.storage_path,
        file_name: v.file_name,
        mime_type: v.mime_type,
        size_bytes: v.size_bytes,
      });
    }
  }

  const cards: DocCard[] = docs.map((d) => ({
    id: d.id,
    name: d.name,
    doc_type: d.doc_type,
    contact_id: d.contact_id,
    account_id: d.account_id,
    deal_id: d.deal_id,
    ticket_id: d.ticket_id,
    created_at: d.created_at,
    latest: latestByDoc.get(d.id) ?? null,
    versionCount: countByDoc.get(d.id) ?? 0,
  }));

  const [{ data: contacts }, { data: accounts }] = await Promise.all([
    supabase.from("contacts").select("id, name").eq("org_id", orgId).order("name").limit(1000),
    supabase.from("accounts").select("id, name").eq("org_id", orgId).order("name").limit(500),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Contracts, invoices, quotations and proposals — versioned and linked to your records."
      />
      <DocumentsManager
        orgId={orgId}
        initialDocs={cards}
        contacts={(contacts ?? []) as { id: string; name: string }[]}
        accounts={(accounts ?? []) as { id: string; name: string }[]}
        prefill={{
          contact_id: searchParams.contact,
          account_id: searchParams.account,
          deal_id: searchParams.deal,
          ticket_id: searchParams.ticket,
        }}
      />
    </div>
  );
}
