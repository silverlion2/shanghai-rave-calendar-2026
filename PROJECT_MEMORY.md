# Project Memory

Last updated: 2026-06-20 Asia/Shanghai

## Project

Shanghai Rave Index is a static-first website for sourced Shanghai techno, rave, warehouse, industrial, bass, trance, and underground electronic events. The public event/venue/DJ guide remains generated and Vercel-hosted, while the web product now also has a deployed Supabase database/backend layer for durable community and Love Wall workflows.

## Dialogue Recap

The user first asked where the event information comes from and where Shanghai rave events are usually posted. The source hierarchy was clarified: official venue/promoter/ticket pages first, Resident Advisor and SmartShanghai next, and social/app-only sources as discovery leads only.

The user then asked to scrape with the Shanghai rave finder skill and update the project. The calendar was refreshed with June 2026 event entries and watch-level leads from Resident Advisor and SmartShanghai, and `SOURCE_LOG.md` was created to record source priority, refresh notes, watch-only rules, and usual posting places.

The user asked whether a scraping mechanism can be done using only GitHub or whether a database is needed. The decision was to build v1 as GitHub-only: GitHub Actions runs the scraper, writes `data/events.json`, commits the file back to the repo, and the static website loads that JSON over HTTP.

The user approved "v1". The project was updated with `scripts/scrape-events.js`, `.github/workflows/scrape-events.yml`, `data/events.json`, a frontend JSON loader, README documentation, and stronger validation in `scripts/check.js`.

The user then asked to make sure the scraper covers X on specific keywords, clarifying that "X" means the Twitter platform. The scraper was extended with X/Twitter keyword coverage using `config/scrape-keywords.json`. X/Twitter results are stored as discovery-only `socialLeads` and never become calendar cards until confirmed by a stronger source.

The user finally asked to create a project memory and save the dialogue. This file is the repo-local project memory for future continuation.

## Current Architecture

- `index.html` and `shanghai-rave-calendar-2026.html` contain embedded fallback event data and load `data/events.json` when served over HTTP.
- `planner.html` is the standalone set-time planner and personal itinerary surface. It estimates missing parseable slots, stores selected itinerary rows in browser `localStorage`, and exports selected slots as `.ics` or PNG.
- `ops.html` is a static operations console for AI intake review, WeChat/Xiaohongshu copy, ticket routing exports, promoter paid-exposure tracking, and ops reports. It stores operator state in browser `localStorage` and exports JSON/CSV for review.
- `data/events.json` is the generated static data file used by the website in deployed or local-server mode.
- `supabase/` contains the database schema and setup documentation for the deployed Supabase backend. Treat Supabase as the durable backend for approved user/community workflows, not as the default source for generated event inventory unless that migration is explicitly requested.
- `assets/love-wall-supabase-config.js` is the public client configuration for Love Wall submissions using the Supabase anon key. Public writes should remain pending/moderated; admin operations require server-side credentials or the Supabase dashboard.
- `scripts/scrape-events.js` seeds from embedded events, refreshes source metadata, scrapes public SmartShanghai pages, best-effort checks RA, records X/Twitter keyword searches, and writes `computerUseQueue` for anti-bot/app-only sources that the agent should inspect with Chrome + Computer Use.
- `config/curated-events.json` stores browser/Computer Use collected event updates, including blocked RA details, poster evidence, lineup, set-time, artist-note, tour-plan, and ticket-status fields that should persist across automated refreshes.
- `.github/workflows/scrape-events.yml` runs the scraper daily and commits changed `data/events.json` back to GitHub.
- `scripts/check.js` validates inline script syntax, parity between the main and archive calendar scripts, SEO markers, `data/events.json`, `config/scrape-keywords.json`, and `config/curated-events.json`.
- `config/scrape-keywords.json` is the editable X/Twitter keyword list.

## Source Rules

1. Direct venue, promoter, ticketing, or official artist pages are the strongest confirmation layer.
2. Resident Advisor event pages and city listings are strong public event sources, but automated listing fetches can return 403.
3. SmartShanghai event pages, clubbing listings, and editorial guides are reliable public discovery and context sources.
4. WeChat official accounts and mini-programs are often the final ticket/set-time source, but are not reliably linkable from the static scraper.
5. X/Twitter, Xiaohongshu, WeChat, Douyin, Instagram, Weibo, reposts, and app-only content are discovery leads unless independently confirmed. For social checks, prioritize XHS and WeChat; Instagram is public/index-only and not login-assisted because account access is unavailable.
6. RA Shanghai when blocked, SmartShanghai when rendered/incomplete, Xiaohongshu, WeChat accounts/groups, venue accounts, promoter posters, ShowStart/Damai/PiaoPlanet/mini-program ticketing, and DJ/label XHS/WeChat/Weibo/Bandcamp/official pages are queued for Chrome + Computer Use instead of plain fetch. Instagram snippets can remain leads, but do not ask for Instagram login.

## X/Twitter Integration

X/Twitter support is keyword-based and discovery-only.

- Keywords live in `config/scrape-keywords.json`.
- The scraper supports the official X API recent search endpoint when `X_BEARER_TOKEN` or `TWITTER_BEARER_TOKEN` is set.
- GitHub Actions passes both secret names into the scrape step.
- Without a bearer token, the scraper records each keyword search as `requires-token` and does not attempt slow unauthenticated page scraping by default.
- To attempt public HTML search, set `SCRAPE_X_PUBLIC_SEARCH=true`, but expect blocked or empty responses.
- Results, when available, are written to `data/events.json.socialLeads`.

## Computer Use Collection Queue

`data/events.json.computerUseQueue` is generated on each scrape run and surfaced in `ops.html` as `computer-use` leads. It covers RA Shanghai, SmartShanghai, Xiaohongshu, WeChat official accounts/groups, venue official accounts, promoter posters, ShowStart/Damai/PiaoPlanet/mini-program ticketing, and DJ/label XHS, Weibo, WeChat, Bandcamp, or official pages. Instagram snippets can stay as discovery leads, but Instagram login should not be requested. These are agent-operated Chrome + Computer Use collection tasks and should capture the complete event record: time, venue/address, lineup/set times, poster and OCR evidence, artist introductions, future city tour dates, ticket platform/price/availability, age/ID and entry rules, second-layer links, source publication date, last checked date, and evidence type.

## Known Caveats

- RA city listing fetches currently return 403 to automated requests. Existing RA event URLs remain stored as event sources, but RA listing discovery is best-effort.
- SmartShanghai public pages are currently the reliable automated discovery layer.
- X/Twitter collection needs an API bearer token for reliable results.
- Anti-bot, logged-in, app-only, mini-program, and poster/image-first sources should be handled through the generated Computer Use queue; do not add captcha/login bypass logic to the GitHub Action scraper.
- Social leads should not be promoted into calendar cards without confirmation from RA, SmartShanghai, venue/promoter, ticketing, or another stronger source.
- The public site is still static-first, but a Supabase database is now deployed for durable web/community workflows. New live user features, moderation queues, notifications, or saved events should build on the deployed backend rather than restarting the old "no database" decision.
- The ops console provides a local/export workflow for review, publishing copy, ticket routes, promoter packages, and reports, but it does not replace a real backend for multi-user moderation, payment processing, direct social posting, or durable analytics.

## Verification History

Recent successful checks:

- `npm run scrape` completed and generated `data/events.json`.
- `npm run check` passed after adding scraper, JSON validation, keyword validation, and frontend loader changes.
- Local HTTP preview previously confirmed `/data/events.json` returned HTTP 200 and the page loaded 55 events.

Current expected commands:

```bash
npm run scrape
npm run check
npm run start
```

### 2026-06-16 Yuyuan Screenshot Ingest: Health Maxxing + Le Youth

The user supplied Yuyuan mini-program, poster, and venue/promoter screenshots for two additional current/future events and asked to upload the analyzed data.

Implemented state:

- Added `health-maxxing-reactor-2026-06-19` for Jun 19 at Reactor Shanghai, 22:00-04:00, 78 RMB+, with lineup, running order, ticketing status, local poster assets, and a recommendation focused on why the room/program is worth attending.
- Added `le-youth-cloudsu-2026-06-27` for Jun 27 at CLOUD.SU Lounge Rooftop, 16:30-02:00, 228 RMB+, with lineup, address, ticketing status, local poster assets, and a recommendation framed around Le Youth's melodic-house / nu-disco appeal.
- Stored original and optimized poster/ticket/reference files under `assets/posters/`, then regenerated `data/poster-archive.json` so both events appear in the poster wall.
- Added CLOUD.SU, Asylum, and idk / HEALTH MAXXING routes to `config/promotion-platform-network.json`; Yuyuan mini-program search is now a preferred core-field source for these venue/promoter flows.
- Regenerated `data/events.json`, `data/dj-data.js`, `data/tracked-dj-itineraries.js`, SEO event pages, and `sitemap.xml`.

Open gaps:

- Direct Yuyuan mini-program URLs are still not linkable from screenshots.
- Age / ID policy was not visible for either event.
- Le Youth appeared sold out in the supplied screenshot.
- Health Maxxing's Reactor free-entry/body-test rule should be rechecked before recommending it as an active entry option.

Verification:

- `npm run check` passed with 108 events, 51 future events, 77 promotion-platform routes, 71 poster records, and 80 tests passing.

## Next Useful Steps

- Add `X_BEARER_TOKEN` or `TWITTER_BEARER_TOKEN` to GitHub repository secrets if reliable X/Twitter recent-search coverage is needed.
- Review and tune `config/scrape-keywords.json` as new venues, promoters, or party names become relevant.
- Keep `SOURCE_LOG.md` updated whenever source priority or scraping behavior changes.
- Consider a database only after the project needs moderation, user accounts, saved events, notifications, or detailed change history.

## 2026-06-08 Continuation State

Later work expanded the static site beyond the original scraper/calendar:

- Added `venues.html` as a venue and organization guide for Abyss, EXIT, Heim, POTENT, Reactor, Space Panda, ALTER, Dirty House / INS, ILLUM / KNOT, Wigwam, System, VOID / VACUUM, and related crews.
- Added `djs.html` and `data/dj-data.js` as a DJ database generated from the event lineups and paired back to calendar events.
- Calendar event cards now include organizer/promoter context under each event name.
- Calendar month cells show event title plus organizer.
- Calendar default view now focuses on future events. Past events are hidden on first load but remain accessible through `Past archive`, `All Dates`, and direct `?event=...` links.
- Calendar grids hide empty Monday-Thursday columns when those weekdays have no visible events in the current filtered month.
- Visible calendar columns now expand across the available horizontal space, so fewer visible weekday columns produce wider cells on desktop while still fitting mobile.
- Event modals include organizer facts, source count, last checked, source layer, DJ set times, DJ notes, details/tickets links, profile links, and individual `.ics` export.
- The calendar supports Tonight, This Weekend, Next 30 Days, Newly Added, venue/promoter filters, status filters, vibe filters, and filtered `.ics` export.
- `planner.html` now handles set-time planning as a standalone page. It estimates missing parseable DJ slots from event windows and lineup order, clearly marks estimated slots, lets users select itinerary rows, persists selected slots in `localStorage`, and exports selected itinerary `.ics` or PNG images.
- `ops.html` adds the requested operator workflow: AI scrape intake, human review, WeChat/Xiaohongshu publishing copy, ticket-route overrides, promoter paid-exposure package tracking, and data report exports.
- The DJ database now includes estimated set-time status, estimated-slot filtering, and profile counts for exact versus estimated slots.
- The calendar hero no longer presents a top-level `RA + SmartShanghai + official/ticket pages` source pill. It retains `Asia/Shanghai dates`, generated visual-poster labeling, Shanghai Bund CC0 hero-photo attribution, the venue and crew guide link, and the DJ database link.
- `venues.html` and `djs.html` include an explicit `Rave calendar` return link.
- `index.html` and `shanghai-rave-calendar-2026.html` link to `planner.html` instead of embedding the itinerary controls; `scripts/check.js` validates the planner page markers and navigation links.
- `index.html` and `shanghai-rave-calendar-2026.html` must keep their calendar inline scripts identical; `scripts/check.js` enforces this.

Current public URLs:

- Production site: https://raveindexsh.top
- Set-time planner: https://raveindexsh.top/planner
- DJ database: https://raveindexsh.top/djs
- Example event deep link: https://raveindexsh.top/?event=nosaj-thing
- Example DJ deep link: https://raveindexsh.top/djs#dj-ebp

GitHub state:

- Repository: https://github.com/silverlion2/shanghai-rave-calendar-2026
- Visibility: public
- Default branch: `main`
- Remote: `origin` -> `https://github.com/silverlion2/shanghai-rave-calendar-2026.git`
- Latest pushed commit: `1cec13a Refresh curated event data`.
- Previous feature push was titled `Add ops console and Computer Use queue`.
- Current local worktree after that push is clean except for untracked `SOCIAL_MEDIA_ACQUISITION_PLAN.md`, which was intentionally not included because it is an unrelated, encoding-corrupted acquisition-plan draft.
- Recent calendar UI commits:
  - `1cec13a Refresh curated event data`
  - `a303c56 Add ops console and Computer Use queue`
  - `b5fefdd Refine calendar navigation and itinerary planning`
  - `ee2c89a Move set-time planner to standalone page`
  - `b418477 Add project memory`
  - `f30578b Focus calendar on future events`
  - `bf0b3a7 Expand calendar cells across available width`
- `gh` is authenticated as `silverlion2`.
- `gh` token scopes include `gist`, `read:org`, `repo`, and `workflow`.

Vercel state:

- Vercel project: `shanghai-rave-calendar-2026`
- Project id: `prj_vamHKrFWPi1nVbKySJ8OMLzpcFz9`
- Org/team id: `team_lVP5FlXsXbdDa5xi390SN7Ph`
- Stable alias: https://raveindexsh.top
- Git connection command completed successfully:

```bash
vercel git connect https://github.com/silverlion2/shanghai-rave-calendar-2026.git
```

Recent verification:

- `npm run check` passed after adding organizer display.
- Local browser check confirmed organizer text in month cells, event cards, and modal facts.
- `npm run check` passed after hiding past events by default, hiding empty weekday columns, and widening available calendar cells.
- Browser checks confirmed default `Future` filter, no past cards on load, archive/deep-link access for past events, compressed Thu-Sun June grid, desktop cells expanding to available width, and no mobile horizontal overflow at 390px.
- `npm run check` passed after adding estimated set-time planning, itinerary export validation, hero source-label cleanup, archive itinerary parity, and `Rave calendar` return links.
- `npm run check` passed after moving the set-time planner to standalone `planner.html`; local HTTP and DOM smoke checks confirmed the planner page returned 200 and rendered exact plus estimated rows from real data.
- Local browser verification on `http://127.0.0.1:4879` confirmed the hero pills, retained guide links, venue/DJ return navigation, and no console errors. The temporary server was stopped after verification.
- `npm run scrape` and `npm run check` passed after adding the 2026-06-08 browser/Computer Use curated refresh. Local Playwright verification on `http://localhost:4177` confirmed FRUITYGROOVE deep-link modal details and Sunset Sundays watch-card rendering; the temporary server was stopped after verification.
- Commit `1cec13a Refresh curated event data` was pushed to `origin/main` after staging the curated event refresh, generated data, scraper/check updates, and related website/documentation changes.
- Vercel production was redeployed after the organizer update.
- GitHub repo was created, all project files were committed, and `main` was pushed.

## 2026-06-11 DJ Entity Audit Refresh

The user asked to update the automatic review mechanism for DJs, organizers, and venues because some organizers/venues were appearing in the DJ database.

Implemented changes:

