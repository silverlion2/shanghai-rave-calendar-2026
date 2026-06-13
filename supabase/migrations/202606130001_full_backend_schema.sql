create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'contributor'
    check (role in ('contributor', 'moderator', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        updated_at = now();
  return new;
end;
$$;

create or replace function public.current_user_has_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = any (allowed_roles)
  );
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table if not exists public.venues (
  slug text primary key check (char_length(slug) > 0),
  name text not null,
  district text,
  city text not null default 'Shanghai',
  country text not null default 'CN',
  address text,
  organizer text,
  latitude numeric,
  longitude numeric,
  tags jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id text primary key check (char_length(id) > 0),
  slug text not null unique,
  title text not null,
  month text,
  date_label text,
  sort_date date,
  time_label text,
  start_at timestamptz,
  end_at timestamptz,
  venue_slug text references public.venues(slug) on update cascade on delete set null,
  venue_name text,
  district text,
  city text not null default 'Shanghai',
  country text not null default 'CN',
  sound text,
  genre text,
  status text not null default 'watch',
  confidence text,
  price text,
  age text,
  description text,
  notes text,
  source_url text,
  source_label text,
  source_status text,
  last_checked date,
  event_url text,
  poster_url text,
  image_theme text,
  vibe jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  lineup jsonb not null default '[]'::jsonb,
  set_times jsonb not null default '[]'::jsonb,
  raw jsonb not null default '{}'::jsonb,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_sources (
  id text primary key,
  event_id text not null references public.events(id) on update cascade on delete cascade,
  label text,
  url text,
  status text,
  kind text,
  source_status text,
  last_checked date,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artists (
  slug text primary key check (char_length(slug) > 0),
  name text not null,
  summary text,
  source_note text,
  image_theme text,
  genres jsonb not null default '[]'::jsonb,
  aliases jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_lineups (
  id text primary key,
  event_id text not null references public.events(id) on update cascade on delete cascade,
  artist_slug text references public.artists(slug) on update cascade on delete set null,
  artist_name text not null,
  note text,
  start_time text,
  end_time text,
  status text,
  room text,
  source_label text,
  source_url text,
  position integer not null default 0,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.poster_archive (
  id text primary key,
  event_id text references public.events(id) on update cascade on delete set null,
  title text not null,
  year integer,
  city text,
  country text,
  date_label text,
  sort_date date,
  time_label text,
  venue_name text,
  district text,
  sound text,
  status text,
  confidence text,
  collection text,
  source jsonb not null default '{}'::jsonb,
  image jsonb not null default '{}'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  notes text,
  event_url text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dj_itineraries (
  artist_slug text primary key references public.artists(slug) on update cascade on delete cascade,
  name text not null,
  tracked_at date,
  checked_by_timezone text,
  scope text,
  summary text,
  source_note text,
  image_theme text,
  genres jsonb not null default '[]'::jsonb,
  aliases jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dj_itinerary_stops (
  id text primary key,
  artist_slug text not null references public.dj_itineraries(artist_slug) on update cascade on delete cascade,
  date date,
  end_date date,
  display_date text,
  title text,
  city text,
  country text,
  venue text,
  source_label text,
  source_url text,
  source_status text,
  status text,
  note text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_checks (
  id text primary key,
  label text not null,
  url text,
  kind text,
  source_status text,
  access text,
  checked_at date,
  ok boolean,
  status text,
  event_links integer,
  links integer,
  priority integer,
  cadence text,
  trigger text,
  error text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_pages (
  id text primary key,
  label text not null,
  file text not null,
  route text,
  shell text,
  include_in_sitemap boolean not null default false,
  changefreq text,
  priority numeric,
  utility boolean not null default false,
  homepage_stats boolean not null default false,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.love_wall_posts (
  id uuid primary key default gen_random_uuid(),
  author text not null default 'anonymous dancer',
  pulse text not null,
  message text not null,
  status text not null default 'pending',
  source text not null default 'supabase',
  reviewed_by uuid references auth.users(id) on delete set null,
  rejection_reason text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint love_wall_posts_author_length check (char_length(author) between 1 and 26),
  constraint love_wall_posts_message_length check (char_length(message) between 1 and 170),
  constraint love_wall_posts_pulse_check check (pulse in ('bass', 'sweat', 'care', 'freedom', 'afterglow')),
  constraint love_wall_posts_status_check check (status in ('pending', 'approved', 'rejected'))
);

alter table public.love_wall_posts
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists rejection_reason text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists events_sort_date_idx on public.events (sort_date desc);
create index if not exists events_status_sort_date_idx on public.events (status, sort_date desc);
create index if not exists events_venue_slug_idx on public.events (venue_slug);
create index if not exists events_published_idx on public.events (published) where published = true;
create index if not exists events_tags_gin_idx on public.events using gin (tags);
create index if not exists events_vibe_gin_idx on public.events using gin (vibe);
create index if not exists event_sources_event_id_idx on public.event_sources (event_id);
create index if not exists event_lineups_event_id_idx on public.event_lineups (event_id, position);
create index if not exists event_lineups_artist_slug_idx on public.event_lineups (artist_slug);
create index if not exists poster_archive_event_id_idx on public.poster_archive (event_id);
create index if not exists poster_archive_sort_date_idx on public.poster_archive (sort_date desc);
create index if not exists dj_itinerary_stops_artist_date_idx on public.dj_itinerary_stops (artist_slug, date);
create index if not exists source_checks_checked_at_idx on public.source_checks (checked_at desc);
create index if not exists love_wall_posts_public_feed_idx
  on public.love_wall_posts (status, created_at desc)
  where status = 'approved';
create index if not exists love_wall_posts_review_queue_idx
  on public.love_wall_posts (status, created_at asc)
  where status = 'pending';

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists venues_set_updated_at on public.venues;
create trigger venues_set_updated_at before update on public.venues
  for each row execute function public.set_updated_at();
drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at before update on public.events
  for each row execute function public.set_updated_at();
drop trigger if exists event_sources_set_updated_at on public.event_sources;
create trigger event_sources_set_updated_at before update on public.event_sources
  for each row execute function public.set_updated_at();
drop trigger if exists artists_set_updated_at on public.artists;
create trigger artists_set_updated_at before update on public.artists
  for each row execute function public.set_updated_at();
drop trigger if exists event_lineups_set_updated_at on public.event_lineups;
create trigger event_lineups_set_updated_at before update on public.event_lineups
  for each row execute function public.set_updated_at();
drop trigger if exists poster_archive_set_updated_at on public.poster_archive;
create trigger poster_archive_set_updated_at before update on public.poster_archive
  for each row execute function public.set_updated_at();
drop trigger if exists dj_itineraries_set_updated_at on public.dj_itineraries;
create trigger dj_itineraries_set_updated_at before update on public.dj_itineraries
  for each row execute function public.set_updated_at();
drop trigger if exists dj_itinerary_stops_set_updated_at on public.dj_itinerary_stops;
create trigger dj_itinerary_stops_set_updated_at before update on public.dj_itinerary_stops
  for each row execute function public.set_updated_at();
drop trigger if exists source_checks_set_updated_at on public.source_checks;
create trigger source_checks_set_updated_at before update on public.source_checks
  for each row execute function public.set_updated_at();
drop trigger if exists site_pages_set_updated_at on public.site_pages;
create trigger site_pages_set_updated_at before update on public.site_pages
  for each row execute function public.set_updated_at();
drop trigger if exists love_wall_posts_set_updated_at on public.love_wall_posts;
create trigger love_wall_posts_set_updated_at before update on public.love_wall_posts
  for each row execute function public.set_updated_at();

create or replace view public.public_events
with (security_invoker = true)
as
select *
from public.events
where published = true;

create or replace view public.public_love_wall_posts
with (security_invoker = true)
as
select id, author, pulse, message, source, created_at, approved_at
from public.love_wall_posts
where status = 'approved';

alter table public.profiles enable row level security;
alter table public.venues enable row level security;
alter table public.events enable row level security;
alter table public.event_sources enable row level security;
alter table public.artists enable row level security;
alter table public.event_lineups enable row level security;
alter table public.poster_archive enable row level security;
alter table public.dj_itineraries enable row level security;
alter table public.dj_itinerary_stops enable row level security;
alter table public.source_checks enable row level security;
alter table public.site_pages enable row level security;
alter table public.love_wall_posts enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Admins can view profiles" on public.profiles;
create policy "Admins can view profiles"
  on public.profiles for select
  to authenticated
  using (public.current_user_has_role(array['admin']));

drop policy if exists "Public can read venues" on public.venues;
create policy "Public can read venues"
  on public.venues for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can read published events" on public.events;
create policy "Public can read published events"
  on public.events for select
  to anon, authenticated
  using (published = true);

drop policy if exists "Public can read event sources" on public.event_sources;
create policy "Public can read event sources"
  on public.event_sources for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.events e
      where e.id = event_sources.event_id
        and e.published = true
    )
  );

drop policy if exists "Public can read artists" on public.artists;
create policy "Public can read artists"
  on public.artists for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can read event lineups" on public.event_lineups;
create policy "Public can read event lineups"
  on public.event_lineups for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.events e
      where e.id = event_lineups.event_id
        and e.published = true
    )
  );

drop policy if exists "Public can read poster archive" on public.poster_archive;
create policy "Public can read poster archive"
  on public.poster_archive for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can read DJ itineraries" on public.dj_itineraries;
create policy "Public can read DJ itineraries"
  on public.dj_itineraries for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can read DJ itinerary stops" on public.dj_itinerary_stops;
create policy "Public can read DJ itinerary stops"
  on public.dj_itinerary_stops for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can read source checks" on public.source_checks;
create policy "Public can read source checks"
  on public.source_checks for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can read site pages" on public.site_pages;
create policy "Public can read site pages"
  on public.site_pages for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can read approved love wall posts" on public.love_wall_posts;
create policy "Public can read approved love wall posts"
  on public.love_wall_posts for select
  to anon, authenticated
  using (status = 'approved');

drop policy if exists "Public can submit pending love wall posts" on public.love_wall_posts;
create policy "Public can submit pending love wall posts"
  on public.love_wall_posts for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and source = 'supabase'
    and reviewed_by is null
    and rejection_reason is null
    and approved_at is null
    and char_length(author) between 1 and 26
    and char_length(message) between 1 and 170
    and pulse in ('bass', 'sweat', 'care', 'freedom', 'afterglow')
  );

drop policy if exists "Admins can read all love wall posts" on public.love_wall_posts;
create policy "Admins can read all love wall posts"
  on public.love_wall_posts for select
  to authenticated
  using (public.current_user_has_role(array['moderator', 'admin']));

drop policy if exists "Admins can moderate love wall posts" on public.love_wall_posts;
create policy "Admins can moderate love wall posts"
  on public.love_wall_posts for update
  to authenticated
  using (public.current_user_has_role(array['moderator', 'admin']))
  with check (public.current_user_has_role(array['moderator', 'admin']));

drop policy if exists "Admins can delete love wall posts" on public.love_wall_posts;
create policy "Admins can delete love wall posts"
  on public.love_wall_posts for delete
  to authenticated
  using (public.current_user_has_role(array['admin']));

grant usage on schema public to anon, authenticated, service_role;
grant select on public.public_events to anon, authenticated;
grant select on public.public_love_wall_posts to anon, authenticated;
grant select on public.venues, public.events, public.event_sources, public.artists,
  public.event_lineups, public.poster_archive, public.dj_itineraries,
  public.dj_itinerary_stops, public.source_checks, public.site_pages
  to anon, authenticated;
grant select, insert on public.love_wall_posts to anon, authenticated;
grant all on all tables in schema public to service_role;
grant all on all routines in schema public to service_role;
