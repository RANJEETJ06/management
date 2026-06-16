"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { UserCheck } from "lucide-react";
import { FEATURE_FLOORS } from "@/lib/levels";

/**
 * Converts a lead into a Contact (and an Account, if the lead names a company
 * that isn't already linked), then marks the lead Won and records the link.
 * Reuses an already-linked contact/account rather than duplicating.
 */
export function ConvertLead({
  orgId,
  lead,
}: {
  orgId: string;
  lead: {
    id: string;
    name: string;
    company: string | null;
    email: string | null;
    phone: string | null;
    contact_id: string | null;
    account_id: string | null;
  };
}) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function convert() {
    if (!confirm("Convert this lead to a contact and mark it Won?")) return;
    setBusy(true);
    setError("");

    let accountId = lead.account_id;
    let contactId = lead.contact_id;

    try {
      // Create an account from the company name when none is linked yet.
      if (!accountId && lead.company) {
        const { data: acc, error: accErr } = await (supabase.from("accounts") as any)
          .insert({ org_id: orgId, name: lead.company, min_level: FEATURE_FLOORS.accounts })
          .select("id")
          .single();
        if (accErr) throw accErr;
        accountId = (acc as { id: string }).id;
      }

      // Reuse the linked contact, else create one from the lead.
      if (!contactId) {
        const { data: c, error: cErr } = await (supabase.from("contacts") as any)
          .insert({
            org_id: orgId,
            name: lead.name,
            type: "buyer",
            email: lead.email,
            phone: lead.phone,
            account_id: accountId,
            min_level: 1,
          })
          .select("id")
          .single();
        if (cErr) throw cErr;
        contactId = (c as { id: string }).id;
      } else if (accountId) {
        await (supabase.from("contacts") as any)
          .update({ account_id: accountId })
          .eq("id", contactId);
      }

      const { error: lErr } = await (supabase.from("leads") as any)
        .update({
          status: "won",
          converted_contact_id: contactId,
          converted_at: new Date().toISOString(),
          account_id: accountId,
        })
        .eq("id", lead.id);
      if (lErr) throw lErr;

      router.push(`/contacts/${contactId}`);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Could not convert lead.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={convert} disabled={busy}>
        <UserCheck className="h-4 w-4" /> {busy ? "Converting…" : "Convert to contact"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
