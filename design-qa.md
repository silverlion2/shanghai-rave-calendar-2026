# Design QA

source visual truth path: `D:\workspace\rave calendar\output\playwright\djs-source-before-viewport.png`
implementation screenshot path: `D:\workspace\rave calendar\output\playwright\djs-implementation-viewport.png`
viewport: 1440 x 1200 desktop, plus 390 x 844 compact mobile metric pass
state: DJ database page on `http://localhost:4173/djs.html` and `http://localhost:4180/djs`, default filters, signed-out public state
full-view comparison evidence: `D:\workspace\rave calendar\output\playwright\djs-side-by-side-viewport.png`
focused region comparison evidence: `D:\workspace\rave calendar\output\playwright\djs-desktop.png` and `D:\workspace\rave calendar\output\playwright\djs-mobile.png`; focused checks covered the hero, stats/data-health band, filter controls, directory, profile panel, and roster cards.

**Findings**
- No actionable P0/P1/P2 findings remain.
- Fonts and typography: the page preserves the existing condensed display/nav treatment, serif display H1, small uppercase control labels, and zero letter-spacing rule. New data cards and evidence blocks use the same scale and do not introduce oversized panel text.
- Spacing and layout rhythm: desktop keeps the prior shell width, text-only hero, sticky directory, card rhythm, and a bottom-positioned stat/data-health block. Mobile uses a denser hero, hidden proof badges, a horizontal data-health rail, compact filter controls, and a shorter scrollable directory without document-level horizontal overflow.
- Colors and visual tokens: the existing dark, acid, cyan, gold, and rose token system is preserved. Data-depth states reuse semantic colors instead of adding a new palette.
- Image quality and asset fidelity: the large hero poster has been removed. Artist images use only real Supabase source URLs; missing photos render as text-first layouts rather than generated placeholder art.
- Copy and content: the page now states the Supabase data model directly, separates rich/sourced/lineup-only profiles, and exposes data cleanup flags without adding instructional wall text.

**Patches Made**
- Added a repeatable Supabase export script and generated client-safe `data/supabase-dj-data.json` / `data/supabase-dj-data.js`.
- Rebuilt `djs.html` around Supabase artist depth while preserving calendar appearances, itinerary context, social/listening links, and relevance sorting.
- Added profile-depth filtering, source/release/label evidence panels, data-health stats, honest empty states, and real-photo-only rendering.
- Fixed the empty-filter state so the profile panel no longer shows a stale artist when zero rows match.
- Added a DJ-page-specific mobile override after the shared Basement Dispatch stylesheet so the shared mobile rules no longer override the compact DJ layout.
- Removed the large hero picture and made the DJ hero a single-column text header.
- Moved the DJ statistics and data-health block to the bottom of the page above the Basement Dispatch footer.
- Simplified directory rows and roster cards to show only DJ name plus top genre / nationality-base metadata; removed the old per-row data-depth chips and the confusing `Sourced text` label.
- Simplified External artist links into a compact clickable source-logo grid using each URL domain favicon; removed numbered `External 1` style links and explanatory copy.
- Hid internal recommendation-policy entry points from the DJ page by removing the profile-level `How we recommend` pill and the footer trust-policy links.
- Replaced the detailed `Supabase sources` list with a single `Source` sentence per DJ profile.
- Moved artist metadata into the top profile header with compact fields for nationality/base, genre, sound, and labels/releases; removed duplicated metadata from the lower facts grid.

**Verification**
- `node scripts/export-supabase-djs.js`: exported 405 artists.
- `node --check scripts/export-supabase-djs.js`: passed.
- `node --test tests/dj-relevance-sort.test.js`: passed.
- Browser smoke test in Chrome at `http://localhost:4173/djs.html`: 405 Supabase rows, 63 rich profiles, 94 photos, 4 data-health cards, rich filter works, Charlotte search opens the correct profile, empty rich+Charlotte filter shows an empty state, no desktop/mobile horizontal overflow.
- In-app browser compact mobile metric pass at `http://localhost:4180/djs`, 390 x 844: no document-level horizontal overflow (`scrollWidth` 375, `bodyScrollWidth` 375 on a 390 viewport), 405 / 63 / 94 / 237 stat row present, 4 data-health cards present, source proof badges hidden on mobile, hero 221px, stats 132px, data-health rail 92px, controls 271px, directory 260px.
- In-app browser wording pass at `http://localhost:4180/djs`: first directory rows and roster cards show only name plus top genre / nationality-base metadata, row/card chip count is 0, and `Sourced text` is absent from rendered body text.
- In-app browser external-link pass at `http://localhost:4180/djs`: External artist links panel renders 42px clickable source-logo tiles for Anyma sources, numbered external text is absent, and no horizontal overflow is present.
- In-app browser internal-link pass at `http://localhost:4180/djs`: `How we recommend`, `.trust-inline`, and `trust.html` links are absent from the rendered DJ page.
- In-app browser source-panel pass at `http://localhost:4180/djs`: `Supabase sources` is absent, the profile shows one `Source` sentence such as `Source: MusicBrainz and Discogs.`, and no source rows/source-list containers render.
- In-app browser metadata pass at `http://localhost:4180/djs`: the profile header contains Nationality, Genre, Sound, and Labels metadata for Anyma, metadata sits inside the hero, and lower Profile facts no longer repeats country/labels/releases/aliases/sounds.
- In-app browser screenshot capture timed out on `Page.captureScreenshot`; the mobile QA above used DOM geometry, computed styles, row/card counts, and overflow measurements from the in-app browser instead.
- Known local-only noise: `_vercel/insights/script.js` returns 404 on the local static server; this is expected outside Vercel and not caused by the DJ page changes.

final result: passed
