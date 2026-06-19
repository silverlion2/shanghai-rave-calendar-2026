# Source Log

Last refreshed: 2026-06-16, Asia/Shanghai.

## Source Priority

1. Resident Advisor event pages and city listings for Shanghai electronic event facts.
2. Yuyuan WeChat mini-program for local ticketing/core-field discovery and verification when accessible through the logged-in desktop WeChat mini-program window. Use it before generic social search for price tiers, ticket state, start time, venue, poster cover, and running-order text.
3. Direct venue, promoter, ticketing, or official artist pages for official updates and conflict resolution.
4. SmartShanghai event pages and monthly clubbing guide for local English context, venue details, and discovery.
5. Public social posts, WeChat mini-program references, Xiaohongshu, Douyin, Instagram, and reposts as discovery leads unless visually verified and corroborated. For social verification, check XHS and WeChat before Instagram. Instagram is no longer a login-assisted route for this project; public/indexed Instagram snippets remain leads only.

Collection method is separate from confirmation strength: Chrome + Computer Use can discover or verify a source when RA/social/ticketing pages are dynamic or blocked, but RA remains the highest-priority public nightlife source for Shanghai event facts. An event still needs a shareable RA, official, ticketing, venue/promoter, SmartShanghai, or artist/label reference before it is promoted from watch-level to upcoming.

## 2026-06-14 RA Clubs Directory Import

Imported the RA Shanghai clubs directory at `https://ra.co/clubs/cn/shanghai` into `data/ra-venues.js` as structured system data. The import preserves duplicate directory rows where RA lists multiple entries for the same venue name.

The public `venues.html` guide keeps curated/event-specific source buttons. RA is used there only as imported venue-directory metadata for matching names and addresses, not as a replacement source for every venue card.

Direct local fetch to the RA clubs page returned 403, matching prior RA access behavior, so this is a captured directory import rather than a live automated dependency. Re-run the import only with browser-visible public directory text and record the checked date.

## 2026-06-11 DJ Itinerary Tracking

Added all-profile itinerary tracking to `djs.html`. Every DJ profile lists its past, upcoming, and watch-level Shanghai Rave Index appearances as itinerary rows. `scripts/scrape-events.js` also writes `data/tracked-dj-itineraries.js`: it preserves curated worldwide overlays and regenerates source-backed rows from event `futureTourPlan` fields.

Rules for worldwide overlay rows: official artist pages win for city/date confirmation; Songkick or Bandsintown can fill exact residency dates and venue names when the official page provides only a date range or city; cancellation or venue details should remain labeled secondary unless confirmed by the artist, venue, promoter, or ticketing page. Do not fabricate worldwide tour rows for local or low-signal DJs; keep their itinerary to confirmed calendar appearances until a source-backed global row is available.

## Computer Use Collection Queue

`scripts/scrape-events.js` writes `computerUseQueue` to `data/events.json` on every run. The queue is for sources where plain HTTP fetch is blocked, incomplete, login-bound, app-only, or image-first. These are agent-operated Chrome + Computer Use collection tasks, not human manual scraping:

- RA Shanghai: use Chrome when city listing fetch returns 403, empty, or stale results.
- Yuyuan WeChat mini-program: first local ticketing/core-field route after RA. Use citywide, venue, promoter, event-title, and DJ searches inside the mini-program. Read list and detail pages only; capture title, date, start time, venue/address, lineup/running order, price tier, e-ticket/standing/no-refund labels, customer-service route, and poster cover. Do not click purchase/payment and do not invent public ticket URLs for app-only pages.
- SmartShanghai: use Chrome when listing/guide fetch times out or misses rendered event cards.
- Xiaohongshu: platform-native search for Shanghai techno/rave/electronic/club queries, venue names, promoter names, event titles, dates, posters, and comment leads. Ask the user before relying on a logged-in XHS session.
- WeChat official accounts/groups: official announcements, ticket QR codes, set times, lineup changes, and cancellations. Prefer official-account article/search routes and public mirrors before mini-program or login-dependent handoffs.
- Venue official accounts: prioritize WeChat and XHS first, then Weibo and official websites. Use Instagram only when a public page or search snippet is visible without login.
- Promoter posters: image posts, stories, reposts, and OCR/extraction from posters.
- Ticketing apps: ShowStart, Damai, PiaoPlanet, and mini-program ticket flows.
- DJ/label accounts: WeChat, XHS, Weibo, Bandcamp, official pages, and public Instagram snippets for tour or label-night announcements. Do not request Instagram login; keep Instagram-only evidence as `social-lead`.

## Venue / Promoter Promotion Network

Added `config/promotion-platform-network.json` as the persistent venue/promoter graph. It currently seeds known Shanghai electronic venues and organizers from recent RA rows plus user-confirmed screenshot ingests: Heim, Wigwam, Abyss, ILLUM, EXIT, Yuyintang, POTENT, Reactor, Dirty House, Specters, FaQ, Liminal Dreams, Earworthy, DiscChef, SO.READY, Normie Corporation, LIQUID DOLLS, YOUSHAN, HouseHeadz Records, and Minuit.

Workflow rule: Resident Advisor remains the first source class. After RA, `scripts/scrape-events.js` now reads the promotion network and writes `promotionPlatformQueue` plus `quality.promotionPlatformNetwork` into `data/events.json`. Yuyuan WeChat mini-program is the preferred local ticketing/core-field route and is inserted before generic venue social searches; entity-specific WeChat, XHS, ShowStart, SmartShanghai context, and public-index routes follow before generic social/keyword discovery. Every future screenshot or Computer Use ingest should update this network when it reveals a new venue, promoter, account name, ticketing route, or recurring series.

2026-06-16 Computer Use test: the live desktop WeChat mini-program window `Yuyuan YuYuan` allowed visual navigation into event detail pages. It confirmed Yuyuan can add new event leads and fill fields: `Antigen Pres. KAVARI` at Reactor Shanghai exposed 2026-06-26 22:00, 98 RMB+, Reactor Shanghai, no-refund/e-ticket/standing labels, and second-layer running-order text; `Le Youth 2026 China Tour Shanghai` exposed 2026-06-27 16:30, 228 RMB+, venue/address text, and ticket labels. Treat Yuyuan as a first-pass local discovery source, but keep app-only pages as screenshot/ticket-route evidence unless a shareable URL exists.

Anti-scrape rule preserved in the network: use platform-native search first for XHS, WeChat, Sogou, ticketing, and public social pages; stop on login/captcha/security-limit pages; ask the user only for XHS/WeChat login-assisted viewing when needed; never ask for Instagram login or treat Instagram-only snippets as current-event confirmation.

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

## 2026-06-14 RA Coverage Sweep

RA remains the highest-priority public source for Shanghai electronic event facts. Plain scripted fetches to `https://ra.co/events/cn/shanghai` and RA event detail pages returned a 403/DataDome browser-required response, so the refresh used RA city/date-listing pages through public indexed text and RA detail pages without attempting a bypass.

Coverage change:

- `config/ra-shanghai-coverage.json` now tracks the full RA Shanghai visible/indexed window checked on June 14, 2026: 41 RA Shanghai event pages from June 5 through September 12, with Cyber Buddha mapped as a supporting RA source because the canonical site row remains SmartShanghai-facing.
- The sweep added the recent-past Jun 5-Jun 7 RA rows still exposed by RA date filters and RA indexed detail pages: JANEIN, Darker Than Wax with Dean Chew, THAM, Gully Riddim / MssingNo, Interzone, dirty beats, 19Hz w. Fractale, NIGHTWAVE, Butterfree at M101, Acierate + The Brvtalist, SUNKISSED, Jun 7 HOUSE OF ZUP, plus the already present Techno Worlds and FāQ / Caroline Roxy rows.
- The audit keeps a separate current-listing guard: RA city listing still reports 15 upcoming Shanghai events on June 14, and the manifest has 15 future/upcoming rows, so a missed current RA event fails `scripts/audit-events.js`.
- Added the missing RA row `PRGRM 021` at EXIT, June 12, 2026 (`https://ra.co/events/2464171`), including RA-backed time, venue/address, lineup, genre, cost, and caveats.
- Added the RA page-2 long-tail row `Shaun Soomro, DJ Serang`, September 12, 2026 (`https://ra.co/events/2232295`), as a Watch/context listing because RA confirms title, date, time, promoter, lineup, and TBA Shanghai venue label, but not venue address, price, age, or ticket route.
- `scripts/scrape-events.js` writes the manifest result to `data/events.json.quality.raShanghaiCoverage`.
- `scripts/audit-events.js` fails if a manifest RA event URL is not present in the generated data, if the quality snapshot drifts from the manifest, or if the RA visible upcoming count does not match the manifest's upcoming rows. Current check: RA label 15 upcoming, manifest 15 upcoming covered, total RA manifest 41/41 covered.

Follow-up correction in the same RA pass:

- Public indexed RA detail pages surfaced four Shanghai rows that were not present in the city-listing text snapshot: `dirty beats` (`https://ra.co/events/2450615`), `19Hz w. Fractale` (`https://ra.co/events/2458581`), `NIGHTWAVE feat. JULIANO ALLGAYER` (`https://ra.co/events/2457307`), and `SUNKISSED ROOFTOP PARTY feat. TOM PRICE` (`https://ra.co/events/2457326`).
- Added `dirty-beats` and `19hz-fractale` as full canonical events with RA-backed date, time, venue/address, promoter, lineup, genre, ticket/age notes, flyer visibility in source confidence, and archive recommendation text.
- Upgraded `nightwave` and `sunkissed` from description-only overlays to RA-backed rows with lineup, address, organizer, ticket status, flyer visibility in source confidence, and `How we recommend` caveats that keep them as social/rooftop routes rather than hard-rave picks.

Workflow rule: when RA fetch is blocked, use Browser/Chrome or publicly indexed RA city/date/page-2 pages, open each event detail page, update `config/ra-shanghai-coverage.json`, then persist event facts in `config/curated-events.json`. Do not treat a challenge page as an empty RA listing, and always check RA pagination before calling Shanghai coverage complete.

## 2026-06-14 High-Watch Social Index Scan

After completing the RA Shanghai coverage manifest, the next high-priority Watch queue was scanned for stronger event-level evidence.

- `jasmin-knopha`: public search results for Heim/Jasmín/Knopha surfaced a Heim Instagram preview for `06.20 | Heim Invites: Jasmín`, which supports the venue-social route but still does not expose a readable ticket page, door price, set times, or final running order. The canonical row remains Watch and now labels Heim Instagram as a `social-index-lead` until XHS, WeChat, ticketing, venue/promoter, or another shareable source confirms the post. Do not request Instagram login.
- `botox-fatale`, `anika-kunst`, and `truth-lies`: public results returned SmartShanghai plus ambiguous or dynamic Instagram/profile snippets. No RA Shanghai event detail or fully readable venue/promoter/ticketing page was found in this pass, so no confidence upgrade was made.

