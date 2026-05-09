import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, relativeDate } from "@/lib/utils";
import { Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InteractionDetailPage({ params }: { params: { id: string } }) {
  const { orgId, role } = await requireOrg();
  const canEdit = role !== "member";
  const supabase = createClient();

  const { data: row } = await supabase
    .from("interactions")
    .select(
      `*,
       contacts(id, name, type, phone, locality),
       interaction_items(id, item_name, quantity, unit, price_per_unit, notes, categories(name))`
    )
    .eq("id", params.id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!row) notFound();

  const r = row as any;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Interaction · ${formatDate(r.occurred_on)}`}
        description={relativeDate(r.occurred_on)}
        action={
          canEdit ? (
            <Button asChild variant="outline">
              <Link href={`/interactions/${r.id}/edit`}>
                <Pencil className="h-4 w-4" /> Edit
              </Link>
            </Button>
          ) : null
        }
      />

      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="muted">{r.status.replace("_", " ")}</Badge>
            {r.channel && <Badge variant="outline">{r.channel.replace("_", " ")}</Badge>}
            {r.location && <span className="text-muted-foreground">📍 {r.location}</span>}
          </div>

          {r.contacts && (
            <div className="text-sm">
              <span className="text-muted-foreground">Contact: </span>
              <Link className="font-medium hover:underline" href={`/contacts/${r.contacts.id}`}>
                {r.contacts.name}
              </Link>
              {r.contacts.locality && (
                <span className="text-muted-foreground"> · {r.contacts.locality}</span>
              )}
              {r.contacts.phone && (
                <span className="text-muted-foreground"> · {r.contacts.phone}</span>
              )}
            </div>
          )}

          <div className="whitespace-pre-wrap text-sm border-t pt-3">{r.summary}</div>

          {r.follow_up_on && (
            <div className="text-sm">
              <span className="text-muted-foreground">Follow up on: </span>
              <span className="font-medium">{formatDate(r.follow_up_on)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {r.interaction_items?.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Items</h2>
          <div className="rounded-md border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3 font-medium">Item</th>
                  <th className="p-3 font-medium">Category</th>
                  <th className="p-3 font-medium text-right">Qty</th>
                  <th className="p-3 font-medium text-right">Price/unit</th>
                  <th className="p-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {r.interaction_items.map((it: any) => (
                  <tr key={it.id} className="border-t">
                    <td className="p-3">{it.item_name || "—"}</td>
                    <td className="p-3 text-muted-foreground">{it.categories?.name || "—"}</td>
                    <td className="p-3 text-right">
                      {it.quantity != null ? `${it.quantity} ${it.unit || ""}` : "—"}
                    </td>
                    <td className="p-3 text-right">
                      {it.price_per_unit != null ? formatCurrency(it.price_per_unit) : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">{it.notes || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
