import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Download } from "lucide-react";
import type { DealStatus, PaymentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<DealStatus, "warn" | "success" | "muted" | "danger" | "default"> = {
  pending: "warn",
  confirmed: "default",
  delivered: "success",
  paid: "success",
  cancelled: "danger",
};

const PAY_BADGE: Record<PaymentStatus, "warn" | "success" | "muted"> = {
  unpaid: "warn",
  partial: "warn",
  paid: "success",
};

export default async function DealsPage({
  searchParams,
}: {
  searchParams: { status?: string; direction?: string };
}) {
  const { orgId, role } = await requireOrg();
  const canEdit = role !== "member";
  const supabase = createClient();

  let query = supabase
    .from("deals")
    .select(
      "id, deal_date, direction, status, payment_status, amount_total, amount_paid, currency, contact_id, contacts(name)"
    )
    .eq("org_id", orgId)
    .order("deal_date", { ascending: false })
    .limit(200);

  if (
    searchParams.status &&
    ["pending", "confirmed", "delivered", "paid", "cancelled"].includes(searchParams.status)
  ) {
    query = query.eq("status", searchParams.status);
  }
  if (searchParams.direction && ["buy", "sell"].includes(searchParams.direction)) {
    query = query.eq("direction", searchParams.direction);
  }

  const { data: rows } = await query;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deals"
        description="Track firm purchases and sales."
        action={
          <>
            <Button asChild variant="outline">
              <a href="/api/export/deals">
                <Download className="h-4 w-4" /> Export
              </a>
            </Button>
            {canEdit && (
              <Button asChild>
                <Link href="/deals/new">
                  <Plus className="h-4 w-4" /> New deal
                </Link>
              </Button>
            )}
          </>
        }
      />

      <form className="flex flex-wrap gap-2">
        <select
          name="direction"
          defaultValue={searchParams.direction ?? ""}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Buy & sell</option>
          <option value="buy">Buying</option>
          <option value="sell">Selling</option>
        </select>
        <select
          name="status"
          defaultValue={searchParams.status ?? ""}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Any status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="delivered">Delivered</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <Button type="submit" variant="secondary">Filter</Button>
      </form>

      {(rows?.length ?? 0) === 0 ? (
        <EmptyState
          title="No deals yet"
          description={
            canEdit
              ? "Capture your first firm order — useful once a conversation turns into a transaction."
              : "An admin hasn't recorded any deals yet."
          }
          action={
            canEdit ? (
              <Button asChild>
                <Link href="/deals/new">New deal</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {rows!.map((d: any) => (
            <Link key={d.id} href={`/deals/${d.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {d.direction === "buy" ? "Buying from " : "Selling to "}
                      {d.contacts?.name || "(no contact)"}
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDate(d.deal_date)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold">
                      {formatCurrency(d.amount_total, d.currency)}
                    </div>
                    <div className="flex justify-end gap-1 mt-1">
                      <Badge variant={STATUS_BADGE[d.status as DealStatus]}>{d.status}</Badge>
                      <Badge variant={PAY_BADGE[d.payment_status as PaymentStatus]}>
                        {d.payment_status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