Follow-up correction in the same pass:

- `botox-fatale`: public search results surfaced the artist/tour Instagram index preview for `26.06 byyb.radio Shanghai`, `26.06 ABYSS Shanghai`, and `27.06 OIL Shenzhen`. Added it as `social-index-lead`; it strengthens the Abyss date lead but does not confirm ticket route, door price, set times, or current platform-visible post state. Keep as Watch until XHS, WeChat, Abyss, promoter, RA Shanghai, ticketing, or another shareable source confirms practical details. Do not require Instagram login.
- `anika-kunst`: public search results surfaced an official `potent_club` Instagram index preview for `POTENT JUNE 2026` naming `@anikakunstmuzik`. Added it as `social-index-lead`; it identifies the likely platform-native Chrome/Instagram verification target but does not confirm the June 27 poster card, ticket route, door price, or set times. Keep as Watch until POTENT, RA Shanghai, ticketing, or visually verified official social evidence confirms practical details.
- `liminal-dreams`: public search results surfaced Liminal Dreams and Wigwam Instagram index previews tying the series to Wigwam and `JUNE 20 @liminal_dreams_`. Added them as `social-index-lead` rows; this lowers single-source risk but still does not confirm lineup, start time, ticket route, door price, or age policy. Keep as Watch until XHS, WeChat, Wigwam, ticketing, or another shareable venue/promoter source confirms practical details. Instagram remains public/index-only.

2026-06-14 follow-up on `liminal-dreams`:

- Public search-index results surfaced an additional Liminal Dreams/Wigwam Instagram result at `https://www.instagram.com/p/DZFFVIPE8VW/` with tentative lineup/time text: Chingyi, IIN, Rainsoft, Toss, June 20, 2026, and 20:00-late.
- Added this as `social-index-lead` only and added lineup notes that explicitly say platform-native visual confirmation is still required.
- Decision: keep `liminal-dreams` as Watch and keep SmartShanghai as the only readable event-level confirmation source until XHS, WeChat, Wigwam, or a ticketing route confirms the visible post, door price, age policy, and final lineup. Instagram remains public/index-only.

2026-06-14 field-first Watch pass:

- Workflow correction: for future high-fit Watch items, fill practical fields first, then pursue second-source confirmation. Practical fields include event time, address, price, age policy, ticket route, poster, lineup, venue context, and DJ/source notes.
- Added venue-context addresses for `jasmin-knopha`, `liminal-dreams`, `botox-fatale`, `anika-kunst`, `truth-lies`, and `youshan-warmup` from SmartShanghai venue pages or RA venue context. These venue rows improve practical usability but do not count as second event confirmation.
- Added tentative social-index lineup/time details for `liminal-dreams` and tentative social-index lineup details for `youshan-warmup`; both remain Watch until platform-native visual confirmation or ticketing/venue pages confirm final details.

Second follow-up in the same queue:

- `botox-fatale`: public search results surfaced an official Abyss Instagram June-program preview containing `BOTOX FATAL (LIVE)` plus `TUI`, `Kong BB`, and `Noodleprince`, but the snippet is adjacent to a separate Saturday June 27 C.U.M listing. Added it as `social-index-lead` only. Next check should use XHS, WeChat, Abyss, promoter, or ticketing routes to verify whether Botox Fatale is on Friday June 26, what support names are attached, and whether ticket or door details are visible. Do not request Instagram login.
- `youshan-warmup`: public search results surfaced the official Wigwam Instagram route with `JUNE 27 @youshanmusicfestival` in June-program context. Added it as `social-index-lead` only because the warmup lineup, start time, ticket route, and door policy remain missing. Next check should use Wigwam / YOUSHAN XHS, WeChat, venue/promoter, or ticketing search before opening any known deep link. Instagram remains public/index-only.

Browser follow-up:

- Instagram public-session check via Playwright/Chrome started at `https://www.instagram.com/`; the public homepage exposed language options but no usable platform search. Opening `abyss_shanghai` and `wigwam.live` account pages reached page titles and image placeholders only; both account navigations timed out before visible post text loaded. No event date card, lineup, ticket route, door price, set times, or June program body text was confirmed.
- Keep `Abyss Instagram June 2026 program search preview` and `Wigwam Instagram June 2026 program search preview` as `social-index-lead`. Next practical step should use XHS, WeChat official-account search, venue/promoter/ticketing routes, or another shareable source. Do not use Instagram login or promote either row based on public-session Instagram metadata alone.

Workflow rule: search-index snippets can reveal where to look next, but they should not promote a Watch item. Use platform-native search or Chrome visual verification before treating XHS/WeChat content as event-level confirmation. Instagram snippets remain public/index-only leads and should not trigger login requests.

## 2026-06-14 Confirmation Source Audit

Added a stricter Watch queue metric in `scripts/scrape-events.js` and `scripts/audit-events.js`: `sourceCount` counts all unique source URLs, while `confirmationSourceCount` counts only sources that can confirm the current event row. Social index previews, social leads, artist profiles, artist-itinerary context, previous-series context, venue context, radio context, and off-city festival context are excluded from confirmation counts.

Current result after regeneration:

- Future Watch rows: 19.
- Single-source Watch rows by raw URL count: 5.
- Single-confirmation-source Watch rows: 13.
- High-priority Watch rows still needing a second event-level confirmation source: `jasmin-knopha`, `botox-fatale`, `anika-kunst`, `truth-lies`, and `youshan-warmup`.
- `jaal` now shows 3 total sources and 2 confirmation sources, so it stays Watch for practical detail checks rather than source-count risk.

Workflow rule: do not use profile links, social index snippets, previous editions, or venue/festival context to make a Watch item appear corroborated. Promote only after a direct current-event source confirms the relevant date, venue, lineup, ticket route, or official update.

## 2026-06-15 Source Sweep + Techno Discovery Gates

Workflow update:

- Every credibility session now starts with a source sweep before manual gap work.
- New-event discovery uses two complementary gates:
  - Event/source keyword fit.
  - Tracked techno DJ/profile/alias fit.
- The tracked DJ gate is intentionally incomplete and must be expanded from RA artist pages, RA event history, venue/promoter lineups, label pages, official artist pages, radio archives, and platform-native social checks.
- Anti-scrape surfaces still require platform-native search or Browser/Chrome visual verification before deep-link inspection.

Automation:

- Created active automation `rave-calendar-source-sweep`.
- Schedule: every 48 hours.
- Workspace: `D:\workspace\rave calendar`.
- Task: run the `rave-calendar-editor` source-sweep-first workflow, inspect `quality.technoDiscovery`, `quality.raShanghaiCoverage`, `quality.platformVerificationQueue`, and `quality.coreFieldQueue`, then update canonical data/logs when new source-backed facts are confirmed.

Source sweep result:

- `node scripts\scrape-events.js` completed on 2026-06-15.
- Generated 89 events, 18 discovered links, 8 Computer Use source queues, and 69 curated updates.
- `quality.technoDiscovery.djProfileGate.signalCount`: 88.
- `quality.technoDiscovery.djProfileGate.profileCount`: 63.
- `quality.technoDiscovery.djProfileGate.matchedEventCount`: 1.
- Matched event: `neon-jungle-tom-kynd`, with tracked profile signals for Mr Chang, Tom Kynd, and Psyche.
- No new high-priority techno event was added by the DJ gate in this run; the gate is now active for future sweeps.

Current gaps:

- `node scripts\audit-events.js` fails on source freshness because many future event and tracked-DJ source rows remain checked on 2026-06-14 while the audit date is 2026-06-15.
- Remaining high-priority core rows after the sweep: `botox-fatale`, `youshan-warmup`, `jasmin-knopha`, `anika-kunst`, `truth-lies`, and `jaal`.
- Remaining medium-priority performer profile gaps: `liminal-dreams` still needs profiles for IIN, Rainsoft, and Toss.

Validation:

- `node --check scripts\scrape-events.js` passed.
- `npm run seo` passed.
- `node --test tests\event-cross-links.test.js tests\trust-framework.test.js` passed.
- `node scripts\check.js` passed.
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs --json` passed with 0 findings.

## 2026-06-14 Platform Verification Queue

Added `quality.platformVerificationQueue` to `data/events.json` and a matching `scripts/audit-events.js` check. This queue is for Watch rows where a platform-bound lead exists, but the lead is still not a current-event confirmation source.

Current result after regeneration:

- Platform verification rows: 5.
- Platform-bound source rows: 9.
- High-priority rows now explicitly queued for platform-native checks: `jasmin-knopha`, `botox-fatale`, `anika-kunst`, and `youshan-warmup`.
- Medium-priority row now explicitly queued: `liminal-dreams`.
- Many current platform leads are Instagram routes or search-index previews; `botox-fatale` and `youshan-warmup` still need stronger non-Instagram visual checks through XHS, WeChat, venue/promoter, or ticketing routes.

Workflow rule: use the event-specific search queries in `quality.platformVerificationQueue` before opening known deep links. Prioritize XHS, WeChat, Weibo, mini-program, or ticket-flow leads; use Instagram only when a public page or snippet is visible without login. Record whether the visible account/post/page confirms the event title, absolute date, venue, lineup, ticket route, door price, set times, or age rule. If the browser only exposes profile metadata, search snippets, image placeholders, login walls, or timeouts, keep the source as a lead and keep the event on Watch.

Follow-up platform check:

- `botox-fatale`: public search still surfaced SmartShanghai plus Instagram search-index snippets, but no new non-social direct source. Playwright/Chrome opened an XHS search route for `Abyss Botox Fatale 6.26 Shanghai`; XHS redirected to `website-login/error` with `安全限制`, `IP at risk`, and error `300012`. Screenshot stored at `output/playwright/xhs-botox-security-limit.png`. Instagram platform search for `Abyss Botox Fatale 6.26 Shanghai` returned HTTP 429. No event post body, ticket route, door price, date card, support lineup, or set times were confirmed.
- `youshan-warmup`: public search surfaced an additional jay_sarayu Instagram index preview reading `27.06: Youshan Festival Pre Party | Wigwam | Shanghai, CN`. Added it as `social-index-lead` only. It gives the next platform-native verification target, but it does not confirm official organizer approval, final lineup, start time, ticketing, door price, or age policy.
- Current decision: keep both rows as Watch and keep their `confirmationSourceCount` at 1. Next useful check is XHS first, then WeChat official-account search, then a shareable Wigwam/YOUSHAN/Abyss/ticketing page. Instagram remains public/index-only and should not require login.

## 2026-06-14 DJ Lineup-Context Profiles

Added conservative source-backed profiles for performers whose only reliable public context in this pass is an RA lineup role:

- Bloom Season 1 Grand Final at EXIT: `DADA`, `Kazane`, `Tevez`, and `Yiyoo` now have lineup-context profiles sourced to RA. The copy distinguishes judges and MC roles from DJ bookings.
- NEON JUNGLE at The Sukhothai Shanghai: `Tom Kynd`, `Psyche`, and `Mr Chang` now have RA-backed lineup profiles.
- FRIENDSSTANDout at Wigwam: `Taidi` now has an RA-backed lineup profile.
- HOUSE OF ZUP at ZUP Pizza Bar: `RB//SH`, `Yogijazz`, `Bolobolo`, `Gabrielle Lin`, `Rain Ling`, and `FLOATING` now have RA-backed lineup-only profiles. These profiles only confirm the June 14 event role/set window shown by RA and do not claim artist biographies.
- Low-priority queue cleanup: `Tsing`, `ALI RIBO`, `SOLO (Enchanted Night listing)`, `DJ Rain`, `Chingyi`, `Chiyokoo`, `Golgol`, `Pei`, `Xiaolaba`, and `Wang Meng + Yu Miao` now have event-role profiles. These stay explicitly low-fit or lineup-context where the source is only SmartShanghai or a single RA event row.