- `scripts/scrape-events.js` now audits performer entities before writing generated data. It filters placeholder entries such as `9 DJs TBA`, `Multi-floor DJs TBA`, and `DJ music TBA`, venue aliases such as `Abyss`, `Specters`, and `Wigwam`, and obvious organizer/crew/stage/room context names unless the item has explicit performer evidence.
- `scripts/scrape-events.js` now rewrites `data/dj-data.js` alongside `data/events.json`, so the DJ fallback data stays in sync with every scrape.
- `djs.html` has a runtime defensive filter for the same DJ/organizer/venue classification problem, so stale or externally loaded data cannot easily create venue/organizer profiles.
- `scripts/check.js` validates both `data/events.json` and `data/dj-data.js` to block non-performer lineup entries from returning.
- `.github/workflows/scrape-events.yml` now commits both generated files: `data/events.json` and `data/dj-data.js`.

Refresh and verification:

- `npm run scrape` completed on 2026-06-11 and wrote 61 events, 11 discovered links, 0 social leads, 8 Computer Use sources, and 12 curated updates.
- Generated data reports 29 current `upcoming` or `watch` events, `verified: 2026-06-11`, and 61 DJ fallback events.
- `npm run check` passed after the new entity-audit validation.
- Data spot checks confirmed the generated event lineups no longer contain the known placeholder, venue, or organizer names that previously polluted the DJ layer. Remaining keyword matches such as `Linear System` and `LOMOROOM` are legitimate artist names.

Local preview:

- `http://localhost:4881/djs.html` returned HTTP content successfully from a local `serve` process.
- The in-app Browser plugin blocked localhost/file navigation with client policy, so final UI verification used local HTTP and generated-data checks instead of Browser DOM inspection.

Working tree caution:

- Separate uncommitted/untracked tracker/acquisition-plan files existed during this work (`README.md`, `SOURCE_LOG.md`, `SOCIAL_MEDIA_ACQUISITION_PLAN.md`, and `data/tracked-dj-itineraries.js`). Do not assume those belong to the DJ entity-audit refresh unless explicitly requested.

## 2026-06-11 DJ Itinerary Tracking and Scrape Integration

The user clarified that profile tracking should cover all DJs in the current system, not only a single DJ. The DJ database now gives every generated profile a past/future itinerary surface:

- `djs.html` renders a `Past / future itinerary` panel for every DJ profile.
- Calendar-derived itinerary rows are built from each DJ's current Shanghai Rave Index appearances, so every profile has at least one itinerary row.
- `data/tracked-dj-itineraries.js` is the worldwide overlay file. It preserves curated global rows such as Anyma and now also receives source-backed generated rows from event `futureTourPlan` fields.
- `scripts/scrape-events.js` writes `data/events.json`, `data/dj-data.js`, and `data/tracked-dj-itineraries.js` during `npm run scrape`.
- `data/events.json.djItineraryStats` records the generated itinerary overlay stats.
- `.github/workflows/scrape-events.yml` now commits `data/tracked-dj-itineraries.js` with the other generated data.
- `scripts/check.js` validates the DJ itinerary UI markers, overlay schema, scrape writer markers, workflow commit target, and `djItineraryStats`.

Refresh and verification:

- `npm run scrape` completed on 2026-06-11 and wrote 63 events, 18 discovered links, 0 social leads, 8 Computer Use sources, 12 curated updates, and 40 tracked DJ itinerary rows.
- `npm run check` passed after the itinerary scrape integration.
- Render audit confirmed 135 DJ profiles, all with itinerary rows; 68 profiles had future/watch itinerary dates; 2 profiles had worldwide overlays.
- Anyma retained 38 curated worldwide rows. NJELIC gained 2 source-backed worldwide rows from `futureTourPlan`, including Guangzhou and Shanghai.

Source rule:

- Do not fabricate worldwide tour rows. The all-DJ itinerary uses confirmed calendar appearances by default, and worldwide overlay rows require official, ticketing, venue/promoter, SmartShanghai/RA, Songkick/Bandsintown, or similarly high-signal sourced data.

## 2026-06-11 World-Class UI/UX Upgrade and Push

The user asked to upgrade the website UI/UX, content, and storyline until it could reasonably be regarded as a high-quality, user-friendly website. The work was turned into an explicit Codex goal and completed.

Implemented site-wide UI/UX changes:

- `index.html` and `shanghai-rave-calendar-2026.html` remain mirrored and now use a clearer public calendar narrative, primary navigation, trust notes, main CTAs, planning shortcut cards, labeled filters, and a live result summary.
- `planner.html` now has consistent five-page navigation, stronger route-builder copy, labeled filters, and a live slot summary showing total, exact, estimated, and date-window state.
- `venues.html` now has consistent five-page navigation, stronger venue decision copy, labeled filters, a live venue/crew summary, and one visible punctuation/encoding cleanup in the crew section.
- `djs.html` now has consistent five-page navigation, stronger performer-discovery copy, labeled filters, a live profile summary, and tighter mobile navigation.
- `ops.html` now has consistent five-page navigation, an operator workflow strip, labeled queue filters, and tighter mobile navigation while preserving the static local-storage/export workflow.

Verification:

- `npm run check` passed after the cross-page UI/UX changes.
- Browser checks on `http://127.0.0.1:4173/` covered `index.html`, `planner.html`, `venues.html`, `djs.html`, and `ops.html`.
- Desktop and 390px mobile checks confirmed shared navigation, live summaries, no console errors, and no horizontal overflow.
- Additional visual spot checks confirmed the planner desktop layout and DJ mobile layout were coherent after the nav tightening.

Git state:

- Branch created and pushed: `codex/world-class-ui-ux`.
- Commit pushed: `fe195b4 Upgrade website UI and UX`.
- Remote: `origin` at `https://github.com/silverlion2/shanghai-rave-calendar-2026.git`.
- PR creation URL: `https://github.com/silverlion2/shanghai-rave-calendar-2026/pull/new/codex/world-class-ui-ux`.
- `SOCIAL_MEDIA_ACQUISITION_PLAN.md` remained untracked and was intentionally not staged or pushed with the UI/UX commit.

## 2026-06-11 Card Masonry Layouts and Push

The user asked for event and venue cards to size naturally based on content, with lower cards filling vertical gaps instead of forcing three equal-height cards in one row.

Implemented layout changes:

- `index.html` and `shanghai-rave-calendar-2026.html` now use masonry-style event card layout. Event cards no longer have a fixed minimum height; a lightweight `grid-auto-rows` + measured `gridRowEnd` pass lets shorter cards leave less empty space while preserving responsive 3/2/1 column behavior.
- `venues.html` applies the same masonry behavior to venue cards and crew cards. Empty states span the full grid width.
- `djs.html` applies the same behavior to the DJ roster cards without changing the directory, profile detail panel, planner rows, or operational form/list layouts.
- `ops.html` and `planner.html` were inspected and intentionally left unchanged because their fixed-height elements are primarily forms, facts, and row lists rather than variable content card grids.

Verification:

- Browser checks covered desktop and 390px mobile for `index.html`, `venues.html`, and `djs.html`.
- Confirmed 3-column desktop masonry behavior where card top positions stagger by shortest available column.
- Confirmed single-column mobile behavior with no horizontal overflow.
- Confirmed no browser console errors in the checked pages.
- Ran JavaScript syntax checks with `node --check scripts/check.js` and `node --check scripts/scrape-events.js`.
- `git diff --check` passed for the touched HTML files.

Git state:

- Branch created and pushed: `codex/card-masonry-layouts`.
- Commit pushed: `bc27a6d Add masonry card layouts`.
- Remote: `origin` at `https://github.com/silverlion2/shanghai-rave-calendar-2026.git`.
- Only `index.html`, `shanghai-rave-calendar-2026.html`, `venues.html`, and `djs.html` were staged and committed for this push.
- Existing uncommitted memory/planning/poster files were intentionally left out of the commit.

## 2026-06-11 Poster Rendering Assets Fix and Main Push

The user reported that event posters looked pitch black after the poster/card update, and explicitly said poster downloads via Chrome or computer use were acceptable.

Root cause and fix:

- Several events had `posterEvidence` but no local `posterUrl`, so they fell back to the site's dark generated default card instead of a real flyer.
- Direct `images.ra.co` URLs are unreliable in-browser because they can be blocked, so real flyers should be downloaded into `assets/posters/` and referenced locally.
- Early screenshots also exposed a loading-state problem: lazy-loaded real poster cards could briefly show a pure black background. Real poster cards now use eager loading and a muted non-black loading background.
- `index.html` and `shanghai-rave-calendar-2026.html` now let real poster images render at natural full height instead of forcing a cropped poster frame. Default generated cards remain only for events with no poster.
- Added local poster assets for `kollin`, `horizon`, `nosaj-thing`, `santa-k`, `synth-crush`, `alter-pavillon`, `photocult-mask-desire-auction`, `mrd`, and `dark-room`.
- Added matching `posterUrl` fields in `config/curated-events.json` and `data/events.json`, and matching `posterUrlOverrides` in both mirrored HTML pages.

Verification:

- `npm run check` passed.
- A Node data check confirmed all 18 `posterEvidence` events have existing local poster files.
- Playwright screenshot verification on `http://localhost:4173/index.html#month-Jun` confirmed Milo/Fengyun/Horizon/KOLLIN and nearby cards render real posters without black blocks or overlapping cards.
- Temporary screenshot artifacts under `output/` were removed before commit.

Git state:

- Commit pushed to `origin/main`: `178b942 Fix poster rendering assets`.
- Previous main commit was `c9fbbe1 Show event posters and venue-first calendar labels`.
- `PROJECT_MEMORY.md` remained locally modified for memory updates.
- `SOCIAL_MEDIA_ACQUISITION_PLAN.md` remained untracked and should not be staged unless explicitly requested.

## 2026-06-11 Scraping Routine Poster Handoff Update

The user asked to update the corresponding daily scraping routine based on the poster-blackout conversation.

Routine change:

- Any event with `posterEvidence` must also have a valid downloaded local `posterUrl` under `assets/posters/`.
- Do not use remote `images.ra.co` URLs in the public UI; RA-hosted images can be blocked or load inconsistently.
- Chrome/Computer Use collection should capture the poster source, OCR/image-only details, and download the actual flyer locally.
- `README.md` and `SOURCE_LOG.md` now document this as part of the daily scrape / Computer Use handoff.
- `scripts/scrape-events.js` Computer Use checklist now explicitly asks for a downloaded local poster asset when `posterEvidence` exists.
- `scripts/check.js` and `scripts/audit-events.js` now validate that `posterEvidence` implies a valid local JPEG/PNG/WebP poster file.

Current poster data cleanup:

- Added local poster assets for newly collected poster-evidence events: `cltx-abyss`, `the-woods`, and `cyber-buddha`.
- Updated `config/curated-events.json` and `data/events.json` with matching local `posterUrl` paths.

Working tree caution:

- This update is layered on top of existing uncommitted scrape/audit/data changes, including `scripts/audit-events.js` and package `audit` wiring.
- `SOCIAL_MEDIA_ACQUISITION_PLAN.md` remains unrelated unless the user explicitly asks to include it.

## 2026-06-11 DJ Profile Source-Coverage Upgrade

The user asked to make the best Shanghai techno venue/DJ database an ongoing goal.

Database-quality change:

- Added a durable `quality.djCoverage.sourceUpgradeQueue` for future performers who appear in single-source future event rows but still lack profile-level sources.
- Normalized performer profile keys across scraper and audit so format suffixes like `[Live]` do not split source coverage.
- Added alias-aware profile-source counting so variants like `TiyaManson` and `Tiya Manson` are covered by one curated source profile.
- Expanded `config/tracked-dj-profiles.json` from 4 to 12 curated source profiles, adding D_z, DISCIPLINE, Altieri3000, Velvet Robot, Hello Shitty, Ruima, Illsee, and Tiya Manson.
- Regenerated `data/events.json` and `data/tracked-dj-itineraries.js`.

Verification:

- `npm run scrape` completed on 2026-06-11 and wrote 63 events, 11 discovered links, 0 social leads, 8 Computer Use sources, 31 curated updates, and 40 tracked DJ itinerary rows.
- `npm run audit` passed with 14 tracked DJ profiles, 12 curated source profiles, 14 future performer profiles with source coverage, and 41 remaining DJ source-upgrade targets.
- `npm run check` passed.

Remaining database gaps:

- The highest-priority source-upgrade queue still includes Cosmjn, D3M3NTOR, howtodo, Josie, LaGlory, Limsum, Marcus, Matisa, Max Shen, MegaWatts, Milo Raad, Santa K, and other single-source future performers.
- Keep using RA, SmartShanghai, LocalHub, venue/promoter channels, artist pages, radio/label pages, and ticketing pages before promoting a performer profile as high-confidence.

## 2026-06-12 Basement Dispatch Product Redesign

The user asked to use the Product Design plugin direction and redesign the website into a gritty underground club guide, matching a provided black poster-wall / Shanghai Rave Index reference image. The chosen public-facing name in the visual system is `Basement Dispatch`.

Implemented visual and interaction changes:

- `index.html` and `shanghai-rave-calendar-2026.html` were redesigned around a black, distressed, poster-wall editorial style with cyan/yellow/red accents, condensed type, thin rule lines, and rough paper labels.
- The home page now opens as an actual calendar/product interface, not a landing page. It keeps upcoming highlights, search, status/vibe filters, month controls, calendar grid, side dispatch lists, and a bottom dispatch bar.
- The old hero source chips (`RA + SmartShanghai`, `Asia/Shanghai dates`, `Official artist pages`, `Generated visual posters`, and related watchlist copy) were removed after the user said they had no meaning for new users.
- The rolling event cards at the bottom of the home page were changed to poster-image-only cards.
- `poster-wall.html` was added as the full waterfall poster/event page, preserving the previous complete masonry-style card content while the home page bottom strip stays image-only.
- A visible bottom dispatch/status bar was added to match the reference: update window, daily listing note, contact/update info, source-first note, and the `Ops desk` link.
- `Ops` was moved out of the top navigation on the calendar/home surface and into the bottom dispatch bar.
- A four-row statistics panel was added directly above the bottom bar with `63`, `31`, `28`, and `6` summary counts.
- Event modals on the calendar and poster wall now include visible back buttons (`Back to calendar` / `Back to wall`) so new users are not forced to discover that clicking outside the modal closes it.

Verification and git state:

- `npm run check` passed after the footer interactions and modal-return changes.
- Browser/CDP checks confirmed the bottom stats panel, modal back buttons, `Ops` bottom-bar link, removed top-nav `Ops` on the calendar page, and no obvious layout overflow.
- Feature branch pushed: `codex/basement-dispatch-redesign`.
- PR #1 was merged into `main` for the larger redesign.
- Latest remote `main` push: `6f65986 Refine calendar footer interactions`.
- Current checked-out branch remains `codex/basement-dispatch-redesign` at `b6c314c`; `origin/main` points to the cherry-picked main commit `6f65986`.
- Uncommitted local files after the main push include `PROJECT_MEMORY.md`, `ops.html`, `planner.html`, `poster-wall.html`, `robots.txt`, `scripts/check.js`, `sitemap.xml`, and untracked `assets/social/`. Do not assume those belong to the redesign unless the user explicitly asks to include or push them.

## 2026-06-12 World-Class SEO Event Pages

The user asked to further improve SEO so the website behaves like a world-class site, then asked to push the result to `main`.

SEO implementation:

- Added a generated static event inventory under `events/`: `events/index.html` plus one detail page for each of the 63 records in `data/events.json`.
- `scripts/generate-seo-pages.js` now generates the event pages and `sitemap.xml` from the event data.
- `package.json` adds `npm run seo`; `npm run scrape` now runs the scraper and then regenerates SEO pages.
- `.github/workflows/scrape-events.yml` now commits `events/` and `sitemap.xml` when refreshed event data changes.
- Public event pages use clean canonical URLs such as `https://raveindexsh.top/events/love-bang`.
- Confirmed/non-watch events expose `MusicEvent`, `WebPage`, `WebSite`, and `BreadcrumbList` JSON-LD.
- Watchlist leads still get generated user-facing pages, but they use `noindex,follow`, do not emit `MusicEvent` JSON-LD, and are excluded from `sitemap.xml`.
- `sitemap.xml` now includes 55 URLs: 6 public route URLs and 49 indexable event pages.
- The public nav and event modal actions now link into the crawlable event inventory from `index.html`, `shanghai-rave-calendar-2026.html`, `poster-wall.html`, `venues.html`, `planner.html`, `djs.html`, and `ops.html`.
- `poster-wall.html` also received clean `/poster-wall` canonical/OG URLs, OG image alt text, and CollectionPage JSON-LD.
- `ops.html` received manifest, OG URL/image metadata, and fuller WebApplication JSON-LD while remaining `noindex,nofollow`.
- `planner.html` had its missing doctype restored.
- `robots.txt` points crawlers at `https://raveindexsh.top/sitemap.xml`.

Validation:

- `npm run seo` generated 64 HTML files under `events/`.
- `npm run check` passed after the SEO generator and validation changes.
- Local HTTP smoke test on `http://127.0.0.1:4174` returned `200` for `/events`, `/events/love-bang`, `/events/system-popup`, `/sitemap.xml`, and `/robots.txt`.
- Confirmed event page `/events/love-bang` was indexable with clean canonical metadata.
- Watchlist page `/events/system-popup` returned `noindex,follow` with clean canonical metadata.

Git/push state:

- Local SEO commit on current branch: `060243c Add static SEO event pages`.
- Because the checked-out branch was not a descendant of `origin/main`, the commit was cherry-picked onto a clean temporary worktree based on `origin/main`.
- Pushed to `origin/main`: `0b1b0f2 Add static SEO event pages`.
- Remote `main` now points to `0b1b0f2`.
- Temporary worktree and temporary local branch `codex/push-seo-main` were removed after the push.
- Current workspace branch remains `codex/basement-dispatch-redesign`, ahead of its remote by the local SEO commit.
- Remaining uncommitted local items after the push: `PROJECT_MEMORY.md` and untracked `assets/social/`.

## 2026-06-13 Mobile Display Optimization

The user asked to optimize the mobile display, then asked to push the result to `main`.

Implementation:

- Mobile changes were intentionally scoped to `assets/basement-dispatch.css`.
- Removed the narrow 342px cap from major mobile sections and kept a steadier phone gutter with `calc(100vw - 32px)`.
- Added a `max-width: 640px` calendar-specific mobile layer for the homepage/calendar surface.
- Tightened the top navigation, hero typography, dispatch strip, hero actions, and hero image height so the first screen is less vertically wasteful.
- Changed the stats panel to a compact two-column phone grid.
- Converted the upcoming highlights into a horizontal swipe rail with full-width readable event cards instead of narrow six-column slivers.
- Made quick filters and the month rail horizontally scrollable controls with thin cyan scrollbars.
- Made the filter controls denser with a two-column layout while keeping search and room/crew full width.
- Kept desktop layout untouched by placing the changes behind mobile breakpoints.

Verification:

- `npm run check` passed before pushing and again after rebasing onto latest `origin/main`.
- In-app browser verification at 390 x 900 confirmed no page-level horizontal overflow; final `documentElement.scrollWidth` and `body.scrollWidth` were both 375 in the browser environment.
- Mobile layout measurements improved: the shell widened from 342px to 358px, stats compressed from 411px to 248px, controls compressed from 585px to about 360px, and month navigation compressed from 193px to 55px.
- Visual mobile screenshots confirmed the highlight cards, date-night route, controls, and month rail render coherently.

Git/push state:

- Local commit before rebase: `3f8bb97 Optimize mobile calendar layout`.
- After rebasing onto `origin/main`, pushed commit: `a88f443 Optimize mobile calendar layout`.
- `origin/main` now points to `a88f443`.
- Current branch is `main`, matching `origin/main` for committed changes.
- Only `assets/basement-dispatch.css` was staged, committed, and pushed.
- Existing local uncommitted items remain outside the pushed mobile fix: `PROJECT_MEMORY.md`, `djs.html`, `index.html`, `ops.html`, `planner.html`, `poster-wall.html`, `scripts/check.js`, `shanghai-rave-calendar-2026.html`, `venues.html`, and untracked `assets/social/`.
- This entry supersedes older memory lines that described the current workspace branch as `codex/basement-dispatch-redesign`; after the mobile push, the active branch is `main`.

## 2026-06-13 Google Analytics Tracking

The user asked to enable Google tracking for the website and connect it to their Google Analytics account.

Analytics account details used:

- Account/property group shown in Google Analytics: `Rave_index_SH | 397848866`.
- GA4 property selected by the user: `Rave Index SH | 541501114`.
- Web data stream: `Shanghai Rave Index`.
- Stream URL: `https://www.raveindexsh.top`.
- Stream ID: `15064526912`.
- Measurement ID installed on the site: `G-HP6NQ3VZB9`.

Implementation:

- Added the Google tag (`gtag.js`) with `G-HP6NQ3VZB9` to `index.html`, `shanghai-rave-calendar-2026.html`, `venues.html`, `djs.html`, `planner.html`, `poster-wall.html`, and `ops.html`.
- Updated `scripts/generate-seo-pages.js` with `GOOGLE_TAG_ID = "G-HP6NQ3VZB9"` so generated event SEO pages include the same Google tag.
- Regenerated `events/index.html` and all 63 event detail pages so crawlable event pages are tracked too.
- Updated `scripts/check.js` to enforce that all static route pages and generated event pages include the Google tag loader and matching `gtag("config", "G-HP6NQ3VZB9")`.
- Because adding an extra inline analytics script changes the inline-script ordering, `scripts/check.js` now compares the last inline calendar script between `index.html` and `shanghai-rave-calendar-2026.html` for parity.

Verification:

- First red check failed as expected while pages still used `G-XXXXXXXXXX`.
- After replacing the placeholder and updating the SEO generator, `npm run seo` regenerated 63 event SEO pages and `sitemap.xml`.
- Final `npm run check` passed with `inline scripts syntax OK: 14 scripts across 7 HTML files`.
- `rg` confirmed there is no remaining `G-XXXXXXXXXX` in HTML or tracking scripts.
- `git diff --check` reported no whitespace errors, only Windows line-ending warnings.

Notes:

- Google Analytics initially showed `No data received in past 48 hours` for the stream. That is expected until the updated site is deployed and real traffic loads pages containing `G-HP6NQ3VZB9`.
- Earlier browser attempts were blocked because the regular Chrome profile returned `ERR_BLOCKED_BY_CLIENT` for `https://apis.google.com/js/client.js`; later the Analytics UI loaded enough to open the stream details and read the Measurement ID.

## 2026-06-13 Main Format Sync, Wall Consolidation, and New Rave Surfaces

The user asked to sync the other pages with the homepage visual format, treat Events and Wall as the same surface while keeping only Wall, move the horizontal homepage statistics strip directly above the bottom bar without changing its formatting, then push everything to `main` and save the work to project history.

Implementation:

- Secondary pages now share the Basement Dispatch visual language more consistently through `dispatch-shell`, shared bottom bars, and synchronized navigation.
- The duplicate `events/index.html` collection page was removed; event inventory entry points now route users to `poster-wall.html`, and `vercel.json` redirects `/events` and `/events/` to `/poster-wall`.
- Navigation now includes the consolidated Wall flow plus the newer `Love`, `Archive`, and `Everywhere` surfaces where relevant.
- Added `love-wall.html`, `poster-archive.html`, `rave-everywhere.html`, poster archive data, the poster archive generator, and supporting frontend scripts.
- `scripts/generate-seo-pages.js` now emits generated event detail pages with the shared dispatch page format and without recreating the duplicate Events index.
- The homepage and archive calendar horizontal statistics strip was moved from the top area to immediately above `bottom-dispatch-bar`; the highlight wall now occupies the former top slot, and mobile stats formatting remains the existing two-column compact layout.
- `scripts/check.js` now validates the shared dispatch format, Google tracking, absence of duplicate Events index links, Rave Everywhere route markers, poster archive support, and homepage stats placement.

Verification:

- `npm run check` passed with `inline scripts syntax OK: 19 scripts across 10 HTML files`.
- Browser verification on `http://127.0.0.1:4173/index.html` confirmed the moved stats strip is full-width above the footer on desktop, the highlight wall moved up, and the 390px mobile layout keeps the two-column stats format with no horizontal overflow.

## 2026-06-13 DJ Direct Listening Links

The user asked for a DJ song trial listening feature, then chose the easiest implementation: separate links to individual audio files or set pages instead of generated preview audio.

Implementation:

- Added `assets/dj-trial-listen.js` as a links-only listening helper for DJ profiles.
- `djs.html` now renders a `Direct listening links` panel on each profile, showing explicit `audioLinks` / `listenLinks` and source-backed radio, set, or audio links first.
- The same panel keeps SoundCloud, YouTube, and Bandcamp search fallbacks for DJs that do not yet have pinned individual listening links.
- The PASHRAWBOI profile surfaces the byyb.radio set link directly from tracked source data.
- `scripts/check.js` now validates the DJ listening helper, requires the direct-link panel, and rejects the old synthetic preview/Web Audio path.

Verification:

- `npm run check` passed after the links-only DJ listening changes.
- Browser verification on `http://127.0.0.1:4174/djs.html#pashrawboi` confirmed the direct byyb.radio link appears before search links, the preview button is gone, and mobile layout has no page-level horizontal overflow.

## 2026-06-13 Shanghai Techno Venue/DJ Database Goal

The user explicitly asked to save the Shanghai techno venue and DJ database goal to project memory.

Ongoing goal:

- Maintain the best available Shanghai techno/rave database across venues, events, DJs, source links, confidence levels, and refresh workflow.
- Treat the database as living source intelligence rather than a completed one-off scrape.
- Prioritize fresh verification from RA, SmartShanghai, LocalHub, venue/promoter channels, ticketing pages, artist/radio/label pages, and credible public social sources.
- Keep unresolved items visible through `quality.watchQueue`, `quality.venueCoverage`, `quality.djCoverage.futureProfiles`, and `quality.djCoverage.sourceUpgradeQueue`.

Last validated database snapshot from the 2026-06-11 refresh:

- 63 total events, 31 future events, 15 future high-confidence events, and 14 future watch events.
- 29 venue profiles, 20 future venue profiles, and 13 future venue watch profiles.
- 14 tracked DJ profiles, 12 curated DJ source profiles, and 40 tracked DJ itinerary rows.
- 14 future performer profiles have profile-source coverage; 41 future performer source-upgrade targets remain.

Important implementation notes:

- `scripts/scrape-events.js` and `scripts/audit-events.js` use a shared performer-profile key strategy that strips format suffixes like `[Live]` and supports alias-aware profile-source coverage.
- `config/tracked-dj-profiles.json` is the durable curated source layer for DJ profile evidence.
- The next database improvement pass should work down `quality.djCoverage.sourceUpgradeQueue`, starting with high-fit single-source future performers such as Cosmjn, D3M3NTOR, howtodo, Josie, LaGlory, Limsum, Marcus, Matisa, Max Shen, MegaWatts, Milo Raad, and Santa K.

## 2026-06-13 Static vs Dynamic Site Decision Note

The user asked about the difference between a static site and a dynamic site.

Decision context for this project:

- The current `rave calendar` / `Basement Dispatch` site remains a static site for v1: HTML, CSS, JavaScript, generated JSON, generated SEO pages, local assets, GitHub/Vercel deployment, and no runtime database requirement.
- Static is still the right default while the main product is a public event/venue/DJ guide with scrape-generated data, crawlable event pages, and mostly read-only user flows.
- Dynamic/database-backed architecture becomes relevant only when the product needs durable multi-user features such as login, saved events, moderation queues, backend publishing, real-time content updates, notifications, payments, or analytics beyond third-party tracking.
- For now, keep using the GitHub-only workflow: scrape/generate data, validate with `npm run check`, commit generated files, and deploy the static output.

## 2026-06-13 Web-First Supabase Backend

The user decided to focus on the web product first, defer mini-program work, connect Supabase, push to `main`, and save the decision in project history.

Implemented state:

- `main` is aligned with `origin/main` at `6af7449` (`Install Supabase backend and refresh site`).
- The static web product now has Supabase backend scaffolding for durable data and Love Wall submissions while preserving static HTML deployment.
- `assets/love-wall-supabase-config.js` enables the Love Wall client against the Supabase project with the public anon key only.
- `supabase/migrations/202606130001_full_backend_schema.sql` defines the full backend schema; `supabase/love-wall.sql` documents the focused Love Wall table/RLS path.
- `supabase/README.md` documents environment variables and the install sequence: `npm run supabase:migrate`, `npm run supabase:import`, and `npm run supabase:configure-client`.
- Public Love Wall submissions insert as `pending`; public reads return only approved posts through RLS. Moderation/admin operations must use server-side credentials or the Supabase dashboard.
- Mini-program/CloudBase work is intentionally deferred until the web funnel and community interaction model are clearer.

## 2026-06-13 Database Deployment and Performance Repeatability

The user confirmed that the database has already been deployed. Future agents should treat the Supabase backend as an active deployed part of the web product, while still preserving the static-first public site architecture.

Database/product interpretation:

- Supabase is the durable backend layer for web-first community features such as Love Wall submissions, approval/moderation, and future saved/community workflows.
- Generated event, venue, DJ, SEO, and scrape-refresh surfaces remain static-file driven unless the user explicitly asks to migrate those inventories into Supabase.
- Do not repeat the old "no database exists/no backend" assumption. The correct current framing is static-first frontend plus deployed Supabase backend.
- A database should not be treated as the default fix for slow page load. For static pages, first optimize assets, caching, generated data size, and render behavior.

Performance-repeatability note:

- A reusable local Codex skill was created at `C:\Users\T480S\.codex\skills\static-site-performance-repeatability\SKILL.md`.
- Its helper script is `C:\Users\T480S\.codex\skills\static-site-performance-repeatability\scripts\optimize-posters.ps1`.
- The skill captures the poster optimization/cache-header workflow used on this project: measure large assets, generate `*-optimized.jpg` derivatives without deleting originals, remove static-data `cache: "no-store"` fetches where appropriate, add bounded Vercel cache headers, lazy-load repeated poster/card images, and verify with `npm run check` plus browser smoke tests.
- Future new poster assets should rerun that helper or an equivalent project script, then wire new optimized paths into the rendering layer before deployment.

## 2026-06-13 Poster Compression Readability Review

The user asked to compare optimized poster readability against original poster assets and save the conclusion to project history.

Review scope:

- Compared all 15 `assets/posters/*-optimized.jpg` files against their original `.jpg` / `.png` source files.
- Generated temporary local comparison sheets:
  - `C:\Users\T480S\AppData\Local\Temp\poster-readability-full.png`
  - `C:\Users\T480S\AppData\Local\Temp\poster-readability-bottom-crops.png`
  - `C:\Users\T480S\AppData\Local\Temp\poster-readability-text-heavy.png`
- Did not copy those diagnostic PNGs into the project because they are large temporary QA artifacts and would work against the free-tier/static-asset budget.

Measured result:

- The optimized poster set keeps the same pixel dimensions as the originals; it changes encoding/quality rather than resizing.
- Combined source size for optimized-pair originals: about 16.61 MB.
- Combined optimized display payload: about 3.68 MB.
- Individual reductions ranged from about 34% to 92%.
- Highest compression cases were `alter-pavillon`, `photocult-mask-desire-auction`, `mrd`, `santa-k`, `matisa-limsum`, `cltx-abyss`, `milo-cosmjn`, and `cyber-buddha`.

