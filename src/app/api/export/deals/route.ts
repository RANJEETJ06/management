import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { csvResponse, dateStampedName, toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

type Row = {
  deal_date: string;
  direction: string;
  contacts: { name: string | null } | null;
  status: string;
  payment_status: string;
  amount_total: number | null;
  amount_paid: number | null;
  currency: string | null;
  delivery_on: string | null;
  notes: string | null;
  created_at: string;
};

export async function GET() {
  const { orgId } = await requireOrg();
  const supabase = createClient();

  const { data, error } = await supabase
    .from("deals")
    .select(
      "deal_date, direction, status, payment_status, amount_total, amount_paid, currency, delivery_on, notes, created_at, contacts(name)"
    )
    .eq("org_id", orgId)
    .order("deal_date", { ascending: false });

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const rows = (data ?? []) as unknown as Row[];

  const csv = toCsv(
    [
      "Date",
      "Direction",
      "Contact",
      "Status",
      "Payment",
      "Total",
      "Paid",
      "Currency",
      "Delivery on",
      "Notes",
      "Created",
    ],
    rows.map((d) => [
      d.deal_date,
      d.direction,
      d.contacts?.name ?? "",
      d.status,
      d.payment_status,
      d.amount_total,
      d.amount_paid,
      d.currency,
      d.delivery_on,
      d.notes,
      d.created_at,
    ])
  );

  return csvResponse(dateStampedName("deals"), csv);
}