Workflow rule: a lineup-context profile is allowed when it makes source scope clearer, but it must not invent label affiliations, origin, biography, discography, or set format. If a later RA artist profile, official artist page, Bandcamp, SoundCloud, or venue/promoter page appears, upgrade the profile and keep the original RA event row as event evidence.

## 2026-06-11 Poster Asset Routine

After the poster rendering issue, the daily scrape/Computer Use routine treats poster collection as a two-step handoff:

1. Record `posterEvidence` with the public event page or screenshot source, including source URL and evidence status.
2. Download the actual flyer into `assets/posters/` and set `posterUrl` to that local file in `config/curated-events.json`; generated `data/events.json` must carry the same local path.
3. When RA exposes front/back or multiple event-relevant flyer images, download all of them as local reference files and list them in `posterEvidence.localFiles`. The public card may use only the front image, but the back/reference image should still be preserved for audit and OCR work.

Do not use remote `images.ra.co` URLs in the UI. RA image hosts can block browsers or load inconsistently, which makes cards look like black/default posters. If a direct image download is slow or blocked, use Chrome/Computer Use, the source page image, or a verified source-hosted image and save the final file locally.

2026-06-14 RA poster follow-up:

- Downloaded RA front/back flyer references for `dirty-beats`, `19hz-fractale`, `nightwave`, and `sunkissed` into `assets/posters/`.
- Main `posterUrl` files: `dirty-beats.png`, `19hz-fractale.jpg`, `nightwave.jpg`, `sunkissed.jpg`.
- Back/reference files: `dirty-beats-back.jpg`, `19hz-fractale-back.png`, `nightwave-back.jpg`, `sunkissed-back.jpg`.
- RA direct `images.ra.co` and encoded `imgproxy.ra.co` URLs can fail from local tooling; the successful route in this pass used the RA imgproxy URL with `quality:66` unescaped, then validated files with `sharp`.

2026-06-14 RA poster completion pass:

- Completed the RA Shanghai poster ledger for all 41 manifest rows: `noPoster: 0`, `posterNoLocalFiles: 0`, `missingLocalFiles: 0`.
- Added `posterEvidence.localFiles` for existing local RA poster rows and downloaded the remaining visible RA flyer references into `assets/posters/`, including front/back files where RA exposed both.
- New RA poster rows covered: `janein`, `fengyun-5`, `gully-riddim-mssingno`, `interzone-summer-time`, `tham`, `butterfree-m101`, `darker-than-wax-dean-chew`, `acierate-brvtalist`, `caroline-roxy`, `techno-worlds`, `house-of-zup-jun7`, `prgrm-021`, `house-of-zup`, `bloom-season-1-grand-final`, `cybionte-solo-ykk-heshang`, `nikita-zabelin-potent`, `onefortyasia-mungk-simbie`, `atm-leo-monira`, `enchanted-night-the-nest`, `neon-jungle-tom-kynd`, `sciahri-potent`, `friendsstandout`, and `shaun-soomro-dj-serang`.
- Verification route: RA event pages were reached through public indexed text/search or direct public event URLs; image links were opened from the RA page image anchors, downloaded as local assets, and fully decoded with `sharp().raw().toBuffer()` before registration. Use Browser/Chrome before changing live ticket state, but RA poster evidence can be preserved from the public indexed image route when visible.

Validation added to the routine:

- `scripts/check.js` fails when any event or curated event has `posterEvidence` but no valid downloaded local `assets/posters/...` image.
- `scripts/check.js` also validates any `posterEvidence.localFiles` reference images that are explicitly listed.
- `scripts/audit-events.js` performs the same poster check during daily event audits.
- `npm run check` now includes the event audit, so daily scrape updates should not be published while poster evidence is missing a local asset.

## Watch-Only Rules

Use status: "watch" when a lead has only a calendar/editorial mention, missing ticket details, missing exact time, or app-only verification. Do not upgrade it to "upcoming" until there is a direct event page, venue/promoter post, or ticketing source.

## Usual Posting Places

- RA is the best public index for Shanghai electronic events.
- SmartShanghai is the best English context layer for addresses, prices, and monthly scene summaries.
- WeChat official accounts and mini-programs are often the final source of truth for tickets, QR codes, set times, and last-minute changes.
- Xiaohongshu, WeChat, Douyin, Instagram, and Weibo are useful for discovery, but should be treated as leads unless independently confirmed. Prioritize XHS and WeChat for social checks; Instagram is public/index-only and not login-assisted.

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

## 2026-06-14 Core vs Non-Core Field Policy

Implemented the user's field-priority correction as an auditable workflow.

- Core future-event fields are now: `date`, `title`, `time`, `venue`, `address`, `lineup`, `price`, `age`, `ticketUrl`, `ticketStatus`, `sourceUrl`, `checkedSource`, and `performerProfileSources`.
- Non-core enrichment fields are now: `poster`, `recommendationReason`, `bestFor`, `verifyBeforeGoing`, `sourceConfidence`, `soundTags`, and `decisionTags`.
- Added `quality.coreFieldPolicy` and `quality.coreFieldQueue` to `data/events.json`; `scripts/audit-events.js` now validates the queue and reports it before the Watch/source-promotion queue.
- Current generated state: 34 future events, 25 rows in the core-field queue, 71 missing core fields, and 5 uncertain core fields.
- Highest-priority core gaps are now explicit: `jasmin-knopha`, `botox-fatale`, `youshan-warmup`, `anika-kunst`, `truth-lies`, and `jaal` come before non-core poster/copy enrichment or second-source promotion work.

Workflow rule: resolve missing or uncertain core fields first. Second-source confirmation is still important, but it comes after the event has usable planning facts for date/title/time, venue/address, DJ lineup/profile context, ticket route, price, age policy, and checked source trail.

## 2026-06-14 Core Gap Marking Pass

Applied the user's clarification: if a core field cannot be found, mark it as a source gap instead of forcing a placeholder.

- Added `coreFieldGapStatus` and `sourceGapNote` to `quality.coreFieldQueue`; unresolved rows now explicitly say that missing or uncertain core fields were not found in current public sources and should be rechecked through organizer, venue, ticketing, RA, SmartShanghai, XHS, WeChat, or public/index-only Instagram leads in the next pass.
- Added source-backed DJ profiles for `Jasmín`, `Knopha`, `Sarayu`, and `Elaheh`. These reduce DJ/profile core gaps but do not confirm event ticketing or final running order.
- Added `JAAL The Machine live acid techno` venue address from SmartShanghai FENRIR venue context and set the ticket route to the already browser-checked 东方演出网 listing. Age policy remains marked as not found in public sources.
- Current generated state after regeneration: future missing core fields dropped from 71 to 69; future performer profile source gaps dropped from 13 to 9. The high-priority rows `jasmin-knopha`, `botox-fatale`, `youshan-warmup`, `anika-kunst`, `truth-lies`, and `jaal` remain in the core-field queue because ticket/time/age/lineup fields are still not publicly confirmed.

Sources used in this pass:

- Minor AM Jasmín profile: `https://www.minor-am.com/roster/jasmin`
- Jasmín Bandcamp: `https://jasminhoek.bandcamp.com/album/bite-the-hand-that-feeds-you`
- Knopha RA profile: `https://ra.co/dj/knopha`
- Sarayu RA profile and RA Mix Of The Day: `https://ra.co/dj/sarayu`, `https://ra.co/news/85130`
- Elaheh RA profile and RA event context: `https://ra.co/dj/elaheh`, `https://ra.co/events/2462725`
- SmartShanghai FENRIR venue context: `https://www.smartshanghai.com/venue/33537/fenrir`

Workflow rule: do not treat `public-source-gap` as a failure. It is an explicit editorial marker meaning the likely organizer/venue/ticketing details are unpublished or not reachable without platform-native browser verification yet.

## 2026-06-14 Venue-Context Core Field Pass

Applied the user's "mark it if not found" rule to the next two medium-priority Watch rows in the core-field queue.

- Added source-backed venue addresses for `devils-dancers` and `hexscape`.
- `devils-dancers`: SmartShanghai Specters venue context confirms the address at LG-21, B1/F, C PARK, 658 Zhaohua Lu, near Zhongdeqiao Lu. Current-event lineup, time, price, ticket route, and age policy remain `public-source-gap`.
- `hexscape`: SmartShanghai EXIT venue context confirms the address at 298 Xingfu Lu, near Pingwu Lu. Current-event time, price, ticket route, age policy, and performer profile gaps for Bi-NON & chillchillshit / Na$ty / Toyn remain `public-source-gap`.
- Current generated state after regeneration: future core-field queue rows stayed at 25, future missing core fields dropped from 69 to 67, uncertain core fields stayed at 5.

Sources used in this pass:

- SmartShanghai Specters venue context: `https://www.smartshanghai.com/venue/34241/specters_c_park`
- SmartShanghai EXIT venue context: `https://www.smartshanghai.com/venue/31776/exit`

Workflow rule: venue-context sources can fill `address`, but they must not be treated as current-event confirmation for start time, lineup, door price, ticket route, or age policy.

## 2026-06-14 Ticketing/Core Field Pass

Continued the core-field queue with public source evidence instead of inferred details.

