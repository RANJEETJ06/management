-- ============================================================================
-- Data Manager — let members log entries but not edit/delete; hide deals
-- After this migration:
--   * member : can READ + INSERT contacts, interactions, interaction_items
--              (still no UPDATE / DELETE on those tables)
--              cannot READ or write deals / deal_items at all
--   * owner / admin : unchanged (full access)
-- Run in Supabase SQL editor.
-- ============================================================================

-- contacts: members may insert ------------------------------------------------
drop policy if exists contacts_insert on public.contacts;
create policy contacts_insert on public.contacts
  for insert with check (public.is_member_of(org_id));

-- interactions: members may insert -------------------------------------------
drop policy if exists interactions_insert on public.interactions;
create policy interactions_insert on public.interactions
  for insert with check (public.is_member_of(org_id));

-- interaction_items: members may insert (gated via parent interaction's org) -
drop policy if exists interaction_items_insert on public.interaction_items;
create policy interaction_items_insert on public.interaction_items
  for insert with check (
    exists (select 1 from public.interactions i
            where i.id = interaction_id
              and public.is_member_of(i.org_id))
  );

-- deals: restrict ALL access (incl. SELECT) to owner/admin -------------------
drop policy if exists deals_select on public.deals;
create policy deals_select on public.deals
  for select using (public.can_edit_org(org_id));

-- deal_items: gate select via parent deal so members see nothing ------------
drop policy if exists deal_items_select on public.deal_items;
create policy deal_items_select on public.deal_items
  for select using (
    exists (select 1 from public.deals d
            where d.id = deal_id
              and public.can_edit_org(d.org_id))
  );
