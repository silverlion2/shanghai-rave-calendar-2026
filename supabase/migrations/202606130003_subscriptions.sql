create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text,
  red_handle text,
  instagram_handle text,
  locale text not null default 'en'
    check (locale in ('en', 'zh', 'bilingual')),
  channels text[] not null default '{}'::text[],
  sound_tags text[] not null default '{}'::text[],
  venue_tags text[] not null default '{}'::text[],
  alert_types text[] not null default '{}'::text[],
  source text not null default 'subscribe_page',
  status text not null default 'pending'
    check (status in ('pending', 'active', 'paused', 'unsubscribed', 'rejected')),
  consent boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_contact_check check (
    nullif(email, '') is not null
    or nullif(red_handle, '') is not null
    or nullif(instagram_handle, '') is not null
  )
);

create index if not exists subscriptions_status_created_idx
  on public.subscriptions (status, created_at desc);
create index if not exists subscriptions_sound_tags_gin_idx
  on public.subscriptions using gin (sound_tags);
create index if not exists subscriptions_alert_types_gin_idx
  on public.subscriptions using gin (alert_types);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

drop policy if exists "Public can submit pending subscriptions" on public.subscriptions;
create policy "Public can submit pending subscriptions"
  on public.subscriptions for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and source = 'subscribe_page'
    and consent = true
    and reviewed_by is null
    and reviewed_at is null
    and cardinality(channels) between 1 and 4
    and cardinality(alert_types) between 1 and 8
    and cardinality(sound_tags) between 0 and 16
  );

drop policy if exists "Admins can read subscriptions" on public.subscriptions;
create policy "Admins can read subscriptions"
  on public.subscriptions for select
  to authenticated
  using (public.current_user_has_role(array['moderator', 'admin']));

drop policy if exists "Admins can update subscriptions" on public.subscriptions;
create policy "Admins can update subscriptions"
  on public.subscriptions for update
  to authenticated
  using (public.current_user_has_role(array['moderator', 'admin']))
  with check (public.current_user_has_role(array['moderator', 'admin']));

drop policy if exists "Admins can delete subscriptions" on public.subscriptions;
create policy "Admins can delete subscriptions"
  on public.subscriptions for delete
  to authenticated
  using (public.current_user_has_role(array['admin']));

grant insert on public.subscriptions to anon, authenticated;
grant select, update, delete on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
