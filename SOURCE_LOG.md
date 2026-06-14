# Source Log

Last refreshed: 2026-06-14, Asia/Shanghai.

## Source Priority

1. Resident Advisor event pages and city listings for Shanghai electronic event facts.
2. Direct venue, promoter, ticketing, or official artist pages for official updates and conflict resolution.
3. SmartShanghai event pages and monthly clubbing guide for local English context, venue details, and discovery.
4. Public social posts, WeChat mini-program references, Xiaohongshu, Douyin, Instagram, and reposts as discovery leads unless visually verified and corroborated.

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

- `jasmin-knopha`: public search results for Heim/Jasmín/Knopha surfaced a Heim Instagram preview for `06.20 | Heim Invites: Jasmín`, which supports the venue-social route but still does not expose a readable ticket page, door price, set times, or final running order. The canonical row remains Watch and now labels Heim Instagram as a `social-index-lead` until Chrome/Instagram, WeChat, XHS, or ticketing visual verification confirms the post.
- `botox-fatale`, `anika-kunst`, and `truth-lies`: public results returned SmartShanghai plus ambiguous or dynamic Instagram/profile snippets. No RA Shanghai event detail or fully readable venue/promoter/ticketing page was found in this pass, so no confidence upgrade was made.

Follow-up correction in the same pass:

- `botox-fatale`: public search results surfaced the artist/tour Instagram index preview for `26.06 byyb.radio Shanghai`, `26.06 ABYSS Shanghai`, and `27.06 OIL Shenzhen`. Added it as `social-index-lead`; it strengthens the Abyss date lead but does not confirm ticket route, door price, set times, or current platform-visible post state. Keep as Watch until Chrome/Instagram platform-native search, Abyss, promoter, RA Shanghai, or ticketing confirms practical details.
- `anika-kunst`: public search results surfaced an official `potent_club` Instagram index preview for `POTENT JUNE 2026` naming `@anikakunstmuzik`. Added it as `social-index-lead`; it identifies the likely platform-native Chrome/Instagram verification target but does not confirm the June 27 poster card, ticket route, door price, or set times. Keep as Watch until POTENT, RA Shanghai, ticketing, or visually verified official social evidence confirms practical details.
- `liminal-dreams`: public search results surfaced Liminal Dreams and Wigwam Instagram index previews tying the series to Wigwam and `JUNE 20 @liminal_dreams_`. Added them as `social-index-lead` rows; this lowers single-source risk but still does not confirm lineup, start time, ticket route, door price, or age policy. Keep as Watch until platform-native Instagram/XHS/WeChat, Wigwam, or ticketing verification confirms practical details.

2026-06-14 follow-up on `liminal-dreams`:

- Public search-index results surfaced an additional Liminal Dreams/Wigwam Instagram result at `https://www.instagram.com/p/DZFFVIPE8VW/` with tentative lineup/time text: Chingyi, IIN, Rainsoft, Toss, June 20, 2026, and 20:00-late.
- Added this as `social-index-lead` only and added lineup notes that explicitly say platform-native visual confirmation is still required.
- Decision: keep `liminal-dreams` as Watch and keep SmartShanghai as the only readable event-level confirmation source until Instagram/XHS/WeChat, Wigwam, or a ticketing route confirms the visible post, door price, age policy, and final lineup.

2026-06-14 field-first Watch pass:

- Workflow correction: for future high-fit Watch items, fill practical fields first, then pursue second-source confirmation. Practical fields include event time, address, price, age policy, ticket route, poster, lineup, venue context, and DJ/source notes.
- Added venue-context addresses for `jasmin-knopha`, `liminal-dreams`, `botox-fatale`, `anika-kunst`, `truth-lies`, and `youshan-warmup` from SmartShanghai venue pages or RA venue context. These venue rows improve practical usability but do not count as second event confirmation.
- Added tentative social-index lineup/time details for `liminal-dreams` and tentative social-index lineup details for `youshan-warmup`; both remain Watch until platform-native visual confirmation or ticketing/venue pages confirm final details.

Second follow-up in the same queue:

- `botox-fatale`: public search results surfaced an official Abyss Instagram June-program preview containing `BOTOX FATAL (LIVE)` plus `TUI`, `Kong BB`, and `Noodleprince`, but the snippet is adjacent to a separate Saturday June 27 C.U.M listing. Added it as `social-index-lead` only. Next check should enter Instagram through Abyss search/profile, open the visible June program post, and verify whether Botox Fatale is on Friday June 26, what support names are attached, and whether ticket or door details are visible.
- `youshan-warmup`: public search results surfaced the official Wigwam Instagram route with `JUNE 27 @youshanmusicfestival` in June-program context. Added it as `social-index-lead` only because the warmup lineup, start time, ticket route, and door policy remain missing. Next check should use Wigwam / YOUSHAN platform-native Instagram, XHS, or WeChat search before opening any known deep link.

