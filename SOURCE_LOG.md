# Source Log

Last refreshed: 2026-06-11, Asia/Shanghai.

## Source Priority

1. Chrome + Computer Use for known anti-bot, logged-in, app-only, poster/image, or mini-program sources.
2. Direct venue, promoter, ticketing, or official artist pages.
3. Resident Advisor event pages and city listings.
4. SmartShanghai event pages and monthly clubbing guide.
5. Public social posts, WeChat mini-program references, Xiaohongshu, Douyin, Instagram, and reposts as discovery leads only.

Collection method is separate from confirmation strength: Chrome + Computer Use can discover or verify a source, but an event still needs a shareable official, ticketing, venue/promoter, RA, SmartShanghai, or artist/label reference before it is promoted from watch-level to upcoming.

## 2026-06-11 DJ Itinerary Tracking

Added all-profile itinerary tracking to `djs.html`. Every DJ profile lists its past, upcoming, and watch-level Shanghai Rave Index appearances as itinerary rows. `scripts/scrape-events.js` also writes `data/tracked-dj-itineraries.js`: it preserves curated worldwide overlays and regenerates source-backed rows from event `futureTourPlan` fields.

Rules for worldwide overlay rows: official artist pages win for city/date confirmation; Songkick or Bandsintown can fill exact residency dates and venue names when the official page provides only a date range or city; cancellation or venue details should remain labeled secondary unless confirmed by the artist, venue, promoter, or ticketing page. Do not fabricate worldwide tour rows for local or low-signal DJs; keep their itinerary to confirmed calendar appearances until a source-backed global row is available.

## Computer Use Collection Queue

`scripts/scrape-events.js` writes `computerUseQueue` to `data/events.json` on every run. The queue is for sources where plain HTTP fetch is blocked, incomplete, login-bound, app-only, or image-first. These are agent-operated Chrome + Computer Use collection tasks, not human manual scraping:

- RA Shanghai: use Chrome when city listing fetch returns 403, empty, or stale results.
- SmartShanghai: use Chrome when listing/guide fetch times out or misses rendered event cards.
- Xiaohongshu: logged-in search for `上海 techno`, `上海 rave`, `上海电子音乐`, `上海 club`, and poster/comment leads.
- WeChat official accounts/groups: official announcements, ticket QR codes, set times, lineup changes, and cancellations.
- Venue official accounts: WeChat, Instagram, Weibo, and other official venue feeds.
- Promoter posters: image posts, stories, reposts, and OCR/extraction from posters.
- Ticketing apps: 秀动, 大麦, 票星球, and mini-program ticket flows.
- DJ/label accounts: Instagram, Weibo, WeChat, and Bandcamp tour or label-night announcements.

Each Computer Use item should capture the full event record, not only the listing summary:

- Time and place: title, event series, absolute date, doors/start/end time, timezone, venue, room/floor, district, full address, and map/search hint.
- Lineup: full lineup, B2B notes, set order, set times, live/DJ format, promoter, venue host, label, and organizing crew.
- Poster evidence: poster/flyer image source, screenshot reference, OCR text, and any image-only ticket/time/venue details.
- Local poster asset: when poster evidence exists, download the flyer into `assets/posters/`, add a local `posterUrl`, and do not rely on remote `images.ra.co` or hotlinked image URLs for the public UI.
- Artist context: short sourced artist introductions, origin/city, genres, labels, notable releases, aliases, and official profile links.
- Future city tour plan: upcoming cities/dates from artist, label, venue, RA, Bandsintown/Songkick, Bandcamp, Instagram, Weibo, or WeChat when available.
- Ticketing status: platform, URL or mini-program name, QR/source reference, price tiers, fees, door price, availability, sold-out/waitlist state, refund rules, purchase cutoff, and age/ID policy.
- Deep links: open second-layer event, ticketing, venue, promoter, artist, label, poster-image, and related tour-announcement links instead of stopping at listing cards.
- Provenance: source publication date, last checked date, confidence, and whether each detail is official, ticketing, social, or image-derived.

## 2026-06-08 Refresh

Primary scrape targets:

- Resident Advisor Shanghai city listing: https://ra.co/events/cn/shanghai
- SmartShanghai June 2026 clubbing guide: https://www.smartshanghai.com/articles/nightlife/the-shanghai-clubbing-guide-june-2026
- SmartShanghai clubbing listings: https://www.smartshanghai.com/events/clubbing/
- Direct SmartShanghai event pages for ALTER. Pavillon and Cyber Buddha.

Added or upgraded in the calendar:

