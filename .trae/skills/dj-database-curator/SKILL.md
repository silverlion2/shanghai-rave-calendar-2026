---
name: "dj-database-curator"
description: "Curates and manages DJ profiles in the rave calendar database. Invoke when user asks to add DJs, curate DJ database, expand international DJ coverage, or manage tracked DJ profiles. The database has two layers: the JSON source of truth (config/tracked-dj-profiles.json) that humans edit, and the JS file (data/tracked-dj-itineraries.js) that the website reads — always run dj-bio-sync after editing the JSON."
---

# DJ Database Curator

Manages DJ profiles in `config/tracked-dj-profiles.json`. This is the **JSON source of truth** — the website does not read this file directly. After any edit, run the `dj-bio-sync` skill to propagate changes to `data/tracked-dj-itineraries.js`.

**Current state as of 2026-06-18:**
- Total profiles: **174**
- International reference DJs: **45**
- Local/China/regional DJs: ~129
- DJs with photo assets in `assets/dj-photos/`: 20 (the first batch of international DJs)
- DJs with confirmed Shanghai appearances (in `itinerary`): ~40

## Profile schema — the actual format used

Every profile in `config/tracked-dj-profiles.json` must match this structure. The fields are ordered consistently for diff readability — keep this order.

```json
{
  "slug": "ben-klock",
  "name": "Ben Klock",
  "aliases": ["Ben Klock", "Ben"],
  "trackedAt": "2026-06-18",
  "checkedByTimezone": "Asia/Shanghai",
  "itinerary": [],
  "scope": "International techno legend / Berghain resident / Klockworks founder",
  "imageTheme": "industrial-grey",
  "imageUrl": "assets/dj-photos/ben-klock.jpg",
  "genres": ["techno", "minimal techno", "dub techno"],
  "summary": "Ben Klock is a German DJ and producer born 1972 in Berlin. A defining figure of modern techno, he is widely recognised for his legendary all-night Sunday marathon sets at Berghain, where he has been a resident since the club's early days. He founded the Klockworks label in 2006, which has become a platform for his own productions and a roster of carefully curated artists.",
  "sourceNote": "Curated as an international reference profile for techno. Facts gathered from the Klockworks label, the Berghain resident context, and the Resident Advisor artist profile.",
  "sources": [
    {"label": "Klockworks Label", "url": "https://klockworks.net", "status": "label-source", "checked": "2026-06-18"},
    {"label": "Ben Klock Resident Advisor profile", "url": "https://ra.co/dj/benklock", "status": "artist-profile", "checked": "2026-06-18"}
  ]
}
```

### Field-by-field rules

| Field | Required? | Notes |
|-------|-----------|-------|
| `slug` | **Yes** | Lowercase, hyphen-separated. Derived from DJ name. For special characters use ASCII approximation (Kölsch → `kolsch`, 10000 → `10000`, Golgol → `golgol`). Must be unique across the file. |
| `name` | **Yes** | Display name as it would appear on a poster. |
| `aliases` | **Yes** | Array of strings. Always include the `name` itself as first element; add stage names and real names if known. |
| `trackedAt` | **Yes** | Date profile was added/last edited. Format `YYYY-MM-DD`. |
| `checkedByTimezone` | **Yes** | Always `"Asia/Shanghai"` for this project. |
| `itinerary` | **Yes** | Array of `{date, eventId, eventTitle, venue, city, status}` objects. Empty array `[]` for international reference DJs with no confirmed China dates. **Never edit this field manually** for events that have RA entries — the scraper populates it. |
| `scope` | **Yes** | 1-line description of role. Format: category / sub-role / label. E.g. `"International techno legend / Berghain resident / Klockworks founder"`. |
| `imageTheme` | **Yes** | Color/theme tag. Free-form but keep consistent: `industrial-grey`, `dark-violet`, `deep-red`, `deep-blue`, `space-blue`, `forest-green`, `military-green`, `rust-orange`, `neon-red`, `swiss-midnight`, `scandinavian-blue`, `amsterdam-teal`, `ink-black`. |
| `imageUrl` | **Yes** | Always `assets/dj-photos/<slug>.jpg`. File may not exist yet (photos are a separate step) — that's fine, the page handles missing images gracefully. |
| `genres` | **Yes** | 2–4 tags. Use the approved taxonomy below. Order from most general to most specific (e.g. `techno` → `hard techno` → `acid techno`, not the reverse). |
| `summary` | **Yes** | 2–3 sentences in English. First sentence: origin/birth year + role. Second sentence: label affiliation + defining characteristic. Optional third sentence: festival/venue highlights. **Never nest double quotes inside this string** — rephrase or use single quotes. **Do not use Cyrillic or Chinese characters** (use English label names: "Trip", not "трип"). |
| `sourceNote` | **Yes** | 1 sentence explaining why this DJ was included and what sources were used. Always starts with `"Curated as an international reference profile for [style]."`. |
| `sources` | **Yes** | 2–3 objects. Each has `label` (short human-readable name), `url` (use `https://ra.co/dj/<slugified-name>` for RA profiles), `status` (one of `artist-official`, `label-source`, `artist-profile`, `venue-source`, `media-source`), and `checked` (date, same as `trackedAt`). |

