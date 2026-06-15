# Supabase Backend

This project has a Supabase-backed schema for the static Shanghai Rave Index data and the public Love Wall submission queue.

## Tables

- `events`, `venues`, `event_sources`, `event_lineups`
- `artists`, `dj_itineraries`, `dj_itinerary_stops`
- `poster_archive`, `source_checks`, `site_pages`
- `love_wall_posts`
- `subscriptions` for newsletter, Xiaohongshu-first, and alert-intent submissions
- `community_contributions` for source-backed community event, DJ, venue, existing-entry addition, and correction leads
- `profiles` for authenticated moderator/admin roles
- `user_event_preferences`, `saved_events` for authenticated account personalization

All tables have Row Level Security enabled. Public visitors can read published calendar data and approved Love Wall posts. Anonymous visitors can insert only pending Love Wall submissions, pending subscription requests, and pending community contribution leads. Contribution rows can identify a contributor role, optional affiliation, and a target event/DJ/venue entry, but remain pending until moderator/admin review. Imports and moderation use server-side credentials only.
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

## Admin Account

Admin access is two-part:

- Passwords and magic links are handled by Supabase Auth.
- Ops authorization is handled by `public.profiles.role`.

Create or sign in once with the owner email on `account.html` so the `handle_new_user` trigger creates `public.profiles`. The password is set in that account form and must be at least 8 characters. Apply migrations when you have database SQL access, then grant the profile from a trusted local shell with either `SUPABASE_DB_URL`, or `NEXT_PUBLIC_SUPABASE_URL` plus `SUPABASE_SERVICE_ROLE_KEY`, configured:

```bash
npm run supabase:migrate
npm run admin:grant -- owner@example.com
```

If you are already in the Supabase SQL Editor, run:

```sql
select *
from public.set_profile_role_by_email('owner@example.com', 'admin');
```

The role-hardening migration grants browser clients only profile select plus self `display_name` updates. Do not add service-role keys or owner email allowlists to browser code.

### Auth Redirect URLs

Account confirmation and magic-link emails use Supabase Auth redirects. Configure the Supabase dashboard Auth URL settings so these URLs are allowed:

```text
https://raveindexsh.top/account.html
https://raveindexsh.top/account
http://localhost:4173/account.html
```

The account page forces local sign-up and email-link requests to use the production account URL so confirmation emails do not send users to `localhost`. The confirmation email may appear from Supabase and can land in Junk/Spam.

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
  table: "love_wall_posts",
  reactionTable: "love_wall_reactions",
  contributionTable: "community_contributions"
};
```

The anon/publishable key is allowed in browser code only because RLS limits it. Never put the service role key in this file.
