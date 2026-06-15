alter table public.profiles
  add column if not exists public_badges boolean not null default false;

grant update (display_name, public_badges) on public.profiles to authenticated;

create table if not exists public.badge_definitions (
  slug text primary key check (char_length(slug) between 2 and 80),
  name text not null check (char_length(name) between 2 and 80),
  name_zh text,
  description text not null check (char_length(description) between 8 and 260),
  category text not null
    check (category in ('source', 'database', 'community', 'identity', 'governance')),
  tier text not null default 'bronze'
    check (tier in ('bronze', 'silver', 'gold', 'identity', 'ops')),
  icon text not null default 'BD' check (char_length(icon) between 1 and 8),
  style_key text not null default 'cyan'
    check (style_key in ('cyan', 'ember', 'gold', 'rose', 'green', 'paper')),
  visibility text not null default 'public'
    check (visibility in ('public', 'private', 'admin')),
  rule_config jsonb not null default '{}'::jsonb,
  display_order integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_slug text not null references public.badge_definitions(slug) on update cascade on delete restrict,
  level integer not null default 1 check (level between 1 and 3),
  status text not null default 'active' check (status in ('active', 'revoked')),
  awarded_by uuid references public.profiles(id) on delete set null,
  source_type text not null default 'manual'
    check (source_type in ('manual', 'community_contribution', 'reputation', 'import')),
  source_id text,
  evidence jsonb not null default '{}'::jsonb,
  awarded_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, badge_slug)
);

create table if not exists public.reputation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (char_length(event_type) between 2 and 80),
  target_type text not null check (char_length(target_type) between 2 and 80),
  target_id text,
  points_delta integer not null default 0,
  badge_slug text references public.badge_definitions(slug) on update cascade on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint reputation_events_unique_target unique (user_id, event_type, target_type, target_id)
);

insert into public.badge_definitions
  (slug, name, name_zh, description, category, tier, icon, style_key, visibility, rule_config, display_order)
values
  ('event-scout', 'Event Scout', '活动雷达', 'Finds source-backed event leads that survive editorial review.', 'source', 'bronze', 'EV', 'cyan', 'public', '{"autoFrom":["event"],"levels":[1,5,15]}'::jsonb, 10),
  ('source-runner', 'Source Runner', '来源跑者', 'Brings stronger public links, ticket routes, and source corrections.', 'source', 'silver', 'SR', 'ember', 'public', '{"autoFrom":["source-fix"],"levels":[1,5,15]}'::jsonb, 20),
  ('trust-ledger-builder', 'Trust Ledger Builder', '信任账本', 'Improves source notes that make the recommendation trail easier to audit.', 'source', 'gold', 'TL', 'gold', 'public', '{"manual":true,"levels":[1,5,15]}'::jsonb, 30),
  ('lineup-mapper', 'Lineup Mapper', '阵容测绘', 'Adds DJ, alias, set-time, or lineup evidence to the database.', 'database', 'bronze', 'LM', 'rose', 'public', '{"autoFrom":["dj"],"levels":[1,5,15]}'::jsonb, 40),
  ('venue-signal', 'Venue Signal', '场地信号', 'Contributes venue, room, policy, address, or recurring-night details.', 'database', 'bronze', 'VS', 'green', 'public', '{"autoFrom":["venue"],"levels":[1,5,15]}'::jsonb, 50),
  ('poster-archivist', 'Poster Archivist', '海报档案', 'Preserves poster or archive evidence for event history.', 'database', 'silver', 'PA', 'paper', 'public', '{"manual":true,"levels":[1,5,15]}'::jsonb, 60),
  ('love-wall-voice', 'Love Wall Voice', '留言之声', 'Adds approved community notes that match the Love Wall tone.', 'community', 'bronze', 'LV', 'rose', 'public', '{"manual":true,"levels":[1,5,15]}'::jsonb, 70),
  ('care-signal', 'Care Signal', '照护信号', 'Shares practical safety, access, ticketing, or care information.', 'community', 'silver', 'CA', 'green', 'public', '{"manual":true,"levels":[1,5,15]}'::jsonb, 80),
  ('verified-organizer', 'Verified Organizer', '主办认证', 'Admin-verified organizer, crew, or promoter identity.', 'identity', 'identity', 'OR', 'gold', 'public', '{"adminOnly":true}'::jsonb, 110),
  ('verified-venue', 'Verified Venue', '场地认证', 'Admin-verified venue or room identity.', 'identity', 'identity', 'VE', 'cyan', 'public', '{"adminOnly":true}'::jsonb, 120),
  ('verified-artist', 'Verified Artist', '艺人认证', 'Admin-verified artist or DJ identity.', 'identity', 'identity', 'AR', 'rose', 'public', '{"adminOnly":true}'::jsonb, 130),
  ('verified-ticketing-source', 'Verified Ticketing Source', '票务认证', 'Admin-verified ticketing or official source identity.', 'identity', 'identity', 'TK', 'ember', 'public', '{"adminOnly":true}'::jsonb, 140),
  ('trusted-reviewer', 'Trusted Reviewer', '可信审核', 'Recognized reviewer for source quality and queue decisions.', 'governance', 'ops', 'TR', 'paper', 'private', '{"adminOnly":true}'::jsonb, 170),
  ('founding-contributor', 'Founding Contributor', '早期贡献者', 'Early community builder recognized by the editorial team.', 'governance', 'ops', 'FC', 'gold', 'public', '{"adminOnly":true}'::jsonb, 180)
