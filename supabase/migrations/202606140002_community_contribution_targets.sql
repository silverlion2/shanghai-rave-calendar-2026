alter table public.community_contributions
  add column if not exists contributor_role text not null default 'community',
  add column if not exists affiliation text,
  add column if not exists target_kind text not null default 'new',
  add column if not exists target_id text,
  add column if not exists target_label text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'community_contributions_contributor_role_check'
      and conrelid = 'public.community_contributions'::regclass
  ) then
    alter table public.community_contributions
      add constraint community_contributions_contributor_role_check
      check (contributor_role in ('community', 'promoter', 'venue', 'artist', 'ticketing'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'community_contributions_target_kind_check'
      and conrelid = 'public.community_contributions'::regclass
  ) then
    alter table public.community_contributions
      add constraint community_contributions_target_kind_check
      check (target_kind in ('new', 'event', 'dj', 'venue'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'community_contributions_affiliation_length'
      and conrelid = 'public.community_contributions'::regclass
  ) then
    alter table public.community_contributions
      add constraint community_contributions_affiliation_length
      check (affiliation is null or char_length(affiliation) <= 160);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'community_contributions_target_check'
      and conrelid = 'public.community_contributions'::regclass
  ) then
    alter table public.community_contributions
      add constraint community_contributions_target_check
      check (
        target_kind = 'new'
        or (
          char_length(coalesce(target_id, '')) between 1 and 160
          and char_length(coalesce(target_label, '')) between 1 and 240
        )
      );
  end if;
end $$;

create index if not exists community_contributions_target_idx
  on public.community_contributions (target_kind, target_id)
  where target_kind <> 'new';

create index if not exists community_contributions_contributor_role_idx
  on public.community_contributions (contributor_role, status);

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
