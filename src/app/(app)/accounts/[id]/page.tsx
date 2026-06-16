import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FEATURE_FLOORS, sensitivityTag } from "@/lib/levels";
import {
  Pencil,
  Plus,
  Lock,
  Globe,
  Phone,
  Mail,
  MapPin,
  Users,
  Receipt,
  Briefcase,
} from "lucide-react";
import type { Account, Contact, Deal } from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  supplier: "Supplier",
  buyer: "Buyer",
  partner: "Partner",
  other: "Other",
};

export default async function AccountDetailPage({ params }: { params: { id: string } }) {
  const { orgId, level, role } = await requireOrg();
  if (level < FEATURE_FLOORS.accounts) redirect("/dashboard");
  const canEdit = role !== "member";
  const isMember = role === "member";
  const supabase = createClient();

  const { data: account } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", orgId)
    .maybeSingle<Account>();

  if (!account) notFound();

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, type, title, phone, email, min_level")
    .eq("account_id", params.id)
    .order("name", { ascending: true })
    .returns<Contact[]>();

  const contactIds = (contacts ?? []).map((c) => c.id);

  let deals: Deal[] = [];
  if (!isMember && contactIds.length) {
    const { data } = await supabase
      .from("deals")
      .select(
        "id, contact_id, direction, deal_date, status, amount_total, amount_paid, currency, min_level"
      )
      .in("contact_id", contactIds)
      .order("deal_date", { ascending: false })
      .limit(100)
      .returns<Deal[]>();
    deals = data ?? [];
  }

  const currency = deals[0]?.currency ?? "INR";
  let sales = 0;
  let purchases = 0;
  let outstanding = 0;
  for (const d of deals) {
    const total = d.amount_total ?? 0;
    if (d.direction === "sell") sales += total;
    else purchases += total;
    if (d.status !== "cancelled") outstanding += Math.max(0, total - (d.amount_paid ?? 0));
  }

  const customEntries = Object.entries(account.custom_fields ?? {});

  return (
    <div className="space-y-6">
      <PageHeader
        title={account.name}
        description={[account.industry, account.locality].filter(Boolean).join(" · ") || "Account"}
        action={
          <>
            {canEdit && (
              <Button asChild variant="outline">
                <Link href={`/accounts/${account.id}/edit`}>
                  <Pencil className="h-4 w-4" /> Edit
                </Link>
              </Button>
            )}
            {canEdit && (
              <Button asChild>
                <Link href={`/contacts/new?account=${account.id}`}>
                  <Plus className="h-4 w-4" /> Add contact
                </Link>
              </Button>
            )}
          </>
        }
      />

      <Card>
        <CardContent className="space-y-2 p-5">
          {account.min_level > FEATURE_FLOORS.accounts && (
            <Badge variant="warn" className="mb-1 gap-1">
              <Lock className="h-3 w-3" /> Restricted · {sensitivityTag(account.min_level)}
            </Badge>
          )}
          {account.website && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <a
                href={account.website}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                {account.website}
              </a>
            </div>
          )}
          {account.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${account.phone}`} className="hover:underline">
                {account.phone}
              </a>
            </div>
          )}
          {account.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${account.email}`} className="hover:underline">
                {account.email}
              </a>
            </div>
          )}
          {account.address && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{account.address}</span>
            </div>
          )}
          {(account.size || account.annual_revenue != null) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm text-muted-foreground">
              {account.size && <span>Size: {account.size}</span>}
              {account.annual_revenue != null && (
                <span>Revenue: {formatCurrency(account.annual_revenue, currency)}</span>
              )}
            </div>
          )}
          {account.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {account.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          {customEntries.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 border-t pt-2 text-sm">
              {customEntries.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}
          {account.notes && (
            <div className="whitespace-pre-wrap border-t pt-2 text-sm">{account.notes}</div>
          )}
        </CardContent>
      </Card>

      {!isMember && deals.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Sales" value={formatCurrency(sales, currency)} />
          <Stat label="Purchases" value={formatCurrency(purchases, currency)} />
          <Stat label="Outstanding" value={formatCurrency(outstanding, currency)} />
        </div>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Users className="h-4 w-4" /> Contacts
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground tnum">
            {contacts?.length ?? 0}
          </span>
        </h2>
        {(contacts?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">
            No contacts linked to this account yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {contacts!.map((c) => (
              <Link key={c.id} href={`/contacts/${c.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="space-y-1 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{c.name}</span>
                      <Badge variant="secondary">{TYPE_LABELS[c.type]}</Badge>
                    </div>
                    {c.title && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Briefcase className="h-3 w-3" /> {c.title}
                      </div>
                    )}
                    {c.phone && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" /> {c.phone}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {!isMember && deals.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Receipt className="h-4 w-4" /> Purchase history
          </h2>
          <div className="space-y-1.5">
            {deals.map((d) => (
              <Link
                key={d.id}
                href={`/deals/${d.id}`}
                className="flex items-center justify-between gap-3 rounded-md border bg-card p-3 transition-colors hover:bg-accent/40"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {d.direction === "buy" ? "Purchase" : "Sale"} ·{" "}
                    {formatCurrency(d.amount_total, d.currency)}
                  </div>
                  <div className="text-xs text-muted-foreground">{formatDate(d.deal_date)}</div>
                </div>
                <Badge variant={d.status === "cancelled" ? "danger" : "success"}>{d.status}</Badge>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="eyebrow">{label}</div>
        <div className="mt-1 font-display text-2xl font-semibold tracking-tight tnum">{value}</div>
      </CardContent>
    </Card>
  );
}
