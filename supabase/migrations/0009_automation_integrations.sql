-- ============================================================================
-- Lupin — Phase 5: Workflow Automation & Integrations
--   * automation_rules — per-org toggles + config for built-in automations
--   * integrations     — connection records for external providers (scaffolding)
--   * security-definer triggers that run each automation when its rule is enabled
-- Run AFTER 0008_support_documents.sql in the Supabase SQL editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Automation rules (workspace config; managed by owners/admins)
-- ----------------------------------------------------------------------------
create table if not exists public.automation_rules (
  id         uuid primary key default uuid_generate_v4(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  kind       text not null check (kind in (
               'auto_assign_leads',
               'followup_on_won',
               'followup_on_ticket_resolved',
               'autopay_deals')),
  enabled    boolean not null default true,
  config     jsonb   not null default '{}'::jsonb,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, kind)
);

drop trigger if exists automation_rules_updated_at on public.automation_rules;
create trigger automation_rules_updated_at
  before update on public.automation_rules
  for each row execute function public.set_updated_at();

alter table public.automation_rules enable row level security;

drop policy if exists automation_rules_select on public.automation_rules;
create policy automation_rules_select on public.automation_rules
  for select using (public.is_member_of(org_id));
drop policy if exists automation_rules_insert on public.automation_rules;
create policy automation_rules_insert on public.automation_rules
  for insert with check (public.can_edit_org(org_id));
drop policy if exists automation_rules_update on public.automation_rules;
create policy automation_rules_update on public.automation_rules
  for update using (public.can_edit_org(org_id)) with check (public.can_edit_org(org_id));
drop policy if exists automation_rules_delete on public.automation_rules;
create policy automation_rules_delete on public.automation_rules
  for delete using (public.can_edit_org(org_id));

-- ----------------------------------------------------------------------------
-- 2. Integrations (connection scaffolding; managed by owners/admins)
-- ----------------------------------------------------------------------------
create table if not exists public.integrations (
  id           uuid primary key default uuid_generate_v4(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  provider     text not null,
  category     text not null check (category in
                ('email','whatsapp','payments','accounting','erp','calendar')),
  status       text not null default 'disconnected'
                check (status in ('connected','disconnected')),
  config       jsonb not null default '{}'::jsonb,
  connected_at timestamptz,
  created_by   uuid default auth.uid() references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (org_id, provider)
);

drop trigger if exists integrations_updated_at on public.integrations;
create trigger integrations_updated_at
  before update on public.integrations
  for each row execute function public.set_updated_at();

alter table public.integrations enable row level security;

drop policy if exists integrations_select on public.integrations;
create policy integrations_select on public.integrations
  for select using (public.is_member_of(org_id));
drop policy if exists integrations_insert on public.integrations;
create policy integrations_insert on public.integrations
  for insert with check (public.can_edit_org(org_id));
drop policy if exists integrations_update on public.integrations;
create policy integrations_update on public.integrations
  for update using (public.can_edit_org(org_id)) with check (public.can_edit_org(org_id));
drop policy if exists integrations_delete on public.integrations;
create policy integrations_delete on public.integrations
  for delete using (public.can_edit_org(org_id));

-- ----------------------------------------------------------------------------
-- 3. Automations. Each trigger function is SECURITY DEFINER so it may write to
--    tasks/deals regardless of who triggered it, and is a no-op unless the
--    org has enabled the matching rule.
-- ----------------------------------------------------------------------------

-- (a) Auto-assign new leads to a configured user (or their creator).
create or replace function public.tg_leads_auto_assign()
returns trigger language plpgsql security definer set search_path = public as $$
declare r public.automation_rules%rowtype;
begin
  if NEW.assignee_id is null then
    select * into r from public.automation_rules
      where org_id = NEW.org_id and kind = 'auto_assign_leads' and enabled;
    if found then
      NEW.assignee_id := coalesce(
        nullif(r.config->>'assignee_id', '')::uuid,
        NEW.created_by);
    end if;
  end if;
  return NEW;
end $$;

drop trigger if exists leads_auto_assign on public.leads;
create trigger leads_auto_assign
  before insert on public.leads
  for each row execute function public.tg_leads_auto_assign();

-- (b) When a lead is marked Won, create a follow-up task.
create or replace function public.tg_leads_followup_on_won()
returns trigger language plpgsql security definer set search_path = public as $$
declare r public.automation_rules%rowtype; d int;
begin
  if NEW.status = 'won' and OLD.status is distinct from 'won' then
    select * into r from public.automation_rules
      where org_id = NEW.org_id and kind = 'followup_on_won' and enabled;
    if found then
      d := coalesce((r.config->>'days')::int, 3);
      insert into public.tasks (org_id, title, type, due_on, contact_id, lead_id,
                                assignee_id, min_level, created_by)
      values (NEW.org_id, 'Follow up: ' || NEW.name, 'follow_up',
              current_date + d, NEW.converted_contact_id, NEW.id,
              NEW.assignee_id, NEW.min_level, NEW.created_by);
    end if;
  end if;
  return NEW;
end $$;

drop trigger if exists leads_followup_on_won on public.leads;
create trigger leads_followup_on_won
  after update on public.leads
  for each row execute function public.tg_leads_followup_on_won();

-- (c) When a ticket is resolved, create a check-in follow-up task.
create or replace function public.tg_tickets_followup_on_resolved()
returns trigger language plpgsql security definer set search_path = public as $$
declare r public.automation_rules%rowtype; d int;
begin
  if NEW.status = 'resolved' and OLD.status is distinct from 'resolved' then
    select * into r from public.automation_rules
      where org_id = NEW.org_id and kind = 'followup_on_ticket_resolved' and enabled;
    if found then
      d := coalesce((r.config->>'days')::int, 2);
      insert into public.tasks (org_id, title, type, due_on, contact_id,
                                assignee_id, min_level, created_by)
      values (NEW.org_id, 'Check in: ' || NEW.subject, 'follow_up',
              current_date + d, NEW.contact_id, NEW.assignee_id,
              NEW.min_level, NEW.created_by);
    end if;
  end if;
  return NEW;
end $$;

drop trigger if exists tickets_followup_on_resolved on public.tickets;
create trigger tickets_followup_on_resolved
  after update on public.tickets
  for each row execute function public.tg_tickets_followup_on_resolved();

-- (d) When a deal is fully paid, advance it to 'paid'.
create or replace function public.tg_deals_autopay()
returns trigger language plpgsql security definer set search_path = public as $$
declare r public.automation_rules%rowtype;
begin
  if NEW.amount_total is not null
     and NEW.amount_paid >= NEW.amount_total
     and NEW.status not in ('paid', 'cancelled') then
    select * into r from public.automation_rules
      where org_id = NEW.org_id and kind = 'autopay_deals' and enabled;
    if found then
      NEW.status := 'paid';
      NEW.payment_status := 'paid';
    end if;
  end if;
  return NEW;
end $$;

drop trigger if exists deals_autopay on public.deals;
create trigger deals_autopay
  before update on public.deals
  for each row execute function public.tg_deals_autopay();
