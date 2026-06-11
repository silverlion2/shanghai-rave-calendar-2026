# Project Memory

Last updated: 2026-06-08 23:44 Asia/Shanghai

## Project

Shanghai Rave Index is a static website for sourced Shanghai techno, rave, warehouse, industrial, bass, trance, and underground electronic events. The current architecture is intentionally GitHub-only for v1: no database, no backend service, and no user-specific data.

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
- The site is static, so live user features, moderation queues, notifications, or saved events would require a later database-backed version.
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

- Production site: https://shanghai-rave-calendar-2026.vercel.app
- Set-time planner: https://shanghai-rave-calendar-2026.vercel.app/planner
- DJ database: https://shanghai-rave-calendar-2026.vercel.app/djs
- Example event deep link: https://shanghai-rave-calendar-2026.vercel.app/?event=nosaj-thing
- Example DJ deep link: https://shanghai-rave-calendar-2026.vercel.app/djs#dj-ebp

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
- Stable alias: https://shanghai-rave-calendar-2026.vercel.app
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
