# Shanghai Rave Calendar 2026

Interactive static calendar for Shanghai techno, rave, warehouse, industrial, bass, and underground electronic events in 2026. It includes a paired DJ database generated from the event lineups, with performer profiles, source status, set-time status, and event deep links.

## Local preview

Open `index.html` directly in a browser, or run:

```bash
npm run scrape
npm run check
npx serve .
```

When served over HTTP, the calendar reads `data/events.json`. If that file is missing or blocked by a direct `file://` preview, the embedded fallback events in the HTML are used.

## Operations console

Open `ops.html` over the same local or deployed HTTP server to run the operator workflow:

- AI 抓取/整理活动: loads `data/events.json`, combines confirmed events, discovered links, source checks, social leads, and Computer Use source tasks into one intake queue.
- 人工审核: stores approve / needs-check / reject decisions in browser `localStorage` and exports a review JSON file for commit or handoff.
- 微信/小红书分发: generates channel-ready copy for the selected approved event and records local publish timestamps.
- 导票链接: saves local ticket URL overrides, builds UTM-tagged route links, and exports ticket-routing CSV.
- promoter 付费曝光: assigns local paid-exposure packages, budgets, and run-until dates for promoter inventory tracking.
- 数据报表: exports ops CSV, ticket CSV, distribution CSV, and a daily text brief.

The console is intentionally static for this version. It does not post directly to WeChat/Xiaohongshu, process payments, or mutate `data/events.json` without an exported file being reviewed and committed.

## Event refresh

V1 uses GitHub only:

1. `.github/workflows/scrape-events.yml` runs daily or manually.
2. `scripts/scrape-events.js` refreshes public RA and SmartShanghai source data.
3. It checks X/Twitter keyword searches from `config/scrape-keywords.json` as discovery-only social leads.
4. It writes a `computerUseQueue` for known anti-bot, logged-in, app-only, poster/image, and mini-program sources that the agent should inspect with Chrome + Computer Use.
5. The script writes `data/events.json`.
6. The workflow commits the changed JSON back to the repository.

No database is required for this version.

X/Twitter leads are stored under `socialLeads` in `data/events.json`. They do not become calendar cards until confirmed by RA, SmartShanghai, venue/promoter, ticketing, or another stronger source.

For reliable X/Twitter collection, add either `X_BEARER_TOKEN` or `TWITTER_BEARER_TOKEN` as a GitHub repository secret. Without a token, the workflow records the configured keyword searches but does not collect posts by default. To attempt unauthenticated public HTML search, set `SCRAPE_X_PUBLIC_SEARCH=true`, but expect frequent empty or blocked responses from X/Twitter.

Known anti-bot or app-bound sources are not scraped with plain `fetch`. They are queued for agent-operated Chrome + Computer Use in `computerUseQueue`: RA Shanghai when blocked, SmartShanghai when fetch is incomplete, Xiaohongshu, WeChat official accounts/groups, venue official accounts, promoter posters, ShowStart/Damai/PiaoPlanet/mini-program ticketing, and DJ/label Instagram, Weibo, WeChat, or Bandcamp pages. Treat these as discovery or verification tasks until the agent captures a shareable official/ticket/source reference or screenshot evidence.

## Deploy

The project is static and can be deployed on Vercel with no build step:

```bash
vercel --prod
```
