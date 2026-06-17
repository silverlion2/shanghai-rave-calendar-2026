const fs = require('fs');
const path = require('path');

const taxonomy = require(path.join(__dirname, '..', '..', '..', 'scripts', 'techno-taxonomy.js'));

// ---------- Config ----------
const EVENTS_FILE = path.join(__dirname, '..', '..', '..', 'data', 'events.json');

// Fake-positive venue names – "House" is the venue brand, not the music style.
const HOUSE_VENUE_BLACKLIST = [
  /dirty house/i,
];

// Fake-positive title patterns – "House of" is a naming convention, not a genre.
const HOUSE_TITLE_BLACKLIST = [
  /\b(house of|dead house)\b/i,
];

// ---------- Helpers ----------
function loadEvents() {
  const raw = fs.readFileSync(EVENTS_FILE, 'utf8');
  const data = JSON.parse(raw);
  return data;
}

function saveEvents(data) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function isGenericNote(note) {
  if (!note) return true;
  return /^RA lists|^RA indexed|^RA-linked|^Heim poster|^Liminal Dreams|^DiscChef|^Space Panda/i.test(note.trim());
}

function isHouseRelated(event) {
  const genre = (event.genre || '').toLowerCase();
  const desc = (event.description || '').toLowerCase();
  const title = (event.title || '').toLowerCase();
  const venue = (event.venue || '').toLowerCase();

  // Skip false-positive venue names
  if (HOUSE_VENUE_BLACKLIST.some(re => re.test(venue))) return false;
  // Skip title-only matches (e.g. "House of X")
  if (HOUSE_TITLE_BLACKLIST.some(re => re.test(title))) return false;

  // Genre-level match
  if (/\b(tech house|deep house|g-house|bass house|underground house|minimal house|afro house|soul house|funky house|melodic house|house night|house music)\b/i.test(genre)) {
    return true;
  }
  if (/\bhouse\b/i.test(genre)) {
    // If genre has "house" as a standalone token
    // But not just in "house," "house -" etc as part of broader list
    return true;
  }
  // Description-level match (strong signals only)
  if (/\b(house night|house music|underground house|house\/techno|house lane|house-leaning|house bill|late house|g-house|bass house)\b/i.test(desc)) {
    return true;
  }
  // DJ-level match
  const lineupNotes = (event.lineup || []).map(d => (d.note || '').toLowerCase()).join(' ');
  if (/\b(tech house|deep house|g-house|bass house|underground house|minimal house|afro house|soul house|funky house|melodic house|house night|house music)\b/i.test(lineupNotes)) {
    return true;
  }

  return false;
}

function extractStyleHint(event) {
  const parts = [];
  const genre = (event.genre || '').trim();
  const desc = (event.description || '').toLowerCase();

  // Genre is the most reliable signal
  if (genre && genre !== 'electronic' && genre !== 'techno') {
    parts.push(genre);
  }

  // Look for style cue keywords in description when genre is too generic
  if (!parts.length || /^techno$/i.test(genre)) {
    const styleKeywords = [
      { pattern: /hard techno/, label: 'hard techno' },
      { pattern: /industrial/, label: 'industrial' },
      { pattern: /ebm/, label: 'EBM' },
      { pattern: /hypnotic|deep tech|psytrance|psy-tech/, label: 'hypnotic/deep' },
      { pattern: /minimal/, label: 'minimal' },
      { pattern: /groove|rolling|groovy/, label: 'groovy' },
      { pattern: /electro/, label: 'electro' },
      { pattern: /trance/, label: 'trance' },
      { pattern: /melodic/, label: 'melodic' },
      { pattern: /\bbass\b|dubstep|uk garage|ukg|breaks|jungle/i, label: 'bass/broken-beat' },
      { pattern: /\bdisco\b|nu-disco|soul|funk/i, label: 'disco/soul' },
      { pattern: /\bhip.hop|hip-hop|rap/i, label: 'hip-hop' },
    ];
    styleKeywords.forEach(kw => {
      if (kw.pattern.test(desc) && !parts.some(p => p.toLowerCase().includes(kw.label.toLowerCase().split('/')[0]))) {
        parts.push(kw.label);
      }
    });
  }

  return parts.join(', ');
}

