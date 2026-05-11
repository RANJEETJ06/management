import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { csvResponse, dateStampedName, toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

type Row = {
  occurred_on: string;
  contacts: { name: string | null; locality: string | null } | null;
  channel: string | null;
  location: string | null;
  summary: string;
  status: string;
  follow_up_on: string | null;
  created_at: string;
};

export async function GET() {
  const { orgId } = await requireOrg();
  const supabase = createClient();

  const { data, error } = await supabase
    .from("interactions")
    .select(
      "occurred_on, channel, location, summary, status, follow_up_on, created_at, contacts(name, locality)"
    )
    .eq("org_id", orgId)
    .order("occurred_on", { ascending: false });

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const rows = (data ?? []) as unknown as Row[];

  const csv = toCsv(
    [
      "Date",
      "Contact",
      "Locality",
      "Channel",
      "Location",
      "Summary",
      "Status",
      "Follow-up on",
      "Created",
    ],
    rows.map((r) => [
      r.occurred_on,
      r.contacts?.name ?? "",
      r.contacts?.locality ?? "",
      r.channel,
      r.location,
      r.summary,
      r.status,
      r.follow_up_on,
      r.created_at,
    ])
  );

  return csvResponse(dateStampedName("interactions"), csv);
}
