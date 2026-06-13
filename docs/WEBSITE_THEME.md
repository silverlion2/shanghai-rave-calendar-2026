# Website Theme

The current theme is **Basement Dispatch**: an underground event index with sharp rectangular controls, distressed print texture, dense information surfaces, and source-first utility. Future pages should look like part of this operating system, not like a separate campaign page.

## Required Files

- Shared stylesheet: `assets/basement-dispatch.css`
- Generated event detail base stylesheet: `assets/event-detail.css`
- Structure source: `config/website-structure.json`
- Structure docs: `docs/WEBSITE_STRUCTURE.md`
- Validation: `npm run structure` and `npm run check`

Every tracked root page must load:

```html
<link rel="stylesheet" href="assets/basement-dispatch.css">
```

Generated event pages must load:

```html
<link rel="stylesheet" href="../assets/event-detail.css">
<link rel="stylesheet" href="../assets/basement-dispatch.css">
```

## Design Tokens

Use the existing CSS custom properties before adding new colors or type styles:

| Token | Use |
| --- | --- |
| `--void` | Page background and deepest panels |
| `--panel`, `--panel-2` | Content panels and layered surfaces |
| `--ink`, `--paper` | Primary text and paper-like contrast |
| `--muted`, `--dim` | Metadata, labels, inactive nav |
| `--cyan`, `--acid` | Active controls, source signals, primary accents |
| `--ember` | Warnings, urgency, selected evidence |
| `--gold` | Secondary confidence and watch states |
| `--rose` | Rare tertiary accent only |
| `--font-display` | Uppercase display labels, nav, headings, stat numbers |
| `--font-mono` | Body copy, metadata, source trails, dense controls |

Do not introduce a page-dominant purple, beige, blue-slate, or warm-brown palette. Accent additions should be small and justified by a page-specific state.

## Page Shells

- Calendar landing pages use `shell calendar-shell`.
- Public tools, directories, walls, and utility pages use `shell dispatch-shell`.
- Generated event detail pages use `shell dispatch-shell`.
- Generated event detail pages use `scripts/site-components.js` for the SEO head, primary nav, and Basement Dispatch footer.
- Every public page should include the Basement Dispatch bottom bar (`bottom-dispatch-bar`) unless the page is intentionally marked as utility-only in `config/website-structure.json`.

## Component Rules

- Controls are sharp, compact, rectangular, and uppercase when they behave like nav/filter/action controls.
- Cards are for repeated event, DJ, venue, poster, or queue records. Avoid nesting cards inside cards.
- Poster imagery should stay inspectable: no heavy blur, no generic stock imagery, and no decorative-only image slots.
- Metadata should be dense and scan-friendly: date, venue, source layer, confidence, price, age, and status should be visible where useful.
- Buttons and links should use existing classes first: `nav-link`, `button`, `hero-button`, `mini-link`, `source-link`, `route-button`, `tab-button`.
- For new icons, prefer existing icon libraries if the page already loads one. Do not hand-draw icon SVGs unless there is no dependency available.

## Typography

- Use `--font-display` for high-impact headings, numbers, nav, badges, and short labels.
- Use `--font-mono` for paragraphs, descriptions, field labels, form controls, source trails, and tables.
- Keep letter spacing at `0`.
- Do not scale font sizes directly with viewport width. Use the existing `clamp()` patterns for true hero headings only.
- Keep compact panel headings smaller than hero scale.

## Layout

- Preserve the gritty grid/print background from the shared stylesheet.
- Use full-width bands or unframed layouts for major page sections.
- Use stable dimensions for posters, controls, rails, and grids so hover states and dynamic labels do not shift layout.
- Mobile layouts must avoid horizontal overflow at 390 px wide.
- The calendar page keeps Ops in the bottom dispatch bar instead of the top primary nav.

## New Page Checklist

- The page is registered in `config/website-structure.json`.
- The page loads `assets/basement-dispatch.css`.
- The page uses the correct shell class.
- The page has the primary nav links from `primaryNav` unless intentionally utility-only.
- The page uses the Basement Dispatch footer unless intentionally utility-only.
- Generated pages reuse `scripts/site-components.js` instead of copying head/nav/footer markup.
- The page has canonical, Open Graph, manifest, icon, JSON-LD, and Google tag markers when public.
- The page follows the token and component rules above.
- `npm run structure` passes.
- `npm run check` passes.
