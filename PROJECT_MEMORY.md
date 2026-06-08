# Project Memory

Last updated: 2026-06-08 19:40 Asia/Shanghai

## Project

Shanghai Rave Calendar 2026 is a static website for sourced Shanghai techno, rave, warehouse, industrial, bass, trance, and underground electronic events. The current architecture is intentionally GitHub-only for v1: no database, no backend service, and no user-specific data.

## Dialogue Recap

The user first asked where the event information comes from and where Shanghai rave events are usually posted. The source hierarchy was clarified: official venue/promoter/ticket pages first, Resident Advisor and SmartShanghai next, and social/app-only sources as discovery leads only.

The user then asked to scrape with the Shanghai rave finder skill and update the project. The calendar was refreshed with June 2026 event entries and watch-level leads from Resident Advisor and SmartShanghai, and `SOURCE_LOG.md` was created to record source priority, refresh notes, watch-only rules, and usual posting places.

The user asked whether a scraping mechanism can be done using only GitHub or whether a database is needed. The decision was to build v1 as GitHub-only: GitHub Actions runs the scraper, writes `data/events.json`, commits the file back to the repo, and the static website loads that JSON over HTTP.

The user approved "v1". The project was updated with `scripts/scrape-events.js`, `.github/workflows/scrape-events.yml`, `data/events.json`, a frontend JSON loader, README documentation, and stronger validation in `scripts/check.js`.

The user then asked to make sure the scraper covers X on specific keywords, clarifying that "X" means the Twitter platform. The scraper was extended with X/Twitter keyword coverage using `config/scrape-keywords.json`. X/Twitter results are stored as discovery-only `socialLeads` and never become calendar cards until confirmed by a stronger source.

The user finally asked to create a project memory and save the dialogue. This file is the repo-local project memory for future continuation.

## Current Architecture

- `index.html` and `shanghai-rave-calendar-2026.html` contain embedded fallback event data and load `data/events.json` when served over HTTP.
- `data/events.json` is the generated static data file used by the website in deployed or local-server mode.
- `scripts/scrape-events.js` seeds from embedded events, refreshes source metadata, scrapes public SmartShanghai pages, best-effort checks RA, and records X/Twitter keyword searches.
- `.github/workflows/scrape-events.yml` runs the scraper daily and commits changed `data/events.json` back to GitHub.
- `scripts/check.js` validates inline script syntax, parity between the main and archive calendar scripts, SEO markers, `data/events.json`, and `config/scrape-keywords.json`.
- `config/scrape-keywords.json` is the editable X/Twitter keyword list.

## Source Rules

1. Direct venue, promoter, ticketing, or official artist pages are the strongest confirmation layer.
2. Resident Advisor event pages and city listings are strong public event sources, but automated listing fetches can return 403.
3. SmartShanghai event pages, clubbing listings, and editorial guides are reliable public discovery and context sources.
4. WeChat official accounts and mini-programs are often the final ticket/set-time source, but are not reliably linkable from the static scraper.
5. X/Twitter, Xiaohongshu, Douyin, Instagram, Weibo, reposts, and app-only content are discovery leads unless independently confirmed.

## X/Twitter Integration

X/Twitter support is keyword-based and discovery-only.

- Keywords live in `config/scrape-keywords.json`.
- The scraper supports the official X API recent search endpoint when `X_BEARER_TOKEN` or `TWITTER_BEARER_TOKEN` is set.
- GitHub Actions passes both secret names into the scrape step.
- Without a bearer token, the scraper records each keyword search as `requires-token` and does not attempt slow unauthenticated page scraping by default.
- To attempt public HTML search, set `SCRAPE_X_PUBLIC_SEARCH=true`, but expect blocked or empty responses.
- Results, when available, are written to `data/events.json.socialLeads`.

## Known Caveats

- RA city listing fetches currently return 403 to automated requests. Existing RA event URLs remain stored as event sources, but RA listing discovery is best-effort.
- SmartShanghai public pages are currently the reliable automated discovery layer.
- X/Twitter collection needs an API bearer token for reliable results.
- Social leads should not be promoted into calendar cards without confirmation from RA, SmartShanghai, venue/promoter, ticketing, or another stronger source.
- The site is static, so live user features, moderation queues, notifications, or saved events would require a later database-backed version.

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
- Event modals include organizer facts, source count, last checked, source layer, DJ set times, DJ notes, details/tickets links, profile links, and individual `.ics` export.
- The calendar supports Tonight, This Weekend, Next 30 Days, Newly Added, venue/promoter filters, status filters, vibe filters, and filtered `.ics` export.
- `index.html` and `shanghai-rave-calendar-2026.html` must keep their calendar inline scripts identical; `scripts/check.js` enforces this.

Current public URLs:

- Production site: https://shanghai-rave-calendar-2026.vercel.app
- DJ database: https://shanghai-rave-calendar-2026.vercel.app/djs
- Example event deep link: https://shanghai-rave-calendar-2026.vercel.app/?event=nosaj-thing
- Example DJ deep link: https://shanghai-rave-calendar-2026.vercel.app/djs#dj-ebp

GitHub state:

- Repository: https://github.com/silverlion2/shanghai-rave-calendar-2026
- Visibility: public
- Default branch: `main`
- Remote: `origin` -> `https://github.com/silverlion2/shanghai-rave-calendar-2026.git`
- Last pushed commit before this memory update: `ed3ea5e Expand Shanghai rave calendar site`
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
- Vercel production was redeployed after the organizer update.
- GitHub repo was created, all project files were committed, and `main` was pushed.
