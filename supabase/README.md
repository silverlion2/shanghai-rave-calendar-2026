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

### Auth Email Confirmation

Account sign-up expects Supabase Auth email confirmation to be disabled. Hosted projects can apply the toggle through Supabase's Management API:

```bash
SUPABASE_ACCESS_TOKEN=your-management-api-token npm run supabase:auth:no-confirm
```

This patches the hosted Auth config with `mailer_autoconfirm=true`. You can also use the dashboard path: Authentication -> Providers -> Email -> Confirm Email off. Supabase's JavaScript client returns a session from `signUp()` when this is off, which lets `account.html` enter the dashboard immediately after account creation.

### Auth Redirect URLs

Magic-link emails still use Supabase Auth redirects. Configure the Supabase dashboard Auth URL settings so these URLs are allowed:

```text
https://raveindexsh.top/account.html
https://raveindexsh.top/account
http://localhost:4173/account.html
```

The account page forces local email-link requests to use the production account URL so magic links do not send users to `localhost`.

## Poster Archive Upload

After adding or replacing local poster files, run:

```bash
npm run posters:upload
```

This compresses every poster source into `assets/posters/*-optimized.jpg`, regenerates `data/poster-archive.json`, and upserts the updated metadata into Supabase. Supabase stores poster paths and metadata in `poster_archive` and imports optimized display paths into `events.poster_url`; image files are deployed from the static site.

## Poster Wall Read Path

`poster-wall.html` remains the single public event/poster browsing surface. The page loads `assets/poster-wall-data.js`, which first tries the read-only Supabase view `poster_wall_cards` and falls back to `data/events.json` plus `data/poster-archive.json` when Supabase is unavailable.

The product is Shanghai-first in this phase:

```js
posterWallDefaultCity: "Shanghai"
```

The view can expose other accepted poster cities for uploads and archive browsing, but the default wall filter remains Shanghai.

Images may still point to static `assets/posters/...` paths. Moving display and thumbnail assets to object storage can happen later without changing the wall renderer, as long as `poster_wall_cards.poster_display_url` and `poster_wall_cards.poster_thumbnail_url` return browser-readable URLs.

## Love Wall Client Config

`npm run supabase:configure-client` updates `assets/love-wall-supabase-config.js` with the public project URL and anon/publishable key:

```js
window.LOVE_WALL_SUPABASE = {
  enabled: true,
  url: "https://your-project-ref.supabase.co",
  anonKey: "your-publishable-or-anon-key",
  table: "love_wall_posts",
  reactionTable: "love_wall_reactions",
  contributionTable: "community_contributions",
  posterWallEnabled: true,
  posterWallView: "poster_wall_cards",
  posterWallDefaultCity: "Shanghai",
  posterWallPageSize: 120,
  posterWallTimeoutMs: 3500
};
```

The anon/publishable key is allowed in browser code only because RLS limits it. Never put the service role key in this file.
