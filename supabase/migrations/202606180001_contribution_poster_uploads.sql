-- Add poster_url column to the community_contributions table
alter table public.community_contributions add column if not exists poster_url text;

-- Create the storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contribution_posters',
  'contribution_posters',
  true,
  5242880, -- 5MB limit
  array['image/jpeg', 'image/png', 'image/webp']
) on conflict (id) do nothing;

-- Set up Row Level Security (RLS) policies for the storage bucket
-- Allow anyone to upload a poster to the contribution_posters bucket
create policy "Allow public uploads to contribution_posters"
on storage.objects for insert
to public
with check (
  bucket_id = 'contribution_posters'
);

-- Allow public to view the posters
create policy "Allow public read from contribution_posters"
on storage.objects for select
to public
using (
  bucket_id = 'contribution_posters'
);

-- Allow admins to manage (delete/update) posters
create policy "Allow admins to manage contribution_posters"
on storage.objects for all
to authenticated
using (
  public.current_user_has_role(array['moderator', 'admin'])
)
with check (
  public.current_user_has_role(array['moderator', 'admin'])
);