on conflict (slug) do update
  set name = excluded.name,
      name_zh = excluded.name_zh,
      description = excluded.description,
      category = excluded.category,
      tier = excluded.tier,
      icon = excluded.icon,
      style_key = excluded.style_key,
      visibility = excluded.visibility,
      rule_config = excluded.rule_config,
      display_order = excluded.display_order,
      active = true,
      updated_at = now();

create index if not exists badge_definitions_category_order_idx
  on public.badge_definitions (category, display_order)
  where active = true;
create index if not exists profile_badges_user_status_idx
  on public.profile_badges (user_id, status, awarded_at desc);
create index if not exists profile_badges_badge_status_idx
  on public.profile_badges (badge_slug, status);
create index if not exists reputation_events_user_created_idx
  on public.reputation_events (user_id, created_at desc);
create index if not exists reputation_events_badge_user_idx
  on public.reputation_events (badge_slug, user_id, created_at desc)
  where badge_slug is not null;

drop trigger if exists badge_definitions_set_updated_at on public.badge_definitions;
create trigger badge_definitions_set_updated_at before update on public.badge_definitions
  for each row execute function public.set_updated_at();

drop trigger if exists profile_badges_set_updated_at on public.profile_badges;
create trigger profile_badges_set_updated_at before update on public.profile_badges
  for each row execute function public.set_updated_at();

alter table public.badge_definitions enable row level security;
alter table public.profile_badges enable row level security;
alter table public.reputation_events enable row level security;

drop policy if exists "Public can read active badge definitions" on public.badge_definitions;
create policy "Public can read active badge definitions"
  on public.badge_definitions for select
  to anon, authenticated
  using (active = true);

drop policy if exists "Admins can manage badge definitions" on public.badge_definitions;
create policy "Admins can manage badge definitions"
  on public.badge_definitions for all
  to authenticated
  using (public.current_user_has_role(array['admin']))
  with check (public.current_user_has_role(array['admin']));

drop policy if exists "Users can read own badges" on public.profile_badges;
create policy "Users can read own badges"
  on public.profile_badges for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Public can read opted in active public badges" on public.profile_badges;
create policy "Public can read opted in active public badges"
  on public.profile_badges for select
  to anon, authenticated
  using (
    status = 'active'
    and exists (
      select 1
      from public.profiles profile
      where profile.id = profile_badges.user_id
        and profile.public_badges = true
    )
    and exists (
      select 1
      from public.badge_definitions definition
      where definition.slug = profile_badges.badge_slug
        and definition.active = true
        and definition.visibility = 'public'
    )
  );

drop policy if exists "Admins and moderators can read badges" on public.profile_badges;
create policy "Admins and moderators can read badges"
  on public.profile_badges for select
  to authenticated
  using (public.current_user_has_role(array['moderator', 'admin']));

drop policy if exists "Admins can manage profile badges" on public.profile_badges;
create policy "Admins can manage profile badges"
  on public.profile_badges for all
  to authenticated
  using (public.current_user_has_role(array['admin']))
  with check (public.current_user_has_role(array['admin']));

drop policy if exists "Users can read own reputation events" on public.reputation_events;
create policy "Users can read own reputation events"
  on public.reputation_events for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Admins and moderators can read reputation events" on public.reputation_events;
create policy "Admins and moderators can read reputation events"
  on public.reputation_events for select
  to authenticated
  using (public.current_user_has_role(array['moderator', 'admin']));

drop policy if exists "Admins can insert reputation events" on public.reputation_events;
create policy "Admins can insert reputation events"
  on public.reputation_events for insert
  to authenticated
  with check (public.current_user_has_role(array['admin']));

create or replace function public.community_badge_slug_for_type(contribution_type text)
returns text
language sql
immutable
as $$
  select case contribution_type
    when 'event' then 'event-scout'
    when 'source-fix' then 'source-runner'
    when 'dj' then 'lineup-mapper'
    when 'venue' then 'venue-signal'
    else null
  end;
