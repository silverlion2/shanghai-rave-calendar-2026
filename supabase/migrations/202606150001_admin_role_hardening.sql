-- Keep profile roles database-owned. Browser clients may read profiles through
-- RLS and update their own display name, but cannot self-promote role values.

grant select on public.profiles to authenticated;
revoke update on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can update own profile display name" on public.profiles;
create policy "Users can update own profile display name"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.set_profile_role_by_email(
  target_email text,
  target_role text default 'admin'
)
returns table (
  profile_id uuid,
  profile_email text,
  profile_display_name text,
  profile_role text,
  profile_updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if nullif(btrim(target_email), '') is null then
    raise exception 'target_email is required';
  end if;

  if coalesce(target_role, '') not in ('contributor', 'moderator', 'admin') then
    raise exception 'target_role must be contributor, moderator, or admin';
  end if;

  return query
    update public.profiles as profile
       set role = target_role,
           updated_at = now()
     where lower(profile.email) = lower(btrim(target_email))
     returning
       profile.id,
       profile.email,
       profile.display_name,
       profile.role,
       profile.updated_at;

  if not found then
    raise exception 'No public.profiles row exists for %. Sign in once first, then rerun this grant.', target_email;
  end if;
end;
$$;

revoke all on function public.set_profile_role_by_email(text, text) from public, anon, authenticated;
grant execute on function public.set_profile_role_by_email(text, text) to service_role;
