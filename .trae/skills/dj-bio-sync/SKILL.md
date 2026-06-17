---
name: "dj-bio-sync"
description: "Updates DJ profile bios in tracked-dj-profiles.json, syncs them to the JS file the website actually reads, pushes to Git, and verifies on Vercel. Invoke when user edits DJ summaries/sources or adds a new batch of DJ profiles and wants the changes live on the website. This skill is ALWAYS called after the dj-database-curator skill finishes writing."
---

# DJ Bio Sync

**Problem this skill solves:** The website displays DJ profiles from `data/tracked-dj-itineraries.js`, but humans edit the more readable `config/tracked-dj-profiles.json`. Editing only the JSON and pushing does nothing visible — a sync step is required to propagate changes to the JS file before committing and pushing.

**When to invoke:**
- After running `dj-database-curator` to add new DJ profiles (e.g., a 20-DJ batch)
- After editing any summary, source note, genre, or scope field
- After the user says "sync this to the website" or "make this live"

**Typical flow: dj-database-curator → dj-bio-sync → [git commit + Vercel verify]**

## Data flow

```
config/tracked-dj-profiles.json  (what you edit)
          |
   scripts/sync-dj-bio.js      (the sync script)
          |
          v
 data/tracked-dj-itineraries.js (what the website reads via window.DJ_ITINERARY_DATA)
          |
          v
 djs.html on shanghai-rave-calendar-2026.vercel.app
```

## Quick start — I just added 20 new DJs, make them live

If the `dj-database-curator` skill just finished adding a batch of new profiles, this is the fastest path:

```bash
# 1. Confirm JSON is valid (already done by curator, but double-check)
node -e "JSON.parse(require('fs').readFileSync('config/tracked-dj-profiles.json','utf8')); console.log('JSON OK')"

# 2. Run the sync script
node scripts/sync-dj-bio.js

# 3. Spot-check that the new slugs are in the output
node -e "const d=require('fs').readFileSync('data/tracked-dj-itineraries.js','utf8');const slugs=['ben-klock','tale-of-us','solomun','dixon'];slugs.forEach(s=>{if(d.includes(s)){console.log('OK:',s);}else{console.log('MISSING:',s);}});"

# 4. Commit and push
git add config/tracked-dj-profiles.json data/tracked-dj-itineraries.js
git commit -m "chore(djs): add 20 international reference profiles (batch 2)"
git push
```

Then optionally open `djs.html` to confirm visually — new profiles appear at the end of the listing until the scraper re-runs.

## Step-by-step workflow (full reference)

### 1. Edit the JSON source

Edit DJ summaries, source notes, labels, scope, genres, or source URLs in:

```
config/tracked-dj-profiles.json
```

**Rules for text in JSON summaries:**
- Keep summaries in English.
- Do not use Cyrillic or Chinese characters in profile summaries, scope, or source labels for international DJs.
- Avoid unsubstantiated claims (e.g., "DJ Mag #1 Techno DJ" without a specific citation URL).
- Reference verified facts: artist's official label (e.g., KNTXT, Drumcode, Fckng Serious, Trip, Gudu Records, Afterlife, Exhale, We Are The Brave), birth/background info drawn from the artist's official site or Resident Advisor, and real festival headlining slots.
- **Do not nest double quotes inside JSON string values.** Use rephrasing to avoid `"..."` inside a `"..."` field.