- Matisa + Limsum at POTENT, Jun 13, 2026, RA confirmed.
- FENGYUN Vol. 5 at M101 Room, Jun 13, 2026, RA confirmed.
- REACTOR pres. Nosaj Thing, Jun 13, 2026, RA confirmed.
- ALTER. Pavillon at Beaufort Terrace, Jun 18, 2026, SmartShanghai ticket page.
- Cyber Buddha: Electronic Nomads of Isan, Jun 26, 2026, SmartShanghai ticket page.
- CLTX at Abyss, Love Bang: The Woods, System summer pop-up, Liminal Dreams, Botox Fatale, The Devil's Dancers, Hexscape, and Youshan Festival warmup as watch-level SmartShanghai leads.

## 2026-06-08 Browser/Computer Use Refresh

Direct `fetch` still returns 403 for the RA Shanghai city listing, so current RA event details were collected through browser/Computer Use style inspection and preserved in `config/curated-events.json`. The scraper now merges that file after each automated refresh.

Added or upgraded in the calendar:

- FRUITYGROOVE Meets Soul Navigator at Reactor Shanghai, Jun 12, 2026, RA confirmed with full running order, address, price, age, lineup, and flyer evidence.
- Milo Raad + Cosmjn, Matisa + Limsum, Santa K x TURBO, Synth Crush, FENGYUN Vol. 5, and REACTOR pres. Nosaj Thing were upgraded with lineup, address, organizer, poster evidence, ticket status, and artist/context notes where available.
- Nova Events Sunset Sessions at Flair, Jun 13, 2026, SmartShanghai confirmed as an upcoming date-night club lead with price tiers, venue address, 9-DJ note, and ticket route.
- Night at the Museum: Back to the 90s Disco Night, A Full Afrowave Takeover, Nova Summer Splash Pool Party, and Sunset Sundays were added as watch-level SmartShanghai club/date leads because they are lower techno fit or have incomplete lineup/ticket details.

`data/events.json` now reports `curatedEventsApplied` so `scripts/check.js` can fail if the browser-confirmed updates stop merging.

## 2026-06-11 Poster Asset Routine

After the poster rendering issue, the daily scrape/Computer Use routine treats poster collection as a two-step handoff:

1. Record `posterEvidence` with the public event page or screenshot source, including source URL and evidence status.
2. Download the actual flyer into `assets/posters/` and set `posterUrl` to that local file in `config/curated-events.json`; generated `data/events.json` must carry the same local path.

Do not use remote `images.ra.co` URLs in the UI. RA image hosts can block browsers or load inconsistently, which makes cards look like black/default posters. If a direct image download is slow or blocked, use Chrome/Computer Use, the source page image, or a verified source-hosted image and save the final file locally.

Validation added to the routine:

- `scripts/check.js` fails when any event or curated event has `posterEvidence` but no valid downloaded local `assets/posters/...` image.
- `scripts/audit-events.js` performs the same poster check during daily event audits.
- `npm run check` now includes the event audit, so daily scrape updates should not be published while poster evidence is missing a local asset.

## Watch-Only Rules

Use status: "watch" when a lead has only a calendar/editorial mention, missing ticket details, missing exact time, or app-only verification. Do not upgrade it to "upcoming" until there is a direct event page, venue/promoter post, or ticketing source.

## Usual Posting Places

- RA is the best public index for Shanghai electronic events.
- SmartShanghai is the best English context layer for addresses, prices, and monthly scene summaries.
- WeChat official accounts and mini-programs are often the final source of truth for tickets, QR codes, set times, and last-minute changes.
- Xiaohongshu, Douyin, Instagram, and Weibo are useful for discovery, but should be treated as leads unless independently confirmed.

## GitHub-Only Refresh V1

- Scheduled refresh: `.github/workflows/scrape-events.yml`.
- Scraper: `scripts/scrape-events.js`.
- Static output: `data/events.json`.
- X/Twitter keyword config: `config/scrape-keywords.json`.
- Site behavior: `index.html` and `shanghai-rave-calendar-2026.html` load `data/events.json` when served over HTTP, then fall back to embedded events when opened directly from disk.
- Database requirement: none for V1. Add a database only when the project needs moderation queues, saved users, notifications, or high-frequency change history.
- RA listing fetches are best-effort because RA may return 403 to automated requests. Existing RA event URLs remain stored as sources, while SmartShanghai public pages currently provide the reliable automated discovery layer.
- X/Twitter searches are discovery-only. They are useful for venue/promoter chatter and short-notice leads, but they do not confirm calendar entries by themselves. Use `X_BEARER_TOKEN` or `TWITTER_BEARER_TOKEN` in GitHub Secrets for reliable recent-search collection.
- Known anti-bot/app-only sources are queued under `computerUseQueue` and surfaced in `ops.html` as `computer-use` leads for agent-operated Chrome + Computer Use collection.
