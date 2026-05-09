-- ============================================================================
-- Data Manager — initial schema
-- Run this in the Supabase SQL editor (Database -> SQL editor -> New query).
-- ============================================================================

-- Extensions ----------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Helper: updated_at trigger -------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- Organizations (tenants) and members
-- ============================================================================
create table if not exists public.organizations (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  owner_id    uuid not null references auth.users(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create table if not exists public.members (
  org_id      uuid not null references public.organizations(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'member' check (role in ('owner','admin','member')),
  created_at  timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index if not exists members_user_idx on public.members(user_id);

-- Membership helper ---------------------------------------------------------
create or replace function public.is_member_of(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members
    where org_id = target_org and user_id = auth.uid()
  );
$$;

-- Returns the first org the current user belongs to (used by app on login).
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.members
  where user_id = auth.uid()
  order by created_at asc
  limit 1;
$$;

-- ============================================================================
-- Invitations (pending team invites by email)
-- ============================================================================
create table if not exists public.invitations (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  email       text not null,
  role        text not null default 'member' check (role in ('admin','member')),
  invited_by  uuid not null references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (org_id, email)
);

create index if not exists invitations_email_idx on public.invitations(lower(email));

-- ============================================================================
-- Categories (product taxonomy: vegetables, fruits, grains...)
-- ============================================================================
create table if not exists public.categories (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  name        text not null,
  parent_id   uuid references public.categories(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (org_id, name, parent_id)
);

create index if not exists categories_org_idx on public.categories(org_id);
create trigger categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Contacts (suppliers, buyers, partners)
-- ============================================================================
create table if not exists public.contacts (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  name        text not null,
  type        text not null default 'supplier'
              check (type in ('supplier','buyer','partner','other')),
  phone       text,
  email       text,
  locality    text,
  address     text,
  notes       text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists contacts_org_idx on public.contacts(org_id);
create index if not exists contacts_org_type_idx on public.contacts(org_id, type);
create index if not exists contacts_org_locality_idx on public.contacts(org_id, locality);
create index if not exists contacts_search_idx on public.contacts
  using gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(locality,'') || ' ' || coalesce(phone,'') || ' ' || coalesce(notes,'')));

create trigger contacts_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Interactions (diary entries: who you talked to, when, where, about what)
-- ============================================================================
create table if not exists public.interactions (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  contact_id      uuid references public.contacts(id) on delete set null,
  occurred_on     date not null default current_date,
  location        text,
  channel         text check (channel in ('in_person','phone','whatsapp','email','other')),
  summary         text not null,
  follow_up_on    date,
  status          text not null default 'open'
                  check (status in ('open','followed_up','closed','dropped')),
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists interactions_org_date_idx on public.interactions(org_id, occurred_on desc);
create index if not exists interactions_contact_idx on public.interactions(contact_id);
create index if not exists interactions_followup_idx on public.interactions(org_id, follow_up_on)
  where follow_up_on is not null and status = 'open';

create trigger interactions_updated_at
  before update on public.interactions
  for each row execute function public.set_updated_at();

-- Line items linking an interaction to product categories with rough qty/price
create table if not exists public.interaction_items (
  id              uuid primary key default uuid_generate_v4(),
  interaction_id  uuid not null references public.interactions(id) on delete cascade,
  category_id     uuid references public.categories(id) on delete set null,
  item_name       text,
  quantity        numeric(14,3),
  unit            text,
  price_per_unit  numeric(14,2),
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists interaction_items_interaction_idx on public.interaction_items(interaction_id);

-- ============================================================================
-- Deals (firm transactions)
-- ============================================================================
create table if not exists public.deals (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  contact_id      uuid not null references public.contacts(id) on delete restrict,
  direction       text not null check (direction in ('buy','sell')),
  deal_date       date not null default current_date,
  delivery_on     date,
  status          text not null default 'pending'
                  check (status in ('pending','confirmed','delivered','paid','cancelled')),
  payment_status  text not null default 'unpaid'
                  check (payment_status in ('unpaid','partial','paid')),
  amount_total    numeric(14,2),
  amount_paid     numeric(14,2) not null default 0,
  currency        text not null default 'INR',
  notes           text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists deals_org_date_idx on public.deals(org_id, deal_date desc);
create index if not exists deals_contact_idx on public.deals(contact_id);
create index if not exists deals_org_status_idx on public.deals(org_id, status);

create trigger deals_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

create table if not exists public.deal_items (
  id              uuid primary key default uuid_generate_v4(),
  deal_id         uuid not null references public.deals(id) on delete cascade,
  category_id     uuid references public.categories(id) on delete set null,
  item_name       text not null,
  quantity        numeric(14,3) not null,
  unit            text not null default 'kg',
  price_per_unit  numeric(14,2) not null,
  line_total      numeric(14,2) generated always as (quantity * price_per_unit) stored,
  notes           text
);

create index if not exists deal_items_deal_idx on public.deal_items(deal_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.organizations    enable row level security;
alter table public.members          enable row level security;
alter table public.invitations      enable row level security;
alter table public.categories       enable row level security;
alter table public.contacts         enable row level security;
alter table public.interactions     enable row level security;
alter table public.interaction_items enable row level security;
alter table public.deals            enable row level security;
alter table public.deal_items       enable row level security;

-- organizations: members can read; owner can update; any authed user can create
create policy org_select on public.organizations
  for select using (public.is_member_of(id));

create policy org_insert on public.organizations
  for insert with check (auth.uid() = owner_id);

create policy org_update on public.organizations
  for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- members: a user can see their own memberships and rows for orgs they belong to
create policy members_select on public.members
  for select using (user_id = auth.uid() or public.is_member_of(org_id));

-- a user can insert their own membership row only when they're the org owner
-- (used right after creating an org); admins can add more members
create policy members_insert on public.members
  for insert with check (
    (user_id = auth.uid()
     and exists (select 1 from public.organizations o
                 where o.id = org_id and o.owner_id = auth.uid()))
    or exists (select 1 from public.members m
               where m.org_id = members.org_id
                 and m.user_id = auth.uid()
                 and m.role in ('owner','admin'))
  );

create policy members_delete on public.members
  for delete using (
    user_id = auth.uid()
    or exists (select 1 from public.members m
               where m.org_id = members.org_id
                 and m.user_id = auth.uid()
                 and m.role in ('owner','admin'))
  );

-- invitations: visible to org members; only admins can manage
create policy inv_select on public.invitations
  for select using (public.is_member_of(org_id));
create policy inv_insert on public.invitations
  for insert with check (
    exists (select 1 from public.members m
            where m.org_id = invitations.org_id
              and m.user_id = auth.uid()
              and m.role in ('owner','admin'))
  );
create policy inv_delete on public.invitations
  for delete using (
    exists (select 1 from public.members m
            where m.org_id = invitations.org_id
              and m.user_id = auth.uid()
              and m.role in ('owner','admin'))
  );

-- Generic membership-based policies for the data tables -----------------------
create policy categories_all on public.categories
  for all using (public.is_member_of(org_id))
  with check (public.is_member_of(org_id));

create policy contacts_all on public.contacts
  for all using (public.is_member_of(org_id))
  with check (public.is_member_of(org_id));

create policy interactions_all on public.interactions
  for all using (public.is_member_of(org_id))
  with check (public.is_member_of(org_id));

create policy interaction_items_all on public.interaction_items
  for all using (
    exists (select 1 from public.interactions i
            where i.id = interaction_id and public.is_member_of(i.org_id))
  )
  with check (
    exists (select 1 from public.interactions i
            where i.id = interaction_id and public.is_member_of(i.org_id))
  );

create policy deals_all on public.deals
  for all using (public.is_member_of(org_id))
  with check (public.is_member_of(org_id));

create policy deal_items_all on public.deal_items
  for all using (
    exists (select 1 from public.deals d
            where d.id = deal_id and public.is_member_of(d.org_id))
  )
  with check (
    exists (select 1 from public.deals d
            where d.id = deal_id and public.is_member_of(d.org_id))
  );

-- ============================================================================
-- Auto-accept invitations on signup
-- When a user signs up, if there's an invitation matching their email, add them
-- to that org as a member.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
begin
  for inv in
    select * from public.invitations
    where lower(email) = lower(new.email)
      and accepted_at is null
  loop
    insert into public.members (org_id, user_id, role)
    values (inv.org_id, new.id, inv.role)
    on conflict do nothing;

    update public.invitations
    set accepted_at = now()
    where id = inv.id;
  end loop;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
