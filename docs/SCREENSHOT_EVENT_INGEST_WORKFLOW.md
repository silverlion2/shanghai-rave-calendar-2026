# Screenshot Event Ingest Workflow

Use this workflow when a human supplies WeChat, Xiaohongshu, ticketing, venue, promoter, or poster screenshots and the editor needs to add or repair event information.

## User Screenshot Pack

Best screenshot set for each venue or event:

1. Venue/month overview: monthly program, weekly schedule, or official account post that shows the venue name and multiple event dates.
2. Event ticket page: screenshot that shows event title, date, start time, venue, price, ticket state, and customer-service or ticketing route.
3. Event poster or gallery cover: clean poster image when available. If only a ticketing homepage image exists, include the full page; the editor will crop away lower ticketing UI for poster-wall display.
4. Article/detail screenshots: lineup notes, DJ descriptions, sound descriptions, organizer copy, or artist profile slides.
5. Platform/source note: tell the editor where it came from, for example Yuyuan WeChat mini-program, venue WeChat official account, XHS, Sogou, RA, SmartShanghai, ticketing app, or direct venue account.

Avoid sending private order pages, payment pages, QR codes tied to a personal purchase, account messages, phone numbers, or screenshots containing other people's personal information. If a ticketing screen contains private data, crop or mask it before sharing.

## Human Notes To Include

Add a short note with the screenshots when possible:

- Venue name and city.
- Platform/source route.
- Whether you manually confirmed the screenshot is from the official venue/promoter/ticketing route.
- Whether the event should be added as a firm listing, watch lead, or evidence for an existing entry.
- Any names that are visually hard to read.
- Whether the lower ticketing menu should be removed for poster-wall use.

## Agent Intake Order

1. Run the broad source sweep first unless the user asked for a single screenshot-only repair:

   ```powershell
   $env:SCRAPE_MAX_DETAIL_PAGES='0'; node scripts/scrape-events.js
   ```

2. Identify which supplied files are:

   - `wechat-miniprogram-ticketing-screenshot`
   - `official-wechat-screenshot`
   - `official-poster-screenshot`
   - `artist-profile-screenshot`
   - `social-lead`
   - `venue-context`

3. Update `config/promotion-platform-network.json` when a screenshot reveals a venue, promoter, ticketing route, official account, recurring series, or platform handle that is not already represented. Future scraping must search this venue/promoter network before generic keyword discovery.

4. Add or update only current and future events by default. Past events are archive repair only when explicitly requested.

5. Fill core fields before non-core enrichment:

   - Core: `date`, `title`, `time`, `venue`, `address`, `lineup`, `price`, `age`, `ticketUrl`, `ticketStatus`, `sourceUrl`, `checkedSource`, `performerProfileSources`.
   - Non-core: `poster`, `recommendationReason`, `bestFor`, `verifyBeforeGoing`, `sourceConfidence`, `soundTags`, `decisionTags`.

6. If a core field is not visible, mark it as a source gap. Do not infer age policy, direct ticket URL, exact running order, or set times from a poster.

## Poster Handling

1. Save full evidence screenshots under `assets/posters/` with stable event slugs.
2. For ticketing homepage screenshots, keep the full original as evidence and create a cropped public cover that removes lower ticketing UI.
3. Prefer event-specific clean posters over ticketing screenshots for `posterUrl` when both are available.
4. Run:

   ```powershell
   npm run posters:prepare
   ```

5. Confirm `data/poster-archive.json` points to optimized display assets.

## Data Update Rules

1. Update `config/curated-events.json` first. Do not hand-edit generated `events/*.html`.
2. Preserve existing stronger sources. User screenshots can upgrade facts, but should not erase RA, SmartShanghai, Bandcamp, SoundCloud, Discogs, venue, or promoter context.
3. Do not invent public `ticketUrl` values from mini-program screenshots. Put the route in `ticketStatus`, `sourceConfidence`, and source notes.
4. Add `posterEvidence.localFiles` for all relevant screenshots and cropped covers.
5. Add a clearly labeled HTTP venue-context source if the strict audit requires an HTTP source, but state that it is context only and not event confirmation.
6. Maintain `config/promotion-platform-network.json` with any newly confirmed venue/promoter/platform route. Store account names, search queries, route type, trust role, access mode, and anti-scrape policy; do not guess social deep links.
7. For DJs with no standalone public source, add an event-role profile only. Keep the summary limited to the visible lineup role and do not invent biographies.
8. For DJs with existing stronger profiles, add itinerary and screenshot sources without replacing their stronger source-backed summaries.

## Recommendation Copy

`recommendationReason` must explain why someone should go:

- sound lane
- room fit
- lineup strength
- live/headliner value
- local-scene relevance
- who the night is best for

Do not make the recommendation about where the event was found. Source discovery belongs in `sourceConfidence`, `ticketStatus`, and the Trust Ledger.

## Anti-Scrape And Browser Rules

1. For Shanghai local ticketing/core-field checks, use the Yuyuan WeChat mini-program first when the desktop WeChat session is available. Search inside Yuyuan by citywide electronic terms, venue, promoter, event title, and DJ; read list/detail pages only, capture screenshots, and do not click purchase or payment controls.
2. For XHS, WeChat, Sogou, Instagram, and other ticketing apps, use platform-native search and visible account/post routes first.
3. Stop immediately on login walls, captcha, verification, security-limit, abnormal-access, or warning pages.
4. Ask the user for XHS or WeChat login-assisted viewing only when needed. Do not enter credentials.
5. Do not ask for Instagram login. Treat Instagram as public/index-only for this project.
6. Do not bulk probe guessed social URLs or repeatedly reload direct deep links.

## Regeneration And Validation

After canonical data changes:

```powershell
$env:SCRAPE_MAX_DETAIL_PAGES='0'; node scripts/scrape-events.js
npm run posters:prepare
node scripts/generate-seo-pages.js
node scripts/check.js
node C:\Users\T480S\.codex\skills\rave-calendar-editor\scripts\audit-rave-site.mjs --json
npm run check
```

Block publish on:

- broken local links
- trust audit `must_fix` findings
- missing source URL/check date
- unsupported recommendation claims
- fake ticket URLs
- poster files that do not match the current event

## History Notes

After a successful ingest, update `SOURCE_LOG.md` or `PROJECT_MEMORY.md` with:

- screenshots received
- assets copied/cropped/compressed
- events added or updated
- venue/promoter platform-network routes added or changed
- DJ profiles added or enriched
- unresolved gaps
- validation commands and results