- `jasmin-knopha`: upgraded the address from an approximate Changle/Shaanxi Nan Lu note to `Green Station, 462 Changle Lu, near Shaanxi Nan Lu, Huangpu District` using SmartShanghai Green Station and prior Heim Sauna venue context. Time, price, age, ticket route, and Instagram post visibility remain `public-source-gap`.
- `cyber-buddha`: added 247tickets as a public ticketing source and set the ticket URL to its e-ticket page. SmartShanghai and 247tickets both support Star@ Cultural Center Dream Hall / 179 Yichang Lu, so the RA venue-name discrepancy is now recorded as a source-label conflict rather than a blocking address gap.
- Added tracked performer profiles for The Hymmapan Electron, Taiga, and MICO so Cyber Buddha's lineup has source-backed artist context instead of only event-page names.
- Current generated state after regeneration: future core-field queue rows dropped from 25 to 24, missing core fields dropped from 67 to 65, uncertain core fields dropped from 5 to 4, and future performer profile gaps dropped from 9 to 6.

Sources used in this pass:

- SmartShanghai Green Station venue context: `https://www.smartshanghai.com/venue/34378/green_station`
- SmartShanghai Butterfree / Heim Sauna context: `https://www.smartshanghai.com/event/butterfree-w-luxixi-bass-techno-club-music-2026-06-06`
- SmartShanghai Cyber Buddha event: `https://www.smartshanghai.com/event/cyber-budha-the-hymmapan-electron-taiga-mico-2026-06-26-1`
- 247tickets The Hymmapan Electron: `https://www.247tickets.com/t/the-hymmapan-electron-shanghai`
- Tuktuk Radio The Hymmapan Electron performance context: `https://www.youtube.com/watch?v=Wrwf5fj4zNI`
- Star Wax Taiga profile: `https://www.starwaxmag.com/news/taiga`
- WOMEX Taiga profile: `https://www.womex.com/virtual/more_zvukov_agency/taiga`
- MICO Liu Wei Bandcamp release context: `https://e-werk.bandcamp.com/album/-`
- Chinese electronic music profile context: `https://electronicmusicinformation.com/gw/index/article_details.html?drysaltery_id=4064`

Workflow rule: when two current public ticketing/event sources agree on venue/address and RA preserves a different venue label, use the ticketing venue for planning fields and keep the discrepancy visible in `venueReconciliation`.

## 2026-06-15 Current/Future-Only Sweep Policy

Applied the user's correction that source updates should only target currently happening or future events.

- Source sweep remains the first step, but archive rows are not rechecked or rewritten unless the user explicitly asks for archive repair.
- `scripts/scrape-events.js` now queues seed event detail pages only when the event is not past by the Shanghai archive cutoff.
- `lastChecked` now updates only after a verified source check succeeds. Failed, browser-required, anti-bot, or archive sources keep their prior checked state instead of receiving a fresh date.
- Freshness is now SLA-based instead of requiring every source date to equal today's date: 2 days for normal future event sources, 1 day for near-event sources, and 30 days for DJ profile sources.
- New parsed Watch rows now receive a `ticketStatus` caveat that asks readers to verify ticket route, price tiers, availability, age policy, and venue details before planning.
- The latest sweep produced 90 events, 33 future rows, 0 stale future rows, 0 missing ticket-status rows, and no past rows refreshed on 2026-06-15.

Discovery rules used:

- Gate A: add source-backed Shanghai activities when the event/source text itself signals techno, rave, electronic, club, warehouse, bass, hard dance, breaks, jungle, UKG, trance, electro, EBM, acid, industrial, or related local-nightlife context.
- Gate B: add events when lineup, DJ profile, aliases, label, promoter, or venue context matches tracked techno-relevant artists. This inventory is not complete and must keep expanding.
- For anti-scrape platforms, use platform-native search before direct deep links. XHS, WeChat, Weibo, ticket widgets, RA DataDome pages, and SmartShanghai dynamic ticket states require Browser/Chrome visual verification before updating source freshness. Instagram is public/index-only and not login-assisted.

Current unresolved source queues:

- `quality.coreFieldQueue`: 23 future rows, 66 missing core fields, 4 uncertain core fields.
- `quality.platformVerificationQueue`: 5 rows needing platform-native visual checks.
- `quality.failedSourceReports`: 17 source reports still failed or require browser handling.

Validation passed:

- `node scripts/scrape-events.js`
- `npm run seo`
- `node scripts/audit-events.js`
- `node --test tests/event-cross-links.test.js tests/trust-framework.test.js`
- `node scripts/check.js`
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs --json`
- `npm run check`

## 2026-06-15 Liminal DJ Profile Gap Pass

Ran the source sweep first, then used the core-field and performer-profile queues for targeted repair.

Changes:

- Added `Rainsoft` to `config/tracked-dj-profiles.json` with social-index profile/lineup context from Liminal Dreams and Wigwam search results.
- Added `Toss` to `config/tracked-dj-profiles.json` with RA profile context from the prior Voltmar & Toss Wigwam listing plus current Liminal Dreams lineup-search context.
- Kept `IIN` unresolved because available public results only surface the current Liminal Dreams lineup text, not an independent artist/profile source.
- Reworded `botox-fatale` lineup evidence so SmartShanghai-confirmed Botox Fatale is the confirmed headliner; support names remain in social-index source notes until platform-visible confirmation.

Result:

- Future performer missing profile sources dropped from 3 to 1.
- Future performer profile sources rose from 78 to 80.
- Tracked DJ profiles rose from 92 to 94.
- Future uncertain core fields dropped from 4 to 3.
- `liminal-dreams` still needs direct platform verification for time, lineup, ticket route, door price, and age policy.

Sources:

- SmartShanghai June 2026 clubbing guide: `https://www.smartshanghai.com/articles/nightlife/the-shanghai-clubbing-guide-june-2026`
- Liminal Dreams Instagram event/profile search preview: `https://www.instagram.com/p/DZXV8WINwkB/`
- Liminal Dreams x Wigwam lineup/time search preview: `https://www.instagram.com/p/DZFFVIPE8VW/`
- RA Voltmar & Toss at Wigwam profile context: `https://de.ra.co/events/1989830`

Validation passed:

- `node scripts\scrape-events.js`
- `npm run seo`
- `node scripts\audit-events.js`
- `node --test tests\event-cross-links.test.js tests\trust-framework.test.js`
- `node scripts\check.js`
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs --json`

## 2026-06-15 Poster Coverage And Display Pass

No new external source search was performed in this pass. The audit used local `data/events.json`, `data/poster-archive.json`, `config/curated-events.json`, generated event pages, and downloaded files in `assets/posters/`.

Poster coverage result:

- RA Shanghai event coverage remains complete: 41 expected, 41 covered, 0 missing.
- RA visible/upcoming event coverage remains complete: 15 expected, 15 covered.
- Every RA coverage row has a local `posterUrl` and at least one `posterEvidence.localFiles` entry.
- `assets/posters/` currently has 110 local image files.
- `data/poster-archive.json` has 47 poster records, 47 optimized display assets, 24 venues, about 8.83 MB optimized display payload, and about 29.55 MB raw source payload.
- Current/future rows: 32. Current/future rows with local poster evidence: 18. Current/future rows without local poster evidence: 14.

Remaining current/future poster gaps:

- `jasmin-knopha`
- `liminal-dreams`
- `botox-fatale`
- `devils-dancers`
- `shanghai-mushroom-music-carnival-2026`
- `anika-kunst`
- `hexscape`
- `jaal`
- `truth-lies`
- `youshan-warmup`
- `shenwave-music-festival-2026`
- `misa-shanghai-summer-music-festival-2026`
- `west-bund-dream-center-waterfront-music-festival-2026`
- `the-magic-of-tomorrowland-shanghai-2026-watch`

Display changes made from local evidence:

- `poster-wall.html` now uses the browser's current Asia/Shanghai date for Upcoming filtering instead of a stale hardcoded date.
- Event cards now show a lineup preview after `How we recommend`.
- Poster modal now displays lineup, recommendation, best-for, verify-before-going, source-confidence, address, price, age, and source label.
- `Resident Advisor` source labels are visible on the poster wall instead of being converted to a generic source label.
- Updated stale RA confidence text on 10 events so it correctly says local flyer assets are stored under `assets/posters` and recorded in `posterEvidence.localFiles`.

Validation:

- `npm run seo` regenerated 89 event pages and sitemap.
- `node scripts/check.js` passed.
- `node --test tests/trust-framework.test.js tests/event-cross-links.test.js` passed.
- `node scripts/audit-events.js` passed with stale future 0 and missing ticket-status 0.
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs --json` passed with must_fix 0 and should_fix 0.
- `npm run check` passed with 66 tests.
- Local Playwright smoke test confirmed `poster-wall.html` Upcoming count 32, first visible event Jun 17, modal opens, Resident Advisor source renders, and 5 insight rows render.

## 2026-06-15 Future Poster Scrape Retrospective

Goal: find posters for current and future rows without risking account warnings or treating social-index snippets as downloadable poster evidence.

Successful routes kept for future scraping:

- Dongfang Performance / ShowStart event detail pages: the JAAL / Endgame listing exposed the correct event flyer in page HTML as a `s2.showstart.com` image. The first extracted sidebar images were unrelated recommendations, so the reliable method is to inspect image context around the event-detail body and visually confirm the flyer before use.
- Shanghai Municipal Administration of Culture and Tourism pages: the MISA article exposed static `cmsres` images. The first image was the official 2026 MISA key visual and was safe to save as a festival poster because it names the festival and Jul 5-Jul 20 date window.
- Sina / Weibo article mirrors: the Mushroom Music Carnival article exposed Weibo image URLs. Direct `wx4.sinaimg.cn/middle/...` requests returned 403, but a single retry with the article URL as `Referer` succeeded. The selected lineup poster visibly confirmed Jun 27, Shanghai Qiantan Sports Park, and the announced artists.
- Temporary candidate review: candidates were downloaded to `output/poster-candidates`, combined into a contact sheet, visually inspected, then only confirmed event-specific posters were copied into `assets/posters/`. The temporary folder was removed after use.
- Local asset publishing: each accepted poster received a local `posterUrl`, `posterEvidence`, optimized display image, poster archive record, and regenerated event detail page. The archive grew from 47 to 50 poster records.

Assets added:

- `assets/posters/jaal-endgame.jpg` and `assets/posters/jaal-endgame-optimized.jpg`
- `assets/posters/shanghai-mushroom-music-carnival-2026.jpg` and `assets/posters/shanghai-mushroom-music-carnival-2026-optimized.jpg`
- `assets/posters/misa-shanghai-summer-music-festival-2026.jpg` and `assets/posters/misa-shanghai-summer-music-festival-2026-optimized.jpg`

What did not work or should not be repeated:

