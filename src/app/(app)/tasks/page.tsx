import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { TasksManager, type TaskRow } from "./tasks-manager";
import { listOrgMembers } from "@/lib/members";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const { user, orgId, level } = await requireOrg();
  const supabase = createClient();

  const [{ data: tasks }, { data: contacts }, allMembers] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, notes, due_on, status, priority, contact_id, min_level, shared_with, contacts(name)"
      )
      .eq("org_id", orgId)
      .order("due_on", { ascending: true, nullsFirst: false })
      .limit(300),
    supabase.from("contacts").select("id, name").eq("org_id", orgId).order("name"),
    listOrgMembers(orgId),
  ]);

  const rows: TaskRow[] = (tasks ?? []).map((t: any) => ({
    id: t.id,
    title: t.title,
    notes: t.notes,
    due_on: t.due_on,
    status: t.status,
    priority: t.priority,
    contact_id: t.contact_id,
    min_level: t.min_level ?? 1,
    shared_with: t.shared_with ?? [],
    contact_name: t.contacts?.name ?? null,
  }));

  const members = allMembers.filter((m) => m.user_id !== user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Reminders and to-dos — tie them to a contact and they surface on the dashboard near their due date."
      />
      <TasksManager
        orgId={orgId}
        userLevel={level}
        initialTasks={rows}
        contacts={contacts ?? []}
        members={members}
      />
    </div>
  );
}
