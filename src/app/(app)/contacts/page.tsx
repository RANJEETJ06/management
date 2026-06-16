import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Phone, MapPin, Download, Lock } from "lucide-react";
import type { Contact, ContactType } from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<ContactType, string> = {
  supplier: "Supplier",
  buyer: "Buyer",
  partner: "Partner",
  other: "Other",
};

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: { q?: string; type?: string; locality?: string; tag?: string };
}) {
  const { orgId } = await requireOrg();
  const supabase = createClient();

  let query = supabase
    .from("contacts")
    .select("*")
    .eq("org_id", orgId)
    .order("name", { ascending: true })
    .limit(200);

  if (
    searchParams.type &&
    ["supplier", "buyer", "partner", "other"].includes(searchParams.type)
  ) {
    query = query.eq("type", searchParams.type);
  }
  if (searchParams.locality) {
    query = query.ilike("locality", `%${searchParams.locality}%`);
  }
  if (searchParams.tag) {
    query = query.contains("tags", [searchParams.tag]);
  }
  if (searchParams.q) {
    const q = searchParams.q.replace(/[%_]/g, "\\$&");
    query = query.or(
      `name.ilike.%${q}%,phone.ilike.%${q}%,locality.ilike.%${q}%,notes.ilike.%${q}%`
    );
  }

  const { data: contacts } = await query;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description="Suppliers, buyers, and partners."
        action={
          <>
            <Button asChild variant="outline">
              <a href="/api/export/contacts">
                <Download className="h-4 w-4" /> Export
              </a>
            </Button>
            <Button asChild>
              <Link href="/contacts/new">
                <Plus className="h-4 w-4" /> Add contact
              </Link>
            </Button>
          </>
        }
      />

      <form className="flex flex-col sm:flex-row gap-2">
        <input
          name="q"
          placeholder="Search name, phone, locality, notes…"
          defaultValue={searchParams.q ?? ""}
          className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <select
          name="type"
          defaultValue={searchParams.type ?? ""}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All types</option>
          <option value="supplier">Suppliers</option>
          <option value="buyer">Buyers</option>
          <option value="partner">Partners</option>
          <option value="other">Other</option>
        </select>
        <input
          name="locality"
          placeholder="Locality"
          defaultValue={searchParams.locality ?? ""}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full sm:w-40"
        />
        <input
          name="tag"
          placeholder="Tag"
          defaultValue={searchParams.tag ?? ""}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full sm:w-32"
        />
        <Button type="submit" variant="secondary" className="w-full sm:w-auto">
          Filter
        </Button>
      </form>

      {(contacts?.length ?? 0) === 0 ? (
        <EmptyState
          title="No contacts yet"
          description="Add the first supplier or buyer to get started."
          action={
            <Button asChild>
              <Link href="/contacts/new">Add contact</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* contact interface */}
          {contacts!.map((c: Contact) => (
            <Link key={c.id} href={`/contacts/${c.id}`}>
              <Card className="transition-shadow hover:shadow-md h-full">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {c.min_level > 1 && (
                        <Lock className="h-3.5 w-3.5 shrink-0 text-gold" aria-label="Restricted" />
                      )}
                      <span className="font-medium truncate">{c.name}</span>
                    </div>
                    <Badge variant="secondary">{TYPE_LABELS[c.type]}</Badge>
                  </div>
                  {c.phone && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {c.phone}
                    </div>
                  )}
                  {c.locality && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {c.locality}
                    </div>
                  )}
                  {c.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {c.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