- SmartShanghai June guide images were not reliable event posters for most missing Watch rows. The guide contains useful text leads, but nearby images often belong to other events or editorial sections. Do not attach them unless the image caption/context identifies the exact event.
- Search image results for `Jasmin + Knopha`, `Liminal Dreams`, `Botox Fatale`, and similar rows returned unrelated posters, old artist/event images, or generic festival art. Do not use these as event poster evidence.
- Instagram/XHS/social post images were not fetched by script. Current usable evidence for those rows remains search-index/social-lead only; next checks must use XHS and WeChat platform-native Browser/Chrome search first. Instagram should not require login and remains public/index-only.
- JAAL page sidebar/recommendation images looked like usable posters at first but were unrelated events. Always inspect HTML context and visually verify event title/date/venue before accepting a downloaded image.
- Citywide campaign images from Shanghai Tonight / commerce pages should not be attached to specific Watch items such as West Bund or Tomorrowland unless the image names that event.
- When PowerShell writes non-ASCII source names into JSON, encoding can corrupt Chinese labels. Use ASCII source labels such as `Dongfang Performance / ShowStart event listing` unless the file/tooling path is known to preserve UTF-8.

Remaining current/future poster gaps after this pass:

- `jasmin-knopha`
- `liminal-dreams`
- `botox-fatale`
- `devils-dancers`
- `anika-kunst`
- `hexscape`
- `truth-lies`
- `youshan-warmup`
- `shenwave-music-festival-2026`
- `west-bund-dream-center-waterfront-music-festival-2026`
- `the-magic-of-tomorrowland-shanghai-2026-watch`

Next verification route:

- Use platform-native XHS and WeChat search for venue/promoter/event/date combinations before opening deep links.
- Ask the user before using a logged-in Chrome/XHS or WeChat session. Do not ask for Instagram login.
- Keep missing posters marked as gaps when the organizer has not published a stable public poster or when the poster is only behind a gated social surface.

## 2026-06-15 XHS and WeChat/Sogou Platform Check

Goal: test whether XHS and WeChat/Sogou can safely confirm remaining current/future poster gaps before using Instagram or broader image search.

Routes tested:

- XHS platform search opened successfully for an Abyss / Botox Fatale query, but public search results were hidden behind the login modal. No event fact or poster was confirmed. Screenshot: `output/platform-checks/xhs-botox-fatale-abyss.png`.
- WeChat/Sogou article search initially worked without captcha. Queries for Abyss, Wigwam, POTENT, Heim, ILLUM, EXIT, Specters, and event/date/DJ phrases returned either no result, SmartShanghai June 2026 mirror snippets, unrelated articles, or old Wigwam historical articles.
- WeChat/Sogou account search for the English venue names did not return visible official certified venue accounts, so there was no account page to click into for current posts.
- A later expanded keyword batch with more date-specific queries triggered a Sogou verification/captcha page. Screenshot example: `output/platform-checks/wechat-expanded-wigwam-youshan-627-en-cn.png`. The route was stopped immediately.

Editorial outcome:

- No canonical event fields, poster assets, or confidence status were updated from this check.
- SmartShanghai mirrors found through Sogou are duplicates of existing SmartShanghai evidence, not independent confirmations.
- Old Wigwam account articles are venue/history context only and do not confirm the 2026 Youshan warmup or Liminal Dreams rows.
- XHS remains the better next social route, but it requires user login-assisted viewing in Chrome/browser for search results. WeChat/Sogou should be retried only in smaller batches, or from user-provided official-account links/QR routes.

Workflow lesson:

- On anti-scrape surfaces, platform-native search is correct, but query volume must stay low. Stop immediately on verification/captcha and mark the route `captcha-stopped` rather than trying more keywords.

## 2026-06-15 User-Provided Heim WeChat / Ticketing Evidence

The user supplied eight Heim images from WeChat/XHS/ticketing context. They included official-looking Heim monthly-program screenshots, WeChat article screenshots, posters, and ticketing-homepage screenshots. Ticketing-homepage screenshots were accepted as usable poster/evidence assets when they visibly named the event, date, time, price, venue, and ticket state.

Assets copied into `assets/posters/`:

- `heim-long-wave.jpg`
- `heim-earworthy-selected-sound.jpg`
- `heim-invites-jasmin-knopha.jpg`
- `heim-dina-ticket.jpg`
- `heim-discchef-roto-ticket.jpg`
- `heim-june-2026-schedule.jpg`
- `heim-june-2026-wechat-article-1.jpg`
- `heim-june-2026-wechat-article-2.jpg`

Canonical updates:

- Added `heim-long-wave` for Jun 18 at Heim. Poster confirms LONG WAVE / Dragon Boat Festival Special, 22:00-late, Heim, Changle Road / M101 location, and lineup: Golgol, SpaceReturn, Sam Tbd, Xiaolaba. Price, ticket route, and age policy remain gaps.
- Added `heim-earworthy-selected-sound` for Jun 19 at Heim. Poster confirms Side B-SH, 16:00-02:00, Heim, Changle Road / M101 address, and lineup context. Price, ticket route, age policy, and final TBA additions remain gaps.
- Updated `jasmin-knopha` with Heim poster/monthly/article evidence. Lineup now includes Sylo, Jasmin, and Knopha. Poster is stored locally. Ticket route, door price, age rule, and exact set times remain gaps, so the event stays Watch.
- Added `heim-invites-dina` for Jun 26 at Heim. Ticketing screenshot confirms title, 2026-06-26 22:00, price from 66 RMB, Changle Road M101 Heim, e-ticket, standing event, and no-refund label. Article/monthly screenshots support DINA, Huizit, Kilo-Vee, and HeShang. Direct ticket URL and age policy remain gaps.
- Added `heim-discchef-roto-anniversary` for Jun 27 at Heim. Ticketing screenshot confirms title, 2026-06-27 22:00, price from 66 RMB, Changle Road M101 Heim, e-ticket, standing event, and no-refund label. Article/monthly screenshots support Roto, 2Difficult, and BIANBIAN. Direct ticket URL and age policy remain gaps.

Workflow note:

- User-provided screenshots can be promoted into canonical evidence only when the visible image itself confirms event facts. Use `ticketing-screenshot` or `official-wechat-screenshot` status, keep a local `posterEvidence.localFiles` trail, and keep missing direct ticket URLs or age policies as explicit gaps instead of inventing links.
- Follow-up clarification: the two ticketing-homepage screenshots are from the Yuyuan WeChat mini-program and were manually confirmed by the user. Treat them as event-level ticketing evidence and acceptable poster-wall visuals after compression, but do not create a fake public `ticketUrl`; record the route in `ticketStatus`, `sourceConfidence`, and source notes.
- Poster-wall handling: use the event-specific poster, or a cropped upper cover from the Yuyuan ticketing screen, as the main `posterUrl`. Keep complete ticketing screenshots, Heim monthly schedule, and article screenshots as `posterEvidence.localFiles` unless the event has no better event-specific visual.
- Cropped ticketing visuals generated for poster wall display: `heim-dina-ticket-cover.jpg` and `heim-discchef-roto-ticket-cover.jpg`. The full ticketing screenshots remain source evidence for price, time, address, e-ticket, standing, and no-refund facts.

## 2026-06-15 User-Provided Wigwam Screenshot Ingest

The user supplied ten Wigwam images covering the June program calendar, a 2026-06-15 to 2026-06-22 weekly schedule, event posters, Liminal Dreams notes, and artist profile slides. They were treated as user-provided official-social/poster evidence when the visible image itself named the event, date, venue, lineup, entry state, or artist context.

Assets copied into `assets/posters/` and optimized for poster-wall/display use:

- `wigwam-june-2026-calendar.jpg`
- `wigwam-weekly-2026-06-15-to-06-22.jpg`
- `wigwam-weekly-listening-golgol-2026-06-16.jpg`
- `wigwam-weekly-listening-xiaolaba-2026-06-17.jpg`
- `wigwam-weekly-listening-wheon-2026-06-19.jpg`
- `wigwam-liminal-dreams-2026-06-20.jpg`
- `wigwam-liminal-dreams-2026-06-20-notes.png`
- `wigwam-golgol-profile.jpg`
- `wigwam-xiaolaba-profile.jpg`
- `wigwam-wheon-profile.jpg`

Canonical updates:

- Added `wigwam-weekly-listening-golgol` for Jun 16 at Wigwam, 22:00-late, Free Entry. The event poster, weekly schedule, monthly calendar, Golgol profile slide, and SmartShanghai venue context are attached. Recommendation focuses on textured electronics, low-frequency phrasing, and a listening-first route.
- Added `wigwam-weekly-listening-xiaolaba` for Jun 17 at Wigwam, 22:00-late, Free Entry. The event poster, weekly schedule, monthly calendar, Xiaolaba profile slide, and venue context are attached. The recommendation stays conservative because the profile slide confirms identity but not a detailed public genre biography.
- Added `wigwam-weekly-listening-wheon` for Jun 19 at Wigwam, 22:00-late, Free Entry. The event poster, weekly schedule, monthly calendar, wheon profile slide, and venue context are attached. Recommendation calls it the strongest techno-adjacent Weekly Listening entry from this batch because the profile text names darkness, tribe, industrial, deep techno, psytrance, and experimental borders.
- Updated `liminal-dreams` with event poster, text-note screenshot, weekly schedule, monthly calendar, and venue context. It is now a Medium-confidence upcoming event with lineup Chingyi, IIN, Rainsoft, and Toss, Free Entry, and an explicit time conflict: event poster says 20:00-late, weekly schedule says 22:00-late. Keep exact start time as a verify-before-going field.
- Updated `friendsstandout` with Wigwam weekly/monthly schedule support for Free Entry and 21:00-late while preserving RA as the primary public event source.
- Updated `youshan-warmup` with the Wigwam monthly calendar as supporting evidence that Jun 27 is a YOUSHAN 2026 warmup / Shanghai stop and ticketed. It remains Watch because the visible screenshot does not expose start time, price, direct ticket route, age policy, or full lineup.

DJ profile updates:

- Added or enriched `wheon`, `IIN`, `Golgol`, `Xiaolaba`, `Chingyi`, `Rainsoft`, and `Toss` with screenshot-backed notes and clear source-status caveats.
- Local screenshot sources do not count as HTTP source URLs in the strict audit script, so venue-context HTTP URLs were added as context-only entries where needed. Do not treat those context URLs as event confirmation.

Not added from this batch:

- Jun 24 `Mama River by Heim`
- Jun 25 `DUANLUOO`
- Jun 26 unclear row that appears to read `迷猪`
- Jun 28 `Call A Taxi`

Reason: they were visible only as monthly-calendar leads in this pass, without enough event-specific poster/core-field evidence to add as firm listings. Recheck next pass through Wigwam/XHS/WeChat/platform-native routes or user-provided screenshots.

Validation:

