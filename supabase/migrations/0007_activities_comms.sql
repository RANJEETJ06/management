-- ============================================================================
-- Lupin — Phase 2: Activities & Communication
--   * tasks            — generalized into activities (type + reminder + lead link)
--   * communications   — logged emails/SMS/WhatsApp/calls/chat (clearance floor 3)
--   * email_templates  — reusable message templates (clearance floor 3)
-- Run AFTER 0006_accounts_leads.sql in the Supabase SQL editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tasks → Activities: a type, an optional reminder, and a lead link.
--    (Tasks stay all-levels; existing rows default to type 'task'.)
-- ----------------------------------------------------------------------------
alter table public.tasks
  add column if not exists type text not null default 'task'
    check (type in ('task','call','meeting','follow_up','note')),
  add column if not exists remind_at timestamptz,
  add column if not exists lead_id uuid references public.leads(id) on delete set null;

create index if not exists tasks_remind_idx on public.tasks(org_id, remind_at)
  where remind_at is not null;
create index if not exists tasks_lead_idx on public.tasks(lead_id);

-- ----------------------------------------------------------------------------
-- 2. Communications log  — floor: clearance 3 (Lead+)
-- ----------------------------------------------------------------------------
create table if not exists public.communications (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  channel     text not null default 'email'
              check (channel in ('email','sms','whatsapp','call','chat','other')),
  direction   text not null default 'outbound'
              check (direction in ('inbound','outbound')),
  subject     text,
  body        text,
  contact_id  uuid references public.contacts(id) on delete set null,
  deal_id     uuid references public.deals(id)     on delete set null,
  lead_id     uuid references public.leads(id)     on delete set null,
  occurred_at timestamptz not null default now(),
  min_level   int  not null default 3 check (min_level between 1 and 5),
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists communications_org_idx     on public.communications(org_id, occurred_at desc);
create index if not exists communications_contact_idx on public.communications(contact_id);

drop trigger if exists communications_updated_at on public.communications;
create trigger communications_updated_at
  before update on public.communications
  for each row execute function public.set_updated_at();

alter table public.communications enable row level security;

drop policy if exists communications_select on public.communications;
create policy communications_select on public.communications
  for select using (
    public.is_member_of(org_id) and min_level <= public.current_level(org_id)
  );
drop policy if exists communications_insert on public.communications;
create policy communications_insert on public.communications
  for insert with check (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  );
drop policy if exists communications_update on public.communications;
create policy communications_update on public.communications
  for update using (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  ) with check (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  );
drop policy if exists communications_delete on public.communications;
create policy communications_delete on public.communications
  for delete using (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  );

-- ----------------------------------------------------------------------------
-- 3. Email templates  — floor: clearance 3 (Lead+)
-- ----------------------------------------------------------------------------
create table if not exists public.email_templates (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  name        text not null,
  subject     text,
  body        text not null default '',
  min_level   int  not null default 3 check (min_level between 1 and 5),
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists email_templates_org_idx on public.email_templates(org_id);

drop trigger if exists email_templates_updated_at on public.email_templates;
create trigger email_templates_updated_at
  before update on public.email_templates
  for each row execute function public.set_updated_at();

alter table public.email_templates enable row level security;

drop policy if exists email_templates_select on public.email_templates;
create policy email_templates_select on public.email_templates
  for select using (
    public.is_member_of(org_id) and min_level <= public.current_level(org_id)
  );
drop policy if exists email_templates_insert on public.email_templates;
create policy email_templates_insert on public.email_templates
  for insert with check (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  );
drop policy if exists email_templates_update on public.email_templates;
create policy email_templates_update on public.email_templates
  for update using (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  ) with check (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  );
drop policy if exists email_templates_delete on public.email_templates;
create policy email_templates_delete on public.email_templates
  for delete using (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  );
