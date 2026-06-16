import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { csvResponse, dateStampedName, toCsv } from "@/lib/csv";
import { FEATURE_FLOORS } from "@/lib/levels";
import { sourceLabel, stageMeta } from "@/lib/leads";
import type { LeadSource, LeadStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const { orgId, level } = await requireOrg();
  if (level < FEATURE_FLOORS.leads) return new Response("Forbidden", { status: 403 });
  const supabase = createClient();

  const { data, error } = await supabase
    .from("leads")
    .select(
      "name, company, email, phone, source, status, score, est_value, currency, created_at"
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return new Response(error.message, { status: 500 });

  const rows = (data ?? []) as Array<Record<string, unknown>>;

  const csv = toCsv(
    ["Name", "Company", "Email", "Phone", "Source", "Stage", "Score", "Est. value", "Currency", "Created"],
    rows.map((l) => [
      l.name as string,
      l.company as string,
      l.email as string,
      l.phone as string,
      sourceLabel(l.source as LeadSource),
      stageMeta(l.status as LeadStatus).label,
      l.score as number,
      l.est_value as number,
      l.currency as string,
      l.created_at as string,
    ])
  );

  return csvResponse(dateStampedName("leads"), csv);
}