// ---------- Step 1: Enrich DJ notes ----------
function enrichDJNotes(events, opts = {}) {
  const { verbose = false } = opts;
  let eventUpdated = 0;
  let noteCount = 0;

  events.forEach(event => {
    const lineup = event.lineup || [];
    if (!lineup.length) return;

    const styleHint = extractStyleHint(event);
    if (!styleHint) return;

    let touched = false;
    lineup.forEach(dj => {
      const note = dj.note || '';
      if (isGenericNote(note)) {
        const djName = dj.name || 'DJ';
        const tail = note ? ' ' + note : '';
        const prefix = styleHint.split(/[,\/]/).slice(0, 2).join('/');
        dj.note = `${djName}: ${prefix} selection.${tail}`;
        noteCount++;
        touched = true;
      }
    });

    if (touched) eventUpdated++;
  });

  if (verbose) {
    console.log(`[step1] ${noteCount} DJ notes enriched across ${eventUpdated} events`);
  }
  return { events, noteCount, eventUpdated };
}

// ---------- Step 2: Re-enrich soundTags, decisionTags/decisionProfile ----------
function reEnrichSoundTags(events, opts = {}) {
  const { verbose = false } = opts;
  let updated = 0;

  events.forEach(event => {
    const newSoundTags = taxonomy.soundTagsForEvent(event);
    const oldStr = (event.soundTags || []).join(',');
    const newStr = newSoundTags.join(',');
    if (oldStr !== newStr) updated++;
    event.soundTags = newSoundTags;

    // decision tags & profile
    const profile = taxonomy.decisionProfileForEvent(event);
    event.decisionTags = profile.decisionTags;
    event.decisionProfile = {
      intensity: profile.intensity,
      credibility: profile.credibility,
      lateRoom: profile.lateRoom,
      ticketReady: profile.ticketReady,
      hasLineup: profile.hasLineup,
      hasPoster: profile.hasPoster,
      riskFlags: profile.riskFlags,
    };
  });

  if (verbose) console.log(`[step2] soundTags/decisionTags re-enriched`);
  return { events, updated };
}

// ---------- Step 3: Smart vibe tagging ----------
function applySmartVibes(events, opts = {}) {
  const { verbose = false, addHouse = true } = opts;

  events.forEach(event => {
    const hasHouse = isHouseRelated(event);
    const alreadyHasHouse = (event.vibe || []).includes('house');

    // house vibe
    if (hasHouse && addHouse && !alreadyHasHouse) {
      event.vibe = [...(event.vibe || []), 'house'];
    } else if (!hasHouse && alreadyHasHouse) {
      // remove false-positive house vibe
      event.vibe = (event.vibe || []).filter(v => v !== 'house');
    }

    // hard / underground / date / bass vibes from genre
    const genre = (event.genre || '').toLowerCase();
    const desc = (event.description || '').toLowerCase();

    // hard
    if (/\b(hard techno|hard trance|hardcore|hard dance|hardstyle|gabber|techno rave|hard house)\b/i.test(genre) ||
        /\b(hard|fast|high-bpm|high bpm|raw|industrial rave)\b/i.test(desc)) {
      if (!(event.vibe || []).includes('hard')) event.vibe = [...(event.vibe || []), 'hard'];
    }

    // bass
    if (/\b(bass|dubstep|ukg|uk garage|breaks|jungle|breakbeat|dnb|drum.*bass|ghettotech)\b/i.test(genre) ||
        /\b(bass music|club music|breakbeat|ukg)\b/i.test(desc)) {
      if (!(event.vibe || []).includes('bass')) event.vibe = [...(event.vibe || []), 'bass'];
    }

    // date-friendly / rooftop / open-air
    if (/\b(rooftop|bund|pavilion|sunset|open-air|open air|outdoor|hotel|hotel party|date night|date-friendly)\b/i.test(genre + ' ' + desc)) {
      if (!(event.vibe || []).includes('date')) event.vibe = [...(event.vibe || []), 'date'];
    }

    // warehouse
    if (/\b(warehouse|secret|pop-up|industrial grid|multi-room|club system)\b/i.test(genre + ' ' + desc)) {
      if (!(event.vibe || []).includes('warehouse')) event.vibe = [...(event.vibe || []), 'warehouse'];
    }

    // techno as default
    if (/\btechno\b/i.test(genre) && !(event.vibe || []).includes('techno')) {
      event.vibe = [...(event.vibe || []), 'techno'];
    }
  });

  if (verbose) console.log(`[step3] smart vibe tags applied`);
  return events;
}

