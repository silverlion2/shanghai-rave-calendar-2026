const fs = require("fs");

const scriptPattern = new RegExp("<script>([\\s\\S]*?)</script>", "g");
const htmlFiles = ["index.html", "venues.html", "djs.html", "planner.html", "ops.html"];
const syntaxOnlyHtmlFiles = ["shanghai-rave-calendar-2026.html"];
const externalJsFiles = ["data/dj-data.js"];
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

for (const requirement of [...itineraryRequirements, ...opsRequirements]) {
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
  }

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
