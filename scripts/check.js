const fs = require("fs");

const scriptPattern = new RegExp("<script>([\\s\\S]*?)</script>", "g");
const htmlFiles = ["index.html", "venues.html", "djs.html"];
const syntaxOnlyHtmlFiles = ["shanghai-rave-calendar-2026.html"];
const externalJsFiles = ["data/dj-data.js"];
let scriptCount = 0;

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
  { file: "index.html", text: 'id="selectedItinerary"', label: "selected itinerary panel" },
  { file: "index.html", text: 'id="exportItineraryImage"', label: "image export button" },
  { file: "index.html", text: 'id="downloadItineraryIcs"', label: "selected itinerary .ics export" },
  { file: "index.html", text: 'data-slot-key', label: "selectable slot key markup" },
  { file: "index.html", text: "function slotKey(", label: "stable itinerary slot keys" },
  { file: "index.html", text: "function toggleItinerarySlot(", label: "slot selection toggle" },
  { file: "index.html", text: "function exportItineraryImage(", label: "PNG itinerary export" },
  { file: "index.html", text: "canvas.toBlob", label: "canvas image save path" },
  { file: "index.html", text: "window.localStorage", label: "itinerary persistence" },
  { file: "shanghai-rave-calendar-2026.html", text: 'id="selectedItinerary"', label: "archive selected itinerary panel" },
  { file: "shanghai-rave-calendar-2026.html", text: 'id="exportItineraryImage"', label: "archive image export button" },
  { file: "shanghai-rave-calendar-2026.html", text: 'id="downloadItineraryIcs"', label: "archive selected itinerary .ics export" },
];

for (const requirement of itineraryRequirements) {
  const html = fs.readFileSync(requirement.file, "utf8");
  if (!html.includes(requirement.text)) {
    throw new Error(`${requirement.file} missing itinerary feature marker: ${requirement.label}`);
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

console.log(`inline scripts syntax OK: ${scriptCount} scripts across ${htmlFiles.length + syntaxOnlyHtmlFiles.length} HTML files`);
