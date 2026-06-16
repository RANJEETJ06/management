"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SensitivityField } from "@/components/sensitivity-field";
import { ShareWithField, type ShareMember } from "@/components/share-with-field";
import { cn, formatDate } from "@/lib/utils";
import {
  Check,
  Trash2,
  Plus,
  Lock,
  CalendarClock,
  User,
  Users,
  Bell,
  Phone,
  Video,
  Repeat,
  StickyNote,
  ListChecks,
} from "lucide-react";
import { ACTIVITY_TYPES } from "@/lib/activities";
import type { ActivityType, TaskPriority, TaskStatus } from "@/lib/types";

export type TaskRow = {
  id: string;
  title: string;
  notes: string | null;
  due_on: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: ActivityType;
  remind_at: string | null;
  contact_id: string | null;
  min_level: number;
  shared_with: string[];
  contact_name: string | null;
};

const PRIORITY_BADGE: Record<TaskPriority, "muted" | "default" | "danger"> = {
  low: "muted",
  normal: "default",
  high: "danger",
};

const TYPE_ICON: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  task: ListChecks,
  call: Phone,
  meeting: Video,
  follow_up: Repeat,
  note: StickyNote,
};

function formatReminder(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const today = () => new Date().toISOString().slice(0, 10);

export function TasksManager({
  orgId,
  userLevel,
  initialTasks,
  contacts,
  members,
}: {
  orgId: string;
  userLevel: number;
  initialTasks: TaskRow[];
  contacts: { id: string; name: string }[];
  members: ShareMember[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [tasks, setTasks] = useState(initialTasks);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [draft, setDraft] = useState({
    title: "",
    type: "task" as ActivityType,
    due_on: "",
    remind_at: "",
    priority: "normal" as TaskPriority,
    contact_id: "",
    min_level: 1,
    shared_with: [] as string[],
  });

  const groups = useMemo(() => {
    const t = today();
    const open = tasks.filter((x) => x.status === "open");
    const done = tasks.filter((x) => x.status === "done");
    return {
      overdue: open.filter((x) => x.due_on && x.due_on < t),
      today: open.filter((x) => x.due_on === t),
      upcoming: open.filter((x) => x.due_on && x.due_on > t),
      someday: open.filter((x) => !x.due_on),
      done,
    };
  }, [tasks]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.title.trim()) return;
    setBusy(true);
    setError("");
    const payload = {
      org_id: orgId,
      title: draft.title.trim(),
      type: draft.type,
      due_on: draft.due_on || null,
      remind_at: draft.remind_at ? new Date(draft.remind_at).toISOString() : null,
      priority: draft.priority,
      contact_id: draft.contact_id || null,
      min_level: draft.min_level,
      shared_with: draft.min_level > 1 ? draft.shared_with : [],
    };
    const { data, error } = await (supabase.from("tasks") as any)
      .insert(payload)
      .select(
        "id, title, notes, due_on, status, priority, type, remind_at, contact_id, min_level, shared_with"
      )
      .single();
    setBusy(false);
    if (error || !data) {
      setError(error?.message ?? "Could not add task.");
      return;
    }
    const contact_name = contacts.find((c) => c.id === data.contact_id)?.name ?? null;
    setTasks((ts) => [{ ...(data as any), shared_with: data.shared_with ?? [], contact_name }, ...ts]);
    setDraft({
      title: "",
      type: "task",
      due_on: "",
      remind_at: "",
      priority: "normal",
      contact_id: "",
      min_level: 1,
      shared_with: [],
    });
  }

  async function toggle(id: string) {
    const task = tasks.find((x) => x.id === id);
    if (!task) return;
    const next: TaskStatus = task.status === "done" ? "open" : "done";
    setTasks((ts) => ts.map((x) => (x.id === id ? { ...x, status: next } : x)));
    const { error } = await (supabase.from("tasks") as any)
      .update({ status: next })
      .eq("id", id);
    if (error) {
      setError(error.message);
      setTasks((ts) => ts.map((x) => (x.id === id ? { ...x, status: task.status } : x)));
    }
  }

  async function remove(id: string) {
    const prev = tasks;
    setTasks((ts) => ts.filter((x) => x.id !== id));
    const { error } = await (supabase.from("tasks") as any).delete().eq("id", id);
    if (error) {
      setError(error.message);
      setTasks(prev);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <form onSubmit={add} className="space-y-3">
            <Input
              placeholder="Add a task — e.g. Call Ramesh about the mango crate"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as ActivityType })}
              >
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </Select>
              <Select
                value={draft.priority}
                onChange={(e) =>
                  setDraft({ ...draft, priority: e.target.value as TaskPriority })
                }
              >
                <option value="low">Low priority</option>
                <option value="normal">Normal priority</option>
                <option value="high">High priority</option>
              </Select>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Due date</span>
                <Input
                  type="date"
                  value={draft.due_on}
                  onChange={(e) => setDraft({ ...draft, due_on: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Reminder</span>
                <Input
                  type="datetime-local"
                  value={draft.remind_at}
                  onChange={(e) => setDraft({ ...draft, remind_at: e.target.value })}
                />
              </div>
              <Select
                className="sm:col-span-2"
                value={draft.contact_id}
                onChange={(e) => setDraft({ ...draft, contact_id: e.target.value })}
              >
                <option value="">— Link a contact —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <SensitivityField
              userLevel={userLevel}
              value={draft.min_level}
              onChange={(min_level) => setDraft({ ...draft, min_level })}
            />
            <ShareWithField
              members={members}
              value={draft.shared_with}
              onChange={(shared_with) => setDraft({ ...draft, shared_with })}
              minLevel={draft.min_level}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={busy}>
                <Plus className="h-4 w-4" /> {busy ? "Adding…" : "Add task"}
              </Button>
            </div>
          </form>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Group title="Overdue" tone="danger" tasks={groups.overdue} onToggle={toggle} onRemove={remove} />
      <Group title="Today" tone="gold" tasks={groups.today} onToggle={toggle} onRemove={remove} />
      <Group title="Upcoming" tasks={groups.upcoming} onToggle={toggle} onRemove={remove} />
      <Group title="Someday" tasks={groups.someday} onToggle={toggle} onRemove={remove} />
      <Group title="Done" muted tasks={groups.done} onToggle={toggle} onRemove={remove} />

      {tasks.length === 0 && (
        <p className="text-sm text-muted-foreground">No tasks yet — add your first above.</p>
      )}
    </div>
  );
}

function Group({
  title,
  tasks,
  onToggle,
  onRemove,
  tone,
  muted,
}: {
  title: string;
  tasks: TaskRow[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  tone?: "danger" | "gold";
  muted?: boolean;
}) {
  if (tasks.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2
        className={cn(
          "flex items-center gap-2 text-sm font-semibold uppercase tracking-wide",
          tone === "danger" && "text-destructive",
          tone === "gold" && "text-[hsl(34_72%_30%)] dark:text-gold",
          muted && "text-muted-foreground"
        )}
      >
        {title}
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground tnum">
          {tasks.length}
        </span>
      </h2>
      <div className="space-y-1.5">
        {tasks.map((t) => {
          const TypeIcon = TYPE_ICON[t.type];
          return (
          <div
            key={t.id}
            className="group flex items-start gap-3 rounded-md border bg-card p-3"
          >
            <button
              onClick={() => onToggle(t.id)}
              aria-label={t.status === "done" ? "Mark open" : "Mark done"}
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                t.status === "done"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/40 hover:border-primary"
              )}
            >
              {t.status === "done" && <Check className="h-3 w-3" />}
            </button>
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium",
                  t.status === "done" && "text-muted-foreground line-through"
                )}
              >
                <TypeIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {t.title}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {t.due_on && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" /> {formatDate(t.due_on)}
                  </span>
                )}
                {t.remind_at && (
                  <span className="inline-flex items-center gap-1 text-gold">
                    <Bell className="h-3 w-3" /> {formatReminder(t.remind_at)}
                  </span>
                )}
                {t.contact_name && (
                  <Link
                    href={`/contacts/${t.contact_id}`}
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    <User className="h-3 w-3" /> {t.contact_name}
                  </Link>
                )}
                {t.min_level > 1 && (
                  <span className="inline-flex items-center gap-1 text-gold">
                    <Lock className="h-3 w-3" /> L{t.min_level}+
                  </span>
                )}
                {t.shared_with.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" /> +{t.shared_with.length} shared
                  </span>
                )}
              </div>
            </div>
            {t.priority !== "normal" && (
              <Badge variant={PRIORITY_BADGE[t.priority]} className="shrink-0">
                {t.priority}
              </Badge>
            )}
            <button
              onClick={() => onRemove(t.id)}
              aria-label="Delete task"
              className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          );
        })}
      </div>
    </section>
  );
}