Readability conclusion:

- Current optimized images are appropriate for the poster wall and poster archive browsing surfaces.
- Main poster information such as title, date, venue, artist names, and strong visual identity remains readable in the optimized versions.
- Very small ticketing text, QR codes, fine texture, and tiny footer details remain the risky areas. In many cases those details were already marginal in the original when viewed at wall/card size.
- Text-heavy assets such as `fruitygroove-soul-navigator`, `kollin`, `horizon`, and `dark-room` remain readable after compression; their compression ratios are lower and visual damage is limited.
- High-frequency/dark/noisy assets such as `mrd` and `santa-k` show more JPEG noise, but still preserve the primary poster message.

Decision:

- Keep using optimized poster files as the default `thumbnail` / `display` assets for archive and wall UI.
- Do not default-load originals in browsing surfaces.
- If poster collection, provenance, QR scanning, or high-res download becomes a product feature, add a separate `Open original` / `High-res` link in the modal while keeping optimized images as the default page payload.

## 2026-06-13 Poster Compression and Supabase Upload Workflow

The user asked to compress the remaining posters, upload all poster metadata to Supabase, and make the workflow recallable as part of scraping.

Current workflow:

- Save raw downloaded poster files under `assets/posters/` and reference that raw local path in event data as `posterUrl`.
- Run `npm run posters:prepare` to generate `assets/posters/*-optimized.jpg` for every poster source and regenerate `data/poster-archive.json`.
- Run `npm run posters:upload` to prepare posters and then run `npm run supabase:import`.
- `npm run scrape` now runs the same poster preparation step after refreshing event data and SEO pages.
- `.github/workflows/scrape-events.yml` commits `assets/posters` alongside generated event data, poster archive metadata, generated event pages, and `sitemap.xml`.
- Supabase imports optimized poster display paths into both `poster_archive.image.display` / `image.thumbnail` and `events.poster_url`.

Future recall command:

```bash
npm run posters:upload
```

Result saved:

- `npm run posters:upload` was run successfully against the deployed Supabase project.
- Supabase verification confirmed `poster_archive` has 20/20 optimized display paths and `events.poster_url` has 20/20 optimized poster paths.
- Five small posters that previously used raw paths now have optimized files: `afrowave-takeover-la-burg`, `night-at-museum-90s-disco`, `nova-summer-splash-pool-party`, `nova-sunset-sessions-flair`, and `sunset-sundays-dome`.
- The poster workflow was committed and pushed to `main` in commit `1d7431c` (`Automate poster compression upload workflow`).
- `npm run check` passed after the workflow and upload changes.

## 2026-06-13 Love Wall Emoji Reaction System

The user asked to add an emoji system to the Love Wall, push it to `main`, and save the implementation state in project history.

Implemented state:

- Love Wall cards now render five fixed reaction options: fire, black heart, water drop, lightning, and moon.
- Local starter notes and pending browser notes persist reaction counts and per-browser "already reacted" state in `localStorage`.
- Approved Supabase Love Wall posts are ready to persist reactions in `love_wall_reactions` using anonymous insert and public read RLS.
- `supabase/migrations/202606130002_love_wall_reactions.sql` creates the reaction table, uniqueness guard, indexes, RLS policies, and grants.
- `supabase/love-wall.sql`, `assets/love-wall-supabase-config.js`, and `scripts/write-love-wall-config.js` now include the reaction table contract.

Operational notes:

- Live Supabase reaction sync still requires applying the new migration; this machine does not currently have `SUPABASE_DB_URL` or `DATABASE_URL` configured for `npm run supabase:migrate`.
- Full `npm run check` is currently blocked by unrelated account-system sitemap state for `/account`.
- Love Wall inline JavaScript checks passed, and browser smoke testing confirmed the emoji rail renders, click state updates, and desktop/mobile layouts do not overflow.

## 2026-06-13 Website Structure Tracking and Theme Unification

The user asked to refactor the website, establish website structure tracking, document the theme, and unify all pages with the front page theme.

Implemented state:

- `config/website-structure.json` is the canonical page/route/navigation registry for the static site.
- `docs/WEBSITE_STRUCTURE.md` documents tracked root pages, the legacy calendar mirror, generated event pages, sitemap rules, shared assets, and validation rules.
- `docs/WEBSITE_THEME.md` documents the Basement Dispatch theme: dark gritty grid background, sharp rectangular controls, `Barlow Condensed` display type, `IBM Plex Mono` body type, shared tokens, shell rules, component rules, and the new-page checklist.
- `scripts/site-structure.js`, `scripts/site-components.js`, and `scripts/check-site-structure.js` support shared SEO/head/nav/footer rendering and structure validation.
- `scripts/generate-seo-pages.js` uses the shared site component helpers for generated event detail pages.
- `assets/event-detail.css` was aligned with the front page theme tokens, typography, nav controls, event panels, and responsive event hero behavior.
- `rave-everywhere.html` had local theme-token drift corrected to match the front page.
- `account.html` is tracked as a public `dispatch-shell` page in the structure registry and structure docs.

Verification:

- Browser audit checked all 74 HTML pages against the front page at desktop `1440x1000` and mobile `390x844`; final result had `0` mismatches.
- The audit covered tracked root pages, `shanghai-rave-calendar-2026.html`, `account.html`, and all generated event detail pages.
- Mobile event-detail overflow was fixed by adding `min-width: 0`, responsive image constraints, and safe wrapping to the shared event detail stylesheet.
- `npm run check` passed after the final theme changes with 6 account-system tests passing, structure tracking OK, inline scripts OK, and event-audit warnings empty.

## 2026-06-13 Poster Wall and Archive Consolidation

The user noted that Wall and Archive duplicate the same purpose, and decided to keep `Wall` as the only public poster/event browsing surface.

Implemented state:

- `poster-wall.html` remains the public poster/event entry point.
- Public navigation no longer shows `Archive` on root pages or generated event detail pages.
- `config/website-structure.json` no longer tracks `poster-archive` as a public page, primary navigation item, shared script, or sitemap route.
- `sitemap.xml` no longer lists `/poster-archive`.
- `vercel.json` permanently redirects `/poster-archive` and `/poster-archive.html` to `/poster-wall`.
- `poster-archive.html` was reduced to a lightweight local fallback redirect page pointing to `poster-wall.html`, so old local links still land on Wall instead of a duplicate UI.
- `data/poster-archive.json` remains part of the poster compression and Supabase metadata workflow; only the public duplicate browsing page was removed.
- `docs/WEBSITE_STRUCTURE.md` now states that `poster-wall.html` is the single public poster/event browsing surface and that the legacy archive route redirects to Wall.
- `scripts/check.js` now rejects reintroduced `poster-archive.html` navigation links outside the legacy redirect page.

Verification:

- `npm run structure` passed with 9 tracked pages, 1 mirror, 8 static sitemap routes, and 1 generated collection.
- Browser smoke test confirmed `poster-wall` navigation contains Calendar, Wall, Love, Planner, Everywhere, Venues, DJs, and Account, with no Archive link.
- Browser smoke test confirmed `poster-wall` renders 31 event cards.
- Browser smoke test confirmed opening `poster-archive.html` lands on `poster-wall.html`.
- A static archive-consolidation check confirmed no public `poster-archive.html` navigation links remain and `/poster-archive` is absent from `sitemap.xml`.

Known unrelated state:

- Full `npm run check` is currently blocked by an existing incomplete China listening feature check: `rave-everywhere.html missing feature marker: Rave Everywhere China listening module`.
- That failure comes from pre-existing `assets/dj-trial-listen.js` / `scripts/check.js` work and is not caused by the Wall/Archive consolidation.

## 2026-06-13 RED / Xiaohongshu Contact Cleanup

The user asked to replace the fake public contact email with the real Xiaohongshu/RED contact surface and remove fake email content.

Implemented state:

- The shared Basement Dispatch footer now uses RED as the public contact channel with ID `980793145`.
- The uploaded Xiaohongshu contact card is stored at `assets/social/xhs-contact-card.jpg` and linked from the footer thumbnail.
- `config/website-structure.json` no longer exposes the old fake `contactEmail` field.
- Static root pages and generated event pages now render the RED contact card instead of the old email/IG footer copy.
- Visible fake email placeholders were removed from account and ops forms; they now use neutral placeholders.

Verification:

- Repo scan found no `info@shanghairaveindex.com`, `mailto:`, `contactEmail`, old `IG @shanghairaveindex`, or `example.com` email placeholders.
- Browser checks confirmed the footer contact cell fits on desktop and mobile, the QR thumbnail loads, and there is no horizontal overflow.
- `npm run check` passed after the cleanup.

## 2026-06-13 Supabase Realtime Rooms Beta

The user decided to try Supabase Realtime, implement Love Wall first, then add live rooms for each same-day event.

Implemented state:

- `assets/live-room-realtime.js` is the shared realtime/local fallback helper for Love Wall and event rooms.
- Love Wall has live dancer presence, safe metadata broadcasts, and a pulse feed.
- The calendar and archive pages expose a `Tonight live rooms` panel that opens one room per non-past event on the current selected day.
- Event rooms use canned, moderation-safe signals instead of free-text chat: `Inside`, `Heat`, `Queue`, `Set now`, `Water`, `Leaving`, and `After?`.
- Joined event rooms show an activity feed, `Details`, and `Copy room`; room links use `#live-room=<eventId>`.
- Visiting a page with a live-room hash auto-joins that event room.
- Supabase Realtime is optional: when unavailable or not configured, the UI remains usable in explicit local mode.

Verification:

- `npm run check` passed with 23 Node tests.
- Browser desktop smoke test confirmed 9 same-day rooms, join, signals, feed, event details modal, hash room links, and no console errors.
- Browser mobile smoke test at `390x844` confirmed no horizontal overflow and no room control layout offenders.

Implementation note:

- Manual room join now marks the hash as already handled before writing `#live-room=...`, preventing a duplicate auto-join cycle.

## 2026-06-13 Shanghai Festival Data Split

The user asked for Shanghai festival leads to be marked differently from normal one-night events because their structure can be multi-day and program-level rather than DJ/set-time based.

Implemented state:

- Festival/watch records now use `kind: "festival"` plus a structured `festival` metadata object.
- Festival program content lives in `programHighlights`, not `lineup`, so pop/city/festival program data does not create DJ profiles, DJ set-time rows, or planner slots.
- Added six festival/watch leads: Shanghai Tonight Night Festival, Shanghai Mushroom Music Carnival, SHENWAVE Music Festival, MISA Shanghai Summer Music Festival, Gate M West Bund Dream Center waterfront music festival, and The Magic of Tomorrowland Shanghai 2026 watch.
- The Magic of Tomorrowland Shanghai 2026 remains a watch lead: the city source says an October return at Hero Dome, but no official Tomorrowland 2026 Shanghai date, ticket page, or lineup was found on June 13, 2026.
- Calendar cards, calendar grid entries, modal facts, `.ics` descriptions, and generated event detail pages now render festival wording and program fields instead of DJ set-time language.
- Generated festival pages use `Festival Program`, festival facts, and no Live Room button.
- DJ source data excludes festival rows unless a future record explicitly sets `includeInDjCoverage: true`.
- `scripts/check.js` now validates festival structure and rejects accidental festival `lineup` use.

Verification:

- `node scripts/check.js` passed.
- `node scripts/check-site-structure.js` passed.
- Syntax checks passed for `scripts/scrape-events.js`, `scripts/generate-seo-pages.js`, `scripts/audit-events.js`, and `scripts/check.js`.
- Playwright render checks confirmed festival calendar markers and festival modal program rendering with no console errors.
- Focused data check confirmed 6 festival rows in `data/events.json`, all with program metadata, and 0 festival rows in `data/dj-data.js`.

Known state:

- `npm run audit` is still blocked by pre-existing stale `lastChecked: 2026-06-11` future rows and tracked DJ profile source freshness gaps relative to the current date, June 13, 2026.
- Do not fake-update those source dates without actually rechecking the source pages.

## 2026-06-13 Product Design Customer Flow Cleanup

The user asked for a Product Design pass focused on customer flow, making sure the website UI/UX does its job and does not puzzle customers.

Implemented state:

- Primary navigation now uses customer task labels: `Events` replaces public `Wall` wording, and `Tonight` replaces public `Live` wording.
- `live-room.html` is customer-facing as `Tonight Rooms`, with copy explaining that users can join same-day event rooms, copy a room link, or open the event page before going.
- `poster-wall.html` is customer-facing as `Events`, while still preserving the poster-backed browsing format and source-first card density.
- Homepage primary CTAs are visible in the desktop calendar rail again: `See upcoming events` and `Plan your night`.
- Account copy now frames the flow as `Save Your Picks`, with public prompts for saving events, rooms, sound preferences, source mode, and budget/timing preferences.
- Planner hero copy now says it turns the event list into a route instead of referring to the wall.
- Generated event detail pages now breadcrumb through `Events`, include `Account` in generated navigation, label same-day room handoff as `Tonight room`, and avoid duplicate source actions when there is no separate ticket URL.
- `docs/WEBSITE_STRUCTURE.md` and `design-qa.md` document the customer-facing navigation contract and flow-verification result.

Verification:

- `npm run seo` regenerated 71 event detail pages and `sitemap.xml`.
- `npm run structure` passed.
- `node scripts/check.js` passed with local link integrity and inline script syntax checks.
- Focused node tests passed: `tests/account-system.test.js`, `tests/preview-room-realtime.test.js`, `tests/live-room-realtime.test.js`, `tests/live-room-page.test.js`, and `tests/social-fusion.test.js` all passed, 25 tests total.
- In-app browser DOM audit checked Home, Events, generated Event Detail, Tonight Rooms, Planner, and Account at `1280x720`; labels/actions were consistent, the homepage primary CTA measured `285x42`, event detail had no duplicate source action, and checked routes had no broken images or horizontal overflow.

Known state:

- Full `npm run check` still fails at `scripts/audit-events.js` only after syntax/tests/structure/link checks pass.
- The remaining audit failure is event-data freshness, not UI flow: stale `lastChecked: 2026-06-11` event/DJ source timestamps relative to June 13, 2026, plus two same-day scraped listings missing ticket-status notes.

## 2026-06-14 Anonymous Room Discussion Rules

The user asked for anonymous room discussion, conservative soft-block filtering, dedicated room discussion pages, sharing tools, and clear closure rules.

Implemented state:

- `live-room.html` remains the Tonight Rooms index and sends users into `live-room-discussion.html?room=<eventId>#live-room` for actual discussion.
- Room discussion is anonymous, scoped to the event room, not posted to the public wall, and closed at 12:00 noon Asia/Shanghai on the day after the event date.
- Rooms stay open even when an event has `status: "past"` until that fixed noon cutoff.
- Closed room links remain readable as local archives, with prompts to return to the homepage for future events or browse other content.
- Logged-in Supabase users with `profiles.role = admin` see a hidden-by-default `Closed room admin access` panel listing sealed room archives.
- Public users and non-admin accounts do not see already-closed rooms in the Tonight list.
- Contact info, social links, phone numbers, rides, afters, tickets, and personal pages are allowed. Politics, obvious ads, unsafe spam, and harmful content are conservatively soft-blocked.

Verification:

- Focused room/page tests pass.
- Browser checks confirmed current 2026-06-13 rooms remain open before the June 14 noon cutoff, closed archive links render read-only, and non-admin public view keeps the admin closed-room panel hidden.

## 2026-06-14 Live Room Discussion UI Cleanup

The user iterated on the room discussion page to make the discussion flow denser, easier to share, and usable on the discussion page without taking over the layout.

