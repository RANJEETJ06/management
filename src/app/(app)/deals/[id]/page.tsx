import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DealDetailPage({ params }: { params: { id: string } }) {
  const { orgId, role } = await requireOrg();
  const canEdit = role !== "member";
  const supabase = createClient();

  const { data: row } = await supabase
    .from("deals")
    .select(
      `*,
       contacts(id, name, type, locality, phone),
       deal_items(id, item_name, quantity, unit, price_per_unit, line_total, notes, categories(name))`
    )
    .eq("id", params.id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!row) notFound();
  const r = row as any;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${r.direction === "buy" ? "Purchase" : "Sale"} · ${formatDate(r.deal_date)}`}
        description={r.contacts?.name}
        action={
          canEdit ? (
            <Button asChild variant="outline">
              <Link href={`/deals/${r.id}/edit`}>
                <Pencil className="h-4 w-4" /> Edit
              </Link>
            </Button>
          ) : null
        }
      />

      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge>{r.status}</Badge>
            <Badge variant="secondary">{r.payment_status}</Badge>
            {r.delivery_on && (
              <span className="text-muted-foreground">
                Delivery: {formatDate(r.delivery_on)}
              </span>
            )}
          </div>
          {r.contacts && (
            <div className="text-sm">
              <Link className="font-medium hover:underline" href={`/contacts/${r.contacts.id}`}>
                {r.contacts.name}
              </Link>
              {r.contacts.locality && (
                <span className="text-muted-foreground"> · {r.contacts.locality}</span>
              )}
            </div>
          )}
          {r.notes && (
            <div className="whitespace-pre-wrap text-sm border-t pt-3">{r.notes}</div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-md border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3 font-medium">Item</th>
              <th className="p-3 font-medium">Category</th>
              <th className="p-3 font-medium text-right">Qty</th>
              <th className="p-3 font-medium text-right">Price/unit</th>
              <th className="p-3 font-medium text-right">Line total</th>
            </tr>
          </thead>
          <tbody>
            {r.deal_items.map((it: any) => (
              <tr key={it.id} className="border-t">
                <td className="p-3">{it.item_name}</td>
                <td className="p-3 text-muted-foreground">{it.categories?.name || "—"}</td>
                <td className="p-3 text-right">
                  {it.quantity} {it.unit}
                </td>
                <td className="p-3 text-right">{formatCurrency(it.price_per_unit, r.currency)}</td>
                <td className="p-3 text-right font-medium">
                  {formatCurrency(it.line_total, r.currency)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/30">
              <td colSpan={4} className="p-3 text-right font-medium">
                Total
              </td>
              <td className="p-3 text-right font-semibold">
                {formatCurrency(r.amount_total, r.currency)}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="p-3 text-right text-muted-foreground">
                Paid
              </td>
              <td className="p-3 text-right">{formatCurrency(r.amount_paid, r.currency)}</td>
            </tr>
            <tr>
              <td colSpan={4} className="p-3 text-right text-muted-foreground">
                Outstanding
              </td>
              <td className="p-3 text-right font-medium">
                {formatCurrency((r.amount_total ?? 0) - (r.amount_paid ?? 0), r.currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