$$;

create or replace function public.community_badge_level(
  target_user_id uuid,
  target_badge_slug text
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with counts as (
    select count(distinct target_id) as accepted_or_merged
    from public.reputation_events
    where user_id = target_user_id
      and badge_slug = target_badge_slug
      and target_type = 'community_contribution'
      and event_type in ('community_contribution_accepted', 'community_contribution_merged')
      and target_id is not null
  )
  select case
    when accepted_or_merged >= 15 then 3
    when accepted_or_merged >= 5 then 2
    when accepted_or_merged >= 1 then 1
    else 0
  end
  from counts;
$$;

create or replace function public.record_community_contribution_reputation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_badge_slug text;
  reputation_event_type text;
  contribution_points integer;
  next_level integer;
begin
  if new.submitted_by is null then
    return new;
  end if;

  if new.status not in ('accepted', 'merged') then
    return new;
  end if;

  target_badge_slug := public.community_badge_slug_for_type(new.contribution_type);
  if target_badge_slug is null then
    return new;
  end if;

  reputation_event_type := case
    when new.status = 'merged' then 'community_contribution_merged'
    else 'community_contribution_accepted'
  end;

  contribution_points := case
    when new.status = 'merged' and new.contribution_type = 'source-fix' then 15
    when new.status = 'merged' then 25
    else 10
  end;

  insert into public.reputation_events (
    user_id,
    event_type,
    target_type,
    target_id,
    points_delta,
    badge_slug,
    created_by,
    reason,
    metadata
  )
  values (
    new.submitted_by,
    reputation_event_type,
    'community_contribution',
    new.id::text,
    contribution_points,
    target_badge_slug,
    new.reviewed_by,
    concat('Community contribution ', new.status),
    jsonb_build_object(
      'contributionType', new.contribution_type,
      'title', new.title,
      'targetKind', new.target_kind,
      'targetId', new.target_id,
      'reviewedAt', new.reviewed_at
    )
  )
  on conflict on constraint reputation_events_unique_target do nothing;

  next_level := public.community_badge_level(new.submitted_by, target_badge_slug);

  if next_level > 0 then
    insert into public.profile_badges (
      user_id,
      badge_slug,
      level,
      status,
      awarded_by,
      source_type,
      source_id,
      evidence
    )
    values (
      new.submitted_by,
      target_badge_slug,
      next_level,
      'active',
      new.reviewed_by,
      'community_contribution',
      new.id::text,
      jsonb_build_object(
        'latestContributionId', new.id,
        'latestContributionTitle', new.title,
        'latestContributionStatus', new.status
      )
    )
    on conflict (user_id, badge_slug) do update
      set level = greatest(public.profile_badges.level, excluded.level),
          status = 'active',
          awarded_by = coalesce(excluded.awarded_by, public.profile_badges.awarded_by),
          source_type = excluded.source_type,
          source_id = excluded.source_id,
          evidence = public.profile_badges.evidence || excluded.evidence,
          revoked_at = null,
          updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists community_contributions_reputation_after_status on public.community_contributions;
create trigger community_contributions_reputation_after_status
  after update of status on public.community_contributions
  for each row
  when (old.status is distinct from new.status)
  execute function public.record_community_contribution_reputation();

create or replace function public.grant_profile_badge(
  target_user_id uuid,
  target_badge_slug text,
  badge_level integer default 1,
  grant_evidence jsonb default '{}'::jsonb
)
returns public.profile_badges
language plpgsql
security definer
set search_path = public
as $$
declare
  granted public.profile_badges;
begin
  if not public.current_user_has_role(array['admin']) then
    raise exception 'Admin role required to grant badges' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.badge_definitions
    where slug = target_badge_slug
      and active = true
  ) then
    raise exception 'Unknown or inactive badge: %', target_badge_slug;
  end if;

  insert into public.profile_badges (
    user_id,
    badge_slug,
    level,
    status,
    awarded_by,
    source_type,
    evidence,
    awarded_at,
    revoked_at
  )
  values (
    target_user_id,
    target_badge_slug,
    least(greatest(coalesce(badge_level, 1), 1), 3),
    'active',
    auth.uid(),
    'manual',
    coalesce(grant_evidence, '{}'::jsonb),
    now(),
    null
  )
  on conflict (user_id, badge_slug) do update
    set level = excluded.level,
        status = 'active',
        awarded_by = excluded.awarded_by,
        source_type = 'manual',
        evidence = public.profile_badges.evidence || excluded.evidence,
        awarded_at = now(),
        revoked_at = null,
        updated_at = now()
  returning * into granted;

  insert into public.reputation_events (
    user_id,
    event_type,
    target_type,
    target_id,
    points_delta,
    badge_slug,
    created_by,
    reason,
    metadata
  )
  values (
    target_user_id,
    'manual_badge_grant',
    'profile_badge',
    target_badge_slug,
    0,
    target_badge_slug,
    auth.uid(),
    'Manual badge grant',
    coalesce(grant_evidence, '{}'::jsonb)
  )
  on conflict on constraint reputation_events_unique_target do nothing;

  return granted;
