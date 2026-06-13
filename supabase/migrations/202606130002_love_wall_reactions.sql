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

drop policy if exists "Admins can delete love wall reactions" on public.love_wall_reactions;
create policy "Admins can delete love wall reactions"
  on public.love_wall_reactions
  for delete
  to authenticated
  using (public.current_user_has_role(array['moderator', 'admin']));

grant select, insert on public.love_wall_reactions to anon, authenticated;
grant all on public.love_wall_reactions to service_role;
