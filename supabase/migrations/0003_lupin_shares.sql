-- ============================================================================
-- Lupin — per-person sharing
--   A restricted deal/task (min_level > 1) can additionally be granted to
--   specific teammates whose clearance would otherwise hide it.
--   Visibility becomes:  clearance >= min_level  OR  you're on shared_with
--   (tasks also: you're the assignee).
-- Run AFTER 0002_lupin.sql in the Supabase SQL editor.
-- ============================================================================

alter table public.deals
  add column if not exists shared_with uuid[] not null default '{}';
alter table public.tasks
  add column if not exists shared_with uuid[] not null default '{}';

create index if not exists deals_shared_with_idx on public.deals using gin (shared_with);
create index if not exists tasks_shared_with_idx on public.tasks using gin (shared_with);

-- ----------------------------------------------------------------------------
-- Deals — re-cut visibility/mutation policies with the share override.
-- ----------------------------------------------------------------------------
drop policy if exists deals_select on public.deals;
create policy deals_select on public.deals
  for select using (
    public.is_member_of(org_id)
    and (
      min_level <= public.current_level(org_id)
      or auth.uid() = any(shared_with)
    )
  );

drop policy if exists deals_update on public.deals;
create policy deals_update on public.deals
  for update using (
    public.is_member_of(org_id)
    and (
      min_level <= public.current_level(org_id)
      or auth.uid() = any(shared_with)
    )
  ) with check (
    public.is_member_of(org_id)
    and (
      min_level <= public.current_level(org_id)
      or auth.uid() = any(shared_with)
    )
  );

drop policy if exists deals_delete on public.deals;
create policy deals_delete on public.deals
  for delete using (
    public.is_member_of(org_id)
    and (
      min_level <= public.current_level(org_id)
      or auth.uid() = any(shared_with)
    )
  );

-- ----------------------------------------------------------------------------
-- Tasks — same, plus the assignee can always see/work their task.
-- ----------------------------------------------------------------------------
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select using (
    public.is_member_of(org_id)
    and (
      min_level <= public.current_level(org_id)
      or auth.uid() = any(shared_with)
      or auth.uid() = assignee_id
    )
  );

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
  for update using (
    public.is_member_of(org_id)
    and (
      min_level <= public.current_level(org_id)
      or auth.uid() = any(shared_with)
      or auth.uid() = assignee_id
    )
  ) with check (
    public.is_member_of(org_id)
    and (
      min_level <= public.current_level(org_id)
      or auth.uid() = any(shared_with)
      or auth.uid() = assignee_id
    )
  );

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
  for delete using (
    public.is_member_of(org_id)
    and (
      min_level <= public.current_level(org_id)
      or auth.uid() = any(shared_with)
      or auth.uid() = assignee_id
    )
  );
