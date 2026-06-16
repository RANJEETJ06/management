import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n: number) => String(n).padStart(2, "0");
const ym = (y: number, m: number) => `${y}-${pad(m + 1)}`;

type Item = {
  id: string;
  day: number;
  label: string;
  kind: "task" | "follow_up";
  href: string;
  done?: boolean;
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const { orgId } = await requireOrg();
  const supabase = createClient();

  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth(); // 0-based
  if (searchParams.month && /^\d{4}-\d{2}$/.test(searchParams.month)) {
    const [y, m] = searchParams.month.split("-").map(Number);
    year = y;
    month = m - 1;
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay(); // 0=Sun
  const monthStart = `${year}-${pad(month + 1)}-01`;
  const nextMonth = new Date(year, month + 1, 1);
  const monthEnd = `${nextMonth.getFullYear()}-${pad(nextMonth.getMonth() + 1)}-01`;

  const [{ data: tasks }, { data: interactions }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, due_on, status, type")
      .eq("org_id", orgId)
      .gte("due_on", monthStart)
      .lt("due_on", monthEnd)
      .limit(500),
    supabase
      .from("interactions")
      .select("id, summary, follow_up_on, contact_id, contacts(name)")
      .eq("org_id", orgId)
      .eq("status", "open")
      .gte("follow_up_on", monthStart)
      .lt("follow_up_on", monthEnd)
      .limit(500),
  ]);

  const items: Item[] = [];
  for (const t of (tasks ?? []) as any[]) {
    if (!t.due_on) continue;
    items.push({
      id: `t-${t.id}`,
      day: Number(t.due_on.slice(8, 10)),
      label: t.title,
      kind: "task",
      href: "/tasks",
      done: t.status === "done",
    });
  }
  for (const i of (interactions ?? []) as any[]) {
    if (!i.follow_up_on) continue;
    items.push({
      id: `i-${i.id}`,
      day: Number(i.follow_up_on.slice(8, 10)),
      label: `Follow up · ${i.contacts?.name ?? i.summary}`,
      kind: "follow_up",
      href: `/interactions/${i.id}`,
    });
  }
  const byDay = new Map<number, Item[]>();
  for (const it of items) {
    const arr = byDay.get(it.day) ?? [];
    arr.push(it);
    byDay.set(it.day, arr);
  }

  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const todayDay = now.getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Due tasks and activities, plus interaction follow-ups, laid out by day."
      />

      <div className="flex items-center justify-between">
        <div className="font-display text-xl font-semibold tracking-tight">
          {MONTHS[month]} {year}
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/calendar?month=${ym(prev.getFullYear(), prev.getMonth())}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link
            href="/calendar"
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Today
          </Link>
          <Link
            href={`/calendar?month=${ym(next.getFullYear(), next.getMonth())}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-2">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            const dayItems = day ? byDay.get(day) ?? [] : [];
            const isToday = isCurrentMonth && day === todayDay;
            return (
              <div
                key={idx}
                className={cn(
                  "min-h-[5.5rem] border-b border-r p-1.5 text-xs [&:nth-child(7n)]:border-r-0",
                  !day && "bg-muted/20"
                )}
              >
                {day && (
                  <>
                    <div
                      className={cn(
                        "mb-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 tnum",
                        isToday ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground"
                      )}
                    >
                      {day}
                    </div>
                    <div className="space-y-1">
                      {dayItems.slice(0, 3).map((it) => (
                        <Link
                          key={it.id}
                          href={it.href}
                          className={cn(
                            "block truncate rounded px-1.5 py-0.5 text-[0.7rem] transition-colors hover:bg-accent",
                            it.kind === "follow_up"
                              ? "bg-gold-soft/60 text-[hsl(34_72%_30%)] dark:text-gold"
                              : "bg-primary/[0.08] text-primary",
                            it.done && "line-through opacity-60"
                          )}
                          title={it.label}
                        >
                          {it.label}
                        </Link>
                      ))}
                      {dayItems.length > 3 && (
                        <div className="px-1.5 text-[0.7rem] text-muted-foreground">
                          +{dayItems.length - 3} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