### Approved genre taxonomy

Use only these tags (combine freely, 2–4 per profile):

**Core techno branches:**
- `techno` — default umbrella
- `minimal techno`
- `driving techno`
- `dark techno`
- `hypnotic techno`
- `industrial techno`
- `hard techno`
- `acid techno`
- `dub techno`
- `deep techno`
- `psychedelic techno`
- `detroit techno`

**Melodic / melodic house:**
- `melodic techno`
- `melodic house`
- `progressive house`
- `tech house`
- `deep house`
- `house`

**Special styles:**
- `rave` — old-school / neo-rave
- `trance-influenced` — not pure trance, but has trance overtones
- `experimental techno` — conceptual / non-club techno

**Do not invent new tags** without adding them to this list first.

## Workflow: adding a batch of DJs

Batches are typically **20 DJs** at a time. Follow this exact order.

### Step 1: Decide the priority (see next section)

Before writing any JSON, decide **which 20 DJs to add**. Use the priority strategy below. Output the list to the user as a plain text list before writing any files.

### Step 2: Write the profiles

For each DJ, write a profile block matching the schema above. Append new profiles to the **end** of the `profiles` array, right before the closing `]`. Keep one blank line between the last existing profile and the first new one.

**Do not reorder existing profiles.** The JS file (and therefore the live website) matches by `slug`, so order in the JSON does not matter functionally — but inserting in-place makes diffs harder to review.

### Step 3: Validate the JSON is still parseable

```bash
node -e "JSON.parse(require('fs').readFileSync('config/tracked-dj-profiles.json','utf8')); console.log('JSON OK')"
```

