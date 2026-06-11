const fs = require("fs");

const scriptPattern = new RegExp("<script>([\\s\\S]*?)</script>", "g");
const htmlFiles = ["index.html", "venues.html", "djs.html", "planner.html", "ops.html"];
const syntaxOnlyHtmlFiles = ["shanghai-rave-calendar-2026.html"];
const externalJsFiles = ["data/dj-data.js", "data/tracked-dj-itineraries.js"];
let scriptCount = 0;
const requiredCuratedEventIds = [
  "milo-cosmjn",
  "fruitygroove-soul-navigator",
  "matisa-limsum",
  "santa-k",
  "synth-crush",
  "fengyun-5",
  "nosaj-thing",
  "nova-sunset-sessions-flair",
  "night-at-museum-90s-disco",
  "afrowave-takeover-la-burg",
  "nova-summer-splash-pool-party",
  "sunset-sundays-dome",
];
const requiredPublishedCuratedEventIds = [
  "fruitygroove-soul-navigator",
  "nova-sunset-sessions-flair",
  "night-at-museum-90s-disco",
  "afrowave-takeover-la-burg",
  "nova-summer-splash-pool-party",
  "sunset-sundays-dome",
];

const knownNonPerformerNames = new Set([
  "abibas club",
  "abyss",
  "abyss residents",
  "abyss support",
  "arcane",
  "arcane shanghai hotel",
  "cocarde crew",
  "heim x alter",
  "hotl4b",
  "house of visions",
  "knot",
  "love bang",
  "met underground festival",
  "onefortyasia room",
  "shanghai hotel",
  "space panda",
  "space panda support",
  "specters",
  "system",
  "system selectors",
  "wigwam",
  "youshan festival",
]);