// ---------- Step 4: Validation ----------
function validateEvents(events) {
  const issues = [];

  events.forEach((event, idx) => {
    // DJ notes – do any have notes that match house cues while the event has no house tag?
    const hasHouseTag = (event.vibe || []).includes('house') || (event.soundTags || []).includes('house');
    const hasHouseInGenre = /\bhouse\b/i.test(event.genre || '');

    // Venue-name false-positive check
    const venueLower = (event.venue || '').toLowerCase();
    if (/dirty house/i.test(venueLower) && hasHouseTag && !hasHouseInGenre) {
      issues.push({ event: event.title, type: 'venue-false-positive', detail: `Venue "Dirty House" but genre has no house` });
    }

    // Title-name false-positive check
    if (/\b(house of|dead house)\b/i.test(event.title || '') && hasHouseTag && !hasHouseInGenre) {
      issues.push({ event: event.title, type: 'title-false-positive', detail: `Title contains "House" pattern but genre has no house` });
    }

    // Empty genre with no other signals
    if (!event.genre && (!event.lineup || !event.lineup.length)) {
      issues.push({ event: event.title, type: 'no-signal', detail: `No genre or lineup provided` });
    }
  });

  return {
    totalEvents: events.length,
    totalWithHouse: events.filter(e => (e.vibe || []).includes('house') || (e.soundTags || []).includes('house')).length,
    totalWithSoundTags: events.filter(e => (e.soundTags || []).length).length,
    totalWithVibe: events.filter(e => (e.vibe || []).length).length,
    issues,
  };
}

// ---------- CLI entry ----------
function run(options = {}) {
  const { verbose = false, tag = 'house', steps = [1,2,3,4] } = options;

  const data = loadEvents();
  let events = data.events || [];

  console.log(`\n=== Event Tagging Skill ===`);
  console.log(`Total events loaded: ${events.length}\n`);

  if (steps.includes(1)) {
    const r = enrichDJNotes(events, { verbose });
    events = r.events;
  }

  if (steps.includes(2)) {
    const r = reEnrichSoundTags(events, { verbose });
    events = r.events;
  }

  if (steps.includes(3)) {
    events = applySmartVibes(events, { verbose, addHouse: tag === 'house' || tag === 'all' });
  }

  if (steps.includes(4)) {
    const report = validateEvents(events);
    console.log(`\n=== Validation Report ===`);
    console.log(`Total events: ${report.totalEvents}`);
    console.log(`Events with house tag: ${report.totalWithHouse}`);
    console.log(`Events with soundTags: ${report.totalWithSoundTags}`);
    console.log(`Events with vibe tags: ${report.totalWithVibe}`);
    console.log(`Issues found: ${report.issues.length}`);
    if (report.issues.length) {
      report.issues.forEach(i => console.log(`  - [${i.type}] ${i.event}: ${i.detail}`));
    }
  }

  saveEvents({ ...data, events });
  console.log(`\nSaved to data/events.json ✓`);
  return data;
}

// Run as CLI
if (require.main === module) {
  const opts = {};
  const args = process.argv.slice(2);
  args.forEach(a => {
    if (a === '--verbose' || a === '-v') opts.verbose = true;
    if (a === '--skip-dj') opts.skipDJ = true;
    if (a === '--only-house') opts.tag = 'house';
    if (a === '--all') opts.tag = 'all';
  });

  const steps = [1, 2, 3, 4];
  if (opts.skipDJ) steps.splice(0, 1);
  run({ verbose: true, tag: opts.tag || 'all', steps });
}

module.exports = {
  run,
  enrichDJNotes,
  reEnrichSoundTags,
  applySmartVibes,
  validateEvents,
  isHouseRelated,
  extractStyleHint,
  HOUSE_VENUE_BLACKLIST,
  HOUSE_TITLE_BLACKLIST,
};
