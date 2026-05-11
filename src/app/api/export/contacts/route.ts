import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { csvResponse, dateStampedName, toCsv } from "@/lib/csv";
import type { Contact } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const { orgId } = await requireOrg();
  const supabase = createClient();

  const { data, error } = await supabase
    .from("contacts")
    .select("name, type, phone, email, locality, address, notes, created_at")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const rows = (data ?? []) as Pick<
    Contact,
    "name" | "type" | "phone" | "email" | "locality" | "address" | "notes" | "created_at"
  >[];

  const csv = toCsv(
    ["Name", "Type", "Phone", "Email", "Locality", "Address", "Notes", "Created"],
    rows.map((c) => [
      c.name,
      c.type,
      c.phone,
      c.email,
      c.locality,
      c.address,
      c.notes,
      c.created_at,
    ])
  );

  return csvResponse(dateStampedName("contacts"), csv);
}
