import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { sensitivityTag } from "@/lib/levels";
import { listOrgMembers } from "@/lib/members";
import { Pencil, Lock, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DealDetailPage({ params }: { params: { id: string } }) {
  const { orgId, role } = await requireOrg();
  if (role === "member") redirect("/dashboard");
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

  const sharedIds: string[] = r.shared_with ?? [];
  let sharedLabels: string[] = [];
  if (r.min_level > 1 && sharedIds.length > 0) {
    const members = await listOrgMembers(orgId);
    const byId = new Map(members.map((m) => [m.user_id, m.email]));
    sharedLabels = sharedIds.map((id) => byId.get(id) ?? `${id.slice(0, 8)}…`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${r.direction === "buy" ? "Purchase" : "Sale"} · ${formatDate(r.deal_date)}`}
        description={r.contacts?.name}
        action={
          <Button asChild variant="outline">
            <Link href={`/deals/${r.id}/edit`}>
              <Pencil className="h-4 w-4" /> Edit
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge>{r.status}</Badge>
            <Badge variant="secondary">{r.payment_status}</Badge>
            {r.min_level > 1 && (
              <Badge variant="warn" className="gap-1">
                <Lock className="h-3 w-3" /> {sensitivityTag(r.min_level)}
              </Badge>
            )}
            {r.delivery_on && (
              <span className="text-muted-foreground">
                Delivery: {formatDate(r.delivery_on)}
              </span>
            )}
          </div>
          {sharedLabels.length > 0 && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                Also visible to:{" "}
                <span className="text-foreground">{sharedLabels.join(", ")}</span>
              </span>
            </div>
          )}
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

      <div className="space-y-3 md:hidden">
        {r.deal_items.map((it: any) => (
          <div key={it.id} className="rounded-md border bg-card p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="font-medium">{it.item_name}</div>
              <div className="text-sm font-semibold text-right">
                {formatCurrency(it.line_total, r.currency)}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Category</span>
              <span>{it.categories?.name || "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Qty</span>
              <span>
                {it.quantity} {it.unit}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Price/unit</span>
              <span>{formatCurrency(it.price_per_unit, r.currency)}</span>
            </div>
          </div>
        ))}

        <div className="rounded-md border bg-card p-4 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">{formatCurrency(r.amount_total, r.currency)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Paid</span>
            <span>{formatCurrency(r.amount_paid, r.currency)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Outstanding</span>
            <span className="font-medium">
              {formatCurrency((r.amount_total ?? 0) - (r.amount_paid ?? 0), r.currency)}
            </span>
          </div>
        </div>
      </div>

      <div className="hidden md:block rounded-md border bg-card overflow-hidden">
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
