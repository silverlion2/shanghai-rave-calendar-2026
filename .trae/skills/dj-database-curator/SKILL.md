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

### Step 1: Decide the priority (see next section — Tier 1 first)

Before writing any JSON, decide **which 20 DJs to add**. Use the **4-tier priority system below** (Tier 1 = confirmed Shanghai event appearances = highest). Start by running `node scripts/_tmp_intl_event_scan.js` to see which international DJs are already referenced in events.json but not yet in profiles. Output the proposed list to the user as plain text before writing any files.

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

**Updated 2026-06-18 after analysis of `data/events.json` and the existing 45 international profiles.**

The project currently has **174 profiles**, of which **45 are international reference DJs**. However, **zero of those 45 international DJs have confirmed Shanghai/China itinerary dates in `data/tracked-dj-itineraries.js`**, and **none of them appear in the Shanghai `data/events.json`** either. Meanwhile, **dozens of international DJs who DO appear in real Shanghai events** are missing profiles — breaking the cross-reference link on the website (each event could link to the DJ profile and vice versa).

**The old priority (global prominence first) was wrong.** Here's the corrected priority — apply in this exact order:

### Tier 1 — 🎯 已在上海事件中出现、但无 profile（最高优先级，50% 配额）

**DJs already appearing in events.json who have no profile.** These are confirmed Shanghai bookings — adding them immediately improves the website's cross-linking. Each event can then link to the DJ profile, and the DJ profile can surface their upcoming Shanghai appearances.

Run this script to regenerate the current gap list:
```bash
node scripts/_tmp_intl_event_scan.js
```

**Confirmed international names currently missing from profiles** (as of 2026-06-18):
- **MssingNo** (UK — grime / UK garage / bass) — Gully Riddim 9 Year Anniversary
- **Fractale** (Italy — drum & bass / dubstep / breaks) — 19Hz Shanghai lineup
- **Mungk** (UK — drum & bass / dubstep) — ONEFORTYASIA event
- **Simbie** (Australia — drum & bass / dubstep) — ONEFORTYASIA event
- **Kirk** — FaQ Pres. KIRK at Abyss Shanghai
- **Leo Monira** — A.T.M Pres. LEO MONIRA at Reactor
- **Cosmjn** (Romania — minimal / deep techno)
- **Dean Chew**
- **Marcos Godoy** (Argentina / Chile — house / techno)
- **Nata Lee**
- **Koldo**
- **Juliano Allgayer**
- **Stefano Dvt**
- **Milo Raad**
- **Janein**
- **Peyotl**

**Before adding each name, verify the DJ is truly international** (not a Chinese local with an English stage name). For example, "YKK", "Wataru", "Oolong", "10000", "Kalapas", "Aho", "Yadong", "Zean", "Kilo Vee", "Tom Yeti", "Maguro", "BAADAAM", "SAI G" are likely Chinese or Asia-based locals — they may already be in the local profile section or belong there.

### Tier 2 — ✈️ 有中国/亚洲巡演信号的国际 DJ（第二高，25% 配额）

**DJs with real China/Asia tour signals.** Artists who have recent confirmed bookings in Shanghai, Beijing, Hong Kong, Shenzhen, Chengdu, or Taipei. Measured by: (a) explicit mention in event lineups, (b) Resident Advisor events showing China dates, (c) official social media announcements with Chinese cities.

For each batch: research 3–5 names from the Tier 1 list who also have this signal.

### Tier 3 — 🌍 风格补齐（15% 配额）

**Style-category coverage gaps.** If the database has zero or near-zero entries in a genre tag, add at least 1–2 representative names for that category. As of 2026-06-18, the **gaps at 0 international entries** are:
- **UK garage / 2-step / UKG:** MJ Cole, Todd Edwards, El-B, Oris Jay
- **Drum & bass:** Goldie, LTJ Bukem, Andy C, Roni Size
- **Breakbeat / breaks:** Plump DJs, Stanton Warriors (or artists from Tier 1 like Fractale, Mungk who cover this)
- **Romanian minimal (a:rpia:r circle):** Ricardo Villalobos, Petre Inspirescu, Rhadoo, Raresh — note **Cosmjn was already in Tier 1** so he doubles-dips into Romanian minimal coverage
- **Sven Väth / Cocoon / German old-school:** Sven Väth himself, plus Cocoon residents

### Tier 4 — 🎖️ 体系补全（低优先级，10% 配额）

**Global prominence and label-system completion.** Iconic names that define the genre or label but lack the China signal. Use as filler for remaining slots in a batch. Examples:
- Innervisions second-tier (Âme live, Trikk)
- Drumcode second-tier (Layton Giordani, Bart Skils, Victor Ruiz)
- Kompakt second-tier (Superpitcher, Michael Mayer)
- Dystopian second-tier (Alex.Do, Ferenc)

### Anti-priority — avoid adding these soon

- DJs whose primary touring is in Western Europe / North America only and who have never shown China booking intent
- One-off warm-up DJs with no releases
- Duplicates of names already profiled (check `slug` field before writing — especially watch for variations: "Âme" vs "Ame", "Kölsch" vs "Kolsch", "MssingNo" vs "mssingno")

### Batch composition rule

A good 20-DJ batch should look like this:
- **8–10 DJs from Tier 1** (confirmed Shanghai appearances, gaps from events.json)
- **4–5 DJs from Tier 2** (Asia/China booking signal but no direct Shanghai lineup yet)
- **3–5 DJs from Tier 3** (style coverage gaps, especially UKG / DnB / Romanian minimal)
- **0–3 DJs from Tier 4** (label-system completion)

### Batch size rules

- **Normal batch: 20 DJs** — one focused session (research + write + verify)
- **Minimum batch: 10 DJs** — if you're adding for a specific event
- **Maximum batch: 30 DJs** — beyond this JSON review becomes unwieldy

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
