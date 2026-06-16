import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { csvResponse, dateStampedName, toCsv } from "@/lib/csv";
import { FEATURE_FLOORS } from "@/lib/levels";

export const dynamic = "force-dynamic";

export async function GET() {
  const { orgId, level } = await requireOrg();
  if (level < FEATURE_FLOORS.accounts) return new Response("Forbidden", { status: 403 });
  const supabase = createClient();

  const { data, error } = await supabase
    .from("accounts")
    .select(
      "name, industry, website, phone, email, locality, address, size, annual_revenue, tags, created_at"
    )
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (error) return new Response(error.message, { status: 500 });

  const rows = (data ?? []) as Array<Record<string, unknown>>;

  const csv = toCsv(
    [
      "Name",
      "Industry",
      "Website",
      "Phone",
      "Email",
      "Locality",
      "Address",
      "Size",
      "Annual revenue",
      "Tags",
      "Created",
    ],
    rows.map((a) => [
      a.name as string,
      a.industry as string,
      a.website as string,
      a.phone as string,
      a.email as string,
      a.locality as string,
      a.address as string,
      a.size as string,
      a.annual_revenue as number,
      ((a.tags as string[]) ?? []).join("; "),
      a.created_at as string,
    ])
  );

  return csvResponse(dateStampedName("accounts"), csv);
}