**For newly-added DJs (slugs that don't yet exist in the JS file):** The sync script creates a new entry in the JS file for every JSON slug it doesn't already know about. There is no separate "add" path — just write to the JSON and run sync. The new entry gets an empty `itinerary: []` by default, which can later be populated by the event scraper.

### 2. Validate the JSON is still parseable

Before syncing, verify the JSON is valid:

```bash
node -e "JSON.parse(require('fs').readFileSync('config/tracked-dj-profiles.json','utf8')); console.log('JSON OK')"
```

If this fails, fix the JSON before continuing. Common issues: trailing commas, unescaped quotes inside string values, or non-ASCII characters in places where the rest of the profile uses English.

### 3. Run the sync script

```bash
node scripts/sync-dj-bio.js
```

Expected output: `Written N profiles to /path/to/data/tracked-dj-itineraries.js`

What the sync script does:
1. Reads `config/tracked-dj-profiles.json`, indexing profiles by their `slug`.
2. Reads the existing `data/tracked-dj-itineraries.js` by running it in a sandbox with a fake `window` object.
3. For every slug that exists in the JSON, **overwrites** the profile fields (`name`, `aliases`, `scope`, `imageTheme`, `genres`, `summary`, `sourceNote`, `sources`) from the JSON while **preserving** all existing `itinerary` rows in the JS file.
4. For slugs that exist in the JS file but not in the JSON, the old profile is kept untouched — so event-driven/local DJ profiles are never erased.
5. Normalizes `sources` entries to always have `label` and `url`, and only carry optional `status` and `checked` fields when present.
6. Writes the merged object back to the JS file in the form `window.DJ_ITINERARY_DATA = { ... };`, with keys alphabetized for stable diffs.

### 4. Verify the JS file picked up the new text

Before pushing, spot-check that a keyword from your edit actually made it into the JS file. For example, if you changed Boris Brejcha's label from "F PMP" to "Fckng Serious":

```bash
grep -c "Fckng Serious" data/tracked-dj-itineraries.js
# expect: 3 (summary, sourceNote, and source label)
```

Or for a multi-DJ sweep, check a few signature phrases from each DJ's summary:

```bash
for kw in "Fckng Serious" "Trip label" "High-Tech Minimal" "Exhale event series" "We Are The Brave" "Savour the Moment"; do
  if grep -q "$kw" data/tracked-dj-itineraries.js; then echo "OK: $kw"; else echo "MISSING: $kw"; fi
done
```

### 5. Commit and push

Only commit the two files the skill touches. Do not bundle unrelated changes:

```bash
git add config/tracked-dj-profiles.json data/tracked-dj-itineraries.js
git commit -m "Sync DJ profile bios: update summaries and sources from JSON to JS"
git push
```

### 6. Wait for Vercel build, then verify live

Vercel auto-deploys on push to `main`. Wait 20-30 seconds, then verify the JS file served from Vercel contains your edits:

```bash
# In PowerShell:
$r = Invoke-WebRequest -Uri "https://shanghai-rave-calendar-2026.vercel.app/data/tracked-dj-itineraries.js" -UseBasicParsing
$content = $r.Content
@("Fckng Serious","Trip label","High-Tech Minimal") | ForEach-Object {
  if ($content.Contains($_)) { Write-Host "FOUND: $_" } else { Write-Host "MISSING: $_" }
}
```

Or verify directly by opening `https://shanghai-rave-calendar-2026.vercel.app/djs.html` in a browser and searching for a DJ you edited — the summary rendered on the page comes straight from `data/tracked-dj-itineraries.js`.

## File map

| File | Role | Edited by |
|------|------|------------|
| `config/tracked-dj-profiles.json` | Curated source of truth for DJ bios | Human (you) |
| `scripts/sync-dj-bio.js` | Sync script. Reads JSON, merges into JS | Human runs it |
| `data/tracked-dj-itineraries.js` | JS file served to the browser. Defines `window.DJ_ITINERARY_DATA` | Overwritten by sync script |
| `djs.html` | Page that consumes `DJ_ITINERARY_DATA` at runtime | Read-only for this skill |
| `scripts/scrape-events.js` | The larger scraper that *also* calls `readTrackedDjProfiles()` and merges into the same JS file during its runs | Read-only for this skill |

## What this skill does NOT touch

- The `itinerary` arrays in the JS file (past/future tour dates) are preserved and never overwritten by this skill — only the curated overlay fields are refreshed.
- Event files in `data/events.json`, `events/*.html`, or poster assets are not touched — if a DJ also appears on a specific event poster page, that display comes from event-level lineups, not from these profiles.
- The `scripts/scrape-events.js` flow — that is the separate auto-scraper job; it will naturally pick up the same JSON profiles on its next run. This manual sync skill is for propagating bio edits to the live site immediately, without waiting for a scrape.

## Common pitfalls

| Pitfall | How to avoid |
|---------|-------------|
| **Pushing only the JSON** — the website keeps showing old bios | Always run `node scripts/sync-dj-bio.js` and commit the JS file too. |
| **JSON parse fails** because you put unescaped `"..."` inside a summary string | Rephrase, or use single quotes/apostrophes in the English prose instead of nested double quotes. |
| **Cyrillic text (трип) shows up on the page** | Replace with the English label name ("Trip") in `tracked-dj-profiles.json`, then re-sync. |
| **Label URL points to the wrong site** (e.g., `fpmp.de` instead of the real label) | Look up the artist's actual label discography on Beatport/Discogs/Resident Advisor before editing. |
| **Sync script loses itinerary rows** | The current script spreads `base` first, then `jsonProfile`, then re-pins `itinerary: base.itinerary || []` last — so itinerary rows are always preserved. Do not change this ordering. |

## Quick reference — one-liner

After editing `config/tracked-dj-profiles.json`:

```bash
node scripts/sync-dj-bio.js && git add config/tracked-dj-profiles.json data/tracked-dj-itineraries.js && git commit -m "Sync DJ bios" && git push
```

Then open `https://shanghai-rave-calendar-2026.vercel.app/djs.html` to confirm.
