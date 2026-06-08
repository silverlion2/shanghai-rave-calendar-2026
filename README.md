# Shanghai Rave Calendar 2026

Interactive static calendar for Shanghai techno, rave, warehouse, industrial, bass, and underground electronic events in 2026. It includes a paired DJ database generated from the event lineups, with performer profiles, source status, set-time status, and event deep links.

## Local preview

Open `index.html` directly in a browser, or run:

```bash
npm run check
npm run scrape
npx serve .
```

When served over HTTP, the calendar reads `data/events.json`. If that file is missing or blocked by a direct `file://` preview, the embedded fallback events in the HTML are used.

## Event refresh

V1 uses GitHub only:

1. `.github/workflows/scrape-events.yml` runs daily or manually.
2. `scripts/scrape-events.js` refreshes public RA and SmartShanghai source data.
3. It checks X/Twitter keyword searches from `config/scrape-keywords.json` as discovery-only social leads.
4. The script writes `data/events.json`.
5. The workflow commits the changed JSON back to the repository.

No database is required for this version.

X/Twitter leads are stored under `socialLeads` in `data/events.json`. They do not become calendar cards until confirmed by RA, SmartShanghai, venue/promoter, ticketing, or another stronger source.

For reliable X/Twitter collection, add either `X_BEARER_TOKEN` or `TWITTER_BEARER_TOKEN` as a GitHub repository secret. Without a token, the workflow records the configured keyword searches but does not collect posts by default. To attempt unauthenticated public HTML search, set `SCRAPE_X_PUBLIC_SEARCH=true`, but expect frequent empty or blocked responses from X/Twitter.

## Deploy

The project is static and can be deployed on Vercel with no build step:

```bash
vercel --prod
```