Browser follow-up:

- Instagram public-session check via Playwright/Chrome started at `https://www.instagram.com/`; the public homepage exposed language options but no usable platform search. Opening `abyss_shanghai` and `wigwam.live` account pages reached page titles and image placeholders only; both account navigations timed out before visible post text loaded. No event date card, lineup, ticket route, door price, set times, or June program body text was confirmed.
- Keep `Abyss Instagram June 2026 program search preview` and `Wigwam Instagram June 2026 program search preview` as `social-index-lead`. Next practical step requires logged-in Chrome/Instagram platform-native search, or XHS/WeChat official-account search if Instagram remains gated. Do not promote either row based on public-session Instagram metadata alone.

Workflow rule: search-index snippets can reveal where to look next, but they should not promote a Watch item. Use platform-native search or Chrome visual verification before treating Instagram/XHS/WeChat content as event-level confirmation.

## 2026-06-14 Confirmation Source Audit

Added a stricter Watch queue metric in `scripts/scrape-events.js` and `scripts/audit-events.js`: `sourceCount` counts all unique source URLs, while `confirmationSourceCount` counts only sources that can confirm the current event row. Social index previews, social leads, artist profiles, artist-itinerary context, previous-series context, venue context, radio context, and off-city festival context are excluded from confirmation counts.

Current result after regeneration:

- Future Watch rows: 19.
- Single-source Watch rows by raw URL count: 5.
- Single-confirmation-source Watch rows: 13.
- High-priority Watch rows still needing a second event-level confirmation source: `jasmin-knopha`, `botox-fatale`, `anika-kunst`, `truth-lies`, and `youshan-warmup`.
- `jaal` now shows 3 total sources and 2 confirmation sources, so it stays Watch for practical detail checks rather than source-count risk.

Workflow rule: do not use profile links, social index snippets, previous editions, or venue/festival context to make a Watch item appear corroborated. Promote only after a direct current-event source confirms the relevant date, venue, lineup, ticket route, or official update.

## 2026-06-14 Platform Verification Queue

Added `quality.platformVerificationQueue` to `data/events.json` and a matching `scripts/audit-events.js` check. This queue is for Watch rows where a platform-bound lead exists, but the lead is still not a current-event confirmation source.

Current result after regeneration:

- Platform verification rows: 5.
- Platform-bound source rows: 9.
- High-priority rows now explicitly queued for platform-native checks: `jasmin-knopha`, `botox-fatale`, `anika-kunst`, and `youshan-warmup`.
- Medium-priority row now explicitly queued: `liminal-dreams`.
- All current platform leads are Instagram routes or search-index previews; `botox-fatale` and `youshan-warmup` carry browser evidence states that indicate logged-in or stronger visual checks are still required.

Workflow rule: use the event-specific search queries in `quality.platformVerificationQueue` before opening known deep links. For Instagram, XHS, WeChat, Weibo, mini-program, or ticket-flow leads, record whether the visible account/post/page confirms the event title, absolute date, venue, lineup, ticket route, door price, set times, or age rule. If the browser only exposes profile metadata, search snippets, image placeholders, login walls, or timeouts, keep the source as a lead and keep the event on Watch.

Follow-up platform check:

- `botox-fatale`: public search still surfaced SmartShanghai plus Instagram search-index snippets, but no new non-social direct source. Playwright/Chrome opened an XHS search route for `Abyss Botox Fatale 6.26 Shanghai`; XHS redirected to `website-login/error` with `安全限制`, `IP at risk`, and error `300012`. Screenshot stored at `output/playwright/xhs-botox-security-limit.png`. Instagram platform search for `Abyss Botox Fatale 6.26 Shanghai` returned HTTP 429. No event post body, ticket route, door price, date card, support lineup, or set times were confirmed.
- `youshan-warmup`: public search surfaced an additional jay_sarayu Instagram index preview reading `27.06: Youshan Festival Pre Party | Wigwam | Shanghai, CN`. Added it as `social-index-lead` only. It gives the next platform-native verification target, but it does not confirm official organizer approval, final lineup, start time, ticketing, door price, or age policy.
- Current decision: keep both rows as Watch and keep their `confirmationSourceCount` at 1. Next useful check requires logged-in/user-assisted Instagram, XHS, WeChat official-account search, or a shareable Wigwam/YOUSHAN/Abyss/ticketing page.

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

- Added `coreFieldGapStatus` and `sourceGapNote` to `quality.coreFieldQueue`; unresolved rows now explicitly say that missing or uncertain core fields were not found in current public sources and should be rechecked through organizer, venue, ticketing, RA, SmartShanghai, WeChat, XHS, or Instagram platform search in the next pass.
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
