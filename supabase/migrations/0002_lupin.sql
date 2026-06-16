-- ============================================================================
-- Lupin — CRM upgrade
--   * Employee clearance levels (1..5) on members
--   * Per-record sensitivity (min_level) on contacts / interactions / deals
--   * current_level() helper + level-gated RLS
--   * Tasks & reminders
-- Run this AFTER 0001_init.sql in the Supabase SQL editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Clearance levels on members (5 = highest / sees everything, 1 = lowest)
-- ----------------------------------------------------------------------------
alter table public.members
  add column if not exists level int not null default 1
    check (level between 1 and 5);

-- Owners always sit at the top of the hierarchy.
update public.members set level = 5 where role = 'owner';
-- Existing admins get a sensible default just below the top.
update public.members set level = 4 where role = 'admin' and level < 4;

-- ----------------------------------------------------------------------------
-- 2. Record sensitivity. A record is visible only to members whose clearance
--    level is >= the record's min_level. Default 1 == visible to everyone.
-- ----------------------------------------------------------------------------
alter table public.contacts
  add column if not exists min_level int not null default 1
    check (min_level between 1 and 5);
alter table public.interactions
  add column if not exists min_level int not null default 1
    check (min_level between 1 and 5);
alter table public.deals
  add column if not exists min_level int not null default 1
    check (min_level between 1 and 5);

create index if not exists contacts_min_level_idx     on public.contacts(org_id, min_level);
create index if not exists interactions_min_level_idx on public.interactions(org_id, min_level);
create index if not exists deals_min_level_idx        on public.deals(org_id, min_level);

-- ----------------------------------------------------------------------------
-- 3. Clearance helper — the caller's level inside a given org (defaults to 1).
-- ----------------------------------------------------------------------------
create or replace function public.current_level(target_org uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select level from public.members
     where org_id = target_org and user_id = auth.uid()),
    1);
$$;

-- ----------------------------------------------------------------------------
-- 4. Members can have their role / level managed by owners & admins.
--    (0001 only shipped select/insert/delete policies for members.)
-- ----------------------------------------------------------------------------
drop policy if exists members_update on public.members;
create policy members_update on public.members
  for update using (
    exists (select 1 from public.members m
            where m.org_id = members.org_id
              and m.user_id = auth.uid()
              and m.role in ('owner','admin'))
  )
  with check (
    exists (select 1 from public.members m
            where m.org_id = members.org_id
              and m.user_id = auth.uid()
              and m.role in ('owner','admin'))
  );

-- ----------------------------------------------------------------------------
-- 5. Re-cut the data-table policies so visibility is gated by clearance.
--    Membership still required; you can never tag a record above your own
--    clearance (so you can't hide data from yourself).
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['contacts','interactions','deals']
  loop
    execute format('drop policy if exists %I_all on public.%I', t, t);
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format('drop policy if exists %I_insert on public.%I', t, t);
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format('drop policy if exists %I_delete on public.%I', t, t);

    execute format($f$
      create policy %1$I_select on public.%1$I
        for select using (
          public.is_member_of(org_id)
          and min_level <= public.current_level(org_id)
        );$f$, t);

    execute format($f$
      create policy %1$I_insert on public.%1$I
        for insert with check (
          public.is_member_of(org_id)
          and min_level <= public.current_level(org_id)
        );$f$, t);

    execute format($f$
      create policy %1$I_update on public.%1$I
        for update using (
          public.is_member_of(org_id)
          and min_level <= public.current_level(org_id)
        ) with check (
          public.is_member_of(org_id)
          and min_level <= public.current_level(org_id)
        );$f$, t);

    execute format($f$
      create policy %1$I_delete on public.%1$I
        for delete using (
          public.is_member_of(org_id)
          and min_level <= public.current_level(org_id)
        );$f$, t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 6. Tasks & reminders
-- ----------------------------------------------------------------------------
create table if not exists public.tasks (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  title       text not null,
  notes       text,
  due_on      date,
  status      text not null default 'open'
              check (status in ('open','done')),
  priority    text not null default 'normal'
              check (priority in ('low','normal','high')),
  contact_id  uuid references public.contacts(id) on delete set null,
  deal_id     uuid references public.deals(id) on delete set null,
  assignee_id uuid references auth.users(id) on delete set null,
  min_level   int not null default 1 check (min_level between 1 and 5),
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists tasks_org_status_idx on public.tasks(org_id, status, due_on);
create index if not exists tasks_assignee_idx   on public.tasks(assignee_id);

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;

create policy tasks_select on public.tasks
  for select using (
    public.is_member_of(org_id) and min_level <= public.current_level(org_id)
  );
create policy tasks_insert on public.tasks
  for insert with check (
    public.is_member_of(org_id) and min_level <= public.current_level(org_id)
  );
create policy tasks_update on public.tasks
  for update using (
    public.is_member_of(org_id) and min_level <= public.current_level(org_id)
  ) with check (
    public.is_member_of(org_id) and min_level <= public.current_level(org_id)
  );
create policy tasks_delete on public.tasks
  for delete using (
    public.is_member_of(org_id) and min_level <= public.current_level(org_id)
  );
