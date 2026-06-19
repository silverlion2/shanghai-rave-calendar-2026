---
name: "event-tagging"
description: "Auto-tags rave calendar events with smart vibe labels, sound taxonomy tags, and enriches DJ lineup notes with style hints. Filters out false-positives (e.g., 'Dirty House' venue name) when tagging 'house' style. Invoke when user asks to tag events, add labels, enrich DJ notes, validate house/techno/bass tags, or run sound classification."
---

# Event Tagging Skill

Smart automatic labelling system for the Shanghai Rave Calendar events in `data/events.json`.

## What it does

### Step 1: Enrich DJ lineup notes
When a DJ's note is generic (e.g. "RA lists [name] on the lineup"), the skill rewrites it with a style hint derived from the event's genre and description.

**Before:**
```
"note": "RA lists Golgol on the LONG WAVE lineup."
```
**After:**
```
"note": "Golgol: house, club, electronic selection. RA lists Golgol on the LONG WAVE lineup."
```

### Step 2: Re-enrich soundTags and decisionTags
Re-runs `techno-taxonomy.js` on every event to refresh `soundTags`, `decisionTags`, and `decisionProfile` based on the updated lineup context.

### Step 3: Smart vibe tagging
Adds vibe labels based on genre + description:
- **`house`** — but only when genre or description mentions real house styles (tech house, deep house, g-house, underground house, etc.)

  **Excludes false-positives** like:
  - Venue name: "Dirty House"
  - Title patterns: "House of X", "DEAD HOUSE"

- **`hard`** — hard techno / hardcore / hard trance / fast / high-BPM
- **`bass`** — bass / dubstep / UKG / breaks / jungle / ghettotech
- **`date`** — rooftop / Bund / sunset / hotel / open-air / date-friendly
- **`warehouse`** — warehouse / secret / pop-up / industrial-grid events
- **`techno`** — default when genre contains "techno"
- **`jazz-electronic`** — jazz/electronic crossover live bands (BBNG, etc.) that use electronic production and hip-hop breakbeat energy (detected from genre text like "jazz/electronic", "jazz/hip-hop", "crossover jazz", or vibe label `jazz-electronic`)
- **`theatre-electronic`** — theatre productions scored by live DJ electronic music (e.g. Vivat Football at Theatre YOUNG). Not a traditional club night but legitimately uses live electronic sound as a core structural element.

### Step 4: Validation report
Emits a report listing events with house tags, events with soundTags, and issues such as:
- Venue-name false-positive (event at Dirty House with house tag but "techno" genre)
- Title-name false-positive (title "House of" but genre is "techno")
- Events with no genre or lineup at all

## File Structure

```
.trae/skills/event-tagging/
├── SKILL.md          ← This file
└── event-tagging.js  ← Runnable script (4-step pipeline)
```

**Dependencies:**
- `scripts/techno-taxonomy.js` — shared taxonomy module (SOUND_TAXONOMY + decision profile + soundTagsForEvent + decisionProfileForEvent + textForEvent)

## How to run

```bash
# Full pipeline (recommended)
node .trae/skills/event-tagging/event-tagging.js --verbose

# Same thing, short flag
node .trae/skills/event-tagging/event-tagging.js -v

# Skip DJ note enrichment (only re-enrich + tag + validate)
node .trae/skills/event-tagging/event-tagging.js --skip-dj

# Only-house mode (keeps existing other-tag logic but focuses validation on house)
node .trae/skills/event-tagging/event-tagging.js --only-house
```

### Expected output

```
=== Event Tagging Skill ===
Total events loaded: 112

[step1] 175 DJ notes enriched across 44 events
[step2] soundTags/decisionTags re-enriched
[step3] smart vibe tags applied

=== Validation Report ===
Total events: 112
Events with house tag: 28
Events with soundTags: 110
Events with vibe tags: 112
Issues found: 0

Saved to data/events.json ✓
```

## Idempotent behaviour

- Step 1 only rewrites DJ notes that match the "RA lists …" / "RA indexed …" generic pattern — already-written styled notes are never overwritten.
- Step 3 only appends new vibe labels (and specifically removes the `house` label only when the genre/signal is in the blacklist like "Dirty House" venue or "House of X" title, but keeps the label when there is a legitimate signal).
- Running the script twice produces the same output.

## When to invoke

| Scenario | Why |
|----------|-----|
| User adds new events or edits event descriptions | Run the 4-step pipeline so all new events get tagged |
| User asks "tag these with house/techno/bass" | Run pipeline, then show the validation report |
| DJ data imported from external source (RA, generic notes) | Step 1 converts generic placeholder notes into styled ones |
| Curator wants to verify the tag quality | Step 4 validation report flags false-positives |
| Adding new sound taxon (e.g., new "trance" branch) | Re-run steps 2-4 to re-apply classification |

## Known false-positive patterns (hard-filtered)

| Pattern | Example | Why |
|---------|---------|-----|
| Venue contains "Dirty House" | `dirty beats @ Dirty House` | "Dirty House" is a Shanghai club, not a house-style label |
| Title matches "House of X" | `House of Visions pres. Noizar & Soyo` | "House of" is a branding/promoter convention |
| Title contains "DEAD HOUSE" | `ABIBAS CLUB: SLAV DEAD HOUSE` | Hardcore/hardstyle promoter series, not house |

These patterns are defined in `event-tagging.js` as `HOUSE_VENUE_BLACKLIST` and `HOUSE_TITLE_BLACKLIST`. To add a new one, add a regex to the appropriate list and re-run the pipeline.

## Example scenario: tagging a new house event

If a new event is scraped with:

```json
{
  "title": "298 pres. Steal Tapes",
  "venue": "EXIT",
  "genre": "house, techno, underground house",
  "description": "298 brings Italy-linked HouseHeadz Records artist Steal Tapes to EXIT for a groove-led underground house night.",
  "lineup": [
    { "name": "Steal Tapes", "note": "RA lists Steal Tapes on the 298 lineup." },
    { "name": "Sam TBD.", "note": "RA lists Sam TBD. on the 298 lineup." }
  ],
  "vibe": ["underground"],
  "soundTags": []
}
```

After running the skill:

- `lineup[0].note` → `Steal Tapes: house, techno selection. RA lists Steal Tapes...`
- `vibe` → `["underground", "house", "techno"]`
- `soundTags` → `["groovy", "house"]` (from taxonomy re-enrich)

## Git workflow

```bash
# After running the tagging pipeline
git add data/events.json scripts/techno-taxonomy.js shanghai-rave-calendar-2026.html
git commit -m "chore(tagging): run event-tagging pipeline"
git push origin main
```

## Related files

| File | Role |
|------|------|
| `data/events.json` | Primary events dataset (what the skill writes to) |
| `scripts/techno-taxonomy.js` | Taxonomy module (classification engine) |
| `config/scrape-keywords.json` | Keyword catalogue used for event ingestion |
| `shanghai-rave-calendar-2026.html` | Calendar page — reads `vibe` + `soundTags` for the Sound filter |
