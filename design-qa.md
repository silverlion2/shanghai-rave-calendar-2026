# Design QA

source visual truth path: `C:\Users\T480S\AppData\Local\Temp\codex-clipboard-470cdf9f-2977-4ced-ad79-743bdf4a3372.png`
home poster strip screenshot path: `C:\Users\T480S\AppData\Local\Temp\rave-index-home-poster-rail.png`
event wall screenshot path: `C:\Users\T480S\AppData\Local\Temp\rave-poster-wall-full-cards.png`
bottom bar screenshot path: `C:\Users\T480S\AppData\Local\Temp\rave-bottom-bar-desktop.png`
viewport: 1440 x 1000 desktop plus 390 x 900 mobile spot check
state: calendar landing screen, June 2026 active, future events visible; poster wall page, upcoming events visible

**Findings**
- No actionable P0/P1/P2 findings remain.

**Required Fidelity Surfaces**
- Fonts and typography: display typography, mono labels, uppercase nav, compact stat labels, and dense panel rows follow the supplied underground index direction.
- Spacing and layout rhythm: the homepage keeps the poster-wall index structure while the bottom activity strip now spans the page shell as a pure poster-image rail.
- Colors and visual tokens: palette remains black/off-white/cyan/yellow/orange, with gritty paper texture and sharp rectangular controls.
- Homepage bottom rail: each `#homePosterRail .poster-strip-card` contains only one `img`; there are no visible titles, time labels, confidence chips, or detail text in the strip.
- Bottom status bar: the homepage now includes the supplied reference's segmented update bar with late-update warning, daily-change note, contact block, public-source disclaimer, and Source First / Rave Second badge.
- Standalone wall page: `poster-wall.html` now renders the previous waterfall composition as complete event cards with poster, date/time, title, venue, description, chips, source, and confidence metadata.

**Evidence**
- `npm run check` passed.
- Desktop runtime metrics: homepage has 18 pure image poster-strip cards, 0 bad poster-strip cards, 0 extra visible text nodes in the rail, 0 broken images, and 0 horizontal overflow.
- Desktop runtime metrics: bottom status bar has 5 cells, late-update marker, source badge, 0 broken images, and 0 horizontal overflow.
- Mobile runtime metrics: bottom status bar has 5 stacked cells and 0 body overflow at 390 px.
- Desktop runtime metrics: `poster-wall.html` has 31 `.wall-card` event cards, 0 `.poster-tile` items, 31 cards with poster images, title, venue, and description, 0 broken images, and 0 horizontal overflow.
- Mobile runtime metrics at 390 px: homepage has 18 pure image poster-strip cards and 0 body overflow; poster wall has 31 full event cards, 0 `.poster-tile` items, and 0 body overflow.

**Patches Made Since Previous QA**
- Restored a full-width homepage bottom activity rail, but changed it to poster images only.
- Added the reference bottom dispatch/status bar below the poster rail.
- Added `renderHomePosterRail()` to keep the homepage rail filter-aware and clickable without visible text details.
- Converted `poster-wall.html` from a poster-only masonry wall into a complete event-card waterfall page.
- Synced `shanghai-rave-calendar-2026.html` with the updated homepage.

final result: passed
