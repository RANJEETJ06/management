import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, relativeDate } from "@/lib/utils";
import { Phone, Mail, MapPin, Pencil, Plus } from "lucide-react";
import { Contact, Deal, Interaction } from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  supplier: "Supplier",
  buyer: "Buyer",
  partner: "Partner",
  other: "Other",
};

export default async function ContactDetailPage({ params }: { params: { id: string } }) {
  const { orgId } = await requireOrg();
  const supabase = createClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", orgId)
    .maybeSingle<Contact>();

  if (!contact) notFound();

  const [{ data: interactions }, { data: deals }] = await Promise.all([
    supabase
      .from("interactions")
      .select("id, occurred_on, summary, location, status")
      .eq("contact_id", params.id)
      .order("occurred_on", { ascending: false })
      .limit(20)
      .returns<Interaction[]>(),
    supabase
      .from("deals")
      .select("id, deal_date, direction, status, amount_total, currency")
      .eq("contact_id", params.id)
      .order("deal_date", { ascending: false })
      .limit(20)
      .returns<Deal[]>(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={contact.name}
        description={`${TYPE_LABELS[contact.type]}${contact.locality ? " · " + contact.locality : ""}`}
        action={
          <>
            <Button asChild variant="outline">
              <Link href={`/contacts/${contact.id}/edit`}>
                <Pencil className="h-4 w-4" /> Edit
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/interactions/new?contact=${contact.id}`}>
                <Plus className="h-4 w-4" /> Log interaction
              </Link>
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="p-5 space-y-2">
          {contact.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a>
            </div>
          )}
          {contact.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>
            </div>
          )}
          {contact.address && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{contact.address}</span>
            </div>
          )}
          {contact.notes && (
            <div className="text-sm whitespace-pre-wrap pt-2 border-t mt-2">{contact.notes}</div>
          )}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Interactions</h2>
        {(interactions?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No interactions logged with this contact yet.</p>
        ) : (
          <div className="grid gap-2">
            {interactions!.map((row) => (
              <Link
                key={row.id}
                href={`/interactions/${row.id}`}
                className="rounded-md border bg-card p-3 hover:bg-accent/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{formatDate(row.occurred_on)}</div>
                  <Badge variant="muted">{row.status}</Badge>
                </div>
                <div className="text-sm text-muted-foreground line-clamp-2 mt-1">{row.summary}</div>
                {row.location && (
                  <div className="text-xs text-muted-foreground mt-1">📍 {row.location}</div>
                )}
                <div className="text-xs text-muted-foreground mt-1">{relativeDate(row.occurred_on)}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Deals</h2>
        {(deals?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No deals with this contact yet.</p>
        ) : (
          <div className="grid gap-2">
            {deals!.map((d) => (
              <Link
                key={d.id}
                href={`/deals/${d.id}`}
                className="rounded-md border bg-card p-3 hover:bg-accent/40 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="text-sm font-medium">
                    {d.direction === "buy" ? "Purchase" : "Sale"} · {formatDate(d.deal_date)}
                  </div>
                  <div className="text-xs text-muted-foreground">{d.status}</div>
                </div>
                <div className="text-sm font-semibold">
                  {formatCurrency(d.amount_total, d.currency)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