- `npm run posters:prepare` generated/confirmed optimized display assets and `data/poster-archive.json` with 59 poster records / 10.32 MB display payload.
- `node scripts/scrape-events.js` passed with `SCRAPE_MAX_DETAIL_PAGES=0`: 96 events, 76 curated updates, 40 tracked DJ itinerary rows.
- `node scripts/generate-seo-pages.js` generated 96 event detail pages and `sitemap.xml`.
- `node scripts/check.js` passed: 3362 local links across 119 HTML/CSS files and 27 inline scripts.
- `npm run check` passed with 70 tests.
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs --json` passed with 0 must-fix and 0 should-fix findings.

## 2026-06-15 User-Provided Abyss / Yuyuan Ticketing Evidence

The user supplied Abyss June program and Yuyuan WeChat mini-program ticketing screenshots. Treat these as manually confirmed ticketing evidence when the screenshot itself shows title/date/time/venue/price/ticket state. Do not invent public ticket URLs from mini-program screenshots.

Assets copied and optimized under `assets/posters/`:

- `abyss-june-2026-program.png`
- `abyss-kirk-ticket.png`
- `abyss-kirk-ticket-cover.jpg`
- `abyss-hardcore-melancholia-ticket.png`
- `abyss-hardcore-melancholia-clean-source.png`
- `abyss-hardcore-melancholia-cover.jpg`
- `abyss-botox-fatal-ticket.png`
- `abyss-botox-fatal-ticket-cover.jpg`
- `abyss-cum-chemical-love-ticket.png`
- `abyss-cum-chemical-love-clean-source.jpg`
- `abyss-cum-chemical-love-cover.jpg`

Canonical updates:

- Added `abyss-faq-kirk` for Jun 19 at Abyss Shanghai, 22:00, 110 RMB+, with lineup Kirk / Shukai / Fischmonger / SHU / PASHRAWBOI / Headrush b2b Nitta.
- Added `abyss-hardcore-melancholia` for Jun 20 at Abyss Shanghai, 22:00, 100 RMB+, with lineup LOLALITA / BRENNT / XIWI / Not Your Daddy / DJ LOVERBOY.
- Upgraded `botox-fatale` from Watch to a Medium-confidence upcoming event: `Obsesion Total: BOTOX FATAL (live)`, Jun 26 at Abyss Shanghai, 22:00, 90 RMB+, with lineup BOTOX FATAL / TUI / Kong BB / Noodleprince.
- Added `abyss-cum-chemical-love` for Jun 27 at Abyss Shanghai, 22:00, 90 RMB+, with lineup Discipline b2b PRYMARA / LaGlory / FMRL / Extreme John / GOGA / Oil Nature.

DJ profile updates:

- Added screenshot-backed event-role profiles for new Abyss lineup names that lacked standalone public sources.
- Existing stronger profiles such as DISCIPLINE, PASHRAWBOI, EXTREME JOHN, Oil Nature, and BOTOX FATAL were enriched with Abyss screenshot evidence and itinerary rows without replacing their stronger RA / public-source context.

Poster handling:

- Ticketing homepage screenshots remain full evidence files.
- Poster wall uses cropped upper cover images or clean source images with the lower ticketing menu removed.
- `npm run posters:prepare` generated optimized display assets and `data/poster-archive.json` now has 63 poster records.

Open gaps:

- No direct public ticket URL was captured for the Yuyuan mini-program pages.
- Age policy and final running order/set times are not visible in the screenshots.
- Abyss monthly poster rows for Jun 5, Jun 6, Jun 12, and Jun 13 are past as of 2026-06-15, so they were not added as new future listings in this pass.

Validation:

- `node scripts/scrape-events.js` with `SCRAPE_MAX_DETAIL_PAGES=0`: 99 events, 79 curated updates, 40 tracked DJ itinerary rows.
- `npm run posters:prepare`: 12 Abyss poster assets optimized, 63 poster records generated.
- `node scripts/generate-seo-pages.js`: generated 99 event detail pages and `sitemap.xml`.
- `node scripts/check.js`: passed, 3460 local links across 122 HTML/CSS files.
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs --json`: 0 must-fix, 0 should-fix.
- `npm run check`: passed with 70 tests.

## 2026-06-16 User-Provided Yuyintang / ShowStart Evidence

The user supplied Yuyintang screenshots for Cooling Water and Lucrecia Dalt. Treat the screenshots as manually confirmed evidence only for visible facts, and use public ShowStart / LocalHub pages as the current event-level HTTP sources. Do not infer missing age policy or running order from QR/ticket screenshots.

Assets copied and optimized under `assets/posters/`:

- `yuyintang-cooling-water-2026-07-03.jpg`
- `yuyintang-cooling-water-2026-07-03-optimized.jpg`
- `yuyintang-cooling-water-wechat-article.jpg`
- `yuyintang-cooling-water-wechat-article-optimized.jpg`
- `lucrecia-dalt-yuyintang-2026-07-16.jpg`
- `lucrecia-dalt-yuyintang-2026-07-16-optimized.jpg`
- `lucrecia-dalt-yuyintang-wechat-profile.jpg`
- `lucrecia-dalt-yuyintang-wechat-profile-optimized.jpg`
- `lucrecia-dalt-yuyintang-ticket-info.jpg`
- `lucrecia-dalt-yuyintang-ticket-info-optimized.jpg`

Canonical updates:

- Added `yuyintang-cooling-water` for Jul 3 at Yuyintang Music Park B Hall, 20:00-23:00, with Handycam / ABYSM / Tuihua Lichang / Wu Xiaotian Erin, 98 / 128 / 158 RMB, and ShowStart ticket source `https://www.showstart.com/event/300239`.
- Added `lucrecia-dalt-yuyintang` for Jul 16 at Yuyintang Music Park C Hall, 20:30-22:00, with Lucrecia Dalt, 180 / 220 RMB, and ShowStart ticket source `https://www.showstart.com/event/300583`.
- Added LocalHub venue-index corroboration for Yuyintang B Hall and C Hall; keep ShowStart as the direct ticketing source.
- Recommendation copy focuses on why to go: Cooling Water is a live/listening-first experimental bill, while Lucrecia Dalt is a high-signal experimental-electronic listening-room booking rather than a peak-time rave pick.

DJ profile updates:

- Added screenshot/event-role profiles for `Handycam`, `ABYSM`, `Tuihua Lichang`, and `Wu Xiaotian Erin` with conservative source notes.
- Added `Lucrecia Dalt` with ShowStart event evidence plus artist/label context from the official site and RVNG Intl catalog, without using those profile sources as event confirmation.

Open gaps:

- Age policy was not visible for either event.
- Final running order, support details, and set times beyond public event windows were not visible.
- One Cooling Water WeChat article/ticket screenshot contains a lower ticket-block conflict (`10.28 SAT`); ShowStart and the clean Yuyintang poster remain the current date/time sources for the Jul 3 event.
- RA Bloom direct HTTP fetch returned 403 during the same freshness pass; source state was refreshed from public indexed RA text and recorded as browser/index verification rather than direct scripted fetch.

Validation:

- `node scripts/scrape-events.js` with `SCRAPE_MAX_DETAIL_PAGES=0`: 101 events, 81 curated updates.
- `npm run posters:prepare`: 65 poster records generated, including the five Yuyintang evidence/display assets.
- `node scripts/generate-seo-pages.js`: generated 101 event detail pages and `sitemap.xml`.
- `node scripts/check.js`: passed, 3525 local links across 124 HTML/CSS files and 27 inline scripts.
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs --json`: 0 must-fix, 0 should-fix.
- `npm run check`: passed with 71 tests.

## 2026-06-16 User-Provided ILLUM / WeChat Ticketing Evidence

The user supplied ILLUM Shanghai official-account screenshots and ticketing screenshots for three future events. Treat these screenshots as manually confirmed evidence for visible facts only. SmartShanghai ILLUM remains venue-context only and must not be treated as event confirmation. No direct public ticket URL was visible, so event source links point to retained local evidence screenshots.

Assets copied, cropped, and optimized under `assets/posters/`:

- `illum-gravity-2026-06-18-poster-source.jpg`
- `illum-gravity-2026-06-18-poster.jpg`
- `illum-gravity-2026-06-18-ticket.jpg`
- `illum-gravity-2026-06-18-wechat.jpg`
- `illum-normie-10k99-2026-06-19-poster-source.jpg`
- `illum-normie-10k99-2026-06-19-poster.jpg`
- `illum-normie-10k99-2026-06-19-ticket-home.jpg`
- `illum-normie-10k99-2026-06-19-ticket-cover.jpg`
- `illum-normie-10k99-2026-06-19-ticket-detail.jpg`
- `illum-normie-10k99-2026-06-19-wechat.jpg`
- `illum-soback-2026-06-20-poster.jpg`
- `illum-soback-2026-06-20-ticket.jpg`
- `illum-soback-2026-06-20-wechat.jpg`

Poster handling:

- Ticketing homepage/detail screenshots are retained as full evidence files.
- Poster wall uses clean poster files or cropped upper images with the lower ticketing menu removed.
- `npm run posters:prepare` generated optimized display assets and `data/poster-archive.json` now has 68 poster records.

Canonical updates:

- Added `illum-gravity-stateofff` for Jun 18 at ILLUM, 22:00-04:00, with StateOFFF / Zein Guz / Qiming / 行么雷, 80 / 100 / 120 RMB.
- Added `illum-normie-10k99` for Jun 19 at ILLUM, 22:00-04:00, with 10K99 / haina from china / GG lobster / DJSYB / Manqing / V-XWI, 85 / 95 / 110 RMB.
- Added `illum-soback-liquid-dolls` for Jun 20 at ILLUM, 22:00-04:00, with SOBACK, 88 / 108 / 128 RMB.
- Added event-role DJ profiles for the new lineup names with conservative screenshot-backed source notes.
- Recommendation copy focuses on why to go: ILLUM's darker visual/bass/experimental lane, the Normie Corp / 10K99 deconstructed-club framing, and SOBACK as a focused tour-stop draw.

Open gaps:

- No direct public ticket URL was visible for any ILLUM event.
- Age policy was not visible for all three.
- Jun 18 Zein Guz and Qiming / 行么雷 preferred spelling should be rechecked if clearer organizer text appears.
- Jun 19 V-XWI support credit is visually unclear.
- Jun 20 support lineup and final running order were not visible.

Validation:

- `node scripts/scrape-events.js` with `SCRAPE_MAX_DETAIL_PAGES=0`: 104 events, 84 curated updates, 40 tracked DJ itinerary rows.
- `npm run posters:prepare`: 68 poster records generated, including 13 ILLUM optimized assets.
- `node scripts/generate-seo-pages.js`: generated 104 event detail pages and `sitemap.xml`.
- `node scripts/check.js`: passed, 3625 local links across 127 HTML/CSS files and 27 inline scripts.
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs --json`: 0 must-fix, 0 should-fix.
- `npm run check`: passed with 72 tests.

