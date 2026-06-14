# International Club Livestream Sources

Research date: 2026-06-14 Asia/Shanghai

## Summary

International club livestreams exist, but stable always-on nightclub feeds are uncommon. The most reliable product path is to link or embed official livestream/video sources from club-culture broadcasters, labels, and venue-adjacent platforms rather than rebroadcasting raw streams.

For Shanghai Rave Index, this should stay as a future feature idea until implementation is explicitly requested.

## Candidate Sources

These sources are suitable for a future `Live` or `Watch` surface because they publish official electronic music livestreams, DJ sets, or live-event videos:

| Source | URL | Fit |
| --- | --- | --- |
| HOR Berlin | https://hoer.live/ | Electronic music livestream channel with regular DJ sets and live acts. Strong candidate for a default international live source. |
| Boiler Room | https://www.youtube.com/@boilerroom | Global DJ set and event livestream/archive source. Good for external watch links and YouTube embeds when enabled. |
| Mixmag Lab | https://mixmag.net/feature/lab-ldn | Live-streamed event series from Mixmag. Good for curated watch items. |
| DJ Mag HQ | https://www.youtube.com/playlist?list=PLxGQNM_MbRMjXc0oOfEAupLxM2ECykWLk | DJ Mag broadcast/archive format. Good for curated watch items. |
| Defected Records | https://www.youtube.com/@DefectedMusic | House music label channel with livestreams and long-running video/radio formats. |
| Cercle | https://www.cercle.io/ | High-production electronic music videos and live events. Not a nightclub feed, but useful for premium watch content. |

## Integration Notes

- External links are the safest first version: show a `Watch live` or `Watch set` button that opens the official source.
- YouTube embeds can be used when the official video or livestream allows embedding.
- Twitch embeds require the production domain to be passed as an allowed `parent` parameter.
- Instagram, TikTok, and similar social live formats are not stable embed targets for this project; use outbound links only if needed.
- Do not rip, proxy, or restream raw media. Only use official links, platform embeds, or source-approved players because nightclub footage can involve music copyright, event rights, and attendee privacy.

## Suggested Data Shape

```json
{
  "streamUrl": "https://www.youtube.com/...",
  "streamPlatform": "youtube",
  "embedUrl": "https://www.youtube.com/embed/...",
  "embedAllowed": true,
  "streamStartsAt": "2026-06-14T22:00:00+02:00",
  "streamStatus": "upcoming",
  "sourceName": "HOR Berlin",
  "sourceUrl": "https://hoer.live/",
  "rightsStatus": "official_link"
}
```

## Future Implementation Idea

Start with a static curated list in `data/` or `config/`, then add a small watch section to the existing Tonight/Live Room experience. A later version could poll official YouTube channel data for upcoming/live videos, but that should be built as a separate source-refresh workflow with clear rate-limit and freshness handling.
