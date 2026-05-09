-- ============================================================================
-- Data Manager — split read vs write permissions by role
-- After this migration:
--   * owner / admin : full read + write on all data tables
--   * member        : read-only on all data tables
-- Also adds an RPC the /api/invite route uses to attach existing users to
-- an org without requiring a fresh signup.
-- Run in Supabase SQL editor.
-- ============================================================================

-- Lookup an existing auth user by email. Used by the invite API so we can add
-- already-registered users to a new workspace immediately (the on_auth_user_created
-- trigger only fires on signup, never on subsequent logins).
create or replace function public.find_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = public, auth
as $$
  select id
  from auth.users
  where lower(email) = lower(p_email)
  limit 1;
$$;

revoke execute on function public.find_user_id_by_email(text) from public, anon, authenticated;
grant  execute on function public.find_user_id_by_email(text) to   service_role;

-- Helper: is the current user allowed to write in this org? -----------------
create or replace function public.can_edit_org(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members
    where org_id  = target_org
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- Drop the blanket _all policies that let every member edit -----------------
drop policy if exists categories_all       on public.categories;
drop policy if exists contacts_all         on public.contacts;
drop policy if exists interactions_all     on public.interactions;
drop policy if exists interaction_items_all on public.interaction_items;
drop policy if exists deals_all            on public.deals;
drop policy if exists deal_items_all       on public.deal_items;

-- categories ----------------------------------------------------------------
create policy categories_select on public.categories
  for select using (public.is_member_of(org_id));
create policy categories_insert on public.categories
  for insert with check (public.can_edit_org(org_id));
create policy categories_update on public.categories
  for update using (public.can_edit_org(org_id))
  with check       (public.can_edit_org(org_id));
create policy categories_delete on public.categories
  for delete using (public.can_edit_org(org_id));

-- contacts ------------------------------------------------------------------
create policy contacts_select on public.contacts
  for select using (public.is_member_of(org_id));
create policy contacts_insert on public.contacts
  for insert with check (public.can_edit_org(org_id));
create policy contacts_update on public.contacts
  for update using (public.can_edit_org(org_id))
  with check       (public.can_edit_org(org_id));
create policy contacts_delete on public.contacts
  for delete using (public.can_edit_org(org_id));

-- interactions --------------------------------------------------------------
create policy interactions_select on public.interactions
  for select using (public.is_member_of(org_id));
create policy interactions_insert on public.interactions
  for insert with check (public.can_edit_org(org_id));
create policy interactions_update on public.interactions
  for update using (public.can_edit_org(org_id))
  with check       (public.can_edit_org(org_id));
create policy interactions_delete on public.interactions
  for delete using (public.can_edit_org(org_id));

-- interaction_items (child table — gate via parent interaction's org) -------
create policy interaction_items_select on public.interaction_items
  for select using (
    exists (select 1 from public.interactions i
            where i.id = interaction_id
              and public.is_member_of(i.org_id))
  );
create policy interaction_items_insert on public.interaction_items
  for insert with check (
    exists (select 1 from public.interactions i
            where i.id = interaction_id
              and public.can_edit_org(i.org_id))
  );
create policy interaction_items_update on public.interaction_items
  for update using (
    exists (select 1 from public.interactions i
            where i.id = interaction_id
              and public.can_edit_org(i.org_id))
  ) with check (
    exists (select 1 from public.interactions i
            where i.id = interaction_id
              and public.can_edit_org(i.org_id))
  );
create policy interaction_items_delete on public.interaction_items
  for delete using (
    exists (select 1 from public.interactions i
            where i.id = interaction_id
              and public.can_edit_org(i.org_id))
  );

-- deals ---------------------------------------------------------------------
create policy deals_select on public.deals
  for select using (public.is_member_of(org_id));
create policy deals_insert on public.deals
  for insert with check (public.can_edit_org(org_id));
create policy deals_update on public.deals
  for update using (public.can_edit_org(org_id))
  with check       (public.can_edit_org(org_id));
create policy deals_delete on public.deals
  for delete using (public.can_edit_org(org_id));

-- deal_items (child table — gate via parent deal's org) ---------------------
create policy deal_items_select on public.deal_items
  for select using (
    exists (select 1 from public.deals d
            where d.id = deal_id
              and public.is_member_of(d.org_id))
  );
create policy deal_items_insert on public.deal_items
  for insert with check (
    exists (select 1 from public.deals d
            where d.id = deal_id
              and public.can_edit_org(d.org_id))
  );
create policy deal_items_update on public.deal_items
  for update using (
    exists (select 1 from public.deals d
            where d.id = deal_id
              and public.can_edit_org(d.org_id))
  ) with check (
    exists (select 1 from public.deals d
            where d.id = deal_id
              and public.can_edit_org(d.org_id))
  );
create policy deal_items_delete on public.deal_items
  for delete using (
    exists (select 1 from public.deals d
            where d.id = deal_id
              and public.can_edit_org(d.org_id))
  );
