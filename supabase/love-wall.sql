create extension if not exists pgcrypto;

create table if not exists public.love_wall_posts (
  id uuid primary key default gen_random_uuid(),
  author text not null default 'anonymous dancer',
  pulse text not null,
  message text not null,
  status text not null default 'pending',
  source text not null default 'supabase',
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  constraint love_wall_posts_author_length check (char_length(author) between 1 and 26),
  constraint love_wall_posts_message_length check (char_length(message) between 1 and 170),
  constraint love_wall_posts_pulse_check check (pulse in ('bass', 'sweat', 'care', 'freedom', 'afterglow')),
  constraint love_wall_posts_status_check check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists love_wall_posts_public_feed_idx
  on public.love_wall_posts (status, created_at desc)
  where status = 'approved';

alter table public.love_wall_posts enable row level security;

drop policy if exists "Public can read approved love wall posts" on public.love_wall_posts;
create policy "Public can read approved love wall posts"
  on public.love_wall_posts
  for select
  to anon, authenticated
  using (status = 'approved');

drop policy if exists "Public can submit pending love wall posts" on public.love_wall_posts;
create policy "Public can submit pending love wall posts"
  on public.love_wall_posts
  for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and source = 'supabase'
    and char_length(author) between 1 and 26
    and char_length(message) between 1 and 170
    and pulse in ('bass', 'sweat', 'care', 'freedom', 'afterglow')
  );

grant usage on schema public to anon, authenticated;
grant select, insert on public.love_wall_posts to anon, authenticated;

create table if not exists public.love_wall_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.love_wall_posts(id) on delete cascade,
  emoji text not null,
  visitor_id text not null,
  created_at timestamptz not null default now(),
  constraint love_wall_reactions_emoji_check check (emoji in ('🔥', '🖤', '💧', '⚡', '🌙')),
  constraint love_wall_reactions_visitor_id_length check (char_length(visitor_id) between 16 and 80),
  constraint love_wall_reactions_unique_vote unique (post_id, emoji, visitor_id)
);

create index if not exists love_wall_reactions_post_idx
  on public.love_wall_reactions (post_id, emoji);

alter table public.love_wall_reactions enable row level security;

drop policy if exists "Public can read approved love wall reactions" on public.love_wall_reactions;
create policy "Public can read approved love wall reactions"
  on public.love_wall_reactions
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.love_wall_posts p
      where p.id = love_wall_reactions.post_id
        and p.status = 'approved'
    )
  );

drop policy if exists "Public can react to approved love wall posts" on public.love_wall_reactions;
create policy "Public can react to approved love wall posts"
  on public.love_wall_reactions
  for insert
  to anon, authenticated
  with check (
    emoji in ('🔥', '🖤', '💧', '⚡', '🌙')
    and char_length(visitor_id) between 16 and 80
    and exists (
      select 1
      from public.love_wall_posts p
      where p.id = love_wall_reactions.post_id
        and p.status = 'approved'
    )
  );

grant select, insert on public.love_wall_reactions to anon, authenticated;

-- Approve from Supabase SQL Editor or dashboard:
-- update public.love_wall_posts
-- set status = 'approved', approved_at = now()
-- where id = 'POST_ID';
