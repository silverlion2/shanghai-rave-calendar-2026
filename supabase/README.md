# Supabase Backend

This project has a Supabase-backed schema for the static Shanghai Rave Index data and the public Love Wall submission queue.

## Tables

- `events`, `venues`, `event_sources`, `event_lineups`
- `artists`, `dj_itineraries`, `dj_itinerary_stops`
- `poster_archive`, `source_checks`, `site_pages`
- `love_wall_posts`
- `profiles` for authenticated moderator/admin roles
- `user_event_preferences`, `saved_events` for authenticated account personalization

All tables have Row Level Security enabled. Public visitors can read published calendar data and approved Love Wall posts. Anonymous visitors can insert only pending Love Wall submissions. Imports and moderation use server-side credentials only.
Authenticated account users can read and update only their own preference profile and saved event shortlist.

## Local Env

Copy `.env.example` to `.env.local` and fill these values from the Supabase dashboard:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-secret-or-service-role-key
SUPABASE_DB_URL=postgresql://postgres:your-db-password@db.your-project-ref.supabase.co:5432/postgres
```

Keep `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_DB_URL` out of browser code.
Use Supabase's direct connection string for migrations when your network supports IPv6. If this machine cannot reach the direct host, use the shared pooler session-mode string from the dashboard's Connect panel.

## Install

```bash
npm run supabase:install
```

This runs:

```bash
npm run supabase:migrate
npm run supabase:import
npm run supabase:configure-client
```

## Poster Archive Upload

After adding or replacing local poster files, run:

```bash
npm run posters:upload
```

This compresses every poster source into `assets/posters/*-optimized.jpg`, regenerates `data/poster-archive.json`, and upserts the updated metadata into Supabase. Supabase stores poster paths and metadata in `poster_archive` and imports optimized display paths into `events.poster_url`; image files are deployed from the static site.

## Love Wall Client Config

`npm run supabase:configure-client` updates `assets/love-wall-supabase-config.js` with the public project URL and anon/publishable key:

```js
window.LOVE_WALL_SUPABASE = {
  enabled: true,
  url: "https://your-project-ref.supabase.co",
  anonKey: "your-publishable-or-anon-key",
  table: "love_wall_posts"
};
```

The anon/publishable key is allowed in browser code only because RLS limits it. Never put the service role key in this file.
