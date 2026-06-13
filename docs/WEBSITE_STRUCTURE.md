# Website Structure

This project is a static, source-first event site. The tracked structure lives in `config/website-structure.json`; use that file as the source of truth before adding, renaming, or removing pages.

## Source of Truth

- `config/website-structure.json` owns site metadata, canonical routes, sitemap participation, primary navigation order, generated collections, and shared asset requirements.
- `scripts/site-structure.js` reads that config and exposes helpers for checks and generators.
- `scripts/site-components.js` renders reusable generated-page head, primary navigation, footer, schema, and escaping helpers.
- `scripts/check-site-structure.js` validates the tracked pages, shared stylesheet, shell classes, canonical URLs, primary nav links, docs, and static sitemap entries.
- `scripts/check.js` calls the same structure validation as part of the full project check.
- `scripts/generate-seo-pages.js` uses the same config for static sitemap routes and generated event-page primary navigation.

## Tracked Pages

| ID | File | Route | Shell | Sitemap |
| --- | --- | --- | --- | --- |
| `calendar` | `index.html` | `/` | `calendar-shell` | yes |
| `poster-wall` | `poster-wall.html` | `/poster-wall` | `dispatch-shell` | yes |
| `love-wall` | `love-wall.html` | `/love-wall` | `dispatch-shell` | yes |
| `planner` | `planner.html` | `/planner` | `dispatch-shell` | yes |
| `rave-everywhere` | `rave-everywhere.html` | `/rave-everywhere` | `dispatch-shell` | yes |
| `djs` | `djs.html` | `/djs` | `dispatch-shell` | yes |
| `venues` | `venues.html` | `/venues` | `dispatch-shell` | yes |
| `account` | `account.html` | `/account` | `dispatch-shell` | yes |
| `ops` | `ops.html` | `/ops` | `dispatch-shell` | no |

`shanghai-rave-calendar-2026.html` is tracked as a legacy calendar mirror. It is syntax-checked and must keep the shared theme and homepage stats placement, but it is not a separate sitemap route.

`poster-wall.html` is the single public poster/event browsing surface. The legacy `/poster-archive` route redirects to `/poster-wall`; `data/poster-archive.json` remains as generated poster metadata for compression and Supabase import workflows.

## Generated Collections

The `events/` detail pages are generated from `data/events.json` by `scripts/generate-seo-pages.js`.

- Public, source-backed events are included in `sitemap.xml`.
- Watchlist events stay `noindex` and are omitted from `sitemap.xml`.
- `events/index.html` must not exist; `poster-wall.html` is the crawlable wall/index surface.
- Generated event pages must load `../assets/basement-dispatch.css`, use `dispatch-shell`, and include the Basement Dispatch footer.
- Generated event pages must also load `../assets/event-detail.css`; that file owns the base detail-page layout before the shared Basement Dispatch theme override.
- Generated head, navigation, footer, and WebSite schema should come from `scripts/site-components.js` rather than inline generator copies.

## Adding a Page

1. Add the HTML file with a canonical URL, SEO head markers, Google tag, `assets/basement-dispatch.css`, and the correct shell class.
2. Add the page to `config/website-structure.json` with `id`, `label`, `file`, `route`, `shell`, sitemap settings, and priority.
3. Add the page ID to `primaryNav` only if it should appear in the main public nav.
4. Add route-specific feature checks to `scripts/check.js` only when the page introduces behavior that can drift.
5. If the page is generated, reuse `scripts/site-components.js` for head, nav, footer, and schema.
6. Run `npm run structure`.
7. Run `npm run check`.

## Commands

```bash
npm run structure
npm run check
npm run seo
```

Run `npm run seo` after changing static sitemap settings or generated event-page navigation.
