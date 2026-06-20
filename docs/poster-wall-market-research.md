# Poster Wall Market Research

Date: 2026-06-20  
Context: early research for a multi-city activity poster wall focused on underground electronic music, club nights, rave events, and poster-based discovery.

## Short Answer

There are adjacent products, but the exact position of "current event poster wall + multi-city discovery + later archive" is not fully occupied.

Most existing products fall into one of three lanes:

- Event discovery and ticketing platforms.
- Text-first electronic music calendars.
- Historical rave flyer archives.

The opportunity is to sit between them: poster-first, current-week useful, internally source-backed, and archive-ready.

## Similar Products

### Event Discovery And Ticketing

These products already solve event discovery, ticket purchase, and artist/venue following, but they are not primarily poster-wall archives.

- [Resident Advisor](https://ra.co/)  
  Global electronic music event guide with city pages, event flyers, lineups, venues, artists, editorial, and ticketing. This is the strongest direct reference for electronic music coverage, but RA is listing-first and ticketing/editorial-first rather than poster-wall-first.

- [Shotgun](https://shotgun.live/en)  
  Event discovery and ticketing for concerts, clubs, raves, festivals, and nightlife. Strong mobile and ticketing UX. The core product is ticket conversion, not public poster archival.

- [DICE](https://dice.fm/)  
  Live-event discovery and ticketing with personalized recommendations, artist/venue following, and mobile purchase flow. It is broader than underground electronic music and not built around a visual poster archive.

- [Bandsintown](https://www.bandsintown.com/)  
  Artist-tracking and concert alert product. Useful for tour discovery, less relevant for local underground club-night poster browsing.

- [Songkick](https://www.songkick.com/)  
  Concert discovery and artist tour tracking. Similar to Bandsintown: strong for artist-based live music alerts, weaker as a poster-first nightlife surface.

### Electronic Music Calendars

These prove that dense, city-level electronic event listings are useful, but many are text-first.

- [19Hz](https://19hz.info/)  
  Multi-city electronic music calendar covering places such as the Bay Area, Los Angeles, Seattle, Chicago, Detroit, Denver, Toronto, and others. It is highly information-dense and practical, but visually minimal and not poster-led.

- [19Hz Bay Area listing](https://19hz.info/eventlisting_BayArea.php)  
  Current example of text-first event aggregation. Good reference for coverage density, city segmentation, and practical event fields.

### Historical Flyer And Poster Archives

These products preserve rave and club culture visually, but they mostly focus on past flyers rather than current event discovery.

- [Phatmedia](https://www.phatmedia.co.uk/)  
  Old-school rave flyer database and community. Strong visual archive reference, but its center of gravity is historical rave flyers.

- [Phatmedia latest flyers](https://www.phatmedia.co.uk/flyers)  
  Useful example of archive browsing and user-contributed flyer collection.

- [Rave Preservation Project](https://www.ravepreservationproject.com/)  
  Large digital archive for rave, underground, club, disco, and EDM memorabilia. Strong precedent for preservation value and community contribution, but not a live city event guide.

- [Oldschool Rave Flyer Archive on Flickr](https://www.flickr.com/photos/villalobosjayse/collections/72157626196424298/)  
  Large personal/community archive of old rave flyers, especially useful as a visual reference for archive scale and tagging.

### Local City Guides And China Context

These are relevant for Shanghai and China, but they are not poster-wall-first.

- [SmartShanghai Events](https://www.smartshanghai.com/events/)  
  General Shanghai event guide with nightlife, live music, dining, arts, and city culture coverage. Useful reference for English-language Shanghai event discovery.

- [SmartShanghai Nightlife](https://www.smartshanghai.com/events/nightlife/)  
  More directly relevant for nightlife event presentation and ticket links, but still a general city guide rather than underground electronic poster archive.

- [ShowStart](https://www.showstart.com/)  
  China ticketing and event platform. Useful for local ticket/event source confirmation, but not positioned as a public poster wall.

## Positioning Gap

The proposed product should not try to beat RA, Shotgun, or DICE at ticketing. It also should not try to beat historical archives at pure preservation from day one.

The more promising gap:

> A Shanghai-first underground electronic poster wall: useful for deciding where to go this week, open to poster-backed leads from other cities, and valuable as a visual archive after events pass.

This gives the project a distinct angle:

- More visual than 19Hz.
- More independent and archive-minded than ticketing apps.
- More current and actionable than historical flyer archives.
- More niche and taste-led than general city guides.

## MVP Recommendation

Current decision: start Shanghai-first. Shanghai is the default wall and editorial focus, but poster-backed uploads from other cities can enter the review queue and appear behind the city filter after approval. A full multi-city discovery product stays a later direction after the Shanghai data model, poster evidence workflow, and wall UX are stable.

Current city posture:

- Shanghai: default browsing view and main editorial coverage.
- Other cities: accepted through upload/review flow when a poster and source are supplied.
- Full multi-city expansion: later product direction, after Shanghai data quality and archive behavior are stable.

The MVP should prioritize:

- Poster wall as the default view.
- A simple city filter, defaulting to Shanghai.
- Venue, lineup, price, date, city, sound, and status for current/future events.
- Source URL and source confidence stay internal for review and event detail trust surfaces; the poster wall itself should not display source labels or source links.
- Ticket links are separate from source links. Current and future events may show outbound `Tickets` actions when a ticket URL or clearly actionable event URL exists.
- Lightweight detail page per event.
- Archive behavior after the event date passes; past posters need only essential facts, not ticketing info.
- Manual or semi-manual ingestion first, not full automation.

## Product Shape

Recommended model:

- Current posters are discovery cards.
- Past posters become the visual archive.
- Each poster keeps source and trust metadata internally.
- The product does not need to sell tickets at launch.
- Ticket links can be outbound for current and future events, but past posters should stay archival and omit ticketing info.

Important fields:

- `city`
- `country`
- `date`
- `title`
- `venue`
- `lineup`
- `sound_tags`
- `source_url` (internal, not shown on the wall)
- `source_label` (internal, not shown on the wall)
- `confidence`
- `poster_thumb_url`
- `poster_display_url`
- `poster_source_url` (internal asset/source trace, not shown on the wall)
- `event_status`

## Technical Implication

The current Shanghai Rave Index codebase can support a small MVP, but a multi-city poster wall should avoid storing every poster image in the repo.

Recommended implementation path:

- Store poster metadata in Supabase.
- Store images in object storage such as Supabase Storage, Vercel Blob, Cloudflare R2, or S3-compatible storage.
- Generate thumbnails and display images.
- Paginate or infinite-scroll the wall.
- Load 30-60 posters per request.
- Keep original source/verification images outside the default browsing payload and out of the poster wall UI.

## Competitive Takeaway

This can be viable if the product is not framed as a generic event calendar.

Best framing:

> "A global poster wall for underground electronic events."

Better still:

> "See what underground electronic music looks like this week, city by city."

The visual archive can become the long-term moat, while current-event discovery creates the short-term utility.
