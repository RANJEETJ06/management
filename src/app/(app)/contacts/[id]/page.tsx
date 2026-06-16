import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, relativeDate } from "@/lib/utils";
import { sensitivityTag } from "@/lib/levels";
import {
  Phone,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Lock,
  CalendarClock,
  Receipt,
  ListChecks,
  Building2,
  Globe,
  Link2,
  MessagesSquare,
} from "lucide-react";
import { channelLabel } from "@/lib/activities";
import { Contact, Communication, Deal, Interaction, Task } from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  supplier: "Supplier",
  buyer: "Buyer",
  partner: "Partner",
  other: "Other",
};

type TimelineEntry = {
  kind: "interaction" | "deal" | "task" | "communication";
  id: string;
  date: string;
  href: string;
  title: string;
  detail?: string | null;
  badge?: { label: string; variant: "muted" | "success" | "warn" | "danger" | "default" };
  restricted?: boolean;
};

export default async function ContactDetailPage({ params }: { params: { id: string } }) {
  const { orgId, role } = await requireOrg();
  const canEdit = role !== "member";
  const isMember = role === "member";
  const supabase = createClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", orgId)
    .maybeSingle<Contact>();

  if (!contact) notFound();

  const account = contact.account_id
    ? ((
        await supabase
          .from("accounts")
          .select("id, name")
          .eq("id", contact.account_id)
          .maybeSingle()
      ).data as { id: string; name: string } | null)
    : null;

  const socialEntries = Object.entries(contact.social ?? {}).filter(([, v]) => v);
  const customEntries = Object.entries(contact.custom_fields ?? {});

  const [{ data: interactions }, dealsRes, { data: tasks }, { data: comms }] =
    await Promise.all([
      supabase
        .from("interactions")
        .select("id, occurred_on, summary, location, status, min_level")
        .eq("contact_id", params.id)
        .order("occurred_on", { ascending: false })
        .limit(50)
        .returns<Interaction[]>(),
      isMember
        ? Promise.resolve({ data: null as Deal[] | null })
        : supabase
            .from("deals")
            .select("id, deal_date, direction, status, amount_total, currency, min_level")
            .eq("contact_id", params.id)
            .order("deal_date", { ascending: false })
            .limit(50)
            .returns<Deal[]>(),
      supabase
        .from("tasks")
        .select("id, title, due_on, status, created_at, min_level")
        .eq("contact_id", params.id)
        .order("due_on", { ascending: false })
        .limit(50)
        .returns<Task[]>(),
      supabase
        .from("communications")
        .select("id, channel, subject, body, occurred_at, min_level")
        .eq("contact_id", params.id)
        .order("occurred_at", { ascending: false })
        .limit(50)
        .returns<Communication[]>(),
    ]);
  const deals = dealsRes.data;

  // Merge everything into one chronological story.
  const timeline: TimelineEntry[] = [];
  for (const i of interactions ?? []) {
    timeline.push({
      kind: "interaction",
      id: i.id,
      date: i.occurred_on,
      href: `/interactions/${i.id}`,
      title: i.summary,
      detail: i.location ? `📍 ${i.location}` : null,
      badge: { label: i.status, variant: "muted" },
      restricted: i.min_level > 1,
    });
  }
  for (const d of deals ?? []) {
    timeline.push({
      kind: "deal",
      id: d.id,
      date: d.deal_date,
      href: `/deals/${d.id}`,
      title: `${d.direction === "buy" ? "Purchase" : "Sale"} · ${formatCurrency(
        d.amount_total,
        d.currency
      )}`,
      detail: null,
      badge: {
        label: d.status,
        variant: d.status === "cancelled" ? "danger" : "success",
      },
      restricted: d.min_level > 1,
    });
  }
  for (const t of tasks ?? []) {
    timeline.push({
      kind: "task",
      id: t.id,
      date: t.due_on ?? t.created_at.slice(0, 10),
      href: `/tasks`,
      title: t.title,
      detail: t.due_on ? `Due ${formatDate(t.due_on)}` : "No due date",
      badge: {
        label: t.status === "done" ? "done" : "task",
        variant: t.status === "done" ? "success" : "warn",
      },
      restricted: t.min_level > 1,
    });
  }
  for (const c of comms ?? []) {
    timeline.push({
      kind: "communication",
      id: c.id,
      date: c.occurred_at.slice(0, 10),
      href: "/communications",
      title: c.subject || channelLabel(c.channel),
      detail: c.body ?? null,
      badge: { label: channelLabel(c.channel), variant: "muted" },
      restricted: c.min_level > 1,
    });
  }
  timeline.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return (
    <div className="space-y-6">
      <PageHeader
        title={contact.name}
        description={[TYPE_LABELS[contact.type], contact.title, contact.locality]
          .filter(Boolean)
          .join(" · ")}
        action={
          <>
            {canEdit && (
              <Button asChild variant="outline">
                <Link href={`/contacts/${contact.id}/edit`}>
                  <Pencil className="h-4 w-4" /> Edit
                </Link>
              </Button>
            )}
            <Button asChild>
              <Link href={`/interactions/new?contact=${contact.id}`}>
                <Plus className="h-4 w-4" /> Log interaction
              </Link>
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="p-5 space-y-2">
          {contact.min_level > 1 && (
            <Badge variant="warn" className="mb-1 gap-1">
              <Lock className="h-3 w-3" /> Restricted · {sensitivityTag(contact.min_level)}
            </Badge>
          )}
          {account && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Link href={`/accounts/${account.id}`} className="hover:underline">
                {account.name}
              </Link>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${contact.phone}`} className="hover:underline">
                {contact.phone}
              </a>
            </div>
          )}
          {contact.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${contact.email}`} className="hover:underline">
                {contact.email}
              </a>
            </div>
          )}
          {contact.address && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{contact.address}</span>
            </div>
          )}
          {contact.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1 border-t pt-2">
              {contact.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          {socialEntries.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-sm">
              {socialEntries.map(([k, v]) => {
                const val = String(v);
                const href =
                  k === "whatsapp"
                    ? `https://wa.me/${val.replace(/[^\d]/g, "")}`
                    : /^https?:\/\//.test(val)
                      ? val
                      : k === "website" || k === "linkedin"
                        ? `https://${val}`
                        : null;
                const Icon = k === "website" ? Globe : Link2;
                return href ? (
                  <a
                    key={k}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 capitalize text-muted-foreground hover:text-foreground hover:underline"
                  >
                    <Icon className="h-3.5 w-3.5" /> {k}
                  </a>
                ) : (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 capitalize text-muted-foreground"
                  >
                    <Icon className="h-3.5 w-3.5" /> {k}: {val}
                  </span>
                );
              })}
            </div>
          )}
          {customEntries.length > 0 && (
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 border-t pt-2 text-sm">
              {customEntries.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}
          {contact.notes && (
            <div className="text-sm whitespace-pre-wrap pt-2 border-t mt-2">{contact.notes}</div>
          )}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Activity</h2>
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing logged with this contact yet. Log an interaction to start the story.
          </p>
        ) : (
          <ol className="relative space-y-3 border-l border-border/70 pl-5">
            {timeline.map((e) => (
              <li key={`${e.kind}-${e.id}`} className="relative">
                <span className="absolute -left-[1.6rem] top-1.5 flex h-6 w-6 items-center justify-center rounded-full border bg-card text-muted-foreground">
                  {e.kind === "interaction" ? (
                    <CalendarClock className="h-3.5 w-3.5" />
                  ) : e.kind === "deal" ? (
                    <Receipt className="h-3.5 w-3.5" />
                  ) : e.kind === "communication" ? (
                    <MessagesSquare className="h-3.5 w-3.5" />
                  ) : (
                    <ListChecks className="h-3.5 w-3.5" />
                  )}
                </span>
                <Link
                  href={e.href}
                  className="block rounded-md border bg-card p-3 transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                      {formatDate(e.date)} · {relativeDate(e.date)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {e.restricted && <Lock className="h-3 w-3 text-gold" />}
                      {e.badge && <Badge variant={e.badge.variant}>{e.badge.label}</Badge>}
                    </div>
                  </div>
                  <div className="mt-1 text-sm font-medium line-clamp-2">{e.title}</div>
                  {e.detail && (
                    <div className="mt-0.5 text-xs text-muted-foreground">{e.detail}</div>
                  )}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