Implemented state:

- `live-room-discussion.html` keeps room status, online count, and sync/live mode in one compact centered row.
- Back-to-rooms, event page, and share-room actions are grouped in one row.
- Sharing now opens a modal popup instead of occupying the discussion page.
- Room share cards render a real QR code using local `assets/qrcode-generator.js`; the previous decorative pseudo-code pattern was removed.
- Share popup actions are fixed in one row: System share, Copy, Text link, and Save card.
- The persistent room-policy panel was removed from the hero. The policy now appears as the first message in the room feed.
- Report controls are compact flag buttons with accessible labels.
- The message feed appears above the composer, is independently scrollable, and the message composer is a two-row textarea.
- The discussion header label was simplified to `Room-only`.

Verification:

- `npm run test:live-room-page` passed.
- `npm run test:live-room` passed.
- In-app browser checks confirmed the share popup opens, the local QR renders visually, centered status readouts align to their containers, action rows stay on one line, the message feed is above the composer, and `.room-discussion-messages` uses `overflow-y: auto` with a bounded max height.

## 2026-06-14 International Livestream Source Backlog

The user asked whether international nightclubs have livestreams that could be linked into the project later.

Saved state:

- Added `docs/international-club-livestream-sources.md` as a future-feature research note.
- Candidate official sources include HOR Berlin, Boiler Room, Mixmag Lab, DJ Mag HQ, Defected Records, and Cercle.
- Recommended first version is outbound official links or platform-approved embeds, not raw stream ripping or restreaming.
- Suggested future data fields include `streamUrl`, `streamPlatform`, `embedUrl`, `embedAllowed`, `streamStartsAt`, `streamStatus`, `sourceName`, `sourceUrl`, and `rightsStatus`.

Implementation status:

- No production pages, event data, or scripts were changed for livestream integration.
- Treat this as a backlog note until the user explicitly asks to build the live/watch surface.

## 2026-06-14 Chinese Version Hidden

The user asked to add a Chinese version, then rejected the partial translation because several pages still felt incomplete. Decision: do not ship Chinese UI for now.

Implemented state:

- The public Chinese entry is hidden.
- `/zh` is no longer registered in `config/website-structure.json`.
- `sitemap.xml` no longer advertises `/zh`.
- `index.html` no longer shows a Chinese navigation link or `zh-CN` alternate link.
- The temporary shared Chinese mode script and `zh.html` page were removed.
- Main pages remain English-only.

Future rule if Chinese is rebuilt:

- Do not translate the site name `Shanghai Rave Index`.
- Do not translate DJ names, venue names, or style/genre labels.
- Only translate the surrounding product UI, help text, buttons, filters, and operational copy, and cover the full navigation surface before exposing it publicly.

Verification:

- `node scripts/check-site-structure.js` passed.
- `node scripts/check.js` passed.
- Local preview confirmed `zh.html` returns 404 and the homepage/venue page have no Chinese entry or Chinese mode switch.

## 2026-06-14 Community Contribution Review Queue

The user asked for a public way for community members to complete the database, including proposing additions to existing entries rather than only submitting new leads. The follow-up request asked to study Resident Advisor's community/promoter contribution model before finalizing.

Implemented state:

- Added `contribute.html` as a public source-backed contribution page.
- The form supports `New lead` and `Add to existing` modes.
- Existing-entry additions can target current events, DJs, or venues loaded from `data/dj-data.js`.
- Submissions capture contributor role and optional affiliation so moderators can distinguish community members, promoters, venue teams, artists, and ticket/source contributors.
- Browser submissions save locally first, then try the Supabase `community_contributions` review table.
- Supabase rows store target metadata (`target_kind`, `target_id`, `target_label`) and contributor metadata without publishing directly to canonical event/DJ/venue data.
- Added an idempotent target/role migration for projects that already applied the first community contribution table migration.
- Navigation, sitemap, feature checks, docs, and tests now track the contribution page.

Resident Advisor patterns mirrored:

- Public event submission with staff approval before publishing.
- Existing-event update flow rather than treating every contribution as a new event.
- Separation between user identity, promoter/event roles, ticketing/admin roles, and source/editorial review.
- Structured artist/venue/event targets to reduce duplicates and make updates reviewable.

Verification:

- `node scripts/check.js` passed.
- `node --test tests/community-contributions.test.js` passed.
- `npm run check` passed.
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs` passed with 0 findings.
- Browser verification on desktop and mobile confirmed the mode switch, existing-entry target search, role/affiliation fields, local queue persistence, and responsive layout.

## 2026-06-14 Xiaohongshu Techno Sound Index 01 Scheduled

The user confirmed the first `TECHNO SOUND INDEX` Xiaohongshu post has been scheduled for sending.

Content state:

- Issue: `TECHNO SOUND INDEX 01 - Hard Techno`
- Recommended title: `不是所有快歌都叫 Hard Techno`
- Status: scheduled on Xiaohongshu; exact scheduled publish time was not recorded locally.
- Main plan: `assets/social/xhs-posts/2026-06-14-techno-sound-index-01-hard-techno.md`
- Publish kit: `assets/social/xhs-posts/2026-06-14-techno-sound-index-01-hard-techno-publish-kit.md`
- Copy-only file: `assets/social/xhs-posts/2026-06-14-techno-sound-index-01-hard-techno-publish-copy.txt`
- Image folder: `assets/social/xhs-posts/2026-06-14-techno-sound-index-01-hard-techno/`
- Generation script: `output/xhs_hard_techno/generate-hard-techno-cards.py`

Final image set:

- `01-cover.png`
- `02-definition.png`
- `03-kick-rumble-glossary.png`
- `04-processing-texture-glossary.png`
- `05-listening-cues-sound.png`
- `06-listening-cues-room.png`
- `07-common-misreadings.png`
- `08-listening-coordinates.png`
- `09-fit-not-fit.png`
- `10-shanghai-checklist-cta.png`

Editorial decisions:

- The cover includes the five-point hook using English titles that match the later page headings: `Kick / Rumble`, `Processing / Texture`, `Listening Cues: Sound`, `Listening Cues: Room`, and `Common Misreadings`.
- Pages 03-07 explicitly mark `判断点 01/05` through `判断点 05/05`.
- Page 01 and Page 10 promote the Basement Dispatch homepage/web calendar with text-only CTA.
- No QR code, external URL, short link, music-platform logo, or private-message playlist CTA is used.

Follow-up:

- Record 1h, 12h, and 24h performance after publish if available.
- Watch comments for `歌单`, `新手能不能去`, `上海哪里有`, and next-subgenre requests.
- Potential next posts: `Hypnotic Techno` if readers ask for something less hard, or `Industrial Techno` if they ask for more machine-like sound.

## 2026-06-14 Event Archive Cutoff Moved to 06:00

The user noticed homepage highlights could keep showing events as upcoming even after the event date, while many Shanghai club nights continue into the next morning. Decision: treat events as current until 06:00 Asia/Shanghai on the morning after `sortDate`, then archive them.

Implemented state:

- Homepage and mirror calendar filtering now calculate an effective status from `sortDate + 1 day 06:00 +08:00` instead of trusting stale `status` fields alone.
- Homepage highlights, dispatch panels, status filters, stats, set planner eligibility, and ICS tentative/confirmed status use the effective status.
- Tonight room links now stay open until next-day 06:00, with public copy changed from "12:00 noon" to "06:00 the next morning".
- `scripts/scrape-events.js` normalizes event status with the same 06:00 cutoff when refreshing canonical data.

Verification:

- `node --test tests/live-room-realtime.test.js` passed.
- `node --test tests/live-room-page.test.js` passed.
- `node scripts/check.js` passed.
- `npm run check` passed.
- Browser verification on `index.html` confirmed Jun 12 and Jun 13 events no longer appear in homepage highlights after the Jun 14 06:00 cutoff.

## 2026-06-14 Venue and DJ Event Cross-Links

The user asked to make sure venue and DJ pages can link back to activities in the system.

Implemented state:

- DJ profile appearance rows now include a local `Event page` action for `events/{eventId}.html`, while keeping `Open in calendar`, external `Source`, and `Tickets` actions separate.
- DJ itinerary rows derived from Shanghai calendar appearances also carry the same local event detail link.
- Venue and crew cards now load `data/dj-data.js`, match card sources / venue aliases against system events, and render a `System events` link block pointing to local event detail pages.
- Added `tests/event-cross-links.test.js` and wired it into `npm run check`.

Verification:

- `node --test tests/event-cross-links.test.js` passed.
- `node --test tests/trust-framework.test.js tests/event-cross-links.test.js` passed.
- `node scripts/check.js` passed.
- `npm run check` passed.
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs` passed with 0 findings.
- Browser verification on `venues.html` found 16 system-event sections and 53 internal event links; browser verification on `djs.html` confirmed appearance actions include `Open in calendar`, `Event page`, `Source`, and `Tickets` with no console warnings/errors.

## 2026-06-14 Resident Advisor Poster Completion

Completed the RA Shanghai poster/reference pass for the current 41-row RA manifest.

Implemented state:

- Every RA manifest row now has a local `posterUrl` and `posterEvidence.localFiles`; the gap count is `noPoster: 0`, `posterNoLocalFiles: 0`, `missingLocalFiles: 0`.
- Downloaded and decoded all visible RA event flyer images encountered in this pass, including front/back references where RA exposed both.
- Added durable curated overlays for `caroline-roxy` and `techno-worlds` so their local RA posters survive regeneration from the embedded fallback events.
- Regenerated `data/events.json`, `data/dj-data.js`, `data/poster-archive.json`, generated event detail pages, and `sitemap.xml`.

Verification:

- `node scripts/scrape-events.js` passed with 89 events and 69 curated updates.
- `npm run posters:prepare` generated 47 poster archive records.
- `npm run seo` generated 89 event detail pages.
- `node scripts/audit-events.js` passed; RA Shanghai coverage remained 41/41 and 15/15 upcoming.
- `node scripts/check.js` passed.
- `node --test tests/trust-framework.test.js` passed.
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs --json` passed with 0 findings.

## 2026-06-17 Source Sweep Refresh

This pass was automation-only and followed the source-sweep-first workflow before any manual gap work.

What changed:

- Re-ran `node scripts/scrape-events.js` with fixed Shanghai time and moderate timeouts.
- Canonical files refreshed: `data/events.json`, `data/dj-data.js`, and `data/tracked-dj-itineraries.js`.
- Regenerated derived outputs with `npm run seo` and `npm run posters:prepare`, which also repaired the poster-archive byte-count mismatch that was causing `node scripts/check.js` to fail.

Post-sweep metrics:

- Events: 112 total, 54 future.
- Future Watch rows: 17.
- Future core-field queue: 44 rows, 101 missing core fields, 1 uncertain core field.
- Platform verification queue: 3 rows (`jasmin-knopha`, `anika-kunst`, `youshan-warmup`).
- RA Shanghai coverage: 43 expected / 43 covered, 16 visible-upcoming / 16 covered, still browser-required because plain scripted fetch returns 403.
- Tracked DJ profile inventory expanded from 136 to 155 profiles; curated source-backed DJ profiles expanded from 134 to 154.

Important interpretation:

- No new public-source-backed Shanghai techno activities were added in this sweep.
- The scrape reduced watch and core-gap counts, but `node scripts/audit-events.js` still fails because many current/future rows have stale `lastChecked` values from 2026-06-14 or 2026-06-15.
- `audit-rave-site.mjs` still reports broader project debt unrelated to this sweep: missing `source` URLs on a few event rows and generated-page references to `/_vercel/insights/script.js`.

Best next manual verification targets if another pass is needed:

- `jasmin-knopha`
- `anika-kunst`
- `youshan-warmup`
- `truth-lies`

These remain the most important current/future rows with unresolved public-source core fields after the automated sweep.

## 2026-06-15 Poster Coverage And Display Pass

Stopped external searching and audited only local data, downloaded poster assets, and generated pages.

Poster state:

- RA Shanghai coverage is poster-complete in the local ledger: 41 expected, 41 covered, 0 missing.
- RA visible/upcoming coverage is also complete: 15 expected, 15 covered.
- `assets/posters/` contains 110 image files, including optimized display variants and front/back reference files.
- Current/future event rows: 32.
- Current/future rows with local poster evidence: 18.
- Current/future rows still missing local poster evidence: 14, all Watch/context leads rather than missing RA ledger rows.

Display and trust changes:

- Fixed `poster-wall.html` so the Upcoming filter uses the current Asia/Shanghai date instead of the stale hardcoded `2026-06-11`.
- Added card-level lineup preview after the `How we recommend` trust link.
- Added modal-level lineup, recommendation, best-for, verify-before-going, source-confidence, address, price, age, and source facts.
- Stopped hiding the `Resident Advisor` source label on poster-wall display; RA is visible as a named source.
- Fixed 10 RA event `sourceConfidence` strings that still claimed poster files were not stored locally after the assets had already been downloaded.

Remaining poster gaps:

- Missing local poster evidence remains for these future/current rows: `jasmin-knopha`, `liminal-dreams`, `botox-fatale`, `devils-dancers`, `shanghai-mushroom-music-carnival-2026`, `anika-kunst`, `hexscape`, `jaal`, `truth-lies`, `youshan-warmup`, `shenwave-music-festival-2026`, `misa-shanghai-summer-music-festival-2026`, `west-bund-dream-center-waterfront-music-festival-2026`, and `the-magic-of-tomorrowland-shanghai-2026-watch`.
- Do not backfill these poster fields without direct event-page, official platform, ticketing, RA, SmartShanghai, or platform-native visual evidence.

Validation passed:

- `npm run seo`
- `node scripts/check.js`
- `node --test tests/trust-framework.test.js tests/event-cross-links.test.js`
- `node scripts/audit-events.js`
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs --json`
- `npm run check`
- Local Playwright smoke test for `poster-wall.html`: Upcoming count 32, first card Jun 17, modal opens, Resident Advisor source and insight sections render.

## 2026-06-15 Liminal DJ Profile Gap Pass

Continued the source-sweep-first credibility workflow. The automated sweep ran first and kept the current/future-only rule intact: 90 events, 12 discovered links, 8 Computer Use/browser queues, and 69 curated updates.

Implemented state:

- Added tracked DJ profiles for `Rainsoft` and `Toss`, tied to the `liminal-dreams` Watch row.
- Used public Liminal Dreams/Wigwam search-index evidence for Rainsoft and the current June 20 lineup lead.
- Used RA's prior `Voltmar (DE) & Toss (VN)` Wigwam listing for Toss profile context; RA describes Toss as connected to the Vietnam Liminal Dreams collective and ambient / outer-music DJ context.
- Left `IIN` as an unresolved performer profile gap because public search found only the current event lineup OCR/search-index lead, not an independent artist/profile source.
- Reworded the `botox-fatale` lineup note so SmartShanghai-confirmed Botox Fatale is treated as the confirmed headliner while support names remain source-note context until platform-visible verification.

Current metrics after regeneration:

- Tracked DJ profiles: 94, up from 92.
- Future performer profile sources: 80, up from 78.
- Future performer missing profile sources: 1, down from 3.
- Future uncertain core fields: 3, down from 4.
- `liminal-dreams` performer profile gaps: only `IIN` remains.
- `botox-fatale` no longer has an uncertain lineup flag; it still lacks time, price, age, ticket URL, and poster.
- Stale future rows: 0.
- Missing ticket-status rows: 0.

Remaining gaps:

- Continue platform-native visual verification for `jasmin-knopha`, `botox-fatale`, `anika-kunst`, `youshan-warmup`, and `liminal-dreams`.
- Do not fill `IIN` as a profile until an independent artist, venue, promoter, RA, radio, or platform-visible source appears.
- Ticket route, door price, age policy, and set-time gaps remain public-source gaps for the highest-priority Watch rows.