If this fails, the most common causes are:
1. **Trailing comma** after the last profile object before `]`
2. **Nested double quotes** inside a `summary` or `sourceNote` string
3. **Non-ASCII special characters** (Kölsch has ö — that's fine in name/aliases, but not inside summary strings)

### Step 4: Run count verification

```bash
node -e "const d=JSON.parse(require('fs').readFileSync('config/tracked-dj-profiles.json','utf8'));console.log('Total:',d.profiles.length);const intl=d.profiles.filter(p=>p.scope&&p.scope.includes('International'));console.log('International:',intl.length);console.log('Last 5:',d.profiles.slice(-5).map(p=>p.slug).join(', '));"
```

Expected output pattern:
```
Total: 174
International: 45
Last 5: chris-liebing, dj-koze, amotik, dax-j, shdw-obscure-shape
```

### Step 5: Cross-reference check — no duplicate slugs

```bash
node -e "const d=JSON.parse(require('fs').readFileSync('config/tracked-dj-profiles.json','utf8'));const seen={};for(const p of d.profiles){if(seen[p.slug]){console.log('DUPLICATE:',p.slug);}else{seen[p.slug]=1;}}"
```

### Step 6: Run dj-bio-sync

**This step is required.** The website reads `data/tracked-dj-itineraries.js`, not the JSON file. Invoke the `dj-bio-sync` skill now — it will:
1. Read your new/edited JSON profiles
2. Merge them into the JS file (preserving all existing `itinerary` rows)
3. Report how many profiles were written

### Step 7: Optional — generate DJ photo assets

If this batch includes international DJs, the `assets/dj-photos/` folder probably doesn't have photos for them yet. Each DJ entry has an `imageUrl` pointing to `assets/dj-photos/<slug>.jpg` — if the file doesn't exist, the page handles it gracefully (no broken image icons).

To add photos later, source high-res portraits or official press images, crop to square, optimize to JPEG quality 85, and save as `<slug>.jpg`. This is a separate session from profile authoring.

### Step 8: Commit

```bash
git add config/tracked-dj-profiles.json data/tracked-dj-itineraries.js
git commit -m "chore(djs): add 20 international reference profiles (batch 2)"
git push
```

## Priority strategy: which DJs to add next

This is the most important decision in the workflow. The project currently has **174 profiles**, with **45 international reference DJs**. The goal is to expand the international DJ roster so that when a big event happens in Shanghai, the DJ is already in the database and gets cross-linked automatically.

Selection is based on **three weighted criteria**:

| Priority factor | Weight | What it means |
|-----------------|--------|---------------|
| **Global prominence** | 40% | Is this DJ a headliner at major festivals (Awakenings, Time Warp, Tomorrowland, Sonar, Fabric, Berghain)? Does they run a label? Have they been in the scene 10+ years? |
| **Coverage gap** | 35% | Which label systems / style branches are under-represented in the current 45? If we have 5 Afterlife DJs but only 1 Innervisions, Innervisions wins. If we have 10 hard techno entries but 0 UK garage/breakbeat, that gap wins. |
| **China tour probability** | 25% | Has this DJ ever played in Asia? Have they played Shanghai/Beijing/Hong Kong in the last 5 years? Is their music likely to appeal to Chinese promoters (melodic > industrial, hard techno > deep house for mainstream venues)? |

### Coverage gap inventory as of 2026-06-18

Current 45 international DJs broken down by the system they belong to:

| System / label | Count in DB | Status |
|----------------|-------------|--------|
| Afterlife / Tale of Us | 5 (Anyma, Tale of Us, Adriatique, Mind Against, Miss Monique) | Good — but could add Mind Against's own label context |
| Kompakt | 2 (Kölsch, Tale of Us link) | Weak — add more Kompakt core |
| Drumcode | 3 (Adam Beyer, Joseph Capriati, Lilly Palmer) plus Pan-Pot affiliate | Okay — could add a third key member |
| Berghain / Ostgut Ton | 4 (Ben Klock, Marcel Dettmann, Len Faki, Rodhad) | Good |
| Innervisions | 2 (Dixon, Âme) | Weak |
| Diynamic | 1 (Solomun) | Weak — add 2nd tier |
| Pampa / Pampa Records | 1 (DJ Koze) | Just opened |
| KNTXT | 1 (Charlotte de Witte) | Good |
| Exhale / Lenske | 1 (Amelie Lens) | Good |
| Trip / Galaxid | 1 (Nina Kraviz) | Good |
| Filth on Acid | 1 (Reinier Zonneveld) | Good |
| Dystopian | 2 (Rodhad, SHDW & Obscure Shape) | Good |
| Detroit / Axis | 1 (Jeff Mills) + Richie Hawtin (Minus) | Thin but Jeff Mills is the "legend" slot |
| Hard techno collective | 4+ (Sara Landry, Nico Moreno, Fantasm, Marlon Hoffstadt, Aamotik, Dax J) | Strong |
| Klockworks | 1 (Ben Klock founder) + some affiliates | Good |
| Cari Lekebusch / H. Productions / Swedish school | 0 | Gap |
| UKG / breakbeat / bass | 0 | **Gap** |
| Trance-adjacent / old-school trance | 1 (Miss Monique, but she's more melodic techno) | **Gap** |
| Minimal / Romanian minimal (a:rpia:r, [a:rpia:r]) | 0 | **Gap** |
| Ricardo Villalobos / Perlon / minimal house | 0 | **Gap** |
| Sven Väth / Cocoon | 0 | **Gap** |
| Âme / Dixon's other labelmates (Âme has a solo project) | 2 | Could add |

### Example priority tiers for the next batch (after the one just completed)

**Tier 1 — highest priority (gap + prominence + Asia potential):**
- Ricardo Villalobos (legendary minimal / minimal house, Perlon, has played Asia)
- Sven Väth (Cocoon, German techno institution, massive Asia presence historically)
- a:rpia:r trio (Rhadoo, Petre Inspirescu, Raresh) — Romanian minimal, played Hong Kong/Shanghai
- Âme solo (Kristian Beyer's solo project) — adds depth to Innervisions
- Adriatique's Siamese label affiliates

**Tier 2 — style breadth (new styles not yet represented):**
- MJ Cole / Todd Edwards / El-B / Oris Jay (UK garage / 2-step — zero coverage)
- Goldie / LTJ Bukem / Roni Size (drum & bass — zero coverage)
- The Chemical Brothers / Daft Punk / The Prodigy (big beat / live electronic acts — zero coverage)
- Four Tet / Floating Points (UK live electronic — zero coverage)
- Maribou State / Bonobo (downtempo / live electronic — zero coverage)

**Tier 3 — second-tier depth for existing systems:**
- Klockworks affiliates: Dustin Zahn, Etapp Kyle, Steve Rachmad
- Drumcode affiliates: Layton Giordani, Bart Skils, Victor Ruiz
- Innervisions affiliates: Âme live, Trikk, Ame
- Dystopian affiliates: Alex.Do, Ferenc
- Filth on Acid affiliates: Space 92, Teenage Mutants
- Cocoon affiliates

**Tier 4 — experimental / niche:**
- Aphex Twin / Richard D. James (too niche for most club bookings but influential)
- Actress / Burial (purely listening electronic — unlikely to play club shows in China)
- Autechre / IDM (same)
- These are deprioritized because their touring likelihood in Shanghai is near-zero.

### Batch size rule of thumb

- **Normal batch: 20 DJs** — one focused session (research + write + verify)
- **Minimum batch: 10 DJs** — if you're adding for a specific event (e.g. "Anyma is playing, so let me add 3 more Afterlife DJs")
- **Maximum batch: 30 DJs** — more than that and the JSON diff review becomes unwieldy

### When NOT to add a DJ

- If the DJ is already in the file with the same `slug` (check first with the cross-reference step)
- If the DJ is strictly a local Shanghai resident already covered by an existing profile
- If the DJ is a one-off warm-up act with no international career or releases
- If information is too sparse to write a meaningful `summary` (need at least label + origin + style)

## Common tasks

### Add the next batch of 20 international DJs

1. Run count verification to see current totals
2. Use the priority strategy above to select 20
3. Write profile blocks matching the schema
4. Validate JSON
5. Run count verification again
6. **Invoke dj-bio-sync** to push changes to the live JS file
7. Commit

### Add a single DJ who has just been announced in Shanghai

1. Write a profile with `itinerary: [{ date: "2026-xx-xx", eventId: "...", ... }]`
2. Run validation + sync
3. The event page's DJ line-up cross-reference will now pick up the slug

### Fix existing profile info (genre, summary, etc.)

1. Edit the specific profile in-place
2. Run JSON validation
3. **Invoke dj-bio-sync** (overwrites the matching slug in the JS file)

### Generate coverage report

```bash
node -e "const d=JSON.parse(require('fs').readFileSync('config/tracked-dj-profiles.json','utf8'));const intl=d.profiles.filter(p=>p.scope&&p.scope.includes('International'));console.log('Total:',d.profiles.length);console.log('International:',intl.length);const g={};intl.forEach(p=>p.genres.forEach(x=>g[x]=(g[x]||0)+1));console.log('Genre distribution:');Object.entries(g).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('  '+k+': '+v));"
```

## What this skill does NOT touch

- **Poster images** — handled by `poster-upload` skill
- **Event line-ups** — handled by `event-tagging` skill
- **DJ photos** — optional separate task (see Step 7)
- **Git push / Vercel deploy** — up to you after running dj-bio-sync

## Related files to know

| File | Role |
|------|------|
| `config/tracked-dj-profiles.json` | **Source of truth.** Human-edited. |
| `data/tracked-dj-itineraries.js` | **What the website reads.** Generated by `scripts/sync-dj-bio.js`. |
| `scripts/sync-dj-bio.js` | The sync script. Invoked by `dj-bio-sync` skill. |
| `assets/dj-photos/` | Thumbnail photos. `imageUrl` field references these. |
| `djs.html` | The DJ listing page on the website. |