## 2026-06-16 User-Provided EXIT / RA Evidence

The user supplied EXIT Shanghai poster, official-account, and ticket-home screenshots for `298 pres. Steal Tapes`. A fresh RA indexed-text check found the same event and also exposed a missing EXIT RA listing for `Minuit pres. MIRROR concept`. Direct scripted RA detail fetch returned 403 for both RA pages, so the event facts are recorded as RA indexed/browser-required verification rather than scripted HTML fetch.

Assets copied, downloaded, cropped, and optimized under `assets/posters/`:

- `exit-steal-tapes-2026-06-20-poster.png`
- `exit-steal-tapes-2026-06-20-wechat.jpg`
- `exit-steal-tapes-2026-06-20-ticket-home.jpg`
- `exit-steal-tapes-2026-06-20-ticket-cover.jpg`
- `exit-steal-tapes-2026-06-20-ra.jpg`

Poster handling:

- Poster wall uses the original user-provided PNG poster as the public display image source.
- The ticket-home screenshot is retained as full evidence; the cropped cover removes lower ticketing UI but is not the primary poster-wall image because a clean poster exists.
- The RA flyer image was downloaded locally as a reference asset.
- `npm run posters:prepare` generated optimized EXIT assets and `data/poster-archive.json` now has 69 poster records.

Canonical updates:

- Added `exit-298-steal-tapes` for Jun 20 at EXIT, 22:00-05:00, with Steal Tapes / Sam TBD. / Queenie. / Max Gross. RA lists 118 RMB; the ticket-home screenshot shows 88 RMB+ as the local ticket-app starting price.
- Added `minuit-mirror-concept` for Jun 18 at EXIT, 22:00-05:00, with MIRROR concept / Mofy / Yoshua, 118 RMB, from RA indexed text.
- Updated RA Shanghai coverage with the two incremental EXIT repairs.
- Added event-role profiles for Steal Tapes, Sam TBD., Queenie., Max Gross, MIRROR concept, Mofy, and Yoshua.
- Recommendation copy focuses on room and sound fit: Steal Tapes as a groove-led underground house / techno EXIT night, and Minuit as a compact late EXIT house / techno route with visible info gaps kept in source confidence and verification notes.

Open gaps:

- No direct mini-program ticket URL was visible for `298 pres. Steal Tapes`.
- Age policy is not visible for either EXIT event.
- `298 pres. Steal Tapes` has a price mismatch: RA indexed text lists 118 RMB, while the ticket-home screenshot shows 88 RMB+.
- `Minuit pres. MIRROR concept` still needs a visible poster or EXIT/Minuit source beyond RA indexed text.

Validation:

- `node scripts/scrape-events.js` with `SCRAPE_MAX_DETAIL_PAGES=0`: 106 events, 86 curated updates, 40 tracked DJ itinerary rows.
- `npm run posters:prepare`: 69 poster records generated, including five EXIT optimized assets.
- `node scripts/generate-seo-pages.js`: generated 106 event detail pages and `sitemap.xml`.
- `node scripts/check.js`: passed, 3694 local links across 130 HTML/CSS files and 43 inline scripts.
- `npm run check`: passed with 79 tests plus site structure, local link, and event audit checks.
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs --json`: still reports existing `/_vercel/insights/script.js` local-link findings on pages that include Vercel Analytics; this is outside the EXIT data update and does not reproduce in the repo's `scripts/check.js`.

## 2026-06-16 User-Provided Yuyuan / Reactor / CLOUD.SU Evidence

The user supplied Yuyuan ticketing screenshots and clean posters for two additional Shanghai electronic events: `DOME | idk Pres. HEALTH MAXXING` at Reactor Shanghai and `Le Youth 2026 China Tour Shanghai` at CLOUD.SU Lounge Rooftop. The screenshots were treated as event-level evidence only for visible facts; no direct mini-program `ticketUrl` was invented.

Assets copied and optimized under `assets/posters/`:

- `health-maxxing-reactor-2026-06-19-poster.jpg`
- `health-maxxing-reactor-2026-06-19-ticket-home.jpg`
- `health-maxxing-reactor-2026-06-19-running-order.jpg`
- `health-maxxing-reactor-2026-06-19-poster-optimized.jpg`
- `health-maxxing-reactor-2026-06-19-ticket-home-optimized.jpg`
- `health-maxxing-reactor-2026-06-19-running-order-optimized.jpg`
- `le-youth-cloudsu-2026-06-27-poster.jpg`
- `le-youth-cloudsu-2026-06-27-ticket-home.jpg`
- `le-youth-cloudsu-2026-06-27-poster-optimized.jpg`
- `le-youth-cloudsu-2026-06-27-ticket-home-optimized.jpg`

Canonical updates:

- Added `health-maxxing-reactor-2026-06-19` for Jun 19 at Reactor Shanghai, 22:00-04:00, 78 RMB+, with will / BIG WESTI / anal / ruima and Body Training Session interludes. Yuyuan confirms ticket labels; Reactor screenshot confirms running order and a before-midnight body-test free-entry note.
- Added `le-youth-cloudsu-2026-06-27` for Jun 27 at CLOUD.SU Lounge Rooftop, 16:30-02:00, 228 RMB+, with Le Youth / Baby Yung / Gabrielle / PAS / Yu-Ya. Yuyuan screenshot shows the ticket state as sold out at screenshot time.
- Updated `config/promotion-platform-network.json`: Reactor's Yuyuan route now includes `HEALTH MAXXING` / `idk`; new network entities were added for `CLOUD.SU Lounge Rooftop`, `Asylum`, and `idk`.

Open gaps:

- No direct public or mini-program ticket URL was visible for either event.
- Age policy was not visible for either event.
- Le Youth ticket status was sold out at screenshot time; recheck Yuyuan or organizer channels before presenting any ticket CTA.
- HEALTH MAXXING's free-entry-before-midnight rule should be rechecked through Reactor/Yuyuan before planning around it.

Validation:

- `node scripts/scrape-events.js` with `SCRAPE_MAX_DETAIL_PAGES=0`: 108 events, 77 promotion-platform routes, 85 Computer Use sources, 88 curated updates.
- `node scripts/optimize-posters.js --archive --all --allow-larger ...`: generated optimized display assets for all five supplied screenshots and `data/poster-archive.json` with 71 poster records.
- `npm run seo`: generated 108 event detail pages and `sitemap.xml`.
- `node scripts/check.js`: passed, 3758 local links across 132 HTML/CSS files and 43 inline scripts.
- `node scripts/audit-events.js`: warnings empty; 108 events, 51 future events, 77 promotion-platform routes.
- `npm run check`: passed with 80 tests plus site structure, local link, and event audit checks.

## 2026-06-17 Automated Shanghai Source Sweep

Ran the source-sweep-first workflow for the current/future Shanghai window with `SCRAPE_NOW=2026-06-17T12:00:00+08:00`, `SCRAPE_FETCH_TIMEOUT_MS=12000`, `SCRAPE_X_FETCH_TIMEOUT_MS=6000`, and `SCRAPE_MAX_DETAIL_PAGES=24`.

Sweep output:

- `node scripts/scrape-events.js`: rewrote canonical data with 112 events, 21 discovered links processed during the scrape pipeline, 0 remaining `discoveredLinks`, 77 promotion-platform routes, 85 Computer Use sources, 91 curated updates, and 40 tracked DJ itinerary rows.
- No new source-backed Shanghai techno-relevant activities were added in this pass; the sweep tightened the existing current/future set instead of expanding it.
- RA Shanghai coverage stayed complete against the manifest: 43/43 covered, 16/16 visible upcoming rows matched, with RA still browser-required because scripted fetches return 403.
- Gate B signal inventory expanded materially through tracked DJ/profile processing: `trackedDjProfiles` 136 -> 155, `curatedDjSourceProfiles` 134 -> 154, `technoArtistSignals` 126 -> 155, and `technoArtistSignalProfiles` 100 -> 120.
- Future-event core-field debt improved but remains substantial: `futureCoreFieldQueue` 46 -> 44 and `futureMissingCoreFields` 112 -> 101.
- Watch-risk counts improved: `futureWatch` 19 -> 17, `singleSourceWatch` 7 -> 5, and `singleConfirmationWatch` 11 -> 9.

Highest-priority remaining public-source gaps after the sweep:

- `jasmin-knopha` (`2026-06-20`): missing `time`, `price`, `age`, `ticketUrl`; still in `quality.platformVerificationQueue`.
- `anika-kunst` (`2026-06-27`): missing `time`, `price`, `age`, `ticketUrl`; still in `quality.platformVerificationQueue`.
- `youshan-warmup` (`2026-06-27`): missing `time`, `age`, `ticketUrl`, and lineup remains uncertain; still in `quality.platformVerificationQueue`.
- `truth-lies` (`2026-06-27`): missing `time`, `price`, `age`, `ticketUrl`.

Derived-file regeneration and verification:

- `npm run seo`: regenerated 112 event detail pages and `sitemap.xml`.
- `npm run posters:prepare`: refreshed `data/poster-archive.json`; no poster binaries changed, 74 poster records emitted.
- `node --test tests/trust-framework.test.js`: passed.
- `node scripts/check.js`: passed after poster-archive regeneration.
- `node scripts/audit-events.js`: still fails on stale current/future source dates concentrated around Jun 14-15 checks, including `wigwam-weekly-listening-xiaolaba`, `cybionte-solo-ykk-heshang`, `heim-long-wave`, `photocult-mask-desire-auction`, `mrd`, `nikita-zabelin-potent`, `onefortyasia-mungk-simbie`, `atm-leo-monira`, `enchanted-night-the-nest`, `neon-jungle-tom-kynd`, `sciahri-potent`, `friendsstandout`, `cyber-buddha`, `dark-room`, `botox-fatale`, `anika-kunst`, `truth-lies`, `youshan-warmup`, `shenwave-music-festival-2026`, `west-bund-dream-center-waterfront-music-festival-2026`, `shaun-soomro-dj-serang`, and `the-magic-of-tomorrowland-shanghai-2026-watch`.
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs --json`: still reports pre-existing must-fix findings, dominated by missing `source` URLs on several rows and local `/_vercel/insights/script.js` link findings across generated pages.

## 2026-06-18 Same-Day Tonight Source Update

Ran a same-day public source refresh for the Jun 18 Shanghai event set using RA, SmartShanghai, and publicly indexed official social posts/profiles. The pass focused on correcting tonight's canonical records instead of doing a broad discovery crawl.

Canonical updates:

