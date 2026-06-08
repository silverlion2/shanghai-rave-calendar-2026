# Source Log

Last refreshed: 2026-06-08, Asia/Shanghai.

## Source Priority

1. Direct venue, promoter, ticketing, or official artist pages.
2. Resident Advisor event pages and city listings.
3. SmartShanghai event pages and monthly clubbing guide.
4. Public social posts, WeChat mini-program references, Xiaohongshu, Douyin, Instagram, and reposts as discovery leads only.

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
