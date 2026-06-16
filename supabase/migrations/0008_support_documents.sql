-- ============================================================================
-- Lupin — Phase 3: Customer Support & Documents
--   * tickets / ticket_comments  — support desk (clearance floor 3)
--   * kb_articles                — knowledge base (clearance floor 3)
--   * documents / document_versions — file library w/ versioning (floor 4)
--   * storage bucket 'documents' + RLS keyed on the org_id path prefix
-- Run AFTER 0007_activities_comms.sql in the Supabase SQL editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tickets  — floor: clearance 3 (Lead+)
-- ----------------------------------------------------------------------------
create table if not exists public.tickets (
  id           uuid primary key default uuid_generate_v4(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  subject      text not null,
  description  text,
  status       text not null default 'open'
               check (status in ('open','pending','resolved','closed')),
  priority     text not null default 'normal'
               check (priority in ('low','normal','high','urgent')),
  contact_id   uuid references public.contacts(id) on delete set null,
  account_id   uuid references public.accounts(id) on delete set null,
  assignee_id  uuid references auth.users(id)      on delete set null,
  sla_due_at   timestamptz,
  resolved_at  timestamptz,
  min_level    int  not null default 3 check (min_level between 1 and 5),
  created_by   uuid default auth.uid() references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists tickets_org_status_idx on public.tickets(org_id, status);
create index if not exists tickets_assignee_idx    on public.tickets(assignee_id);
create index if not exists tickets_contact_idx      on public.tickets(contact_id);

drop trigger if exists tickets_updated_at on public.tickets;
create trigger tickets_updated_at
  before update on public.tickets
  for each row execute function public.set_updated_at();

alter table public.tickets enable row level security;

drop policy if exists tickets_select on public.tickets;
create policy tickets_select on public.tickets
  for select using (
    public.is_member_of(org_id) and min_level <= public.current_level(org_id)
  );
drop policy if exists tickets_insert on public.tickets;
create policy tickets_insert on public.tickets
  for insert with check (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  );
drop policy if exists tickets_update on public.tickets;
create policy tickets_update on public.tickets
  for update using (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  ) with check (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  );
drop policy if exists tickets_delete on public.tickets;
create policy tickets_delete on public.tickets
  for delete using (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  );

-- ----------------------------------------------------------------------------
-- 2. Ticket comments (child of tickets — gated through the parent's org/level)
-- ----------------------------------------------------------------------------
create table if not exists public.ticket_comments (
  id          uuid primary key default uuid_generate_v4(),
  ticket_id   uuid not null references public.tickets(id) on delete cascade,
  body        text not null,
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists ticket_comments_ticket_idx on public.ticket_comments(ticket_id);

alter table public.ticket_comments enable row level security;

drop policy if exists ticket_comments_select on public.ticket_comments;
create policy ticket_comments_select on public.ticket_comments
  for select using (
    exists (select 1 from public.tickets t
            where t.id = ticket_id
              and public.is_member_of(t.org_id)
              and t.min_level <= public.current_level(t.org_id))
  );
drop policy if exists ticket_comments_insert on public.ticket_comments;
create policy ticket_comments_insert on public.ticket_comments
  for insert with check (
    exists (select 1 from public.tickets t
            where t.id = ticket_id
              and public.can_edit_org(t.org_id)
              and t.min_level <= public.current_level(t.org_id))
  );
drop policy if exists ticket_comments_delete on public.ticket_comments;
create policy ticket_comments_delete on public.ticket_comments
  for delete using (
    exists (select 1 from public.tickets t
            where t.id = ticket_id
              and public.can_edit_org(t.org_id)
              and t.min_level <= public.current_level(t.org_id))
  );

-- ----------------------------------------------------------------------------
-- 3. Knowledge base articles  — floor: clearance 3 (Lead+)
-- ----------------------------------------------------------------------------
create table if not exists public.kb_articles (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  title       text not null,
  body        text not null default '',
  tags        text[] not null default '{}',
  published   boolean not null default true,
  min_level   int  not null default 3 check (min_level between 1 and 5),
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists kb_articles_org_idx  on public.kb_articles(org_id);
create index if not exists kb_articles_tags_idx on public.kb_articles using gin (tags);

drop trigger if exists kb_articles_updated_at on public.kb_articles;
create trigger kb_articles_updated_at
  before update on public.kb_articles
  for each row execute function public.set_updated_at();

alter table public.kb_articles enable row level security;

drop policy if exists kb_articles_select on public.kb_articles;
create policy kb_articles_select on public.kb_articles
  for select using (
    public.is_member_of(org_id) and min_level <= public.current_level(org_id)
  );
drop policy if exists kb_articles_insert on public.kb_articles;
create policy kb_articles_insert on public.kb_articles
  for insert with check (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  );
drop policy if exists kb_articles_update on public.kb_articles;
create policy kb_articles_update on public.kb_articles
  for update using (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  ) with check (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  );
drop policy if exists kb_articles_delete on public.kb_articles;
create policy kb_articles_delete on public.kb_articles
  for delete using (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  );

-- ----------------------------------------------------------------------------
-- 4. Documents + versions  — floor: clearance 4 (Manager+)
--    `documents` is the logical file; `document_versions` holds each upload.
-- ----------------------------------------------------------------------------
create table if not exists public.documents (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  name        text not null,
  doc_type    text not null default 'other'
              check (doc_type in ('contract','invoice','quotation','proposal','other')),
  contact_id  uuid references public.contacts(id) on delete set null,
  account_id  uuid references public.accounts(id) on delete set null,
  deal_id     uuid references public.deals(id)     on delete set null,
  ticket_id   uuid references public.tickets(id)   on delete set null,
  notes       text,
  min_level   int  not null default 4 check (min_level between 1 and 5),
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists documents_org_idx     on public.documents(org_id, created_at desc);
create index if not exists documents_contact_idx on public.documents(contact_id);
create index if not exists documents_account_idx on public.documents(account_id);

drop trigger if exists documents_updated_at on public.documents;
create trigger documents_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

alter table public.documents enable row level security;

drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents
  for select using (
    public.is_member_of(org_id) and min_level <= public.current_level(org_id)
  );
drop policy if exists documents_insert on public.documents;
create policy documents_insert on public.documents
  for insert with check (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  );
drop policy if exists documents_update on public.documents;
create policy documents_update on public.documents
  for update using (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  ) with check (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  );
drop policy if exists documents_delete on public.documents;
create policy documents_delete on public.documents
  for delete using (
    public.can_edit_org(org_id) and min_level <= public.current_level(org_id)
  );

create table if not exists public.document_versions (
  id           uuid primary key default uuid_generate_v4(),
  document_id  uuid not null references public.documents(id) on delete cascade,
  version      int  not null default 1,
  storage_path text not null,
  file_name    text not null,
  mime_type    text,
  size_bytes   bigint,
  created_by   uuid default auth.uid() references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (document_id, version)
);

create index if not exists document_versions_doc_idx on public.document_versions(document_id);

alter table public.document_versions enable row level security;

drop policy if exists document_versions_select on public.document_versions;
create policy document_versions_select on public.document_versions
  for select using (
    exists (select 1 from public.documents d
            where d.id = document_id
              and public.is_member_of(d.org_id)
              and d.min_level <= public.current_level(d.org_id))
  );
drop policy if exists document_versions_insert on public.document_versions;
create policy document_versions_insert on public.document_versions
  for insert with check (
    exists (select 1 from public.documents d
            where d.id = document_id
              and public.can_edit_org(d.org_id)
              and d.min_level <= public.current_level(d.org_id))
  );
drop policy if exists document_versions_delete on public.document_versions;
create policy document_versions_delete on public.document_versions
  for delete using (
    exists (select 1 from public.documents d
            where d.id = document_id
              and public.can_edit_org(d.org_id)
              and d.min_level <= public.current_level(d.org_id))
  );

-- ----------------------------------------------------------------------------
-- 5. Storage bucket for document files.
--    Files are uploaded under the path '<org_id>/<document_id>/<version>_<name>'
--    so RLS can derive the org from the first path segment.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Safely pull the org_id out of a 'documents' object path ('<org_id>/...').
-- Returns null (never errors) for paths that don't start with a uuid, so the
-- table-wide policies below can't break access to objects in other buckets.
create or replace function public.doc_path_org(path text)
returns uuid
language plpgsql
immutable
as $$
begin
  return nullif(split_part(path, '/', 1), '')::uuid;
exception when others then
  return null;
end;
$$;

-- Read access must match the documents feature floor (clearance L4), otherwise
-- any org member could list/download files via the Storage API and bypass the
-- L4 gate that protects the documents table rows.
drop policy if exists documents_objects_select on storage.objects;
create policy documents_objects_select on storage.objects
  for select to authenticated using (
    bucket_id = 'documents'
    and public.is_member_of(public.doc_path_org(name))
    and public.current_level(public.doc_path_org(name)) >= 4
  );
drop policy if exists documents_objects_insert on storage.objects;
create policy documents_objects_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'documents'
    and public.can_edit_org(public.doc_path_org(name))
  );
drop policy if exists documents_objects_delete on storage.objects;
create policy documents_objects_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'documents'
    and public.can_edit_org(public.doc_path_org(name))
  );
