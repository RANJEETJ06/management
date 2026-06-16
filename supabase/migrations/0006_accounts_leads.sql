-- ============================================================================
-- Lupin — Phase 1: Accounts, Leads, richer Contacts
--   * accounts        — company/organization records (clearance floor 4)
--   * contacts        — + account link, title, tags, social, custom fields
--   * leads           — sales pipeline / opportunities (clearance floor 5)
-- Level-gating reuses the existing model: a row is visible to members whose
-- clearance >= its min_level; the column default sets each feature's "floor".
-- Run AFTER 0002_lupin.sql and 0003_lupin_shares.sql in the Supabase SQL editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Accounts (companies / organizations)  — floor: clearance 4 (Manager+)
-- ----------------------------------------------------------------------------
create table if not exists public.accounts (
  id             uuid primary key default uuid_generate_v4(),
  org_id         uuid not null references public.organizations(id) on delete cascade,
  name           text not null,
  website        text,
  industry       text,
  phone          text,
  email          text,
  locality       text,
  address        text,
  size           text,                       -- e.g. "1-10", "200+"
  annual_revenue numeric(16,2),
  notes          text,
  tags           text[]  not null default '{}',
  custom_fields  jsonb   not null default '{}'::jsonb,
  min_level      int     not null default 4 check (min_level between 1 and 5),
  created_by     uuid default auth.uid() references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists accounts_org_idx  on public.accounts(org_id);
create index if not exists accounts_tags_idx on public.accounts using gin (tags);

drop trigger if exists accounts_updated_at on public.accounts;
create trigger accounts_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

alter table public.accounts enable row level security;

drop policy if exists accounts_select on public.accounts;
create policy accounts_select on public.accounts
  for select using (
    public.is_member_of(org_id) and min_level <= public.current_level(org_id)
  );
drop policy if exists accounts_insert on public.accounts;
create policy accounts_insert on public.accounts
  for insert with check (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  );
drop policy if exists accounts_update on public.accounts;
create policy accounts_update on public.accounts
  for update using (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  ) with check (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  );
drop policy if exists accounts_delete on public.accounts;
create policy accounts_delete on public.accounts
  for delete using (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  );

-- ----------------------------------------------------------------------------
-- 2. Contacts — company link + enrichment fields
-- ----------------------------------------------------------------------------
alter table public.contacts
  add column if not exists account_id    uuid references public.accounts(id) on delete set null,
  add column if not exists title         text,
  add column if not exists tags          text[] not null default '{}',
  add column if not exists social        jsonb  not null default '{}'::jsonb,
  add column if not exists custom_fields jsonb  not null default '{}'::jsonb;

create index if not exists contacts_account_idx on public.contacts(account_id);
create index if not exists contacts_tags_idx    on public.contacts using gin (tags);

-- ----------------------------------------------------------------------------
-- 3. Leads (sales pipeline / opportunities)  — floor: clearance 5 (Director)
-- ----------------------------------------------------------------------------
create table if not exists public.leads (
  id                   uuid primary key default uuid_generate_v4(),
  org_id               uuid not null references public.organizations(id) on delete cascade,
  name                 text not null,
  company              text,
  email                text,
  phone                text,
  source               text not null default 'web'
                       check (source in ('web','referral','cold_call','event','social','email','other')),
  status               text not null default 'new'
                       check (status in ('new','qualified','proposal','negotiation','won','lost')),
  score                int  not null default 0 check (score between 0 and 100),
  est_value            numeric(16,2),
  currency             text not null default 'INR',
  assignee_id          uuid references auth.users(id)     on delete set null,
  contact_id           uuid references public.contacts(id) on delete set null,
  account_id           uuid references public.accounts(id) on delete set null,
  converted_contact_id uuid references public.contacts(id) on delete set null,
  converted_at         timestamptz,
  notes                text,
  min_level            int  not null default 5 check (min_level between 1 and 5),
  created_by           uuid default auth.uid() references auth.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists leads_org_status_idx on public.leads(org_id, status);
create index if not exists leads_assignee_idx    on public.leads(assignee_id);

drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

alter table public.leads enable row level security;

drop policy if exists leads_select on public.leads;
create policy leads_select on public.leads
  for select using (
    public.is_member_of(org_id) and min_level <= public.current_level(org_id)
  );
drop policy if exists leads_insert on public.leads;
create policy leads_insert on public.leads
  for insert with check (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  );
drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads
  for update using (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  ) with check (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  );
drop policy if exists leads_delete on public.leads;
create policy leads_delete on public.leads
  for delete using (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  );
