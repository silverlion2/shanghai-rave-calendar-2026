# Project Memory

Last updated: 2026-06-13 16:22 Asia/Shanghai

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
5. X/Twitter, Xiaohongshu, Douyin, Instagram, Weibo, reposts, and app-only content are discovery leads unless independently confirmed.
6. RA Shanghai when blocked, SmartShanghai when rendered/incomplete, Xiaohongshu, WeChat accounts/groups, venue accounts, promoter posters, ShowStart/Damai/PiaoPlanet/mini-program ticketing, and DJ/label Instagram/Weibo/WeChat/Bandcamp are queued for Chrome + Computer Use instead of plain fetch.

## X/Twitter Integration

X/Twitter support is keyword-based and discovery-only.

- Keywords live in `config/scrape-keywords.json`.
- The scraper supports the official X API recent search endpoint when `X_BEARER_TOKEN` or `TWITTER_BEARER_TOKEN` is set.
- GitHub Actions passes both secret names into the scrape step.
- Without a bearer token, the scraper records each keyword search as `requires-token` and does not attempt slow unauthenticated page scraping by default.
- To attempt public HTML search, set `SCRAPE_X_PUBLIC_SEARCH=true`, but expect blocked or empty responses.
- Results, when available, are written to `data/events.json.socialLeads`.

## Computer Use Collection Queue

`data/events.json.computerUseQueue` is generated on each scrape run and surfaced in `ops.html` as `computer-use` leads. It covers RA Shanghai, SmartShanghai, Xiaohongshu, WeChat official accounts/groups, venue official accounts, promoter posters, ShowStart/Damai/PiaoPlanet/mini-program ticketing, and DJ/label Instagram, Weibo, WeChat, or Bandcamp pages. These are agent-operated Chrome + Computer Use collection tasks and should capture the complete event record: time, venue/address, lineup/set times, poster and OCR evidence, artist introductions, future city tour dates, ticket platform/price/availability, age/ID and entry rules, second-layer links, source publication date, last checked date, and evidence type.

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