- Corrected `minuit-mirror-concept` from the live RA event page: price is 100 RMB and lineup is SLVN, Olivier K, Olivier G, Chabuduo, plus the live camera/VJing concept. Removed stale Mofy/Yoshua MIRROR role profiles from the tracked DJ profile seed so regenerated data follows the current RA lineup.
- Promoted `heim-long-wave` with SmartShanghai details plus Heim social evidence: 22:00-05:00, 88 RMB presale / 108 RMB door, Jing'an Changle Lu address, and Elevator reunion lineup context. The duplicate SmartShanghai watch-only generated event was removed from derived data.
- Updated `illum-gravity-stateofff` from SmartShanghai plus ILLUM screenshot evidence: current title, 80 RMB early bird / 100 RMB presale / 120 RMB door pricing, and lineup State OFFF / Zean / Qin_niQ / GUZ / Xingli Huang.
- Updated `cybionte-solo-ykk-heshang` with POTENT public social-index evidence: support lineup Fat-K / Tayzo / Yomi and a documented time conflict between organizer text and RA's 23:59 listing.
- Added official-public-index support to `photocult-mask-desire-auction` while keeping RA as the primary source.
- Added `girls-night-out-dome` as a low-fit watch entry for The Dome's Thursday series through Jun 25, sourced from SmartShanghai.

Derived regeneration:

- `SCRAPE_MAX_DETAIL_PAGES=0 SCRAPE_FETCH_TIMEOUT_MS=12000 SCRAPE_X_FETCH_TIMEOUT_MS=6000 node scripts/scrape-events.js`: wrote 112 events, 92 curated updates, and 40 tracked DJ itinerary rows.
- `node scripts/generate-seo-pages.js`: regenerated 112 event detail pages and `sitemap.xml`.
- `node scripts/optimize-posters.js --archive --all --allow-larger`: refreshed `data/poster-archive.json` with 75 poster records; no poster binaries changed.

Validation:

- `node scripts/check.js`: passed, 4018 local links across 137 HTML/CSS files and 46 inline scripts.
- `node scripts/audit-events.js`: still fails on pre-existing stale-source audit debt across older Jun 14-16 checked future events. Tonight's edited canonical records are current, but secondary venue/profile sources such as Heim and ILLUM venue pages still inherit older source dates.

## 2026-06-19 Hardcore Melancholia RA Poster and Genre Repair

Updated `abyss-hardcore-melancholia` from the live Resident Advisor event page plus the user-supplied matching poster screenshot.

Canonical update:

- Event title is `Hardcore Melancholia w. Lolalita & BRENNT(LIVE)`.
- Event genre is `trance, hardcore`, using RA's event-level genres and the poster context. Workflow rule: when event genre conflicts with DJ/artist profile genre, use the event genre first because artists can choose a different sound for a specific event.
- Local poster source is `assets/posters/abyss-hardcore-melancholia-ra-flyer.png`; optimized archive display asset is `assets/posters/abyss-hardcore-melancholia-ra-flyer-optimized.jpg`.
- RA source is `https://ra.co/events/2470462`; RA showed Abyss Shanghai, Sat Jun 20 2026, 22:30-05:00, Lolalita / BRENNT / XIWI / Not Your Daddy / DJ LOVERBOY, 120 RMB, and 18+.

RA future-event poster/genre check:

- Checked visible RA Shanghai future rows against poster and genre fields where RA exposed them. RA remains the primary source for event-level genre and flyer evidence.
- Noted new RA future rows that should be handled by a broader ingest pass instead of silently changing this targeted repair: Antigen pres. KAVARI (`https://ra.co/events/2470329`, IDM / Industrial), BELLAGIO SUMMER ROOFTOP PARTY (`https://ra.co/events/2470446`, Techno / House), and Antigen pres. DJ Stingray 313 + Actress (`https://ra.co/events/2470387`, Techno / Experimental).
- Noted one possible RA flyer/display mismatch during visual checking: Heim Invites Jasmín (`https://ra.co/events/2468308`) showed a visible event flyer on the page, but the opened image appeared to resolve to a Long Wave flyer. Recheck before replacing local poster assets.

Validation:

- `node scripts/optimize-posters.js --archive --all --allow-larger assets/posters/abyss-hardcore-melancholia-ra-flyer.png`: generated the optimized Hardcore Melancholia archive asset and refreshed `data/poster-archive.json`.
- `npm run seo`: regenerated 117 event detail pages and `sitemap.xml`.
- Targeted Node verification confirmed canonical event title, `trance, hardcore` genre, RA source URL, poster archive display/source asset, and generated HTML poster/genre/title references.
- `node --test tests/trust-framework.test.js`: passed.
- `node scripts/check.js`: passed, 4200 local links across 145 HTML/CSS files and 48 inline scripts.
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs --json`: still reports pre-existing sitewide audit debt unrelated to the Hardcore Melancholia repair (`events: 117`, `must_fix: 338`, `should_fix: 1`), dominated by unrelated missing event source URLs, local `/_vercel/insights/script.js` findings, and scratch HTML captures.

## 2026-06-19 HOUSE OF ZUP Jun 21 RA Repair

Updated `2026-06-21-house-of-zup-house-disco-hip-hop` from the user-supplied poster and the indexed Resident Advisor event page.

Canonical update:

- Replaced the SmartShanghai watch-level placeholder with RA-backed event facts for `HOUSE OF ZUP` on Sun Jun 21, 2026 at ZUP Pizza Bar.
- Source is `https://ra.co/events/2470695`; SmartShanghai remains secondary local context.
- Time is `15:00-21:00`.
- Venue/address is ZUP Pizza Bar, 457 Shanxi Rd North, Bldg #4 Unit 101, Jing'an District, Shanghai.
- Event genre is `house, italo disco`, using the event-level RA genres before any DJ/profile genre.
- Lineup/running order is F-Mark 15:00-16:00, Skinny Brown 16:00-17:00, huiscat 17:00-18:00, M!R4 18:00-19:00, KOUGAR 19:00-20:00, and IANFABELAR 20:00-21:00.
- RA does not expose cost or age, so price and age remain verify-before-going fields.

Poster and source network:

- Saved the user-supplied poster as `assets/posters/house-of-zup-2026-06-21-ra-flyer.png`.
- Optimized display asset is `assets/posters/house-of-zup-2026-06-21-ra-flyer-optimized.jpg`.
- Added the RA event to `config/ra-shanghai-coverage.json`.
- Added ZUP Pizza Bar to `config/promotion-platform-network.json` with RA, SmartShanghai, XHS/Little Red Book, and Instagram public-index routes.

Validation:

- `node scripts/optimize-posters.js --archive --allow-larger assets/posters/house-of-zup-2026-06-21-ra-flyer.png`: generated the optimized poster and refreshed `data/poster-archive.json`.
- `npm run seo`: regenerated 117 event detail pages and `sitemap.xml`.
- Targeted Node verification confirmed title, `15:00-21:00` time, ZUP Pizza Bar venue, `house, italo disco` genre, RA source URL, poster archive display/source asset, generated HTML poster, generated HTML genre, and generated lineup text.
- `node --test tests/trust-framework.test.js`: passed.
- `node scripts/check.js`: passed, 4200 local links across 145 HTML/CSS files and 48 inline scripts.
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs --json`: still reports pre-existing sitewide audit debt (`events: 117`, `must_fix: 338`, `should_fix: 1`), dominated by unrelated missing event source URLs, local `/_vercel/insights/script.js` findings, and scratch HTML captures.

## 2026-06-19 Automated Shanghai Source Sweep

Ran the source-sweep-first workflow for the current/future Shanghai window with `SCRAPE_NOW=2026-06-19T12:00:00+08:00`, `SCRAPE_FETCH_TIMEOUT_MS=12000`, `SCRAPE_X_FETCH_TIMEOUT_MS=6000`, and `SCRAPE_MAX_DETAIL_PAGES=24`.

Sweep output:

- `npm run scrape`: rewrote canonical data with 117 events, 18 discovered links processed during the scrape pipeline, 0 remaining `discoveredLinks`, 77 promotion-platform routes, 85 Computer Use sources, 92 curated updates, and 40 tracked DJ itinerary rows.
- The sweep expanded the active canonical set by five SmartShanghai-backed watch rows: `2026-06-19-italo-disco-shanghai-s-italian-roofto`, `2026-06-19-vibes-up-party-reggae-dancehall-hip-h`, `2026-06-20-nova-events-presents-sundown-char-bar`, `2026-06-21-house-of-zup-house-disco-hip-hop`, and `2026-06-27-white-party-shanghai-s-all-white-roof`.
- Three older recurring/no-date variants were replaced by current dated canonical rows: `italo-disco-skyline-dome`, `house-of-zup-2026-06-21`, and `white-party-skyline-dome`.
- No new tracked DJ profiles were added in this pass, and no new public-source-backed high-fit Shanghai techno activities were confirmed beyond the automated watch-row additions.
- RA Shanghai coverage still appears complete in canonical data, but scripted RA remains browser-required and the saved RA coverage manifest still audits as stale (`2026-06-16`).

Post-sweep metrics from `data/events.json` / `node scripts/audit-events.js`:

- `events`: 117
- `future`: 49
- `futureWatch`: 20
- `singleSourceWatch`: 9
- `singleConfirmationWatch`: 13
- `futureCoreFieldQueue`: 41
- `futureMissingCoreFields`: 109
- `futureUncertainCoreFields`: 1
- `platformVerificationQueue`: 3
- `trackedDjProfiles`: 175
- `curatedDjSourceProfiles`: 171
- `technoArtistSignals`: 184
- `technoArtistSignalProfiles`: 137

Highest-priority remaining public-source gaps after the sweep:

- `jasmin-knopha` (`2026-06-20`): still missing `time`, `price`, `age`, and `ticketUrl`.
- `anika-kunst` (`2026-06-27`): still missing `time`, `price`, `age`, `ticketUrl`, and a poster.
- `truth-lies` (`2026-06-27`): still missing `time`, `price`, `age`, `ticketUrl`, and a poster.
- `youshan-warmup` (`2026-06-27`): still missing `time`, `age`, `ticketUrl`, with lineup still uncertain.
- `quality.platformVerificationQueue` stayed focused on `anika-kunst`, `youshan-warmup`, and `jasmin-knopha`.

Derived regeneration and verification:

- `node --test tests/trust-framework.test.js`: passed.
- `node scripts/check.js`: passed.
- `node scripts/audit-events.js`: still fails on broad stale `lastChecked` debt across current/future rows and supporting poster/social/profile sources.
- `node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs --json`: still reports pre-existing sitewide audit debt, dominated by rows with missing event `source` URLs and repeated `/_vercel/insights/script.js` local-link findings.
