-- ============================================================================
-- Data Manager — explicit invitation consent + multi-workspace support
--
-- Changes:
--   1. Add declined_at column to invitations (state: pending / accepted / declined)
--   2. Drop the on_auth_user_created auto-attach trigger — joining a workspace
--      now requires the invitee to actively click Accept.
--   3. accept_invitation / decline_invitation / my_pending_invitations RPCs.
--   4. Update invitations RLS so the invitee (matched by email) can see their
--      own pending rows.
-- Run in Supabase SQL editor.
-- ============================================================================

-- 1. Add declined_at column ------------------------------------------------
alter table public.invitations
  add column if not exists declined_at timestamptz;

-- 2. Drop the auto-attach trigger and its function -------------------------
drop trigger  if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 3. Helper: pull the caller's email from auth.users -----------------------
create or replace function public.current_user_email()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select email from auth.users where id = auth.uid();
$$;
revoke execute on function public.current_user_email() from public, anon;
grant  execute on function public.current_user_email() to authenticated;

-- 4. List my pending invitations -------------------------------------------
create or replace function public.my_pending_invitations()
returns table (
  id          uuid,
  org_id      uuid,
  org_name    text,
  email       text,
  role        text,
  invited_by  uuid,
  created_at  timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select i.id, i.org_id, o.name as org_name, i.email, i.role, i.invited_by, i.created_at
  from public.invitations i
  join public.organizations o on o.id = i.org_id
  where lower(i.email) = lower(public.current_user_email())
    and i.accepted_at is null
    and i.declined_at is null
  order by i.created_at desc;
$$;
revoke execute on function public.my_pending_invitations() from public, anon;
grant  execute on function public.my_pending_invitations() to authenticated;

-- 5. Accept an invitation --------------------------------------------------
create or replace function public.accept_invitation(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  inv record;
  uid uuid := auth.uid();
  uemail text;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select email into uemail from auth.users where id = uid;

  select * into inv
  from public.invitations
  where id = p_invitation_id
    and accepted_at is null
    and declined_at is null;

  if inv is null then
    raise exception 'Invitation not found or already resolved' using errcode = 'P0002';
  end if;

  if lower(inv.email) <> lower(uemail) then
    raise exception 'This invitation was sent to a different email' using errcode = '42501';
  end if;

  insert into public.members (org_id, user_id, role)
  values (inv.org_id, uid, inv.role)
  on conflict (org_id, user_id) do nothing;

  update public.invitations
  set accepted_at = now()
  where id = inv.id;

  return inv.org_id;
end;
$$;
revoke execute on function public.accept_invitation(uuid) from public, anon;
grant  execute on function public.accept_invitation(uuid) to authenticated;

-- 6. Decline an invitation -------------------------------------------------
create or replace function public.decline_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  inv record;
  uid uuid := auth.uid();
  uemail text;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select email into uemail from auth.users where id = uid;

  select * into inv
  from public.invitations
  where id = p_invitation_id
    and accepted_at is null
    and declined_at is null;

  if inv is null then
    return;
  end if;

  if lower(inv.email) <> lower(uemail) then
    raise exception 'This invitation was sent to a different email' using errcode = '42501';
  end if;

  update public.invitations
  set declined_at = now()
  where id = inv.id;
end;
$$;
revoke execute on function public.decline_invitation(uuid) from public, anon;
grant  execute on function public.decline_invitation(uuid) to authenticated;

-- 7. Update invitations RLS so the invitee (matched by email) can see their
--    own pending rows. Existing inv_select policy only allowed org members
--    to see invitations, which kept the recipient blind to invites for orgs
--    they don't yet belong to.
drop policy if exists inv_select on public.invitations;
create policy inv_select on public.invitations
  for select using (
    public.is_member_of(org_id)
    or lower(email) = lower(public.current_user_email())
  );
