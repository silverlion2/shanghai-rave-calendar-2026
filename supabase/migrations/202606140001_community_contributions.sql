create table if not exists public.community_contributions (
  id uuid primary key default gen_random_uuid(),
  contribution_type text not null
    check (contribution_type in ('event', 'dj', 'venue', 'source-fix')),
  contributor_role text not null default 'community'
    check (contributor_role in ('community', 'promoter', 'venue', 'artist', 'ticketing')),
  affiliation text,
  target_kind text not null default 'new'
    check (target_kind in ('new', 'event', 'dj', 'venue')),
  target_id text,
  target_label text,
  title text not null,
  event_date date,
  venue_name text,
  city text not null default 'Shanghai',
  source_url text,
  source_note text,
  details text not null,
  contact_method text,
  status text not null default 'pending'
    check (status in ('pending', 'needs-check', 'accepted', 'merged', 'rejected')),
  source text not null default 'contribute_page',
  consent boolean not null default false,
  submitted_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  reviewer_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_contributions_title_length check (char_length(title) between 2 and 120),
  constraint community_contributions_details_length check (char_length(details) between 20 and 3000),
  constraint community_contributions_source_evidence check (
    coalesce(source_url, '') ~* '^https?://'
    or char_length(coalesce(source_note, '')) between 3 and 240
  ),
  constraint community_contributions_contact_length check (
    contact_method is null or char_length(contact_method) <= 160
  ),
  constraint community_contributions_affiliation_length check (
    affiliation is null or char_length(affiliation) <= 160
  ),
  constraint community_contributions_target_check check (
    target_kind = 'new'
    or (
      char_length(coalesce(target_id, '')) between 1 and 160
      and char_length(coalesce(target_label, '')) between 1 and 240
    )
  )
);

create index if not exists community_contributions_status_created_idx
  on public.community_contributions (status, created_at asc);
create index if not exists community_contributions_type_idx
  on public.community_contributions (contribution_type, status);
create index if not exists community_contributions_target_idx
  on public.community_contributions (target_kind, target_id)
  where target_kind <> 'new';
create index if not exists community_contributions_contributor_role_idx
  on public.community_contributions (contributor_role, status);
create index if not exists community_contributions_event_date_idx
  on public.community_contributions (event_date)
  where event_date is not null;

drop trigger if exists community_contributions_set_updated_at on public.community_contributions;
create trigger community_contributions_set_updated_at before update on public.community_contributions
  for each row execute function public.set_updated_at();

alter table public.community_contributions enable row level security;

drop policy if exists "Public can submit pending community contributions" on public.community_contributions;
create policy "Public can submit pending community contributions"
  on public.community_contributions for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and source = 'contribute_page'
    and consent = true
    and reviewed_by is null
    and reviewed_at is null
    and reviewer_note is null
    and (submitted_by is null or submitted_by = auth.uid())
    and contributor_role in ('community', 'promoter', 'venue', 'artist', 'ticketing')
    and (
      affiliation is null
      or char_length(affiliation) <= 160
    )
    and (
      target_kind = 'new'
      or (
        char_length(coalesce(target_id, '')) between 1 and 160
        and char_length(coalesce(target_label, '')) between 1 and 240
      )
    )
    and char_length(title) between 2 and 120
    and char_length(details) between 20 and 3000
    and (
      coalesce(source_url, '') ~* '^https?://'
      or char_length(coalesce(source_note, '')) between 3 and 240
    )
  );

drop policy if exists "Users can read own community contributions" on public.community_contributions;
create policy "Users can read own community contributions"
  on public.community_contributions for select
  to authenticated
  using (submitted_by = auth.uid());

drop policy if exists "Admins can read community contributions" on public.community_contributions;
create policy "Admins can read community contributions"
  on public.community_contributions for select
  to authenticated
  using (public.current_user_has_role(array['moderator', 'admin']));

drop policy if exists "Admins can update community contributions" on public.community_contributions;
create policy "Admins can update community contributions"
  on public.community_contributions for update
  to authenticated
  using (public.current_user_has_role(array['moderator', 'admin']))
  with check (public.current_user_has_role(array['moderator', 'admin']));

drop policy if exists "Admins can delete community contributions" on public.community_contributions;
create policy "Admins can delete community contributions"
  on public.community_contributions for delete
  to authenticated
  using (public.current_user_has_role(array['admin']));

grant insert on public.community_contributions to anon, authenticated;
grant select, update, delete on public.community_contributions to authenticated;
grant all on public.community_contributions to service_role;
