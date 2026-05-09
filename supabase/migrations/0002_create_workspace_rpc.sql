-- ============================================================================
-- Atomic workspace bootstrap.
--
-- The original onboarding flow does two client-side inserts under RLS:
--   1. organizations (org_insert requires auth.uid() = owner_id)
--   2. members       (members_insert requires the user to already own the org)
-- That is fragile: a session-sync hiccup right after signup or email
-- confirmation leaves auth.uid() unresolved on the first insert and trips
-- "new row violates row-level security policy". Even when it works, a failure
-- between the two inserts leaves an orphan org.
--
-- This function performs both inserts atomically as the function owner
-- (SECURITY DEFINER) after explicitly verifying the caller is authenticated.
-- ============================================================================

create or replace function public.create_workspace(workspace_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_org_id uuid;
  clean_name text := coalesce(nullif(trim(workspace_name), ''), 'My workspace');
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  insert into public.organizations (name, owner_id)
  values (clean_name, uid)
  returning id into new_org_id;

  insert into public.members (org_id, user_id, role)
  values (new_org_id, uid, 'owner');

  return new_org_id;
end;
$$;

revoke all on function public.create_workspace(text) from public, anon;
grant execute on function public.create_workspace(text) to authenticated;