Sources used in this pass:

- SmartShanghai June 2026 clubbing guide: `https://www.smartshanghai.com/articles/nightlife/the-shanghai-clubbing-guide-june-2026`
- Liminal Dreams Instagram event/profile search preview: `https://www.instagram.com/p/DZXV8WINwkB/`
- Liminal Dreams x Wigwam lineup/time search preview: `https://www.instagram.com/p/DZFFVIPE8VW/`
- RA Voltmar & Toss at Wigwam profile context: `https://de.ra.co/events/1989830`

Validation:

- `node scripts\scrape-events.js` passed.
- `npm run seo` passed.
- `node scripts\audit-events.js` passed.
- `node --test tests\event-cross-links.test.js tests\trust-framework.test.js` passed.
- `node scripts\check.js` passed.
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs --json` passed with 0 findings.

## 2026-06-15 Current/Future-Only Source Sweep

Applied the user's workflow correction: scrape broadly first, but only refresh source state, checked dates, and core-field evidence for events that are currently happening or in the future. Past events stay as archive rows unless explicitly requested.

Implemented state:

- Updated `scripts/scrape-events.js` so seed detail-page refresh skips archive rows by Shanghai archive cutoff.
- Updated event/source freshness logic so `lastChecked` is refreshed only when a source check actually succeeds; browser-required, failed, or archive sources no longer receive a fresh checked date.
- Added freshness SLA windows to `scripts/scrape-events.js` and `scripts/audit-events.js`: normal future event sources use a 2-day window, near events use a 1-day window, and DJ profile sources use a 30-day window.
- Added complementary techno discovery gates: event/source keyword fit plus tracked DJ/profile/alias fit. The tracked DJ inventory remains incomplete and must keep expanding from RA, venue/promoter, label, radio, artist, and platform-native social evidence.
- Added default `ticketStatus` caveats for newly parsed future Watch rows so auto-discovered events carry a planning warning instead of a silent ticket gap.
- Updated the local `rave-calendar-editor` workflow with source-sweep-first, anti-scrape platform-native search, XHS/browser verification, RA poster capture, and current/future-only refresh rules.

Current metrics after regeneration:

- Events: 90.
- Future events: 33.
- Future high-confidence events: 8.
- Future Watch events: 19.
- Single-source Watch rows: 5.
- Single-confirmation Watch rows: 13.
- Future core-field queue rows: 23.
- Future missing core fields: 66.
- Future uncertain core fields: 4.
- Stale future rows: 0.
- Missing ticket status rows: 0.
- Past rows refreshed today: 0.
- RA Shanghai coverage remains configured with 41 covered rows and 15 upcoming rows covered.

Remaining gaps:

- Continue core-field work before second-source promotion. Highest-priority future gaps remain `botox-fatale`, `youshan-warmup`, `jasmin-knopha`, `anika-kunst`, `truth-lies`, `jaal`, `devils-dancers`, `hexscape`, and `liminal-dreams`.
- Use platform-native browser search for XHS/WeChat/ticketing queues before opening direct deep links. Instagram is public/index-only and not login-assisted.
- RA/SmartShanghai source sweep is now routine; manual work should begin from `quality.coreFieldQueue`, `quality.platformVerificationQueue`, and failed source reports.

Validation:

- `node --check scripts/scrape-events.js` passed.
- `node --check scripts/audit-events.js` passed.
- `node scripts/scrape-events.js` passed with 90 events, 12 discovered links, 8 Computer Use sources, and 69 curated updates.
- `npm run seo` passed.
- `node scripts/audit-events.js` passed.
- `node --test tests/event-cross-links.test.js tests/trust-framework.test.js` passed.
- `node scripts/check.js` passed.
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs --json` passed with 0 findings.
- `npm run check` passed.

## 2026-06-14 Venue-Context Core Field Pass

The user clarified again that missing fields should be marked because organizers may not have published details yet. Continued the core-field queue from `devils-dancers` and `hexscape`.

Implemented state:

- Added SmartShanghai venue-context source rows for Specters and EXIT.
- Filled `devils-dancers.address` from SmartShanghai Specters venue context.
- Filled `hexscape.address` from SmartShanghai EXIT venue context.
- Updated both `ticketStatus` and `sourceConfidence` strings so venue addresses are separated from current-event facts.
- Left missing time, price, ticket route, age policy, and missing current lineup/performer-profile fields as `public-source-gap` rather than inferred values.

Current metrics after regeneration:

- Future core-field queue rows: 25.
- Missing core fields: 67, down from 69.
- Uncertain core fields: 5.
- Future performer missing profile sources: 9.

Validation:

- `node scripts\scrape-events.js` passed after a full detail rerun with 18 discovered links. A fast `SCRAPE_MAX_DETAIL_PAGES=0` rerun was not used as final state because it removed discovery-derived source trail context.
- `npm run seo` passed.
- `node scripts\audit-events.js` passed.
- `node --test tests\trust-framework.test.js` passed.
- `node --test tests\event-cross-links.test.js` passed.
- `node scripts\check.js` passed.
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs --json` passed with 0 findings.
- `npm run check` passed.
- `npm run check` passed with 52 tests.

## 2026-06-14 Ticketing/Core Field Pass

Continued the credibility goal after the venue-context pass. This was the second session after the last push, so the finished state should be committed and pushed to `main`.

Implemented state:

- Added `SCRAPE_NOW` support in `scripts/scrape-events.js` so date-sensitive regeneration can be reproduced against the editorial audit date. Used `SCRAPE_NOW=2026-06-14T12:00:00+08:00` for this round because the local shell had crossed into `2026-06-15` while the thread/editorial context was still the June 14 review pass.
- Filled `jasmin-knopha.address` with SmartShanghai-backed Green Station / 462 Changle Lu venue context.
- Added 247tickets to `cyber-buddha`, filled `ticketUrl`, filled the Star@ Cultural Center Dream Hall address, and changed `venueReconciliation.status` from `needs-reconcile` to `resolved-public-ticketing`.
- Added tracked performer profiles for The Hymmapan Electron, Taiga, and MICO using SmartShanghai / 247tickets / artist-profile sources.
- Preserved `botox-fatale`, `youshan-warmup`, `anika-kunst`, `truth-lies`, `devils-dancers`, and `hexscape` as Watch/public-source-gap rows where ticket/time/price/age or visual social confirmation remains missing.
- Included the existing `new-to-techno.html` trust/education page and site-structure/nav updates in the release set because it is already wired into the website structure and strengthens beginner trust context.

Current metrics after regeneration:

- Future core-field queue rows: 24, down from 25.
- Missing core fields: 65, down from 67.
- Uncertain core fields: 4, down from 5.
- Future performer missing profile sources: 6, down from 9.
- Tracked DJ profiles: 89.

Validation:

- `node scripts\scrape-events.js` passed with `SCRAPE_NOW=2026-06-14T12:00:00+08:00`, 18 discovered links, and 69 curated updates.
- `npm run seo` passed.
- `node scripts\audit-events.js` passed.
- `node --test tests\trust-framework.test.js` passed.
- `node scripts\check.js` passed.
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs --json` passed with 0 findings.
- `npm run check` passed with 57 tests.

## 2026-06-15 Source Sweep First + Techno Discovery Gates

Applied the user's workflow correction: each credibility session should scrape all configured sources first, then use the generated queues for manual gap work. The workflow is now:

- Source sweep first: RA, SmartShanghai, existing detail URLs, curated events, tracked DJ profiles, RA coverage manifest, discovered links, source health, and browser-required queues.
- New-event discovery uses two complementary gates:
  - Event/source keyword fit: techno, rave, electronic, hard techno, acid, industrial, EBM, electro, trance, warehouse, hard dance, bass/club crossover, breaks, jungle, UKG, experimental electronic.
  - DJ/profile fit: events can enter the Watch queue when title/description/lineup/promoter/venue/label text matches a source-backed techno-related tracked DJ profile or alias.
- The DJ gate is explicitly not complete; `config/tracked-dj-profiles.json` is a source-backed signal library that should keep expanding from RA artist pages, RA event histories, venue/promoter lineups, label pages, official artist pages, radio archives, and platform-native social checks.

Implemented state:

- Created active Codex automation `rave-calendar-source-sweep`, scheduled every 48 hours, to run the source-sweep-first workflow in `D:\workspace\rave calendar`.
- Updated the local `rave-calendar-editor` site workflow with the source-sweep-first rule, anti-scrape platform-native routing, and complementary discovery gates.
- Updated `scripts/scrape-events.js` to build techno DJ/profile alias signals from `config/tracked-dj-profiles.json`.
- New parsed events pass `isCalendarFit` when either event/source text matches the calendar sound vocabulary or a tracked techno DJ/profile/alias signal matches.
- Added `quality.technoDiscovery` plus totals for `technoArtistSignals`, `technoArtistSignalProfiles`, and `eventsWithTechnoProfileSignals`.
- Auto-parsed Watch events now add a description caveat saying to verify lineup, ticketing, age policy, and venue details before planning.
- Public homepage renderers no longer expose raw `High/Medium/Watch confidence` language; tests now enforce this.

Current generated state after the 2026-06-15 source sweep:

- Events: 89.
- Future events: 32.
- Future core-field queue rows: 22.
- Missing core fields: 61.
- Uncertain core fields: 4.
- Future performer missing profile sources: 3.
- Techno DJ/profile signals: 88 aliases across 63 tracked profiles.
- Events matched by DJ/profile gate in this sweep: 1 (`neon-jungle-tom-kynd` via Mr Chang, Tom Kynd, Psyche).
- The dropped auto-discovered row versus the prior 90-event run was `Sundown - CHAR Bar`, a low-techno-fit SmartShanghai rooftop/social lead whose detail fetch failed in this run.

Validation:

- `node --check scripts\scrape-events.js` passed.
- `node scripts\scrape-events.js` passed with 18 discovered links and 69 curated updates.
- `npm run seo` passed and generated 89 event detail pages.
- `node --test tests\event-cross-links.test.js tests\trust-framework.test.js` passed with 17 tests.
- `node scripts\check.js` passed.
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs --json` passed with 0 findings.
- `node scripts\audit-events.js` still fails on freshness because the audit date is now 2026-06-15 while many event and tracked-DJ source rows are still checked 2026-06-14. This is a real next-pass freshness gap, not a syntax/site-integrity failure.

## 2026-06-14 Liminal Dreams Watch Detail Upgrade

The credibility pass continued after the RA poster push by reviewing the remaining Watch queue.

Implemented state:

- Public search did not find a new RA, ticketing, venue page, or non-social official page for the high-priority single-confirmation rows.
- For `liminal-dreams`, public search-index results surfaced an additional Liminal Dreams/Wigwam Instagram result with tentative lineup/time text: Chingyi, IIN, Rainsoft, Toss, June 20, 2026, and 20:00-late.
- Updated `config/curated-events.json` with the new social-index source and caveated lineup notes.
- Kept the event as Watch because the evidence is still search-index/social context, not platform-visible confirmation of ticket route, door price, age policy, or final post state.

Next verification:

- Use XHS, WeChat, Wigwam, or ticketing search to confirm the post visually before promoting the row. Instagram remains public/index-only.
- Continue prioritizing high-fit single-confirmation rows: `jasmin-knopha`, `botox-fatale`, `anika-kunst`, `truth-lies`, and `youshan-warmup`.

## 2026-06-14 Field-First Watch Pass

The user clarified the operating order: first identify high-priority missing fields across future events, their venues, and their DJs; fill those fields where public evidence supports them; then look for second sources.

Implemented state:

- Ran a future-event field scan for missing time, address, price, age, ticket URL, poster, lineup, recommendation fields, and checked sources.
- Added venue-context addresses and sources for six future Watch rows: `jasmin-knopha`, `liminal-dreams`, `botox-fatale`, `anika-kunst`, `truth-lies`, and `youshan-warmup`.
- Added `20:00-late` as a social-index time lead for `liminal-dreams`, not as a confirmed ticket state.
- Added social-index lineup leads for `youshan-warmup` (`Sarayu`, `Elaheh`) and kept the row on Watch.

Remaining gaps:

- Do not invent price, age, ticket route, or poster fields without direct event evidence.
- Next pass should continue with high-fit future Watch gaps before chasing second confirmation: start with ticket/age/poster fields for `jasmin-knopha`, `botox-fatale`, `anika-kunst`, `truth-lies`, and `youshan-warmup`.

## 2026-06-14 Core Field Queue Automation

The user clarified that event fields must be split into core and non-core fields, with core fields filled first.

Implemented state:

- Added `quality.coreFieldPolicy` and `quality.coreFieldQueue` generation in `scripts/scrape-events.js`.
- Added matching validation and JSON audit reporting in `scripts/audit-events.js`.
- Updated the local `rave-calendar-editor` skill and `site-workflow.md` so future credibility passes start with the core-field queue before second-source promotion or non-core enrichment.
- Regenerated `data/events.json`, `data/dj-data.js`, event detail pages, and sitemap.

Current queue after regeneration:

- Future events: 34.
- Future core-field queue rows: 25.
- Missing core fields: 71.
- Uncertain core fields: 5.
- Top high-fit core rows: `jasmin-knopha`, `botox-fatale`, `youshan-warmup`, `anika-kunst`, `truth-lies`, and `jaal`.

Validation:

- `node scripts/scrape-events.js` passed.
- `npm run seo` passed.
- `node scripts/audit-events.js` passed.
- `node scripts/check.js` passed.
- `node --test tests/trust-framework.test.js` passed.
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs --json` passed with 0 findings.

## 2026-06-15 Abyss User Evidence Ingest

The user supplied Abyss June program and Yuyuan WeChat mini-program ticketing screenshots. Updated state:

- Added `abyss-faq-kirk` for Jun 19 at Abyss Shanghai, 22:00, 110 RMB+, with Kirk / Shukai / Fischmonger / SHU / PASHRAWBOI / Headrush b2b Nitta.
- Added `abyss-hardcore-melancholia` for Jun 20 at Abyss Shanghai, 22:00, 100 RMB+, with LOLALITA / BRENNT / XIWI / Not Your Daddy / DJ LOVERBOY.
- Upgraded `botox-fatale` into `Obsesion Total: BOTOX FATAL (live)` for Jun 26 at Abyss Shanghai, 22:00, 90 RMB+, with BOTOX FATAL / TUI / Kong BB / Noodleprince.
- Added `abyss-cum-chemical-love` for Jun 27 at Abyss Shanghai, 22:00, 90 RMB+, with Discipline b2b PRYMARA / LaGlory / FMRL / Extreme John / GOGA / Oil Nature.
- Added or enriched Abyss lineup DJ profiles with screenshot-backed itinerary evidence. Existing stronger RA/public-source profiles were preserved and only supplemented.

Poster/evidence handling:

- Full Yuyuan ticketing screenshots remain evidence for title, date, time, venue, price, e-ticket, no-refund label, and `abyss_service`.
- Public poster wall uses cropped/clean cover images without the lower ticketing menu.
- Direct public ticket URLs, age policy, and running order remain explicit gaps.
- Abyss monthly rows before 2026-06-15 were not added as new future listings.

Validation:

- `node scripts/scrape-events.js` with `SCRAPE_MAX_DETAIL_PAGES=0`: 99 events.
- `npm run posters:prepare`: 63 poster records.
- `node scripts/generate-seo-pages.js`: 99 event pages.
- `node scripts/check.js`: passed.
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs --json`: 0 must-fix, 0 should-fix.
- `npm run check`: passed with 70 tests.

## 2026-06-16 Screenshot Event Ingest Workflow

Added `docs/SCREENSHOT_EVENT_INGEST_WORKFLOW.md` as the standard workflow for user-provided WeChat, XHS, ticketing, venue, promoter, article, and poster screenshots.

Core rules:

- User should provide overview, ticketing page, clean poster/cover, article/detail, and source-route screenshots when available.
- Full ticketing screenshots remain evidence; poster-wall covers should crop away lower ticketing UI.
- Current/future core fields are filled first; missing age policy, direct ticket URL, running order, or set times stay explicit gaps.
- Mini-program screenshots must not become fake public `ticketUrl` values.
- New unsourced performers get event-role profiles only; existing stronger DJ profiles are supplemented, not overwritten.
- Recommendations must explain why to go, while source discovery belongs in `ticketStatus`, `sourceConfidence`, and Trust Ledger notes.

Also added a README link and updated the local `rave-calendar-editor` skill workflow reference so future screenshot batches route through the same process.

## 2026-06-15 Favicon Refresh And Production Deploy

The user selected the existing Basement Dispatch stamp artwork as the site favicon.

Implemented state:

- Generated a favicon image set from the selected stamp source: `favicon.png`, `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`, `favicon-64x64.png`, `favicon-192x192.png`, `favicon-512x512.png`, and `apple-touch-icon.png`.
- Updated `scripts/site-components.js` so generated pages use the dedicated favicon files instead of `/og-image.png`.
- Updated all existing root and event HTML pages to reference `/favicon-32x32.png`, `/favicon-16x16.png`, and `/apple-touch-icon.png`.
- Updated `site.webmanifest` with 192x192 and 512x512 icon entries.
- Updated `vercel.json` with long-lived immutable cache headers for favicon and touch-icon assets.
- Added `.vercelignore` to keep local output, dependency, Vercel, and environment files out of deployment uploads.

Validation:

- `npm run structure` passed.
- `npm run check` passed.
- Production deployment completed with `vercel --prod --yes`.
- Production was aliased to `https://raveindexsh.top`.
- Verified the production homepage includes the new favicon links.
- Verified production `site.webmanifest`, `/favicon-16x16.png`, `/favicon-32x32.png`, and `/apple-touch-icon.png` return HTTP 200; favicon assets return `Cache-Control: public, max-age=31536000, immutable`.
- `npm run check` passed.

## 2026-06-15 Poster Wall Upcoming Filter Tightening

The user noticed past-looking cards in the default `Upcoming events` filter on `https://raveindexsh.top/poster-wall`.

Diagnosis:

- The poster wall filter was date-first: default `Upcoming events` excluded rows where `eventDate(event) < today`, but it did not explicitly exclude rows with `event.status === "past"`.
- Production at the time rendered 32 default upcoming cards and no `status: past` rows, but the code path was still fragile if a future-dated row was explicitly marked past.
- The default view intentionally includes future `watch` rows; those are unconfirmed future leads, not past events.

Implemented state:

- Updated `poster-wall.html` so default `Upcoming events` excludes both past dates and explicit `status: past` rows.
- Updated `Past archive` logic so it includes rows with past dates or explicit `status: past`.
- Added `tests/poster-wall-filters.test.js` covering the default upcoming exclusion and past archive inclusion behavior.
- Added the new test file to `npm run check` in `package.json`.

Validation:

- `node --test tests/poster-wall-filters.test.js` passed.
- `npm run check` passed with 68 tests.
- Production deployment completed with `vercel --prod --yes`.
- Verified the production poster wall default state with Playwright: filter `upcoming`, count `32`, `pastStatusRows: []`.

## 2026-06-15 Event Recommendation Copy Separation

The user clarified that event recommendations should explain why people should go, including lineup, DJ, sound, room, and audience fit, rather than where the event was found.

Diagnosis:

- Many `recommendationReason` fields used source-first wording such as source trail support, Resident Advisor coverage, SmartShanghai leads, or public preview/visual confirmation language.
- That source language belongs in `sourceConfidence` and the generated event Trust Ledger, not in the recommendation itself.

Implemented state:

- Updated `scripts/scrape-events.js` so generated/default event recommendations are taste-first: lineup draw, sound lane, room/venue fit, and watch/pick status.
- Added refresh detection for old source-first recommendation templates, including `Resident Advisor`, `SmartShanghai`, `RA`, `source`, public preview, visual confirmation, and event-level wording.
- Updated `data/events.json` and `data/dj-data.js` so current public event cards, poster wall modals, DJ event references, and generated event pages use the revised recommendation copy.
- Regenerated all `events/*.html` pages with `npm run seo`.
- Added a regression test in `tests/trust-framework.test.js` that rejects source-discovery wording inside `recommendationReason`; source provenance remains allowed in `sourceConfidence`.

Validation:

- Source-first recommendation audit returned `badCount: 0`.
- `node --test tests/trust-framework.test.js tests/poster-wall-filters.test.js` passed.

## 2026-06-15 Future Poster Scrape Retrospective

The user asked to preserve successful scraping experience and review unsuccessful poster routes.

Preserved in workflow:

- Updated the local `rave-calendar-editor` skill reference with a `Poster Scraping Playbook`.
- Recorded the detailed source-level retrospective in `SOURCE_LOG.md`.

Successful poster routes from this pass:

- Dongfang Performance / ShowStart static event-detail images after HTML-context inspection and visual confirmation.
- Shanghai Municipal Administration of Culture and Tourism static `cmsres` images for official festival key visuals.
- Sina / Weibo article-mirror images with a single page-`Referer` retry after a direct 403, followed by visual confirmation.
- Temporary candidate folder plus contact sheet review before copying confirmed posters into `assets/posters/`.

Unsuccessful or unsafe routes:

- SmartShanghai guide images were useful for context but mostly not exact posters for the missing Watch rows.
- Search image results returned unrelated or old posters for several social-heavy rows.
- Instagram/XHS/WeChat images were not script-fetched. XHS and WeChat remain platform-native Browser/Chrome verification tasks, and logged-in XHS/WeChat viewing requires user permission. Instagram is public/index-only and should not require login.

## 2026-06-15 Social Verification Priority Update

The user clarified that XHS and WeChat should be checked before Instagram, and that Instagram login is not available because the account was banned.

Updated rule:

- Prioritize XHS for venue/promoter/event/date/poster searches.
- Then check WeChat official-account articles, public mirrors, ticket QR references, and mini-program handoff routes where reachable.
- Use Instagram only as public/index snippet evidence or a public visible page. Do not ask for Instagram login, and do not make Instagram the primary next step when XHS, WeChat, RA, SmartShanghai, official venue/promoter, or ticketing routes exist.
- Sidebar/recommended images on event-directory pages can be unrelated and must be rejected unless the image context matches the exact event.

Remaining poster gaps after adding JAAL, Mushroom, and MISA:

- `jasmin-knopha`, `liminal-dreams`, `botox-fatale`, `devils-dancers`, `anika-kunst`, `hexscape`, `truth-lies`, `youshan-warmup`, `shenwave-music-festival-2026`, `west-bund-dream-center-waterfront-music-festival-2026`, and `the-magic-of-tomorrowland-shanghai-2026-watch`.

## 2026-06-15 XHS and WeChat/Sogou Test Result

The user asked to test XHS and WeChat/Sogou first and to avoid Instagram login.

Observed state:

- XHS search loaded but hid results behind a login wall. No event/poster evidence was promoted.
- WeChat/Sogou article and account search initially worked. Venue account search for Abyss, Wigwam, POTENT, Heim, ILLUM, EXIT, and Specters did not expose official certified accounts by English venue name.
- Article search mostly returned no results, existing SmartShanghai June 2026 mirror snippets, unrelated articles, or old Wigwam articles. These are not independent current-event confirmations.
- Expanded Sogou keyword probing triggered a verification/captcha page, so the route was stopped. Screenshots and JSON are under `output/platform-checks/`.

Rule carried forward:

- Do not continue Sogou after verification/captcha. Mark as `captcha-stopped`.
- Do not update canonical data from social login walls, old venue articles, SmartShanghai mirrors, or unrelated snippets.
- Next useful route is user login-assisted XHS/WeChat browser verification or user-provided official-account links/QR routes.

## 2026-06-15 Heim User Evidence Ingest

The user supplied Heim images from WeChat/ticketing context and clarified that all supplied images were Heim events.

Updated state:

- Added `heim-long-wave` for Jun 18 at Heim with local poster, 22:00-late time, lineup, address, and official screenshot evidence.
- Added `heim-earworthy-selected-sound` for Jun 19 at Heim with local poster, 16:00-02:00 time, lineup, address, and official screenshot evidence.
- Updated `jasmin-knopha` with Heim poster/monthly/article screenshots, local poster, and confirmed Sylo / Jasmin / Knopha lineup. It remains Watch because ticket route, price, age rule, and set times are still not visible.
- Added `heim-invites-dina` for Jun 26 at Heim with Yuyuan WeChat mini-program ticketing screenshot evidence, 22:00 time, 66 RMB+ price, address, and lineup DINA / Huizit / Kilo-Vee / HeShang. The public poster wall visual uses the cropped upper cover image `heim-dina-ticket-cover.jpg`; the full ticketing screenshot remains evidence.
- Added `heim-discchef-roto-anniversary` for Jun 27 at Heim with Yuyuan WeChat mini-program ticketing screenshot evidence, 22:00 time, 66 RMB+ price, address, and lineup Roto / 2Difficult / BIANBIAN. The public poster wall visual uses the cropped upper cover image `heim-discchef-roto-ticket-cover.jpg`; the full ticketing screenshot remains evidence.

Evidence rule:

- Ticketing homepage images are acceptable evidence when they visibly name the event and practical facts. For poster wall display, crop away lower ticketing UI and use only the upper cover image. Do not invent a direct `ticketUrl` from screenshots; keep ticket URL and age policy as explicit gaps when only the image is available.

## 2026-06-15 Wigwam User Evidence Ingest

The user supplied Wigwam images from poster/WeChat-like context. Updated state:

- Added `wigwam-weekly-listening-golgol` for Jun 16 at Wigwam, 22:00-late, Free Entry, with event poster, weekly schedule, monthly calendar, Golgol profile slide, and venue context.
- Added `wigwam-weekly-listening-xiaolaba` for Jun 17 at Wigwam, 22:00-late, Free Entry, with event poster, weekly schedule, monthly calendar, Xiaolaba profile slide, and venue context.
- Added `wigwam-weekly-listening-wheon` for Jun 19 at Wigwam, 22:00-late, Free Entry, with event poster, weekly schedule, monthly calendar, wheon profile slide, and venue context.
- Updated `liminal-dreams` into a stronger upcoming entry with poster, note screenshot, free-entry context, and lineup Chingyi / IIN / Rainsoft / Toss. Keep the start-time conflict visible: poster says 20:00-late, weekly schedule says 22:00-late.
- Updated `friendsstandout` with Wigwam schedule evidence for Free Entry and 21:00-late, while preserving Resident Advisor as the strongest event source.
- Updated `youshan-warmup` with the Wigwam June calendar as evidence that Jun 27 is a ticketed YOUSHAN 2026 warmup / Shanghai stop; it remains Watch because time, price, ticket URL, age policy, and full lineup are not visible.
- Enriched DJ profiles for Golgol, Xiaolaba, wheon, Chingyi, Rainsoft, IIN, and Toss using only screenshot-backed claims and profile-level caveats.

Poster handling:

- Event-specific Wigwam posters are the public poster-wall display images after `npm run posters:prepare`.
- Monthly calendar, weekly schedule, artist profile slides, and Liminal note screenshot are source/evidence files unless there is no better event-specific poster.
- Do not add monthly-only Wigwam leads as firm listings until an event-specific poster/source or enough core fields are visible.

Open Wigwam leads for next pass:

- Jun 24 `Mama River by Heim`
- Jun 25 `DUANLUOO`
- Jun 26 unclear row, likely `迷猪`
- Jun 28 `Call A Taxi`

Workflow lesson:

- The strict `audit-rave-site.mjs` requires at least one HTTP source URL for every event and DJ profile. Local screenshot paths are valid evidence for event facts but do not satisfy that audit rule. Add a clearly labeled context-only HTTP source such as SmartShanghai venue context when the actual event source is a local screenshot, and state that it is not event confirmation.

Validation:

- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs --json`: 0 must-fix, 0 should-fix.
- `node scripts/check.js`: passed.
- `npm run check`: passed with 70 tests.

## 2026-06-14 Core Gap Marking Pass

The user clarified the handling rule: if a core field cannot be found, mark it clearly because the organizer may not have published it yet, then recheck next time.

Implemented state:

- `quality.coreFieldQueue` now includes `coreFieldGapStatus` and `sourceGapNote`.
- Missing or uncertain high-priority core fields are labeled `public-source-gap` instead of being filled with inferred values.
- Added tracked DJ profiles for `Jasmín`, `Knopha`, `Sarayu`, and `Elaheh` using Minor AM, Bandcamp, RA profile/news, and RA event-context sources.
- Updated `jaal` with source-backed FENRIR address and the existing 东方演出网 ticket route; age policy remains marked as a source gap.

Current metrics after regeneration:

- Future core-field queue rows: 25.
- Missing core fields: 69, down from 71.
- Uncertain core fields: 5.
- Future performer profile sources: 79, up from 75.
- Future performer missing profile sources: 9, down from 13.

Validation:

- `node scripts/scrape-events.js` passed.
- `npm run seo` passed.
- `node scripts/audit-events.js` passed.
- `node scripts/check.js` passed.
- `node --test tests/trust-framework.test.js` passed.
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs --json` passed with 0 findings.

## 2026-06-18 Project Audit and Bug Fixes

The user requested a full project audit to find and fix bugs. 

Implemented state:

- Fixed a memory leak in `assets/account-system.js` and `assets/ops-admin-gate.js` by properly storing and unsubscribing from the `onAuthStateChange` listener.
- Added double-click and race condition guards in `account-system.js` (for saving events), `ops-admin-gate.js` (for admin sign-in), and `subscription-system.js` (for form submissions).
- Improved parsing robustness in `assets/community-contributions.js` by isolating `try/catch` per row during `localStorage` deserialization to prevent a single corrupt row from wiping the queue.
- Fixed a falsy comparison bug (`||` vs `??`) for `displayOrder` in `assets/community-badges.js`.
- Added defensive null checks and `href` protocol validation (`http://` or `https://`) in `assets/poster-archive.js` to avoid crashes and prevent potential XSS vulnerabilities.
- Verified that `localStorage` parsing in `planner.html` was properly wrapped in `try/catch`.

Validation:

- `node --check` ran on all JavaScript files successfully.
- `npm run check` test suite passed with all 70 tests.
- Site structure and event audits completed with 0 warnings.

## 2026-06-18 Xiaohongshu Website Link Strategy

The user asked where to place the Shanghai Rave Index website URL on Xiaohongshu, then clarified that the normal profile bio link is not clickable on mobile and asked how other accounts handle this.

Decision saved in `docs/xiaohongshu-website-link-strategy.md`:

- Treat `raveindexsh.top` as a short brand/search cue on normal accounts, not as a clickable button.
- Use Xiaohongshu-native posts as the primary value surface: weekend picks, venue guides, sound guides, and "tonight" shortlists should be useful even if the reader never leaves Xiaohongshu.
- Use a stable searchable brand phrase such as `上海Rave日历`, `上海电子音乐日历`, `Basement Dispatch`, `Shanghai Rave Index`, and `raveindexsh.top`.
- Keep the domain in the profile and pinned entry note; regular notes should usually say `完整日历看主页` or `完整活动 calendar 看平台` rather than repeating a raw URL every time.
- Avoid QR codes, comment links, split links, "DM for link", image watermarks, and other gray off-platform diversion tactics on the primary account.
- If clickable conversion becomes necessary, test official/professional Xiaohongshu surfaces such as business account features, official lead tools, shop/product links, or official ad landing pages.