function normalizeEntityName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function splitEntityNames(value) {
  return String(value || "")
    .split(/\s+\/\s+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function performerNameFromLineupItem(item) {
  if (typeof item === "string") return item;
  return item?.name || item?.dj || item?.artist || "";
}

function lineupItemNote(item) {
  return item && typeof item === "object" ? String(item.note || item.description || "") : "";
}

function lineupItemRole(item) {
  return item && typeof item === "object" ? normalizeEntityName(item.entityType || item.role || item.type || "") : "";
}

function isPlaceholderPerformerName(name) {
  const normalized = normalizeEntityName(name);
  return !normalized
    || /\btba\b/.test(normalized)
    || /\b\d+\s*djs?\b/.test(normalized)
    || /\bmulti\s*floor\s*djs?\b/.test(normalized)
    || /\bdj\s*music\b/.test(normalized);
}

function venueAliases(event = {}) {
  const aliases = new Set();
  const add = value => {
    const normalized = normalizeEntityName(value);
    if (normalized && normalized.length >= 3) aliases.add(normalized);
  };
  add(event.venue);
  splitEntityNames(event.venue).forEach(add);
  const venue = normalizeEntityName(event.venue);
  if (venue.endsWith(" shanghai")) add(venue.replace(/\s+shanghai$/, ""));
  if (venue.startsWith("the ")) add(venue.replace(/^the\s+/, ""));
  return aliases;
}

function hasPerformerEvidence(name, item) {
  const role = lineupItemRole(item);
  if (/^(artist|dj|performer|live|live act|live set|musician)$/.test(role)) return true;
  const text = `${normalizeEntityName(name)} ${normalizeEntityName(lineupItemNote(item))}`;
  return /\b(dj|producer|artist|selector|performer|headliner|live act|live set|opening slot|closing artist|lineup artist|booked|listed artist|listed from)\b/.test(text);
}

function hasNonPerformerRole(item) {
  return /^(organizer|organiser|venue|crew|promoter|label|room|stage|placeholder|context)$/.test(lineupItemRole(item));
}

function isNonPerformerName(name, item, event = {}) {
  const normalized = normalizeEntityName(name);
  if (isPlaceholderPerformerName(name)) return true;
  if (knownNonPerformerNames.has(normalized)) return true;
  if (venueAliases(event).has(normalized)) return true;
  if (hasNonPerformerRole(item)) return true;

  const organizer = normalizeEntityName(event.organizer);
  if (organizer && organizer === normalized && !hasPerformerEvidence(name, item)) return true;

  const note = normalizeEntityName(lineupItemNote(item));
  const nonPerformerNameCue = /\b(crew|promoter|organizer|organiser|collective|festival|room|stage|floor|venue|support|residents?|selectors?|hosts?)\b/.test(normalized);
  const nonPerformerNoteCue = /\b(promoter context|festival context|party concept|theme note|room context|support context|venue context|organizer|organiser|rather than a single|club institution)\b/.test(note);
  return (nonPerformerNameCue || nonPerformerNoteCue) && !hasPerformerEvidence(name, item);
}

function assertNoNonPerformerLineups(events, lineups = {}) {
  for (const event of events) {
    const items = [
      ...(Array.isArray(event.lineup) ? event.lineup : []),
      ...(Array.isArray(lineups[event.id]) ? lineups[event.id] : []),
    ];

    for (const item of items) {
      const name = performerNameFromLineupItem(item);
      for (const part of splitEntityNames(name)) {
        if (isNonPerformerName(part, item, event)) {
          throw new Error(`venue/organizer entered DJ lineup for ${event.id}: ${part}`);
        }
      }
    }
  }
}

function assertLocalPosterAsset(event, contextLabel) {
  if (event.posterEvidence === undefined) return;

  const posterUrl = String(event.posterUrl || "").trim();
  if (!posterUrl) {
    throw new Error(`${contextLabel} ${event.id} has posterEvidence but no local posterUrl`);
  }
  if (!/^assets\/posters\/[^/]+\.(?:jpe?g|png|webp)$/i.test(posterUrl)) {
    throw new Error(`${contextLabel} ${event.id} posterUrl must point to a local assets/posters image: ${posterUrl}`);
  }
  if (/^https?:\/\//i.test(posterUrl) || /images\.ra\.co/i.test(posterUrl)) {
    throw new Error(`${contextLabel} ${event.id} posterUrl must not use a remote or RA-blocked image URL: ${posterUrl}`);
  }
  if (!fs.existsSync(posterUrl)) {
    throw new Error(`${contextLabel} ${event.id} posterUrl file does not exist: ${posterUrl}`);
  }

  const bytes = fs.readFileSync(posterUrl);
  if (bytes.length < 1024) {
    throw new Error(`${contextLabel} ${event.id} posterUrl file is too small to be a real poster: ${posterUrl}`);
  }
  const signature = bytes.subarray(0, 8).toString("hex");
  const isJpeg = signature.startsWith("ffd8");
  const isPng = signature === "89504e470d0a1a0a";
  const isWebp = bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (!isJpeg && !isPng && !isWebp) {
    throw new Error(`${contextLabel} ${event.id} posterUrl is not a valid local JPEG, PNG, or WebP image: ${posterUrl}`);
  }
}

for (const file of [...htmlFiles, ...syntaxOnlyHtmlFiles]) {
  const html = fs.readFileSync(file, "utf8");
  const scripts = Array.from(html.matchAll(scriptPattern), match => match[1]);
  scriptCount += scripts.length;

  for (const script of scripts) {
    new Function(script);
  }

  if (syntaxOnlyHtmlFiles.includes(file)) {
    continue;
  }

  for (const required of [
    '<meta name="description"',
    '<meta property="og:title"',
    '<link rel="canonical"',
    'type="application/ld+json"',
  ]) {
    if (!html.includes(required)) {
      throw new Error(`${file} missing required SEO marker: ${required}`);
    }
  }
}

for (const file of externalJsFiles) {
  if (!fs.existsSync(file)) {
    throw new Error(`${file} is required for the DJ database page`);
  }
  new Function(fs.readFileSync(file, "utf8"));
}

let djSourceData = null;
if (fs.existsSync("data/dj-data.js")) {
  const context = { window: {} };
  new Function("window", fs.readFileSync("data/dj-data.js", "utf8"))(context.window);
  djSourceData = context.window.DJ_SOURCE_DATA || null;
  if (!djSourceData || !Array.isArray(djSourceData.events)) {
    throw new Error("data/dj-data.js must expose window.DJ_SOURCE_DATA.events");
  }
  assertNoNonPerformerLineups(djSourceData.events, djSourceData.lineups || {});
}

if (fs.existsSync("data/tracked-dj-itineraries.js")) {
  const context = { window: {} };
  new Function("window", fs.readFileSync("data/tracked-dj-itineraries.js", "utf8"))(context.window);
  const trackedData = context.window.DJ_ITINERARY_DATA;
  if (!trackedData || typeof trackedData !== "object" || !Object.keys(trackedData).length) {
    throw new Error("data/tracked-dj-itineraries.js must define at least one worldwide itinerary overlay");
  }
  for (const [slug, profile] of Object.entries(trackedData)) {
    if (!profile?.name) {
      throw new Error(`tracked itinerary ${slug} must define a name`);
    }
    if (!Array.isArray(profile.sources) || profile.sources.length === 0) {
      throw new Error(`tracked itinerary ${slug} must include source records`);
    }
    for (const source of profile.sources) {
      if (!String(source.url || "").trim() || !String(source.label || "").trim()) {
        throw new Error(`tracked itinerary ${slug} source records must include label and url`);
      }
    }
    const itinerary = Array.isArray(profile.itinerary) ? profile.itinerary : [];
    for (const row of itinerary) {
      for (const field of ["date", "title", "city", "country", "venue", "source", "sourceLabel", "sourceStatus"]) {
        if (!String(row[field] || "").trim()) {
          throw new Error(`tracked itinerary ${slug} row missing ${field}: ${row.title || row.date || "(unknown)"}`);
        }
      }
    }
  }
}

const mainScript = fs.readFileSync("index.html", "utf8").match(scriptPattern)[1];
const archiveScript = fs.readFileSync("shanghai-rave-calendar-2026.html", "utf8").match(scriptPattern)[1];
if (mainScript !== archiveScript) {
  throw new Error("calendar scripts differ between index.html and shanghai-rave-calendar-2026.html");
}

const itineraryRequirements = [
  { file: "index.html", text: 'href="planner.html"', label: "calendar planner link" },
  { file: "shanghai-rave-calendar-2026.html", text: 'href="planner.html"', label: "archive planner link" },
  { file: "djs.html", text: 'href="planner.html"', label: "DJ database planner link" },
  { file: "venues.html", text: 'href="planner.html"', label: "venue guide planner link" },
  { file: "planner.html", text: 'id="selectedItinerary"', label: "selected itinerary panel" },
  { file: "planner.html", text: 'id="exportItineraryImage"', label: "image export button" },
  { file: "planner.html", text: 'id="downloadItineraryIcs"', label: "selected itinerary .ics export" },
  { file: "planner.html", text: 'data-slot-key', label: "selectable slot key markup" },
  { file: "planner.html", text: "function estimateSetTimes(", label: "duration-based set-time estimates" },
  { file: "planner.html", text: "function slotKey(", label: "stable itinerary slot keys" },
  { file: "planner.html", text: "function toggleItinerarySlot(", label: "slot selection toggle" },
  { file: "planner.html", text: "function exportItineraryImage(", label: "PNG itinerary export" },
  { file: "planner.html", text: "canvas.toBlob", label: "canvas image save path" },
  { file: "planner.html", text: "window.localStorage", label: "itinerary persistence" },
  { file: "djs.html", text: "data/tracked-dj-itineraries.js", label: "tracked DJ itinerary data" },
  { file: "djs.html", text: "Past / future itinerary", label: "all-DJ itinerary panel" },
  { file: "djs.html", text: "function renderArtistItinerary(", label: "all-DJ itinerary renderer" },
  { file: "djs.html", text: "function calendarItineraryRows(", label: "calendar-derived DJ itinerary rows" },
];

const opsRequirements = [
  { file: "index.html", text: 'href="ops.html"', label: "calendar ops console link" },
  { file: "shanghai-rave-calendar-2026.html", text: 'href="ops.html"', label: "archive ops console link" },
  { file: "ops.html", text: 'id="leadList"', label: "AI intake and review queue" },
  { file: "ops.html", text: 'option value="computer-use"', label: "Computer Use source filter" },
  { file: "ops.html", text: 'id="publishCopy"', label: "WeChat/Xiaohongshu copy editor" },
  { file: "ops.html", text: 'id="ticketInput"', label: "ticket route editor" },
  { file: "ops.html", text: 'id="promoPackage"', label: "promoter paid exposure package selector" },
  { file: "ops.html", text: 'id="exportReportCsv"', label: "data report CSV export" },
  { file: "ops.html", text: "function publishCopy(", label: "channel copy generator" },
  { file: "ops.html", text: "function normalizeComputerUseLead(", label: "Computer Use lead normalizer" },
  { file: "ops.html", text: "computerUseQueue", label: "Computer Use queue ingestion" },
  { file: "ops.html", text: "function routedTicketUrl(", label: "ticket routing URL builder" },
  { file: "ops.html", text: "function dailyBrief(", label: "daily report generator" },
  { file: "ops.html", text: "window.localStorage", label: "local review workflow persistence" },
];

const scrapeRequirements = [
  { file: "scripts/scrape-events.js", text: "DJ_ITINERARY_FILE", label: "scraper tracked itinerary output path" },
  { file: "scripts/scrape-events.js", text: "function writeDjItineraryData(", label: "scraper tracked itinerary writer" },
  { file: "scripts/scrape-events.js", text: "function normalizeFutureTourRows(", label: "futureTourPlan to DJ itinerary conversion" },
  { file: "scripts/scrape-events.js", text: "djItineraryStats", label: "scrape payload itinerary stats" },
  { file: ".github/workflows/scrape-events.yml", text: "data/tracked-dj-itineraries.js", label: "workflow commits tracked itinerary data" },
];

for (const requirement of [...itineraryRequirements, ...opsRequirements, ...scrapeRequirements]) {
  const html = fs.readFileSync(requirement.file, "utf8");
  if (!html.includes(requirement.text)) {
    throw new Error(`${requirement.file} missing feature marker: ${requirement.label}`);
  }
}

if (fs.existsSync("data/events.json")) {
  const payload = JSON.parse(fs.readFileSync("data/events.json", "utf8"));
  const events = Array.isArray(payload) ? payload : payload.events;
  if (!Array.isArray(events) || events.length === 0) {
    throw new Error("data/events.json must contain a non-empty events array");
  }
  if (!Array.isArray(payload) && (!payload.djItineraryStats || typeof payload.djItineraryStats.rowCount !== "number")) {
    throw new Error("data/events.json must include djItineraryStats from the scraper");
  }

  const requiredFields = [
    "id",
    "month",
    "sortDate",
    "date",
    "time",
    "title",
    "venue",
    "district",
    "vibe",
    "genre",
    "confidence",
    "status",
    "price",
    "age",
    "source",
    "sourceLabel",
    "imageTheme",
    "description",
  ];
  const ids = new Set();
  for (const event of events) {
    if (ids.has(event.id)) {
      throw new Error(`duplicate event id in data/events.json: ${event.id}`);
    }
    ids.add(event.id);
    for (const field of requiredFields) {
      if (event[field] === undefined || event[field] === null || event[field] === "") {
        throw new Error(`event ${event.id} missing required field in data/events.json: ${field}`);
      }
    }
    if (!Array.isArray(event.vibe) || event.vibe.length === 0) {
      throw new Error(`event ${event.id} must have at least one vibe in data/events.json`);
    }
    assertLocalPosterAsset(event, "event");
  }
  assertNoNonPerformerLineups(events);

  if (fs.existsSync("config/curated-events.json")) {
    if (typeof payload.curatedEventsApplied !== "number" || payload.curatedEventsApplied < requiredCuratedEventIds.length) {
      throw new Error("data/events.json must report all curated event updates as applied");
    }
    for (const id of requiredPublishedCuratedEventIds) {
      if (!ids.has(id)) {
        throw new Error(`data/events.json missing curated published event: ${id}`);
      }
    }
    const fruitygroove = events.find(event => event.id === "fruitygroove-soul-navigator");
    if (!Array.isArray(fruitygroove?.setTimes) || fruitygroove.setTimes.length < 6) {
      throw new Error("fruitygroove-soul-navigator must include the RA running order");
    }
  }

  const computerUseQueue = payload.computerUseQueue;
  if (!Array.isArray(computerUseQueue) || computerUseQueue.length === 0) {
    throw new Error("data/events.json must contain a non-empty computerUseQueue");
  }

  const requiredComputerUseSources = [
    "RA Shanghai",
    "SmartShanghai nightlife",
    "Xiaohongshu searches",
    "WeChat official accounts and groups",
    "Venue official accounts",
    "Promoter posters",
    "Ticketing apps and mini-programs",
    "DJ and label accounts",
  ];
  const computerUseLabels = new Set(computerUseQueue.map(item => item.label));
  for (const label of requiredComputerUseSources) {
    if (!computerUseLabels.has(label)) {
      throw new Error(`computerUseQueue missing required source: ${label}`);
    }
  }
  for (const source of computerUseQueue) {
    for (const field of ["label", "platform", "url", "trigger", "collectionGoal", "access", "sourceStatus"]) {
      if (!source[field]) {
        throw new Error(`computerUseQueue source ${source.label || "(unknown)"} missing ${field}`);
      }
    }
    if (source.access !== "chrome-computer-use") {
      throw new Error(`computerUseQueue source ${source.label} must use chrome-computer-use access`);
    }
    if (source.sourceStatus !== "computer-use") {
      throw new Error(`computerUseQueue source ${source.label} must be computer-use`);
    }
    if (!Array.isArray(source.evidence) || source.evidence.length === 0) {
      throw new Error(`computerUseQueue source ${source.label} must define evidence requirements`);
    }
    if (!Array.isArray(source.collectionChecklist) || source.collectionChecklist.length < 10) {
      throw new Error(`computerUseQueue source ${source.label} must define a complete collectionChecklist`);
    }
    if (!Array.isArray(source.deepCollectionRules) || source.deepCollectionRules.length < 4) {
      throw new Error(`computerUseQueue source ${source.label} must define deepCollectionRules`);
    }
    const checklistText = source.collectionChecklist.join(" ").toLowerCase();
    for (const requiredTerm of ["poster", "artist introductions", "future tour", "ticketing status", "second-layer links"]) {
      if (!checklistText.includes(requiredTerm)) {
        throw new Error(`computerUseQueue source ${source.label} checklist missing ${requiredTerm}`);
      }
    }
  }
}

if (fs.existsSync("config/scrape-keywords.json")) {
  const config = JSON.parse(fs.readFileSync("config/scrape-keywords.json", "utf8"));
  const keywords = config.x?.keywords;
  if (!Array.isArray(keywords) || keywords.length === 0) {
    throw new Error("config/scrape-keywords.json must define x.keywords as a non-empty array");
  }
  for (const keyword of keywords) {
    if (!String(keyword).trim()) {
      throw new Error("config/scrape-keywords.json contains an empty X/Twitter keyword");
    }
  }
}

if (fs.existsSync("config/curated-events.json")) {
  const curatedPayload = JSON.parse(fs.readFileSync("config/curated-events.json", "utf8"));
  const curatedEvents = Array.isArray(curatedPayload) ? curatedPayload : curatedPayload.events;
  if (!Array.isArray(curatedEvents) || curatedEvents.length === 0) {
    throw new Error("config/curated-events.json must contain a non-empty events array");
  }

  const seenCuratedIds = new Set();
  const fullEventRequiredFields = [
    "id",
    "month",
    "sortDate",
    "date",
    "time",
    "title",
    "venue",
    "district",
    "vibe",
    "genre",
    "confidence",
    "status",
    "price",
    "age",
    "source",
    "sourceLabel",
    "imageTheme",
    "description",
  ];

  for (const event of curatedEvents) {
    if (!event.id || !String(event.id).trim()) {
      throw new Error("every curated event update must define an id");
    }
    if (seenCuratedIds.has(event.id)) {
      throw new Error(`duplicate event id in config/curated-events.json: ${event.id}`);
    }
    seenCuratedIds.add(event.id);

    if (event.title || event.sortDate) {
      for (const field of fullEventRequiredFields) {
        if (event[field] === undefined || event[field] === null || event[field] === "") {
          throw new Error(`curated full event ${event.id} missing required field: ${field}`);
        }
      }
    }

    if (event.lineup !== undefined) {
      if (!Array.isArray(event.lineup) || event.lineup.length === 0) {
        throw new Error(`curated event ${event.id} must define a non-empty lineup array when lineup is present`);
      }
      for (const lineupItem of event.lineup) {
        const name = typeof lineupItem === "string" ? lineupItem : lineupItem?.name;
        if (!String(name || "").trim()) {
          throw new Error(`curated event ${event.id} has a lineup item without a name`);
        }
      }
    }

    if (event.setTimes !== undefined) {
      if (!Array.isArray(event.setTimes) || event.setTimes.length === 0) {
        throw new Error(`curated event ${event.id} must define a non-empty setTimes array when setTimes is present`);
      }
      for (const slot of event.setTimes) {
        if (!slot.name || !slot.start || !slot.end || !slot.source) {
          throw new Error(`curated event ${event.id} has an incomplete set time`);
        }
      }
    }

    if (event.posterEvidence !== undefined && (!event.posterEvidence.source || !event.posterEvidence.url)) {
      throw new Error(`curated event ${event.id} posterEvidence must include source and url`);
    }
    assertLocalPosterAsset(event, "curated event");

    if (event.ticketStatus !== undefined && !String(event.ticketStatus).trim()) {
      throw new Error(`curated event ${event.id} ticketStatus must not be empty`);
    }

    if (event.futureTourPlan !== undefined && !Array.isArray(event.futureTourPlan)) {
      throw new Error(`curated event ${event.id} futureTourPlan must be an array when present`);
    }
  }

  for (const id of requiredCuratedEventIds) {
    if (!seenCuratedIds.has(id)) {
      throw new Error(`config/curated-events.json missing required update: ${id}`);
    }
  }
}

console.log(`inline scripts syntax OK: ${scriptCount} scripts across ${htmlFiles.length + syntaxOnlyHtmlFiles.length} HTML files`);