end;
$$;

create or replace function public.revoke_profile_badge(
  target_user_id uuid,
  target_badge_slug text,
  revoke_reason text default null
)
returns public.profile_badges
language plpgsql
security definer
set search_path = public
as $$
declare
  revoked public.profile_badges;
begin
  if not public.current_user_has_role(array['admin']) then
    raise exception 'Admin role required to revoke badges' using errcode = '42501';
  end if;

  update public.profile_badges
     set status = 'revoked',
         revoked_at = now(),
         evidence = evidence || jsonb_build_object('revokeReason', revoke_reason, 'revokedBy', auth.uid()),
         updated_at = now()
   where user_id = target_user_id
     and badge_slug = target_badge_slug
  returning * into revoked;

  if revoked.user_id is null then
    raise exception 'Badge is not assigned to this profile';
  end if;

  insert into public.reputation_events (
    user_id,
    event_type,
    target_type,
    target_id,
    points_delta,
    badge_slug,
    created_by,
    reason,
    metadata
  )
  values (
    target_user_id,
    'manual_badge_revoke',
    'profile_badge',
    target_badge_slug,
    0,
    target_badge_slug,
    auth.uid(),
    coalesce(revoke_reason, 'Manual badge revoke'),
    jsonb_build_object('revokeReason', revoke_reason)
  )
  on conflict on constraint reputation_events_unique_target do nothing;

  return revoked;
end;
$$;

drop view if exists public.profile_reputation_summary;
create view public.profile_reputation_summary
with (security_invoker = true)
as
with reputation as (
  select
    user_id,
    coalesce(sum(points_delta), 0)::integer as total_points,
    count(*) filter (where event_type = 'community_contribution_accepted')::integer as accepted_contributions,
    count(*) filter (where event_type = 'community_contribution_merged')::integer as merged_contributions
  from public.reputation_events
  group by user_id
),
badges as (
  select
    profile_badges.user_id,
    count(*) filter (where profile_badges.status = 'active')::integer as badge_count,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'slug', badge_definitions.slug,
          'name', badge_definitions.name,
          'category', badge_definitions.category,
          'tier', badge_definitions.tier,
          'icon', badge_definitions.icon,
          'styleKey', badge_definitions.style_key,
          'level', profile_badges.level,
          'awardedAt', profile_badges.awarded_at
        )
        order by profile_badges.level desc, badge_definitions.display_order asc
      ) filter (where profile_badges.status = 'active'),
      '[]'::jsonb
    ) as top_badges
  from public.profile_badges
  join public.badge_definitions
    on badge_definitions.slug = profile_badges.badge_slug
  group by profile_badges.user_id
)
select
  profiles.id as user_id,
  profiles.display_name,
  profiles.public_badges,
  coalesce(reputation.total_points, 0) as total_points,
  coalesce(reputation.accepted_contributions, 0) as accepted_contributions,
  coalesce(reputation.merged_contributions, 0) as merged_contributions,
  coalesce(badges.badge_count, 0) as badge_count,
  coalesce(badges.top_badges, '[]'::jsonb) as top_badges
from public.profiles
left join reputation on reputation.user_id = profiles.id
left join badges on badges.user_id = profiles.id;

revoke all on function public.community_badge_slug_for_type(text) from public, anon, authenticated;
revoke all on function public.community_badge_level(uuid, text) from public, anon, authenticated;
revoke all on function public.record_community_contribution_reputation() from public, anon, authenticated;
revoke all on function public.grant_profile_badge(uuid, text, integer, jsonb) from public, anon;
revoke all on function public.revoke_profile_badge(uuid, text, text) from public, anon;

grant execute on function public.grant_profile_badge(uuid, text, integer, jsonb) to authenticated;
grant execute on function public.revoke_profile_badge(uuid, text, text) to authenticated;

grant select on public.badge_definitions to anon, authenticated;
grant select on public.profile_badges to anon, authenticated;
grant select on public.reputation_events to authenticated;
grant select on public.profile_reputation_summary to authenticated;
grant insert, update on public.profile_badges to authenticated;
grant insert on public.reputation_events to authenticated;
grant all on public.badge_definitions, public.profile_badges, public.reputation_events to service_role;