## 2026-06-19 Sound Buddy Classifier, Beta Badge, and Deploy

The user reported that Sound Buddy could not reliably pick up DNB, house, or trance, then asked to label the feature as beta and upload it.

Implemented state:

- Added targeted local scoring signatures in `assets/sound-buddy.js` for DNB break patterns, warm house grooves, and trance lift.
- DNB handling now covers common live tempo-reader failure cases, including half-time `80-92 BPM` reads and fast `168+ BPM` reads.
- House handling now protects warmer `118-134 BPM` grooves from falling into techno/electro when the spectrum is low-mid and chord/groove led.
- Trance handling now protects progressive and hard-trance style cues from falling back to techno subgenres when the signal is bright, stable, and lead/mid-high led.
- Widened Discogs-style tag mapping for `Drum N Bass`, `drum n bass`, and related variants so the local pretrained tag model can steer DNB candidates.
- Added regression tests for broad DNB/house/trance genre recall and family-correct subgenre ranking.
- Added small `beta` badges to the Sound Buddy navigation label and main title in `sound-buddy.html`.

Validation:

- `npm run test:sound-buddy` passed with 41/41 tests.
- `node --check assets\sound-buddy.js` passed.
- `npm run structure` passed.
- Production deployment completed with `npx vercel deploy --prod --yes`.
- Production was aliased to `https://raveindexsh.top`.
- Verified `https://raveindexsh.top/sound-buddy` returned HTTP 200 and contained both beta badges.

Working tree caution:

- This Sound Buddy work is mixed into a dirty local tree with unrelated event/data/poster changes already present. Do not assume all dirty files belong to Sound Buddy unless explicitly reviewed.

## 2026-06-19 DJ Relevance Rerank Push

The user asked to rerank/sort DJs by relevancy, then pushed the result to `main`.

Implemented state:

- Updated `djs.html` so DJ profile ordering uses an explicit `profileRelevanceScore` instead of the previous global-itinerary-heavy score.
- The default DJ order now prioritizes current/future Shanghai calendar appearances, watch-level local listings, source quality, exact set-time evidence, local recurrence, and techno/sound fit.
- Global itinerary rows still help, but they are capped as a supporting signal so broad international reference profiles do not outrank locally relevant current Shanghai DJs by volume alone.
- Added `tests/dj-relevance-sort.test.js` to load the real DJ page/data bundle in a VM and assert that current Shanghai relevance outranks global itinerary volume.
- Added the new relevance regression test to `npm run check` in `package.json`.

Validation:

- `node --test tests/dj-relevance-sort.test.js` passed.
- `node --test tests/trust-framework.test.js` passed.
- `node scripts/check.js` passed.
- `package.json` parsed successfully.

Push state:

- Commit pushed to `origin/main`: `63a6bb8 Rerank DJ relevance`.
- Only `djs.html`, `package.json`, and `tests/dj-relevance-sort.test.js` were staged for that commit.
- Existing unrelated dirty files remained unstaged after the push, including event/data/poster/Sound Buddy work already present in the local tree.

## 2026-06-19 Sound Buddy Indicators And Local Model Bundle

The user asked to update Sound Buddy, expose all indicators on the page, confirm before implementation, then push the result to `main` and save it to project history.

Implemented state:

- Added a collapsed `Signal indicators` drawer to `sound-buddy.html`.
- The drawer exposes live signal, frequency balance, texture / MIR, stream movement, music cue confidence, model-source count, and external tag count.
- The collapsed drawer summary has its own live status chip, synchronized with the existing genre, energy-arc, and drill live chips.
- Expanded the Sound Buddy page into a denser live signal desk with genre radar, subgenre candidates, energy arc, listening drill, session recap, advanced tuning, and hybrid ML source status.
- Added local Discogs400 / Essentia / TensorFlow runtime assets under `assets/sound-buddy-models/` so the browser model path has local runtime, labels, manifest, weight shards, and vendor files.
- Updated `tests/sound-buddy.test.js` with regression coverage for the richer Sound Buddy analyzer, genre/subgenre matrix, energy arc, listening drills, session recap, hybrid model status, and collapsible signal indicators.

Validation:

- `npm run test:sound-buddy` passed with 41/41 tests.
- `node scripts/check.js` passed local link integrity and inline script syntax.
- `npm run structure` passed.
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs` still reports unrelated existing audit findings: several event rows missing source URLs and the audit script treating `/_vercel/insights/script.js` as a missing local target.

Push state:

- Commit pushed to `origin/main`: `45288dc Enhance Sound Buddy indicators`.
- Sound Buddy/history scope in that commit: `PROJECT_MEMORY.md`, `assets/sound-buddy.js`, `assets/sound-buddy-models/`, `sound-buddy.html`, and `tests/sound-buddy.test.js`.
- Unrelated dirty event/data/poster/generated-page files remained local and were not included in the push.

## 2026-06-19 Automatic Event Status Labels and GitHub Refresh

The user asked whether the site could automatically label current and past events, then clarified they did not want to push every day and wanted GitHub to handle it directly.

Implemented state:

- Removed stale hard-coded `data-current-date="2026-06-13"` attributes from public status-aware pages.
- Added Shanghai-time status derivation on the homepage/archive calendar, poster wall, account recommendations, live-room pages, and generated event detail pages.
- Events now compute temporal state from `sortDate` and a next-day `06:00` Asia/Shanghai archive cutoff: `current` for today/overnight active rows, `past` after cutoff or explicit past rows, and `upcoming` for future rows.
- Watchlist remains an editorial/source-confidence state layered over temporal state, so active watch rows can display as `CURRENT WATCH` without being treated as confirmed public events.
- Added current/status filter behavior for the calendar and poster wall; poster wall now defaults to active `Current + upcoming events`.
- Updated generated SEO event detail pages with `data-event-detail` attributes and a small browser-side status script so detail-page labels update on load.
- Added `.github/workflows/refresh-event-status.yml` to run daily at `06:10` Asia/Shanghai, regenerate static event pages and `sitemap.xml`, validate status/trust surfaces, and commit only generated status refresh changes.
- Updated the workflow to Node 24 and current official actions: `actions/checkout@v7.0.0` and `actions/setup-node@v6.4.0`.

Validation:

- `npm run seo` passed and generated 112 event detail pages from current `main` data.
- `node --test tests/poster-wall-filters.test.js tests/trust-framework.test.js` passed.
- `node --test tests/account-system.test.js tests/event-cross-links.test.js tests/home-highlights.test.js tests/live-room-realtime.test.js tests/live-room-page.test.js` passed.
- `node scripts/check-site-structure.js` passed.
- `node scripts/check.js` passed local link integrity and inline script syntax on the clean publish branch.
- Live custom-domain smoke checks passed for `https://raveindexsh.top/` and `https://raveindexsh.top/events/health-maxxing-reactor-2026-06-19`.
- Manual GitHub Actions workflow run passed cleanly: `https://github.com/silverlion2/shanghai-rave-calendar-2026/actions/runs/27809396449`.

Push/deploy state:

- `f5c9232 Automate event status labels` pushed to `origin/main`.
- `a6c259e Use Node 24 for status refresh workflow` pushed to `origin/main`.
- `1b147ce Update status refresh workflow actions` pushed to `origin/main`.
- Vercel production deployment was `READY` for commit `1b147ce`, with production aliases including `raveindexsh.top`, `www.raveindexsh.top`, and `shanghai-rave-calendar-2026.vercel.app`.
- The implementation was published from a separate clean worktree at `D:\workspace\rave-calendar-auto-status-main` to avoid unrelated dirty/conflicted files in the active local workspace.

## 2026-06-19 XHS Tonight Style Guide And MIRROR Poster

The user asked to generate a Xiaohongshu tonight recommendation by style, include real event posters, add a supplied MIRROR concept poster into the database, and save the result to project history.

Implemented state:

- Added the user-provided MIRROR by Minuit poster as `assets/posters/minuit-mirror-concept-2026-06-18.jpg`.
- Generated the optimized display asset `assets/posters/minuit-mirror-concept-2026-06-18-optimized.jpg`.
- Updated `config/curated-events.json` for `minuit-mirror-concept`:
  - Added `posterUrl`.
  - Added structured `posterEvidence` with `source`, `url`, `asset`, visible poster facts, and `lastChecked`.
  - Changed source status to `trusted-ra-and-user-poster`.
  - Marked `decisionProfile.hasPoster` true and removed poster-missing risk flags.
- Regenerated `data/events.json`, `data/dj-data.js`, `data/tracked-dj-itineraries.js`, `data/poster-archive.json`, event SEO pages, and `sitemap.xml`.
- Created the Xiaohongshu carousel folder `assets/social/xhs-posts/2026-06-18-tonight-style-guide/`.
- Generated five 1080x1440 upload cards:
  - `01-cover.png`
  - `02-techno.png`
  - `03-bass-hard-club.png`
  - `04-house-groove.png`
  - `05-disco-social.png`
- Generated `contact-sheet.png`, `publish-copy.txt`, and `publish-kit.md`.
- The carousel groups tonight's events by style:
  - TECHNO: PHOTOCULT, MIRROR concept
  - BASS / HARD CLUB: State OFFF, Cybionte
  - HOUSE / GROOVE: LONG WAVE, ALTER. Pavillon
  - DISCO / SOCIAL: Night at the Museum, Girls Night Out
- Updated the local `xhs-rave-calendar-carousel` skill to make the poster workflow explicit:
  - Real official poster thumbnails must come from local `posterUrl` assets.
  - GPT image prompt-only generation is only acceptable for style mockups, not exact official-poster placement.
  - User-provided posters should be copied into `assets/posters`, entered into `config/curated-events.json`, optimized, and then used through regenerated `data/events.json`.

Validation:

- `node scripts/check.js` passed after regenerating SEO pages.
- All five main XHS cards are `1080x1440`.
- `contact-sheet.png` was visually inspected and shows the MIRROR poster in the cover poster wall and TECHNO page.
- Generated copy was checked for unwanted leftovers such as `watch`, `recheck`, `verify`, `NO POSTER`, source-trace wording, and placeholder wording.

Working tree caution:

- This work originated locally on `codex/update-tonight-events` and is being merged into `main` with the rest of the pending branch work.
- Scratch scrape captures and temporary helper scripts were kept out of the committed project files.

## 2026-06-19 Shanghai Source Sweep Refresh

Ran the source-sweep-first workflow again with `SCRAPE_NOW=2026-06-19T12:00:00+08:00`, `SCRAPE_FETCH_TIMEOUT_MS=12000`, `SCRAPE_X_FETCH_TIMEOUT_MS=6000`, and `SCRAPE_MAX_DETAIL_PAGES=24`.

What changed:

- Canonical event data expanded from 112 to 117 rows.
- Five SmartShanghai-backed watch rows entered the active set: `2026-06-19-italo-disco-shanghai-s-italian-roofto`, `2026-06-19-vibes-up-party-reggae-dancehall-hip-h`, `2026-06-20-nova-events-presents-sundown-char-bar`, `2026-06-21-house-of-zup-house-disco-hip-hop`, and `2026-06-27-white-party-shanghai-s-all-white-roof`.
- Three older recurring/no-date variants left the active set in favor of the new dated IDs: `italo-disco-skyline-dome`, `house-of-zup-2026-06-21`, and `white-party-skyline-dome`.
- `trackedDjProfiles` did not gain new source-backed names in this pass; the movement was event refresh, not DJ-signal expansion.
- `data/poster-archive.json`, `events/*.html`, and `sitemap.xml` were regenerated from the refreshed canonical data.

Current post-sweep metrics:

- `events`: 117
- `future`: 49
- `futureWatch`: 20
- `futureCoreFieldQueue`: 41
- `futureMissingCoreFields`: 109
- `platformVerificationQueue`: 3
- `trackedDjProfiles`: 175
- `curatedDjSourceProfiles`: 171
- `technoArtistSignals`: 184
- `technoArtistSignalProfiles`: 137

Validation state:

- `node --test tests/trust-framework.test.js`: passed.
- `node scripts/check.js`: passed.
- `node scripts/audit-events.js`: still fails on stale `lastChecked` debt across many current/future rows and supporting poster/social/profile sources.
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs --json`: still reports long-running publish debt, mainly missing event `source` URLs and `/_vercel/insights/script.js` local-link findings.

Highest-signal next manual targets remain `jasmin-knopha`, `anika-kunst`, `truth-lies`, and `youshan-warmup`, with platform-native XHS / WeChat / Yuyuan verification still needed for usable ticket/core-field upgrades.

## 2026-06-19 Friday Xiaohongshu Weekend Screenshot Carousel

Generated the Friday Xiaohongshu style guide in `assets/social/xhs-posts/2026-06-19-friday-style-guide/`.

- Added HUSH Three-Year Anniversary w/DJ David to curated/database as a low-techno-fit hip-hop/edits social route.
- Localized SmartShanghai event images for Italo Disco and Vibes Up, and corrected their visible times from the event pages.
- Regenerated `data/events.json`, DJ data, SEO event pages, poster archive, and sitemap.
- Output cards: `01-cover.png` through `08-calendar-site.png`, plus `contact-sheet.png`, `publish-copy.txt`, and `publish-kit.md`.
- Final page uses the mobile website Calendar with the `Weekend` filter screenshot so it shows a fuller Fri/Sat/Sun weekend view instead of only tonight.

## 2026-06-20 Supabase DJ Page Rebuild

The user asked to go over all DJ data in Supabase, remake the DJ page with Product Design, compact the mobile version, iterate the profile UI, then push to `main` and save the work to project history.

What changed:

- Added `scripts/export-supabase-djs.js` to export Supabase DJ/artist data into static client-safe files.
- Added generated `data/supabase-dj-data.json` and `data/supabase-dj-data.js` with 405 artist rows, 63 rich profiles, 94 source-photo profiles, 237 source-backed profiles, 102 release-rich rows, and 15 cleanup flags.
- Rebuilt `djs.html` around Supabase artist depth while preserving Shanghai calendar appearances, combined past/future itinerary rows, external links, releases, labels, listening/social links, profile facts, and calendar/event actions.
- Reranked the default DJ order toward photo-backed and public-footprint-heavy artists. The top order now favors real source photos, rich profile depth, releases, labels, external URLs, source breadth, and global itinerary breadth.
- Removed the duplicate `Calendar appearances` block and kept a single combined `Past / future itinerary` panel sorted newest-first.
- Removed the large hero image and moved the statistics/data-health block to the bottom above the Basement Dispatch footer.
- Simplified directory rows and roster cards to show only DJ name plus `top genre / nationality-base`.
- Moved artist metadata into the top profile header: nationality/base, genre, sound, and labels or releases.
- Simplified External artist links into a clickable favicon/source-logo grid.
- Replaced detailed Supabase source rows with a single `Source: ...` sentence.
- Hid internal recommendation-policy links from the DJ page (`How we recommend`, `.trust-inline`, and `trust.html` links).
- Updated `tests/dj-relevance-sort.test.js` and `tests/trust-framework.test.js` for the new DJ ranking and internal-policy-link behavior.
- Updated `design-qa.md` with Product Design verification notes and mobile/layout checks.

Validation:

- `node --test tests/dj-relevance-sort.test.js tests/trust-framework.test.js` passed.
- `node --check scripts/export-supabase-djs.js` passed.
- In-app browser checks on `http://localhost:4180/djs` confirmed no horizontal overflow, source-logo external links, one simple Source sentence, hidden internal trust links, bottom-positioned stats, no hero image, and top profile metadata.

Pushed state:

- Commit pushed to `origin/main`: `21ce187 feat: rebuild DJ page with Supabase profiles`.
- Only the DJ/Supabase files and related tests/QA were staged for that push. Large unrelated dirty event/data changes remained uncommitted in the local working tree.
