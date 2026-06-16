import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { PipelineBoard, type PipelineDeal } from "./pipeline-board";
import Link from "next/link";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const { orgId, role } = await requireOrg();
  if (role === "member") redirect("/dashboard");
  const supabase = createClient();

  const { data: rows } = await supabase
    .from("deals")
    .select(
      "id, deal_date, direction, status, payment_status, amount_total, amount_paid, currency, contact_id, min_level, contacts(name)"
    )
    .eq("org_id", orgId)
    .order("deal_date", { ascending: false })
    .limit(400);

  const deals: PipelineDeal[] = (rows ?? []).map((d: any) => ({
    id: d.id,
    deal_date: d.deal_date,
    direction: d.direction,
    status: d.status,
    payment_status: d.payment_status,
    amount_total: d.amount_total,
    amount_paid: d.amount_paid,
    currency: d.currency ?? "INR",
    min_level: d.min_level ?? 1,
    contact_name: d.contacts?.name ?? null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline"
        description="Drag a deal across the board as it moves from first handshake to settled payment."
        action={
          <Button asChild>
            <Link href="/deals/new">
              <Plus className="h-4 w-4" /> New deal
            </Link>
          </Button>
        }
      />

      {deals.length === 0 ? (
        <EmptyState
          title="Your pipeline is empty"
          description="Once you record a deal it shows up here as a card you can drag between stages."
          action={
            <Button asChild>
              <Link href="/deals/new">New deal</Link>
            </Button>
          }
        />
      ) : (
        <PipelineBoard initialDeals={deals} />
      )}
    </div>
  );
}
