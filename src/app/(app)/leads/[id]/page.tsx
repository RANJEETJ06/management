import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { listOrgMembers } from "@/lib/members";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConvertLead } from "@/components/convert-lead";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FEATURE_FLOORS, sensitivityTag } from "@/lib/levels";
import { scoreBand, sourceLabel, stageMeta } from "@/lib/leads";
import {
  Pencil,
  Lock,
  Phone,
  Mail,
  Building2,
  User,
  UserCog,
  CheckCircle2,
} from "lucide-react";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const { orgId, level, role } = await requireOrg();
  if (level < FEATURE_FLOORS.leads) redirect("/dashboard");
  const canEdit = role !== "member";
  const supabase = createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", orgId)
    .maybeSingle<Lead>();

  if (!lead) notFound();

  const members = await listOrgMembers(orgId);
  const assigneeEmail = lead.assignee_id
    ? members.find((m) => m.user_id === lead.assignee_id)?.email ?? null
    : null;

  const [accountRes, contactRes, convertedRes] = await Promise.all([
    lead.account_id
      ? supabase.from("accounts").select("name").eq("id", lead.account_id).maybeSingle()
      : Promise.resolve({ data: null }),
    lead.contact_id
      ? supabase.from("contacts").select("name").eq("id", lead.contact_id).maybeSingle()
      : Promise.resolve({ data: null }),
    lead.converted_contact_id
      ? supabase.from("contacts").select("name").eq("id", lead.converted_contact_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const accountName = (accountRes.data as { name: string } | null)?.name ?? null;
  const contactName = (contactRes.data as { name: string } | null)?.name ?? null;
  const convertedName = (convertedRes.data as { name: string } | null)?.name ?? null;

  const stage = stageMeta(lead.status);
  const band = scoreBand(lead.score);
  const forecast = (lead.est_value ?? 0) * stage.probability;
  const converted = Boolean(lead.converted_contact_id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={lead.name}
        description={[lead.company, sourceLabel(lead.source)].filter(Boolean).join(" · ")}
        action={
          <>
            {canEdit && (
              <Button asChild variant="outline">
                <Link href={`/leads/${lead.id}/edit`}>
                  <Pencil className="h-4 w-4" /> Edit
                </Link>
              </Button>
            )}
            {canEdit && !converted && (
              <ConvertLead
                orgId={orgId}
                lead={{
                  id: lead.id,
                  name: lead.name,
                  company: lead.company,
                  email: lead.email,
                  phone: lead.phone,
                  contact_id: lead.contact_id,
                  account_id: lead.account_id,
                }}
              />
            )}
          </>
        }
      />

      {converted && (
        <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/[0.06] px-4 py-3 text-sm">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span>
            Converted{lead.converted_at ? ` on ${formatDate(lead.converted_at.slice(0, 10))}` : ""}
            {convertedName ? " — " : ""}
          </span>
          {convertedName && lead.converted_contact_id && (
            <Link href={`/contacts/${lead.converted_contact_id}`} className="font-medium text-primary hover:underline">
              {convertedName}
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Stage" value={stage.label} />
        <Metric label="Est. value" value={formatCurrency(lead.est_value, lead.currency)} />
        <Metric
          label="Weighted forecast"
          value={formatCurrency(forecast, lead.currency)}
          sub={`${Math.round(stage.probability * 100)}% of est. value`}
        />
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          {lead.min_level > FEATURE_FLOORS.leads && (
            <Badge variant="warn" className="gap-1">
              <Lock className="h-3 w-3" /> Restricted · {sensitivityTag(lead.min_level)}
            </Badge>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{stage.label}</Badge>
            <Badge variant={band.variant}>
              {band.label} · score {lead.score}
            </Badge>
            <Badge variant="muted">{sourceLabel(lead.source)}</Badge>
          </div>

          <div className="grid gap-2 pt-1 text-sm sm:grid-cols-2">
            {lead.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${lead.phone}`} className="hover:underline">
                  {lead.phone}
                </a>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${lead.email}`} className="hover:underline">
                  {lead.email}
                </a>
              </div>
            )}
            {accountName && lead.account_id && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <Link href={`/accounts/${lead.account_id}`} className="hover:underline">
                  {accountName}
                </Link>
              </div>
            )}
            {contactName && lead.contact_id && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <Link href={`/contacts/${lead.contact_id}`} className="hover:underline">
                  {contactName}
                </Link>
              </div>
            )}
            <div className="flex items-center gap-2">
              <UserCog className="h-4 w-4 text-muted-foreground" />
              <span>{assigneeEmail ?? "Unassigned"}</span>
            </div>
          </div>

          {lead.notes && (
            <div className="whitespace-pre-wrap border-t pt-3 text-sm">{lead.notes}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="eyebrow">{label}</div>
        <div className="mt-1 font-display text-2xl font-semibold tracking-tight tnum">{value}</div>
        {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
