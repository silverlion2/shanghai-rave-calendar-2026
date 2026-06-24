const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const vm = require("vm");
const { enrichEvent } = require("./techno-taxonomy");

const ROOT = path.resolve(__dirname, "..");
const INDEX_HTML = path.join(ROOT, "index.html");
const DATA_DIR = path.join(ROOT, "data");
const SCRAPE_CACHE_DIR = path.join(DATA_DIR, "scrape-cache");
const DATA_FILE = path.join(DATA_DIR, "events.json");
const DJ_DATA_FILE = path.join(DATA_DIR, "dj-data.js");
const DJ_ITINERARY_FILE = path.join(DATA_DIR, "tracked-dj-itineraries.js");
const KEYWORD_CONFIG_FILE = path.join(ROOT, "config", "scrape-keywords.json");
const CURATED_EVENTS_FILE = path.join(ROOT, "config", "curated-events.json");
const TRACKED_DJ_PROFILES_FILE = path.join(ROOT, "config", "tracked-dj-profiles.json");
const RA_SHANGHAI_COVERAGE_FILE = path.join(ROOT, "config", "ra-shanghai-coverage.json");
const PROMOTION_PLATFORM_NETWORK_FILE = path.join(ROOT, "config", "promotion-platform-network.json");
const TIME_ZONE = "Asia/Shanghai";
const CURRENT_YEAR = 2026;
const ARCHIVE_CUTOFF_HOUR = 6;
const USER_AGENT = "ShanghaiRaveCalendar/1.0 (+https://github.com/) public-event-refresh";
const REQUEST_DELAY_MS = Number(process.env.SCRAPE_DELAY_MS || 300);
const SCRAPE_HOST_DELAY_MS = Number(process.env.SCRAPE_HOST_DELAY_MS || 1500);
const SCRAPE_HOST_DELAY_JITTER_MS = Number(process.env.SCRAPE_HOST_DELAY_JITTER_MS || 900);
const FETCH_TIMEOUT_MS = Number(process.env.SCRAPE_FETCH_TIMEOUT_MS || 8000);
const X_FETCH_TIMEOUT_MS = Number(process.env.SCRAPE_X_FETCH_TIMEOUT_MS || 5000);
const SCRAPE_RESPECT_ROBOTS = process.env.SCRAPE_RESPECT_ROBOTS !== "false";
const SCRAPE_CACHE_ENABLED = process.env.SCRAPE_CACHE_ENABLED !== "false";
const SCRAPE_CACHE_TTL_HOURS = Number(process.env.SCRAPE_CACHE_TTL_HOURS || 12);
const MAX_DETAIL_PAGES = Number(process.env.SCRAPE_MAX_DETAIL_PAGES || 18);
const MAX_X_KEYWORDS = Number(process.env.SCRAPE_MAX_X_KEYWORDS || 16);
const MAX_X_LINKS_PER_KEYWORD = Number(process.env.SCRAPE_MAX_X_LINKS_PER_KEYWORD || 8);
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN || "";
const X_PUBLIC_SEARCH_ENABLED = process.env.SCRAPE_X_PUBLIC_SEARCH === "true";
const EVENT_SOURCE_FRESHNESS_DAYS = Number(process.env.EVENT_SOURCE_FRESHNESS_DAYS || 2);
const EVENT_NEAR_WINDOW_DAYS = Number(process.env.EVENT_NEAR_WINDOW_DAYS || 1);
const EVENT_NEAR_SOURCE_FRESHNESS_DAYS = Number(process.env.EVENT_NEAR_SOURCE_FRESHNESS_DAYS || 1);
const DJ_PROFILE_SOURCE_FRESHNESS_DAYS = Number(process.env.DJ_PROFILE_SOURCE_FRESHNESS_DAYS || 30);
const RUN_NOW = process.env.SCRAPE_NOW ? new Date(process.env.SCRAPE_NOW) : new Date();

if (Number.isNaN(RUN_NOW.getTime())) {
  throw new Error(`SCRAPE_NOW must be a valid date/time when set: ${process.env.SCRAPE_NOW}`);
}

const DEFAULT_X_KEYWORDS = [
  "\"Shanghai\" techno",
  "\"Shanghai\" rave",
  "\"Shanghai\" underground electronic",
  "\"Shanghai\" warehouse party",
  "\"Shanghai\" house",
  "\"Shanghai\" bass music",
  "\"Shanghai\" trance",
  "\"Shanghai\" club night",
  "\"Abyss Shanghai\" techno",
  "\"POTENT Shanghai\"",
  "\"EXIT Shanghai\" techno",
  "\"Heim Shanghai\" electronic",
  "\"System Shanghai\" club",
  "\"ILLUM Shanghai\"",
  "\"Reactor Shanghai\" electronic",
  "\"Wigwam Shanghai\"",
];

const CALENDAR_FIT_PATTERN = /\b(techno|rave|electronic|electro|acid|industrial|ebm|trance|ambient|idm|bass|warehouse|a\/v|experimental|club music|hard dance|breaks?|jungle|ukg|garage|dubstep|ghettotech|baile funk|minimal|nu-disco)\b/i;
const HOUSE_CONTEXT_PATTERN = /\b(dj|club|rave|dance|dancefloor|electronic|music|selector|lineup|venue|promoter)\b/i;
const CALENDAR_NEGATIVE_PATTERN = /\b(girls night|pool party|disco ball|disco night|afrowave|sunset sessions)\b/i;
const TECHNO_PROFILE_PATTERN = /\b(techno|hard techno|acid|industrial|ebm|electro|trance|rave|warehouse|hard dance|breaks?|jungle|ukg|garage|dubstep|ghettotech|club music|bass|experimental electronic|minimal)\b/i;
const AMBIGUOUS_PROFILE_SIGNAL_TERMS = new Set([
  "acid",
  "ambient",
  "bass",
  "breaks",
  "club",
  "dreaming",
  "electro",
  "exit",
  "floating",
  "garage",
  "house",
  "live",
  "minimal",
  "solo",
  "system",
  "techno",
  "trance",
]);

const SOURCE_PAGES = [
  {
    label: "SmartShanghai clubbing listings",
    url: "https://www.smartshanghai.com/events/clubbing/",
    kind: "listing",
    sourceStatus: "primary",
  },
  {
    label: "SmartShanghai all events",
    url: "https://www.smartshanghai.com/events/",
    kind: "listing",
    sourceStatus: "primary",
  },
  {
    label: "SmartShanghai June 2026 clubbing guide",
    url: "https://www.smartshanghai.com/articles/nightlife/the-shanghai-clubbing-guide-june-2026",
    kind: "guide",
    sourceStatus: "primary",
  },
];

const COMPUTER_USE_COLLECTION_CHECKLIST = [
  "event title and series name",
  "absolute date, doors time, start time, end time, and timezone",
  "venue name, room/floor, city, district, full address, and map/search hint",
  "promoter, venue host, label, or organizing crew",
  "full lineup, B2B notes, set order, set times, and live/DJ format when available",
  "poster or flyer image source, screenshot reference, OCR text from image-only details, and a downloaded local assets/posters posterUrl when posterEvidence exists",
  "artist introductions: origin/city, genres, labels, notable releases, aliases, and official profile links",
  "future tour plan: upcoming cities/dates from artist, label, venue, RA, Bandsintown/Songkick, Bandcamp, Instagram, Weibo, or WeChat when available",
  "ticketing status: platform, public URL or mini-program name, QR/source reference, price tiers, fees, door price, availability, sold-out/waitlist status, refund rules, and purchase cutoff",
  "age/ID, entry policy, dress/door notes, cancellation or lineup-change notices",
  "all second-layer links: event detail, ticketing, venue, promoter, artist, label, poster image, and related tour announcement links",
  "source publication date, last checked date, source confidence, and whether each detail is official, ticketing, social, or image-derived",
];

const COMPUTER_USE_DEEP_COLLECTION_RULES = [
  "Open and inspect second-layer links instead of stopping at a listing card or search result.",
  "If robots.txt, rate limits, CAPTCHA, or anti-bot challenges block automated fetches, stop automated retries and record browser-required evidence instead of bypassing the protection.",
  "If key details are inside images, posters, stories, or screenshots, capture the image reference, OCR/transcribe the relevant text, and download the poster into assets/posters instead of relying on remote image URLs.",
  "For every lineup artist, open official or high-signal profile links when available and collect a short sourced artist intro.",
  "For touring artists, look for future city/date announcements beyond Shanghai and record source links or screenshot references.",
  "For ticketing, inspect the final ticket page or mini-program reference, not only the promoter CTA.",
  "Keep app-only, group-only, or screenshot-only claims at watch level until corroborated by official, ticketing, venue/promoter, RA, SmartShanghai, artist, or label evidence.",
];

const COMPUTER_USE_SOURCES = [
  {
    label: "RA Shanghai",
    platform: "Resident Advisor",
    url: "https://ra.co/events/cn/shanghai",
    priority: 1,
    cadence: "Daily; repeat before weekend publication and after known RA listing changes",
    trigger: "Use Chrome + Computer Use when RA blocks plain fetch, returns challenge markup, or misses event cards.",
    collectionGoal: "Collect Shanghai city listings and event detail pages, stable RA event URLs, lineups, set times, venue facts, ticket details, flyer evidence, and browser-required status.",
    queries: ["Shanghai", "techno", "rave", "club", "electronic"],
    evidence: ["RA city listing URL", "RA event URL", "date/time", "venue", "lineup", "ticket/source link"],
  },
  {
    label: "SmartShanghai nightlife",
    platform: "SmartShanghai",
    url: "https://www.smartshanghai.com/events/clubbing/",
    priority: 1,
    cadence: "Daily; repeat Thu/Fri before the weekend and after monthly guide updates",
    trigger: "Use Chrome + Computer Use when fetch times out, returns incomplete markup, or misses event cards.",
    collectionGoal: "Collect full clubbing listings, monthly guide leads, event detail pages, venue pages, ticket links, and English descriptions.",
    queries: ["clubbing", "nightlife", "techno", "electronic", "rave", "disco", "DJ"],
    evidence: ["listing URL", "event URL", "guide URL", "date/time", "venue", "ticket/source link"],
  },
  {
    label: "SmartShanghai events main page",
    platform: "SmartShanghai",
    url: "https://www.smartshanghai.com/events/",
    priority: 1,
    cadence: "Daily; cross-reference with clubbing listing for completeness",
    trigger: "Use Chrome + Computer Use when the main events page has pagination or search filters that plain fetch misses.",
    collectionGoal: "Capture events across categories: music, nightlife, live, and festival.",
    queries: ["Shanghai events", "clubbing", "music festival", "live", "DJ set"],
    evidence: ["event URL", "date/time", "venue", "ticket/source link"],
  },
  {
    label: "Xiaohongshu searches",
    platform: "Xiaohongshu",
    url: "https://www.xiaohongshu.com/search_result?keyword=%E4%B8%8A%E6%B5%B7%20techno&source=web_explore_feed",
    priority: 2,
    cadence: "Daily discovery; stronger pass Thu/Fri",
    trigger: "Use Chrome + Computer Use with logged-in search; do not rely on unauthenticated fetch.",
    collectionGoal: "Discover local posts, poster screenshots, comments asking for links, and short-notice parties.",
    queries: ["上海 techno", "上海 rave", "上海 电子音乐", "上海 club", "上海 周末去哪", "上海 地下电子"],
    evidence: ["post URL or screenshot reference", "poster image", "publisher handle", "publish date", "claimed event date"],
  },
  {
    label: "WeChat official accounts and groups",
    platform: "WeChat",
    url: "weixin://",
    priority: 1,
    cadence: "Daily for known accounts; urgent checks when leads mention ticket QR or set times",
    trigger: "Use Chrome + Computer Use or phone-side capture; WeChat articles, groups, and mini-programs are app/session bound.",
    collectionGoal: "Confirm official announcements, ticket QR codes, set times, lineup changes, and cancellation notices.",
    queries: ["venue account names", "promoter account names", "上海电子音乐", "活动名称", "DJ name"],
    evidence: ["account name", "article title", "article URL when shareable", "screenshot reference", "publish date", "ticket QR or mini-program name"],
  },
  {
    label: "Venue official accounts",
    platform: "Venue WeChat/Instagram/Weibo",
    url: "https://www.google.com/search?q=Shanghai+techno+venue+official+account",
    priority: 1,
    cadence: "Daily for active venues; repeat on event day",
    trigger: "Use Chrome + Computer Use when venue content is only in social feeds, stories, or app-only posts.",
    collectionGoal: "Confirm venue-posted event details, address, door policy, age/ID rules, and last-minute updates.",
    queries: ["Abyss Shanghai", "POTENT Shanghai", "EXIT Shanghai", "Heim Shanghai", "System Shanghai", "Wigwam Shanghai", "Reactor Shanghai"],
    evidence: ["official account handle", "post URL or screenshot reference", "event poster", "address", "age/ID note"],
  },
  {
    label: "Promoter posters",
    platform: "Promoter social/poster",
    url: "https://www.google.com/search?q=Shanghai+rave+promoter+poster",
    priority: 1,
    cadence: "Daily discovery; OCR/extract whenever a new poster appears",
    trigger: "Use Chrome + Computer Use to inspect image posts, stories, reposts, and posters that expose details only in the image.",
    collectionGoal: "Extract event name, date, start time, venue, lineup, ticket channel, and organizer from posters.",
    queries: ["Shanghai rave poster", "上海 rave 海报", "上海 techno 海报", "厂牌 上海 电子"],
    evidence: ["poster image reference", "source post URL", "OCR text", "organizer", "ticket channel"],
  },
  {
    label: "Ticketing apps and mini-programs",
    platform: "ShowStart/Damai/PiaoPlanet/mini-programs",
    url: "https://www.showstart.com/",
    priority: 1,
    cadence: "Daily; repeat before publishing any ticket CTA",
    trigger: "Use Chrome + Computer Use for app-only flows, mini-program tickets, captchas, login walls, or JS-rendered ticket pages.",
    collectionGoal: "Verify ticket availability, price tiers, doors time, refund policy, venue address, and purchase route.",
    queries: ["秀动 上海 techno", "大麦 上海 电子音乐", "票星球 上海 rave", "活动名称 票务"],
    evidence: ["ticket URL or mini-program name", "price tier", "sale status", "doors time", "ticket platform"],
  },
  {
    label: "DJ and label accounts",
    platform: "Instagram/Weibo/WeChat/Bandcamp",
    url: "https://www.instagram.com/explore/search/keyword/?q=Shanghai%20techno",
    priority: 2,
    cadence: "Every 2-3 days; daily for touring DJs already on the calendar",
    trigger: "Use Chrome + Computer Use for logged-in social feeds, stories, reposts, and platform search that blocks simple fetch.",
    collectionGoal: "Find tour announcements, label nights, release-party context, lineup confirmation, and artist-posted ticket links.",
    queries: ["DJ name Shanghai", "label name Shanghai", "厂牌 上海", "Bandcamp Shanghai techno"],
    evidence: ["artist/label handle", "post URL or screenshot reference", "tour date", "event title", "ticket/source link"],
  },
];

const REQUIRED_EVENT_FIELDS = [
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

function shanghaiDateString(date = RUN_NOW) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).filter(part => part.type !== "literal").map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dateKeyToEpochDay(value) {
  const match = String(value || "").match(/\d{4}-\d{2}-\d{2}/);
  if (!match) return null;
  const [year, month, day] = match[0].split("-").map(Number);
  if (!year || !month || !day) return null;
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function dayDifference(fromDate, toDate) {
  const from = dateKeyToEpochDay(fromDate);
  const to = dateKeyToEpochDay(toDate);
  if (from === null || to === null) return null;
  return to - from;
}

function sourceAgeDays(checkedDate, auditDate) {
  return dayDifference(checkedDate, auditDate);
}

function eventFreshnessMaxAgeDays(event = {}, auditDate = shanghaiDateString()) {
  const daysUntilEvent = dayDifference(auditDate, event.sortDate || event.date);
  if (daysUntilEvent !== null && daysUntilEvent >= 0 && daysUntilEvent <= EVENT_NEAR_WINDOW_DAYS) {
    return EVENT_NEAR_SOURCE_FRESHNESS_DAYS;
  }
  return EVENT_SOURCE_FRESHNESS_DAYS;
}

function checkedDateIsFresh(checkedDate, auditDate, maxAgeDays) {
  const age = sourceAgeDays(checkedDate, auditDate);
  return age !== null && age <= maxAgeDays;
}

function eventCheckedDateIsFresh(event = {}, auditDate = shanghaiDateString()) {
  return checkedDateIsFresh(event.lastChecked, auditDate, eventFreshnessMaxAgeDays(event, auditDate));
}

function sourceCheckIsVerified(check = {}) {
  return Boolean(check && check.ok === true && check.lastChecked);
}

function eventArchiveCutoff(sortDate) {
  const dateKey = String(sortDate || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const cutoff = new Date(`${dateKey}T${String(ARCHIVE_CUTOFF_HOUR).padStart(2, "0")}:00:00+08:00`);
  cutoff.setUTCDate(cutoff.getUTCDate() + 1);
  return cutoff;
}

function eventIsPastByCutoff(sortDate, now = RUN_NOW) {
  const cutoff = eventArchiveCutoff(sortDate);
  if (!cutoff) return false;
  const nowTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
  return Number.isFinite(nowTime) && nowTime >= cutoff.getTime();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function readKeywordConfig() {
  if (!fs.existsSync(KEYWORD_CONFIG_FILE)) {
    return { x: { enabled: true, keywords: DEFAULT_X_KEYWORDS } };
  }

  const config = JSON.parse(readText(KEYWORD_CONFIG_FILE));
  const xConfig = config.x || {};
  return {
    x: {
      enabled: xConfig.enabled !== false,
      keywords: Array.isArray(xConfig.keywords) && xConfig.keywords.length
        ? xConfig.keywords.map(keyword => String(keyword).trim()).filter(Boolean)
        : DEFAULT_X_KEYWORDS,
    },
  };
}

function readCuratedEvents() {
  if (!fs.existsSync(CURATED_EVENTS_FILE)) return [];
  const payload = JSON.parse(readText(CURATED_EVENTS_FILE));
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.events)) return payload.events;
  return [];
}

function readTrackedDjProfiles() {
  if (!fs.existsSync(TRACKED_DJ_PROFILES_FILE)) return {};
  const payload = JSON.parse(readText(TRACKED_DJ_PROFILES_FILE));
  const profiles = Array.isArray(payload) ? payload : payload.profiles;
  if (!Array.isArray(profiles)) return {};
  const normalized = {};
  for (const profile of profiles) {
    const name = cleanText(profile.name || profile.artist || profile.slug);
    if (!name) continue;
    const slug = profile.slug ? slugify(profile.slug) : performerProfileSlug(name);
    normalized[slug] = {
      ...profile,
      slug,
      name,
      trackedAt: profile.trackedAt || shanghaiDateString(),
      checkedByTimezone: profile.checkedByTimezone || TIME_ZONE,
      scope: profile.scope || "Curated DJ source profile",
      imageTheme: profile.imageTheme || imageThemeFor(name),
      aliases: ensureArray(profile.aliases || profile.alias),
      genres: ensureArray(profile.genres),
      summary: cleanText(profile.summary || `Curated source profile for ${name}.`),
      sourceNote: cleanText(profile.sourceNote || "Curated profile-level sources; event-specific confidence remains attached to event rows."),
      sources: mergeSourceLists(profile.sources || [], []),
      itinerary: Array.isArray(profile.itinerary) ? profile.itinerary : [],
    };
  }
  return normalized;
}

function readRaShanghaiCoverage() {
  if (!fs.existsSync(RA_SHANGHAI_COVERAGE_FILE)) return null;
  return JSON.parse(readText(RA_SHANGHAI_COVERAGE_FILE));
}

function readPromotionPlatformNetwork() {
  if (!fs.existsSync(PROMOTION_PLATFORM_NETWORK_FILE)) {
    return {
      updatedAt: shanghaiDateString(),
      timezone: TIME_ZONE,
      scrapeOrder: [],
      antiScrapePolicy: {},
      entities: [],
    };
  }
  const payload = JSON.parse(readText(PROMOTION_PLATFORM_NETWORK_FILE));
  return {
    ...payload,
    entities: Array.isArray(payload.entities) ? payload.entities : [],
    scrapeOrder: Array.isArray(payload.scrapeOrder) ? payload.scrapeOrder : [],
    antiScrapePolicy: payload.antiScrapePolicy || {},
  };
}

function readText(file) {
  return fs.readFileSync(file, "utf8");
}

function extractEmbeddedEvents() {
  const html = readText(INDEX_HTML);
  const startMarkers = ["const fallbackEvents = [", "const events = ["];
  const startMarker = startMarkers.find(marker => html.includes(marker));
  if (!startMarker) {
    throw new Error("Could not find embedded events array in index.html");
  }
  const start = html.indexOf(startMarker) + startMarker.length - 1;
  const end = findMatchingBracket(html, start);
  if (end === -1) {
    throw new Error("Could not find embedded events array terminator in index.html");
  }

  const literal = html.slice(start, end + 1).trim();
  const context = { module: { exports: null } };
  vm.runInNewContext(`module.exports = ${literal}`, context, { timeout: 1000 });
  if (!Array.isArray(context.module.exports)) {
    throw new Error("Embedded events block did not evaluate to an array");
  }
  return context.module.exports;
}

function readCanonicalEvents() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    const payload = JSON.parse(readText(DATA_FILE));
    return Array.isArray(payload.events) ? payload.events : [];
  } catch (_) {
    return [];
  }
}

function hasEventDate(event = {}) {
  return Boolean(event.sortDate || event.start || event.startDate);
}

function extractSeedEvents() {
  const canonicalEvents = readCanonicalEvents().filter(hasEventDate);
  if (canonicalEvents.length) return canonicalEvents;
  return extractEmbeddedEvents();
}

function findMatchingBracket(text, start) {
  let depth = 0;
  let quote = "";
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inLineComment) {
      if (char === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === "/" && next === "/") {
      inLineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      inBlockComment = true;
      index += 1;
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "[") depth += 1;
    if (char === "]") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripTags(value) {
  return decodeEntities(String(value || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
}

function cleanText(value) {
  return stripTags(value).replace(/\s+/g, " ").trim();
}

const KNOWN_NON_PERFORMER_NAMES = new Set([
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
  return cleanText(value)
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

function lineupItemName(item) {
  if (typeof item === "string") return item;
  return item?.name || item?.dj || item?.artist || "";
}

function lineupItemNote(item) {
  return typeof item === "object" && item ? cleanText(item.note || item.description || "") : "";
}

function lineupItemRole(item) {
  if (!item || typeof item !== "object") return "";
  return normalizeEntityName(item.entityType || item.role || item.type || "");
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
  for (const part of splitEntityNames(event.venue)) add(part);
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
  if (KNOWN_NON_PERFORMER_NAMES.has(normalized)) return true;
  if (venueAliases(event).has(normalized)) return true;
  if (hasNonPerformerRole(item)) return true;

  const organizer = normalizeEntityName(event.organizer);
  if (organizer && organizer === normalized && !hasPerformerEvidence(name, item)) return true;

  const note = normalizeEntityName(lineupItemNote(item));
  const nonPerformerNameCue = /\b(crew|promoter|organizer|organiser|collective|festival|room|stage|floor|venue|support|residents?|selectors?|hosts?)\b/.test(normalized);
  const nonPerformerNoteCue = /\b(promoter context|festival context|party concept|theme note|room context|support context|venue context|organizer|organiser|rather than a single|club institution)\b/.test(note);
  return (nonPerformerNameCue || nonPerformerNoteCue) && !hasPerformerEvidence(name, item);
}

function auditedLineupItems(items, event = {}) {
  if (!Array.isArray(items)) return [];
  return items.flatMap(item => {
    const note = lineupItemNote(item);
    return splitEntityNames(lineupItemName(item))
      .filter(name => !isNonPerformerName(name, item, event))
      .map(name => (typeof item === "string" ? name : { ...item, name, note }));
  });
}

function performerNamesForEvent(event) {
  if (isFestivalListing(event) && event.includeInDjCoverage !== true) return [];
  return auditedLineupItems(event.lineup || [], event).map(lineupItemName);
}

function profileIsTechnoRelevant(profile = {}) {
  const text = [
    profile.scope,
    ensureArray(profile.genres).join(" "),
    profile.summary,
    profile.sourceNote,
  ].filter(Boolean).join(" ");
  return TECHNO_PROFILE_PATTERN.test(text);
}

function isAmbiguousProfileSignal(term) {
  const normalized = normalizeEntityName(term);
  if (!normalized || normalized.length < 3) return true;
  if (AMBIGUOUS_PROFILE_SIGNAL_TERMS.has(normalized)) return true;
  if (/^\d+$/.test(normalized) && normalized.length < 4) return true;
  if (!normalized.includes(" ") && normalized.length < 4) return true;
  return false;
}

function buildTechnoArtistSignals(profiles = {}) {
  const byTerm = new Map();
  for (const profile of Object.values(profiles)) {
    if (!profileIsTechnoRelevant(profile)) continue;
    const name = cleanText(profile.name || profile.slug);
    const terms = [name, ...ensureArray(profile.aliases)].filter(Boolean);
    for (const term of terms) {
      const normalized = normalizeEntityName(term);
      if (isAmbiguousProfileSignal(normalized)) continue;
      if (!byTerm.has(normalized)) {
        byTerm.set(normalized, {
          term: cleanText(term),
          normalized,
          profile: name,
          slug: profile.slug || performerProfileSlug(name),
        });
      }
    }
  }
  return Array.from(byTerm.values()).sort((first, second) => second.normalized.length - first.normalized.length);
}

function eventSignalSearchText(event = {}) {
  const lineupText = Array.isArray(event.lineup)
    ? event.lineup.map(item => [lineupItemName(item), lineupItemNote(item)].filter(Boolean).join(" ")).join(" ")
    : "";
  return normalizeEntityName([
    event.title,
    event.venue,
    event.organizer,
    event.genre,
    event.description,
    event.sourceLabel,
    lineupText,
  ].filter(Boolean).join(" "));
}

function technoArtistMatchesForEvent(event = {}, technoArtistSignals = []) {
  if (!technoArtistSignals.length) return [];
  const text = ` ${eventSignalSearchText(event)} `;
  const matches = [];
  const seen = new Set();
  for (const signal of technoArtistSignals) {
    if (!signal.normalized || !text.includes(` ${signal.normalized} `)) continue;
    if (seen.has(signal.slug)) continue;
    seen.add(signal.slug);
    matches.push(signal);
    if (matches.length >= 8) break;
  }
  return matches;
}

function annotateTechnoArtistSignals(event = {}, technoArtistSignals = []) {
  const matches = technoArtistMatchesForEvent(event, technoArtistSignals);
  if (!matches.length) return event;
  return {
    ...event,
    technoProfileSignals: matches.map(match => ({
      artist: match.profile,
      matchedTerm: match.term,
      source: "tracked-dj-profiles",
    })),
    decisionTags: Array.from(new Set([
      ...ensureArray(event.decisionTags),
      "tracked techno DJ signal",
    ])),
  };
}

function auditedSetTimes(items, event = {}) {
  if (!Array.isArray(items)) return [];
  return items.flatMap(item => splitEntityNames(lineupItemName(item))
    .filter(name => !isNonPerformerName(name, item, event))
    .map(name => ({ ...item, name })));
}

function metaContent(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeEntities(match[1]);
  }
  return "";
}

function titleFromHtml(html) {
  return cleanText(metaContent(html, "og:title") || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
}

function descriptionFromHtml(html) {
  return cleanText(metaContent(html, "og:description") || metaContent(html, "description") || "");
}

function findJsonLdEvents(html) {
  const blocks = Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi), match => decodeEntities(match[1].trim()));
  const found = [];

  function collect(value) {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }
    if (typeof value !== "object") return;
    if (Array.isArray(value["@graph"])) value["@graph"].forEach(collect);
    const type = value["@type"];
    const types = Array.isArray(type) ? type : [type];
    if (types.some(item => String(item).toLowerCase() === "event")) {
      found.push(value);
    }
  }

  for (const block of blocks) {
    try {
      collect(JSON.parse(block));
    } catch (_) {
      // Ignore malformed third-party JSON-LD.
    }
  }

  return found;
}

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    if (parsed.pathname !== "/") parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    return parsed.href;
  } catch (_) {
    return String(url || "").trim();
  }
}

function absoluteUrl(href, baseUrl) {
  try {
    return new URL(decodeEntities(href), baseUrl).href;
  } catch (_) {
    return "";
  }
}

function imageUrlFromValue(value, baseUrl) {
  if (!value) return "";
  if (Array.isArray(value)) {
    for (const item of value) {
      const url = imageUrlFromValue(item, baseUrl);
      if (url) return url;
    }
    return "";
  }
  if (typeof value === "object") {
    return imageUrlFromValue(value.url || value.contentUrl || value.thumbnailUrl || value.src, baseUrl);
  }

  const url = normalizeUrl(absoluteUrl(String(value).trim(), baseUrl));
  if (!/^https?:\/\//i.test(url)) return "";
  return /\.(?:avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i.test(url) || /\/(?:image|images|imgproxy)\b/i.test(url) ? url : "";
}

function posterUrlFromHtml(html, baseUrl, jsonLd = null) {
  return imageUrlFromValue(jsonLd?.image, baseUrl)
    || imageUrlFromValue(metaContent(html, "og:image"), baseUrl)
    || imageUrlFromValue(metaContent(html, "twitter:image"), baseUrl)
    || imageUrlFromValue(html.match(/<img\b[^>]+(?:src|data-src|data-original)=["']([^"']+)["'][^>]*>/i)?.[1], baseUrl);
}

function extractEventLinks(html, baseUrl) {
  const links = [];
  const seen = new Set();
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorPattern.exec(html))) {
    const url = normalizeUrl(absoluteUrl(match[1], baseUrl));
    if (!url || seen.has(url)) continue;
    const host = new URL(url).hostname;
    const pathName = new URL(url).pathname;
    const isSmartShanghaiEvent = host === "www.smartshanghai.com" && /^\/event\//.test(pathName);
    if (!isSmartShanghaiEvent) continue;
    seen.add(url);
    links.push({
      url,
      title: cleanText(match[2]),
      sourceLabel: "SmartShanghai",
    });
  }
  return links;
}

// SmartShanghai API integration - reliable structured event data source
const SMART_SHANGHAI_API_BASE = "https://www.smartshanghai.com/api2/";
const SMART_SHANGHAI_API_KEY = "oisidoosdkouiimnkcjhisdfui393jskdfu23jsdf";

async function fetchSmartShanghaiApi(path, timeoutMs = FETCH_TIMEOUT_MS) {
  const fullUrl = SMART_SHANGHAI_API_BASE + path;
  try {
    const result = await fetchText(fullUrl, timeoutMs, { isRaSource: false });
    if (!result.ok || !result.text) {
      return {
        ok: false,
        data: null,
        status: result.status,
        checkedAt: result.checkedAt,
        fromCache: result.fromCache,
        cacheAgeHours: result.cacheAgeHours,
        browserRequired: result.browserRequired,
        antiBotReason: result.antiBotReason,
        access: result.access,
        error: result.error || "HTTP fetch failed",
      };
    }
    try {
      const json = JSON.parse(result.text);
      return {
        ok: json.isSuccessful !== false,
        data: json.data,
        status: result.status,
        raw: json,
        checkedAt: result.checkedAt,
        fromCache: result.fromCache,
        cacheAgeHours: result.cacheAgeHours,
      };
    } catch (parseErr) {
      return {
        ok: false,
        data: null,
        status: result.status,
        checkedAt: result.checkedAt,
        fromCache: result.fromCache,
        cacheAgeHours: result.cacheAgeHours,
        error: "JSON parse failed: " + parseErr.message,
      };
    }
  } catch (err) {
    return { ok: false, data: null, error: err.message };
  }
}

function getRandomDelay(minMs = 1500, maxMs = 4000) {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

async function fetchSmartShanghaiEventListing(category = "clubbing", limit = 30) {
  const result = await fetchSmartShanghaiApi(`events/?category=${category}&limit=${limit}`);
  return {
    ...result,
    events: result.ok && Array.isArray(result.data) ? result.data : [],
  };
}

async function fetchSmartShanghaiEventDetail(eventId, delayMs = 800) {
  await sleep(delayMs);
  const result = await fetchSmartShanghaiApi(`events/${eventId}/`);
  if (!result.ok || !result.data) return null;
  return result.data;
}

function parseSmartShanghaiApiListingEvent(apiEvent) {
  if (!apiEvent || typeof apiEvent !== "object") return null;
  const title = cleanText(apiEvent.title || "");
  if (!title) return null;

  const url = apiEvent.listing_url || (apiEvent.id ? `https://www.smartshanghai.com/event/${apiEvent.id}` : "");
  const venue = cleanText(apiEvent.venue_name_en || apiEvent.venue_name || "");
  const posterUrl = apiEvent.flyer_url || apiEvent.thumbnail_url || "";
  const humanDate = apiEvent.human_readable_date || apiEvent.simplified_human_readable_date || "";
  const dateText = humanDate.toLowerCase();
  const priceText = apiEvent.price || "";

  // Extract date from human-readable format
  let sortDate = "";
  const todayMatch = dateText.match(/today|今日|今晚/);
  const tomorrowMatch = dateText.match(/tomorrow|明日|明天/);
  const dateMatch = humanDate.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/) || humanDate.match(/(?:jun|june|jul|july|aug|august|jan|feb|mar|apr|may|sep|oct|nov|dec)[\s\.\,]*(\d{1,2})/i);

  if (todayMatch) {
    sortDate = shanghaiDateString();
  } else if (tomorrowMatch) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    sortDate = shanghaiDateString(d);
  } else if (dateMatch && dateMatch.length >= 4) {
    const y = dateMatch[1];
    const m = dateMatch[2].padStart(2, "0");
    const d = dateMatch[3].padStart(2, "0");
    sortDate = `${y}-${m}-${d}`;
  } else if (dateMatch) {
    const monthMap = { jun: "06", june: "06", jul: "07", july: "07", aug: "08", august: "08", jan: "01", feb: "02", mar: "03", apr: "04", may: "05", sep: "09", oct: "10", nov: "11", dec: "12" };
    const m = monthMap[(dateMatch[0] || "").replace(/[\s\.\,].*/, "").toLowerCase()] || "";
    if (m) {
      sortDate = `${CURRENT_YEAR}-${m}-${String(dateMatch[1]).padStart(2, "0")}`;
    }
  }

  if (!sortDate || !sortDate.match(/^\d{4}-\d{2}-\d{2}$/)) return null;

  const description = cleanText(apiEvent.brief_description || "");
  const vibe = inferVibe(title, description);
  const genre = inferGenre(title, description);

  return {
    id: slugify(`${sortDate}-${title}`),
    month: monthCodeFromDate(sortDate),
    sortDate,
    date: displayDate(sortDate),
    time: cleanText(apiEvent.time_human || ""),
    title,
    venue,
    district: "Shanghai",
    vibe,
    genre,
    confidence: "Medium",
    status: eventStatus(sortDate, "Medium"),
    price: priceText,
    age: "Check source",
    ticketStatus: priceText ? `Tickets via SmartShanghai: ${priceText}` : "Check SmartShanghai for ticket details",
    source: normalizeUrl(url) || url,
    sourceLabel: "SmartShanghai",
    imageTheme: imageThemeFor(title),
    ...(posterUrl ? { posterUrl } : {}),
    description: description || `Event from SmartShanghai listing. ${vibe ? `Vibe: ${vibe}. ` : ""}`,
    sourceStatus: "secondary",
    addedAt: shanghaiDateString(),
    lastChecked: shanghaiDateString(),
    sources: [{
      label: "SmartShanghai",
      url: normalizeUrl(url) || url,
      status: "secondary",
      lastChecked: shanghaiDateString(),
    }],
    rawApiData: { ...apiEvent, fetchedAt: shanghaiDateString() },
  };
}

async function fetchSmartShanghaiApiEvents() {
  const events = [];
  const report = {
    label: "SmartShanghai API: clubbing listing",
    url: `${SMART_SHANGHAI_API_BASE}events/?category=clubbing`,
    kind: "api-listing",
    sourceStatus: "primary",
    checkedAt: shanghaiDateString(),
    ok: false,
    status: null,
    eventsFetched: 0,
    eventsParsed: 0,
  };

  try {
    const listing = await fetchSmartShanghaiEventListing("clubbing", 60);
    applyFetchResultToReport(report, listing);
    const rawEvents = listing.events;
    report.ok = listing.ok && rawEvents.length > 0;
    report.status = listing.ok ? "api-success" : (listing.status || "api-failed");
    if (listing.error) report.error = listing.error;
    report.eventsFetched = rawEvents.length;
    if (!listing.ok || rawEvents.length === 0) return { events, report };

    // Parse listing data
    for (const apiEvent of rawEvents) {
      const parsed = parseSmartShanghaiApiListingEvent(apiEvent);
      if (parsed) {
        events.push(parsed);
      }
    }

    // Try a few with detail pages for richer data
    const detailIds = rawEvents.slice(0, 10).map(e => e.id).filter(Boolean);
    for (const id of detailIds) {
      const detail = await fetchSmartShanghaiEventDetail(id, getRandomDelay(500, 1500));
      if (detail) {
        const matchingEvent = events.find(e => e.source && e.source.includes(`/${id}`) || e.rawApiData && e.rawApiData.id === id);
        if (matchingEvent && detail.starts_on) {
          const startsOn = String(detail.starts_on).match(/^\d{4}-\d{2}-\d{2}/);
          if (startsOn) {
            matchingEvent.sortDate = startsOn[0];
            matchingEvent.date = displayDate(startsOn[0]);
            matchingEvent.month = monthCodeFromDate(startsOn[0]);
            matchingEvent.status = eventStatus(startsOn[0], "Medium");
            matchingEvent.description = cleanText(detail.description || matchingEvent.description);
            matchingEvent.time = cleanText(detail.time_human || matchingEvent.time);
            if (detail.age) matchingEvent.age = cleanText(detail.age);
            matchingEvent.sources.push({
              label: "SmartShanghai detail",
              url: normalizeUrl(detail.listing_url || matchingEvent.source),
              status: "secondary",
              lastChecked: shanghaiDateString(),
            });
            matchingEvent.lastChecked = shanghaiDateString();
          }
        }
      }
    }

    report.eventsParsed = events.length;
  } catch (err) {
    report.error = err.message;
    report.status = "error";
  }

  return { events, report };
}

function xSearchUrl(keyword) {
  const query = `${keyword} (Shanghai OR 上海) (techno OR rave OR electronic OR 电子音乐)`;
  return `https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=live`;
}

function xApiSearchUrl(keyword) {
  const query = `${keyword} -is:retweet`;
  const params = new URLSearchParams({
    query,
    "tweet.fields": "created_at,author_id,lang,entities",
    expansions: "author_id",
    "user.fields": "username,name",
    max_results: String(Math.max(10, Math.min(MAX_X_LINKS_PER_KEYWORD, 100))),
  });
  return `https://api.x.com/2/tweets/search/recent?${params.toString()}`;
}

function extractXPostLinks(html, keyword) {
  const normalized = decodeEntities(String(html || ""))
    .replace(/\\u002F/g, "/")
    .replace(/\\\//g, "/");
  const links = [];
  const seen = new Set();
  const statusPattern = /(?:https?:\/\/(?:x|twitter)\.com)?\/([A-Za-z0-9_]{1,15})\/status\/(\d{8,})/g;
  let match;

  while ((match = statusPattern.exec(normalized))) {
    const user = match[1];
    const id = match[2];
    const url = `https://x.com/${user}/status/${id}`;
    if (seen.has(url)) continue;
    seen.add(url);
    links.push({
      platform: "X/Twitter",
      keyword,
      title: `X/Twitter post by @${user}`,
      url,
      sourceLabel: "X/Twitter",
      sourceStatus: "social-lead",
      parsed: false,
    });
    if (links.length >= MAX_X_LINKS_PER_KEYWORD) break;
  }

  return links;
}

function parseXApiLeads(payload, keyword) {
  const users = new Map();
  for (const user of payload.includes?.users || []) {
    users.set(user.id, user);
  }

  return (payload.data || []).slice(0, MAX_X_LINKS_PER_KEYWORD).map(tweet => {
    const user = users.get(tweet.author_id);
    const username = user?.username || "i";
    return {
      platform: "X/Twitter",
      keyword,
      title: `X/Twitter post by @${username}`,
      url: `https://x.com/${username}/status/${tweet.id}`,
      sourceLabel: "X/Twitter",
      sourceStatus: "social-lead",
      createdAt: tweet.created_at || "",
      snippet: cleanText(tweet.text || "").slice(0, 280),
      parsed: false,
    };
  });
}

const hostRequestState = new Map();
const robotsPolicyCache = new Map();
const blockedHostState = new Map();

function cachePathForUrl(url) {
  const digest = crypto.createHash("sha256").update(normalizeUrl(url)).digest("hex");
  return path.join(SCRAPE_CACHE_DIR, `${digest}.json`);
}

function dateOnlyFromIso(value) {
  const match = String(value || "").match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

function cacheAgeHours(savedAt) {
  const saved = new Date(savedAt).getTime();
  if (!Number.isFinite(saved)) return Number.POSITIVE_INFINITY;
  return (Date.now() - saved) / 3600000;
}

function readCachedFetch(url) {
  if (!SCRAPE_CACHE_ENABLED) return null;
  const file = cachePathForUrl(url);
  if (!fs.existsSync(file)) return null;
  try {
    const cached = JSON.parse(fs.readFileSync(file, "utf8"));
    const ageHours = cacheAgeHours(cached.savedAt);
    if (ageHours > SCRAPE_CACHE_TTL_HOURS) return null;
    return {
      ok: Boolean(cached.ok),
      status: cached.status || null,
      text: cached.text || "",
      headers: cached.headers || {},
      browserRequired: Boolean(cached.browserRequired),
      antiBotReason: cached.antiBotReason || "",
      fromCache: true,
      checkedAt: dateOnlyFromIso(cached.savedAt),
      cacheAgeHours: Number.isFinite(ageHours) ? Number(ageHours.toFixed(2)) : null,
    };
  } catch (_) {
    return null;
  }
}

function writeCachedFetch(url, result) {
  if (!SCRAPE_CACHE_ENABLED || !result || !result.text) return;
  if (!result.ok && !result.browserRequired) return;
  fs.mkdirSync(SCRAPE_CACHE_DIR, { recursive: true });
  fs.writeFileSync(cachePathForUrl(url), `${JSON.stringify({
    url: normalizeUrl(url),
    savedAt: new Date().toISOString(),
    ok: result.ok,
    status: result.status,
    headers: result.headers || {},
    browserRequired: result.browserRequired || false,
    antiBotReason: result.antiBotReason || "",
    text: result.text,
  }, null, 2)}\n`);
}

function originForUrl(url) {
  try {
    return new URL(url).origin;
  } catch (_) {
    return "";
  }
}

function pathForRobots(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname || "/"}${parsed.search || ""}`;
  } catch (_) {
    return "/";
  }
}

async function waitForHostSlot(url) {
  const origin = originForUrl(url);
  if (!origin) return;
  const now = Date.now();
  const availableAt = hostRequestState.get(origin) || 0;
  if (availableAt > now) await sleep(availableAt - now);
  const jitter = Math.floor(Math.random() * Math.max(0, SCRAPE_HOST_DELAY_JITTER_MS));
  hostRequestState.set(origin, Date.now() + Math.max(0, SCRAPE_HOST_DELAY_MS) + jitter);
}

function parseRetryAfter(value) {
  const text = String(value || "").trim();
  if (!text) return 0;
  const seconds = Number(text);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = new Date(text).getTime();
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0;
}

function robotsRuleApplies(rulePath, requestPath) {
  if (!rulePath) return false;
  return requestPath.startsWith(rulePath);
}

function parseRobotsRules(text) {
  const groups = [];
  let currentAgents = [];
  let currentRules = [];
  const flush = () => {
    if (currentAgents.length || currentRules.length) {
      groups.push({ agents: currentAgents, rules: currentRules });
      currentAgents = [];
      currentRules = [];
    }
  };

  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    if (!line) {
      flush();
      continue;
    }
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    const field = match[1].trim().toLowerCase();
    const value = match[2].trim();
    if (field === "user-agent") {
      if (currentRules.length) flush();
      currentAgents.push(value.toLowerCase());
    } else if (field === "allow" || field === "disallow") {
      currentRules.push({ type: field, path: value });
    }
  }
  flush();
  return groups;
}

function robotsAllowsPath(groups, requestPath, userAgent = USER_AGENT) {
  const agent = userAgent.toLowerCase();
  const matchingRules = [];
  for (const group of groups) {
    const applies = group.agents.some(item => item === "*" || agent.includes(item) || item.includes("shanghairavecalendar"));
    if (!applies) continue;
    matchingRules.push(...group.rules.filter(rule => robotsRuleApplies(rule.path, requestPath)));
  }
  if (!matchingRules.length) return true;
  matchingRules.sort((first, second) => second.path.length - first.path.length || (first.type === "allow" ? -1 : 1));
  return matchingRules[0].type !== "disallow";
}

async function fetchRobotsPolicy(url, timeoutMs) {
  const origin = originForUrl(url);
  if (!origin) return { allowed: true, reason: "invalid-origin" };
  if (robotsPolicyCache.has(origin)) return robotsPolicyCache.get(origin);

  const robotsUrl = `${origin}/robots.txt`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(timeoutMs, 4000));
  let policy = { allowed: true, groups: [], reason: "robots-unavailable" };
  try {
    await waitForHostSlot(robotsUrl);
    const response = await fetch(robotsUrl, {
      headers: {
        accept: "text/plain,*/*;q=0.8",
        "user-agent": USER_AGENT,
      },
      signal: controller.signal,
    });
    if (response.ok) {
      policy = {
        allowed: true,
        groups: parseRobotsRules(await response.text()),
        reason: "robots-read",
      };
    }
  } catch (_) {
    policy = { allowed: true, groups: [], reason: "robots-unavailable" };
  } finally {
    clearTimeout(timeout);
  }
  robotsPolicyCache.set(origin, policy);
  return policy;
}

async function robotsAllowsUrl(url, timeoutMs) {
  if (!SCRAPE_RESPECT_ROBOTS) return { allowed: true, reason: "robots-disabled" };
  const policy = await fetchRobotsPolicy(url, timeoutMs);
  if (!policy.groups.length) return { allowed: true, reason: policy.reason };
  return {
    allowed: robotsAllowsPath(policy.groups, pathForRobots(url)),
    reason: policy.reason,
  };
}

function antiBotSignal({ status, text = "", headers = {} }) {
  const body = String(text || "");
  const server = String(headers.server || "");
  if (status === 429) return "rate-limited";
  if (status === 403 && /cloudflare|datadome|akamai|perimeterx|captcha|challenge/i.test(`${body} ${server}`)) return "anti-bot-challenge";
  if (/datadome|captcha-delivery|attention required|cloudflare|checking your browser|just a moment|please enable js|enable javascript|disable any ad blocker|you have been blocked|automated access|bot detection|challenge-platform/i.test(body)) {
    return "anti-bot-challenge";
  }
  return "";
}

function applyFetchResultToReport(report, result) {
  report.ok = Boolean(result.ok);
  report.status = result.status;
  if (result.checkedAt) report.checkedAt = result.checkedAt;
  if (result.fromCache) {
    report.fromCache = true;
    report.cacheAgeHours = result.cacheAgeHours;
  }
  if (result.browserRequired) {
    report.access = "browser-required";
    report.antiBotReason = result.antiBotReason || "anti-bot-challenge";
    report.error = result.error || "Anti-bot or JavaScript challenge detected; use Browser/Chrome visible verification instead of bypassing.";
  }
  if (result.access === "robots-disallowed" || result.status === "robots-disallowed") {
    report.access = "robots-disallowed";
    report.error = result.error || "robots.txt disallows this URL for this scraper.";
  }
  if (result.retryAfterMs) report.retryAfterMs = result.retryAfterMs;
  return report;
}

function blockedHostReason(url) {
  const origin = originForUrl(url);
  if (!origin) return "";
  const blocked = blockedHostState.get(origin);
  if (!blocked) return "";
  return blocked.reason || "anti-bot-challenge";
}

function rememberBlockedHost(url, reason) {
  const origin = originForUrl(url);
  if (!origin) return;
  blockedHostState.set(origin, { reason, at: new Date().toISOString() });
}

function fetchHeadersFor(url) {
  const headers = {
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.9,zh-CN;q=0.7",
    "user-agent": USER_AGENT,
  };
  const origin = originForUrl(url);
  if (/smartshanghai\.com/i.test(origin)) headers.referer = "https://www.smartshanghai.com/";
  return headers;
}

async function fetchText(url, timeoutMs = FETCH_TIMEOUT_MS, options = {}) {
  const { retries = 2, baseDelayMs = 1500, useCache = true } = options;
  const cached = useCache ? readCachedFetch(url) : null;
  if (cached) return cached;

  const blockedReason = blockedHostReason(url);
  if (blockedReason) {
    return {
      ok: false,
      status: "browser-required",
      text: "",
      error: `Host already returned ${blockedReason}; queued for browser/manual verification for this run.`,
      browserRequired: true,
      antiBotReason: blockedReason,
    };
  }

  const robots = await robotsAllowsUrl(url, timeoutMs);
  if (!robots.allowed) {
    return {
      ok: false,
      status: "robots-disallowed",
      text: "",
      error: "robots.txt disallows this URL for the scraper user agent",
      access: "robots-disallowed",
      robots: robots.reason,
    };
  }

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      await waitForHostSlot(url);
      const response = await fetch(url, {
        headers: fetchHeadersFor(url),
        signal: controller.signal,
      });
      const text = await response.text();
      const headers = {
        "content-type": response.headers.get("content-type"),
        "retry-after": response.headers.get("retry-after"),
        "server": response.headers.get("server"),
      };
      const antiBotReason = antiBotSignal({ status: response.status, text, headers });
      if (antiBotReason) {
        rememberBlockedHost(url, antiBotReason);
        const result = {
          ok: false,
          status: response.status,
          text,
          headers,
          error: antiBotReason === "rate-limited" ? "Rate limited; retry later" : "Anti-bot or JavaScript challenge detected; queued for browser/manual verification.",
          browserRequired: true,
          antiBotReason,
          retryAfterMs: parseRetryAfter(headers["retry-after"]),
        };
        writeCachedFetch(url, result);
        return result;
      }
      const result = {
        ok: response.ok,
        status: response.status,
        text,
        headers,
        checkedAt: shanghaiDateString(),
      };
      writeCachedFetch(url, result);
      if (!response.ok && [408, 425, 500, 502, 503, 504].includes(response.status) && attempt < retries) {
        await sleep(baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000);
        continue;
      }
      if (!response.ok && response.status === 429 && attempt < retries) {
        await sleep(parseRetryAfter(headers["retry-after"]) || (baseDelayMs * Math.pow(2, attempt)));
        continue;
      }
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    ok: false,
    status: null,
    text: "",
    error: lastError?.message || "Request failed after retries",
  };
}

async function fetchJson(url, headers = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const robots = await robotsAllowsUrl(url, timeoutMs);
  if (!robots.allowed) {
    return {
      ok: false,
      status: "robots-disallowed",
      json: null,
      text: "",
      access: "robots-disallowed",
      error: "robots.txt disallows this URL for the scraper user agent",
    };
  }
  await waitForHostSlot(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        "accept": "application/json",
        "user-agent": USER_AGENT,
        ...headers,
      },
      signal: controller.signal,
    });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (_) {
      json = null;
    }
    const responseHeaders = {
      "content-type": response.headers.get("content-type"),
      "retry-after": response.headers.get("retry-after"),
      "server": response.headers.get("server"),
    };
    const antiBotReason = antiBotSignal({ status: response.status, text, headers: responseHeaders });
    if (antiBotReason) {
      rememberBlockedHost(url, antiBotReason);
      return {
        ok: false,
        status: response.status,
        json,
        text,
        headers: responseHeaders,
        browserRequired: true,
        antiBotReason,
        retryAfterMs: parseRetryAfter(responseHeaders["retry-after"]),
        error: antiBotReason === "rate-limited" ? "Rate limited; retry later" : "Anti-bot or JavaScript challenge detected; use Browser/Chrome visible verification.",
      };
    }
    return {
      ok: response.ok,
      status: response.status,
      json,
      text,
      headers: responseHeaders,
      checkedAt: shanghaiDateString(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "event";
}

function performerProfileSlug(value) {
  const stripped = cleanText(value)
    .replace(/\s*[\[(]\s*(?:live|live set|dj set|hybrid set)\s*[\])]\s*$/i, "")
    .replace(/\s+(?:live|live set|dj set|hybrid set)$/i, "");
  return slugify(stripped || value);
}

function monthCodeFromDate(sortDate) {
  const month = Number(String(sortDate).slice(5, 7));
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1] || "Jun";
}

function displayDate(sortDate) {
  return `${monthCodeFromDate(sortDate)} ${Number(String(sortDate).slice(8, 10))}`;
}

function displayTime(startDate) {
  const value = String(startDate || "");
  const time = value.match(/T(\d{2}):(\d{2})/);
  return time ? `${time[1]}:${time[2]}` : "Check source";
}

function eventStatus(sortDate, confidence, currentStatus = "", now = RUN_NOW) {
  const status = String(currentStatus || "").toLowerCase();
  if (eventIsPastByCutoff(sortDate, now)) return "past";
  if (status === "watch" || confidence === "Watch") return "watch";
  if (status && status !== "past") return status;
  return "upcoming";
}

function sourceLabelFor(url) {
  try {
    const host = new URL(url).hostname;
    if (host === "ra.co") return "Resident Advisor";
    if (host.includes("smartshanghai.com")) return "SmartShanghai";
    return host.replace(/^www\./, "");
  } catch (_) {
    return "Source";
  }
}

function routeSearchQuery(entity = {}, route = {}) {
  return cleanText(route.query || route.accountName || route.handle || entity.name || route.platform || "");
}

function routeSearchQueries(entity = {}, route = {}) {
  return Array.from(new Set([
    routeSearchQuery(entity, route),
    ...(Array.isArray(route.queries) ? route.queries : []),
    [entity.name, "Shanghai"].filter(Boolean).join(" "),
    ...(Array.isArray(entity.aliases) ? entity.aliases.slice(0, 3) : []),
  ].map(cleanText).filter(Boolean)));
}

function platformRouteUrl(entity = {}, route = {}) {
  if (route.url) return normalizeUrl(route.url) || route.url;
  const platform = cleanText(route.platform || "");
  const routeType = cleanText(route.route || "");
  const query = routeSearchQuery(entity, route);
  const encoded = encodeURIComponent(query || entity.name || "Shanghai electronic music");
  if (/xiaohongshu|xhs/i.test(platform)) {
    return `https://www.xiaohongshu.com/search_result?keyword=${encoded}&source=web_explore_feed`;
  }
  if (/wechat|weixin/i.test(platform) && /article|sogou/i.test(routeType)) {
    return `https://weixin.sogou.com/weixin?type=2&query=${encoded}`;
  }
  if (/wechat|weixin|mini-program|yuyuan/i.test(platform)) {
    return `weixin://search?query=${encoded}`;
  }
  if (/instagram/i.test(platform)) {
    return `https://www.instagram.com/explore/search/keyword/?q=${encoded}`;
  }
  if (/showstart/i.test(platform)) return route.url || "https://www.showstart.com/";
  if (/damai/i.test(platform)) return "https://www.damai.cn/";
  if (/piaoplanet/i.test(platform)) return "https://www.piaoplanet.com/";
  if (/smartshanghai/i.test(platform)) {
    return `https://www.smartshanghai.com/search/?q=${encoded}`;
  }
  return `https://www.google.com/search?q=${encoded}`;
}

function promotionPlatformEvidence(route = {}) {
  const role = cleanText(route.trustRole || "platform route");
  if (/ticket/i.test(role)) {
    return ["ticket route or mini-program name", "price tiers", "sale status", "venue/date/time", "refund or purchase notes"];
  }
  if (/poster/i.test(role)) {
    return ["visible official account/post", "poster image", "OCR text", "event date", "lineup", "ticket channel"];
  }
  if (/venue-context/i.test(role)) {
    return ["venue name", "address", "district/floor", "context URL", "last checked date"];
  }
  if (/resident advisor|event-confirmation/i.test(role)) {
    return ["public event URL", "event title", "absolute date/time", "venue", "lineup", "ticket/source link"];
  }
  return ["account name", "post/article title", "publish date", "event title/date", "venue", "lineup or ticket facts"];
}

function promotionPlatformRouteCount(network = {}) {
  const entities = Array.isArray(network.entities) ? network.entities : [];
  const entityRoutes = entities.reduce((total, entity) => (
    total + (Array.isArray(entity.platforms) ? entity.platforms.length : 0)
  ), 0);
  const globalRoutes = Array.isArray(network.globalRoutes) ? network.globalRoutes.length : 0;
  return entityRoutes + globalRoutes;
}

function promotionPlatformRank(platform = "") {
  const normalized = String(platform || "").toLowerCase();
  if (/yuyuan|芋圆/.test(normalized)) return 0;
  if (/smartshanghai/.test(normalized)) return 1;
  if (/showstart|damai|piaoplanet|247tickets|ticketing/.test(normalized)) return 2;
  if (/wechat|weixin/.test(normalized)) return 3;
  if (/xiaohongshu|xhs/.test(normalized)) return 4;
  if (/instagram/.test(normalized)) return 6;
  return 5;
}

function buildPromotionPlatformQueue(network, checkedAt) {
  const entities = Array.isArray(network?.entities) ? network.entities : [];
  const globalRoutes = Array.isArray(network?.globalRoutes) ? network.globalRoutes : [];
  const tasks = [];
  for (const route of globalRoutes) {
    const platform = cleanText(route.platform || "Platform source");
    const routeType = cleanText(route.route || "platform-search");
    const role = cleanText(route.trustRole || "platform route");
    tasks.push({
      label: `Network: citywide / ${platform} / ${routeType}`,
      platform,
      url: platformRouteUrl({ name: "Shanghai electronic music" }, route),
      priority: Number(route.priority || 1),
      sourceNetworkPriority: Number(route.priority || 1),
      cadence: "Every scrape cycle; run after RA and before venue-by-venue social search",
      trigger: `Run the citywide ${platform} route before generic keyword discovery; use ${routeType} and stop on platform warnings.`,
      collectionGoal: `Discover and verify Shanghai electronic events through ${platform}: event date, venue, lineup, ticket route, poster, and last-minute updates when visible.`,
      queries: routeSearchQueries({ name: "Shanghai electronic music", aliases: [] }, route),
      evidence: promotionPlatformEvidence(route),
      kind: "promotion-platform-network",
      sourceStatus: "computer-use",
      access: "chrome-computer-use",
      checkedAt,
      parsed: false,
      entityId: "citywide-platform",
      entityType: "citywide-platform",
      entityName: platform,
      route: routeType,
      trustRole: role,
      scrapePolicy: cleanText(route.scrapePolicy || "platform-native-search-first"),
      routeAccess: cleanText(route.access || "browser-required"),
      notes: cleanText(route.notes || ""),
      confirmationRule: "Treat this route as a local ticketing/discovery task. It confirms an event only when visible current-event facts are captured from the mini-program, ticketing screen, official venue/promoter, or shareable evidence.",
      collectionChecklist: COMPUTER_USE_COLLECTION_CHECKLIST,
      deepCollectionRules: COMPUTER_USE_DEEP_COLLECTION_RULES,
      requiredFields: COMPUTER_USE_COLLECTION_CHECKLIST,
    });
  }
  for (const entity of entities) {
    const platforms = Array.isArray(entity.platforms) ? entity.platforms : [];
    for (const route of platforms) {
      const query = routeSearchQuery(entity, route);
      const platform = cleanText(route.platform || "Platform source");
      const routeType = cleanText(route.route || "platform-search");
      const role = cleanText(route.trustRole || "platform route");
      tasks.push({
        label: `Network: ${entity.name} / ${platform} / ${routeType}`,
        platform,
        url: platformRouteUrl(entity, route),
        priority: Number(route.priority || entity.priority || 3),
        sourceNetworkPriority: Number(entity.priority || route.priority || 3),
        cadence: Number(route.priority || entity.priority || 3) <= 1
          ? "Every scrape cycle; repeat before weekend publication"
          : "Every 2-3 days or when a matching future event has gaps",
        trigger: `Scrape ${entity.name}'s known promotion network before generic keyword discovery; use ${routeType} and stop on platform warnings.`,
        collectionGoal: `Confirm ${entity.name} ${role}: event date, venue, lineup, ticket route, poster, and last-minute updates when visible.`,
        queries: routeSearchQueries(entity, route),
        evidence: promotionPlatformEvidence(route),
        kind: "promotion-platform-network",
        sourceStatus: "computer-use",
        access: "chrome-computer-use",
        checkedAt,
        parsed: false,
        entityId: entity.id,
        entityType: entity.type || "entity",
        entityName: entity.name,
        route: routeType,
        trustRole: role,
        scrapePolicy: cleanText(route.scrapePolicy || "platform-native-search-first"),
        routeAccess: cleanText(route.access || "browser-required"),
        notes: cleanText(route.notes || entity.evidenceBasis || ""),
        confirmationRule: "Treat this route as a venue/promoter network task. It confirms an event only when visible current-event facts are captured from RA, official venue/promoter, ticketing, or other shareable evidence.",
        collectionChecklist: COMPUTER_USE_COLLECTION_CHECKLIST,
        deepCollectionRules: COMPUTER_USE_DEEP_COLLECTION_RULES,
        requiredFields: COMPUTER_USE_COLLECTION_CHECKLIST,
      });
    }
  }
  return tasks.sort((first, second) => (
    first.priority - second.priority
    || first.sourceNetworkPriority - second.sourceNetworkPriority
    || promotionPlatformRank(first.platform) - promotionPlatformRank(second.platform)
    || String(first.entityName || "").localeCompare(String(second.entityName || ""))
    || String(first.platform || "").localeCompare(String(second.platform || ""))
    || String(first.route || "").localeCompare(String(second.route || ""))
  ));
}

function promotionEntityMatchTerms(entity = {}) {
  return Array.from(new Set([
    entity.name,
    ...(Array.isArray(entity.aliases) ? entity.aliases : []),
    ...(Array.isArray(entity.venueMatches) ? entity.venueMatches : []),
    ...(Array.isArray(entity.promoterMatches) ? entity.promoterMatches : []),
  ].map(cleanText).filter(Boolean)));
}

function promotionEntityMatchesEvent(entity = {}, event = {}) {
  const terms = promotionEntityMatchTerms(entity).map(term => term.toLowerCase());
  if (!terms.length) return false;
  const lineupText = Array.isArray(event.lineup)
    ? event.lineup.map(lineupItemName).join(" ")
    : "";
  const scopedText = String(entity.type || "").toLowerCase() === "venue"
    ? [event.venue, event.address, event.title].join(" ")
    : [event.organizer, event.promoter, event.title, event.description, event.ticketStatus, lineupText].join(" ");
  const haystack = scopedText.toLowerCase();
  return terms.some(term => haystack.includes(term));
}

function buildPromotionPlatformNetworkSnapshot(network, promotionPlatformQueue, events, auditDate) {
  const entities = Array.isArray(network?.entities) ? network.entities : [];
  const globalRoutes = Array.isArray(network?.globalRoutes) ? network.globalRoutes : [];
  const future = events.filter(event => String(event.sortDate || "") >= auditDate);
  const matchedEventIds = new Set();
  const entityCoverage = entities.map(entity => {
    const routes = Array.isArray(entity.platforms) ? entity.platforms : [];
    const matchedEvents = future.filter(event => promotionEntityMatchesEvent(entity, event));
    matchedEvents.forEach(event => matchedEventIds.add(event.id));
    return {
      id: entity.id,
      type: entity.type || "entity",
      name: entity.name,
      priority: Number(entity.priority || 3),
      routeCount: routes.length,
      platforms: Array.from(new Set(routes.map(route => route.platform).filter(Boolean))),
      futureEventCount: matchedEvents.length,
      futureEvents: matchedEvents.slice(0, 10).map(event => ({
        id: event.id,
        date: event.sortDate,
        title: event.title,
        venue: event.venue,
        status: event.status,
        confidence: event.confidence,
      })),
    };
  }).sort((first, second) => (
    first.priority - second.priority
    || second.futureEventCount - first.futureEventCount
    || String(first.name || "").localeCompare(String(second.name || ""))
  ));
  const unmappedFutureEvents = future
    .filter(event => !matchedEventIds.has(event.id))
    .map(event => ({
      id: event.id,
      date: event.sortDate,
      title: event.title,
      venue: event.venue,
      organizer: event.organizer || event.promoter || "",
      status: event.status,
      confidence: event.confidence,
    }))
    .sort((first, second) => String(first.date || "").localeCompare(String(second.date || ""))
      || String(first.venue || "").localeCompare(String(second.venue || "")));
  return {
    source: "config/promotion-platform-network.json",
    updatedAt: network?.updatedAt || "",
    entityCount: entities.length,
    routeCount: promotionPlatformRouteCount(network),
    globalRouteCount: globalRoutes.length,
    globalRoutes: globalRoutes.map(route => ({
      platform: route.platform || "",
      route: route.route || "",
      priority: Number(route.priority || 1),
      trustRole: route.trustRole || "",
      query: route.query || "",
    })),
    queueCount: promotionPlatformQueue.length,
    scrapeOrder: Array.isArray(network?.scrapeOrder) ? network.scrapeOrder : [],
    antiScrapePolicy: network?.antiScrapePolicy || {},
    priorityRule: "Run Resident Advisor first, then Yuyuan/local ticketing routes, then entity promotion-platform tasks sorted by route priority, entity priority, platform rank, and entity name before generic social keyword discovery.",
    confirmationRule: "Entity network routes are collection paths. They confirm an event only after visible current-event facts are captured from RA, official venue/promoter, ticketing, or shareable source evidence.",
    entityCoverage,
    unmappedFutureVenueCount: Array.from(new Set(unmappedFutureEvents.map(event => event.venue).filter(Boolean))).length,
    unmappedFutureVenues: Array.from(new Set(unmappedFutureEvents.map(event => event.venue).filter(Boolean))).sort(),
    unmappedFutureEvents: unmappedFutureEvents.slice(0, 30),
  };
}

function buildComputerUseQueue(checkedAt, promotionPlatformQueue = []) {
  const genericQueue = COMPUTER_USE_SOURCES.map(source => ({
    ...source,
    kind: "computer-use-source",
    sourceStatus: "computer-use",
    access: "chrome-computer-use",
    checkedAt,
    parsed: false,
    confirmationRule: "Treat as a discovery lead until confirmed by a public event page, official venue/promoter/artist account, or ticketing source.",
    collectionChecklist: COMPUTER_USE_COLLECTION_CHECKLIST,
    deepCollectionRules: COMPUTER_USE_DEEP_COLLECTION_RULES,
    requiredFields: COMPUTER_USE_COLLECTION_CHECKLIST,
  }));
  const raQueue = genericQueue.filter(source => source.label === "RA Shanghai");
  const remainingGenericQueue = genericQueue.filter(source => source.label !== "RA Shanghai");
  return [...raQueue, ...promotionPlatformQueue, ...remainingGenericQueue];
}

function computerUseSourceReports(computerUseQueue) {
  return computerUseQueue.map(source => ({
    label: source.label,
    url: source.url,
    kind: source.kind,
    sourceStatus: source.sourceStatus,
    access: source.access,
    checkedAt: source.checkedAt,
    ok: null,
    status: "computer-use",
    priority: source.priority,
    cadence: source.cadence,
    trigger: source.trigger,
  }));
}

function inferGenre(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const terms = [];
  for (const term of ["hard techno", "techno", "acid", "industrial", "ebm", "electro", "trance", "bass", "ambient", "house", "club"]) {
    if (text.includes(term)) terms.push(term);
  }
  return terms.length ? Array.from(new Set(terms)).join(", ") : "electronic, club";
}

function inferVibe(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const vibes = [];
  if (/(hard|industrial|acid|turbo|abyss|rave)/.test(text)) vibes.push("hard");
  if (/(underground|warehouse|exit|potent|heim|abyss|reactor|system)/.test(text)) vibes.push("underground");
  if (/(ambient|experimental|idm|live|a\/v|electro|ebm)/.test(text)) vibes.push("experimental");
  if (/(bass|club|breaks|ghettotech)/.test(text)) vibes.push("bass");
  if (/(rooftop|garden|pavillon|bund|date)/.test(text)) vibes.push("date");
  return vibes.length ? Array.from(new Set(vibes)) : ["underground"];
}

function imageThemeFor(value) {
  const themes = ["acid", "ember", "cyan", "rose", "gold"];
  let hash = 0;
  for (const char of String(value || "")) hash = (hash + char.charCodeAt(0)) % themes.length;
  return themes[hash];
}

function locationName(location) {
  if (!location) return "";
  if (typeof location === "string") return cleanText(location);
  return cleanText(location.name || location.address?.name || "");
}

function parseEventPage(url, html, linkTitle = "") {
  const jsonLd = findJsonLdEvents(html)[0];
  const title = cleanText(jsonLd?.name || titleFromHtml(html) || linkTitle)
    .replace(/\s*[-|·]\s*(Resident Advisor|SmartShanghai).*$/i, "")
    .trim();
  const description = cleanText(jsonLd?.description || descriptionFromHtml(html) || `Public event listing from ${sourceLabelFor(url)}.`);
  const startDate = jsonLd?.startDate || metaContent(html, "event:start_time") || "";
  const sortDate = String(startDate).match(/\d{4}-\d{2}-\d{2}/)?.[0] || String(url).match(/2026-\d{2}-\d{2}/)?.[0] || "";
  if (!title || !sortDate || !sortDate.startsWith(`${CURRENT_YEAR}-`)) return null;

  const sourceLabel = sourceLabelFor(url);
  const isSmartShanghai = sourceLabel === "SmartShanghai";
  const confidence = isSmartShanghai ? "Medium" : "Watch";
  const venue = locationName(jsonLd?.location) || "Check source";
  const posterUrl = posterUrlFromHtml(html, url, jsonLd);

  return {
    id: slugify(`${sortDate}-${title}`),
    month: monthCodeFromDate(sortDate),
    sortDate,
    date: displayDate(sortDate),
    time: displayTime(startDate),
    title,
    venue,
    district: "Shanghai",
    vibe: inferVibe(title, description),
    genre: inferGenre(title, description),
    confidence,
    status: eventStatus(sortDate, confidence),
    price: "Check source",
    age: "Check venue",
    ticketStatus: confidence === "Watch"
      ? `Watchlist lead from ${sourceLabel}; verify ticket route, price tiers, availability, age policy, and venue details before planning.`
      : `Parsed from ${sourceLabel}; recheck same-day ticket availability and door policy before planning.`,
    source: normalizeUrl(url),
    sourceLabel,
    imageTheme: imageThemeFor(title),
    ...(posterUrl ? { posterUrl } : {}),
    description: confidence === "Watch"
      ? `${description || `Public event listing from ${sourceLabel}.`} Watchlist lead: verify lineup, ticketing, age policy, and venue details before planning.`
      : description || `Public event listing from ${sourceLabel}.`,
    sourceStatus: confidence === "Watch" ? "watchlist" : "secondary",
    addedAt: shanghaiDateString(),
    lastChecked: shanghaiDateString(),
    sources: [{
      label: sourceLabel,
      url: normalizeUrl(url),
      status: confidence === "Watch" ? "watchlist" : "secondary",
      lastChecked: shanghaiDateString(),
    }],
  };
}

function ensureArray(value) {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
  if (!value) return [];
  return String(value).split(",").map(item => item.trim()).filter(Boolean);
}

function requiresBrowserVerification(text = "") {
  return Boolean(antiBotSignal({ status: 200, text }));
}

function isFestivalListing(event = {}) {
  return normalizeEntityName(event.kind) === "festival" || Boolean(event.festival);
}

function normalizeProgramHighlights(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map(item => {
      if (typeof item === "string") {
        return { title: cleanText(item), note: "Program highlight listed by the festival source." };
      }
      return {
        title: cleanText(item?.title || item?.name || item?.artist || item?.label),
        note: cleanText(item?.note || item?.description || item?.status || ""),
      };
    })
    .filter(item => item.title);
}

function hasRecommendationText(value) {
  return typeof value === "string" && value.trim().length >= 8;
}

function recommendationNeedsTasteRefresh(value) {
  return /\b(?:Resident Advisor|SmartShanghai|RA\b|sources?\b|public .*preview|visual confirmation|event-level|source trail supports|supports the event basics|gives a useful lead|included from resident advisor|source-backed electronic music options|current event-level source|fully readable event-level source)\b/i.test(String(value || ""));
}

function recommendationSourceName(event = {}) {
  return event.sourceLabel || sourceLabelFor(event.source) || "the attached source";
}

function recommendationSearchText(event = {}) {
  return [
    event.title,
    event.venue,
    event.district,
    event.genre,
    event.description,
    ensureArray(event.soundTags).join(" "),
    ensureArray(event.decisionTags).join(" "),
    ensureArray(event.vibe).join(" "),
  ].filter(Boolean).join(" ").toLowerCase();
}

function recommendationPerformerNames(event = {}, limit = 4) {
  const names = auditedLineupItems(event.lineup || [], event)
    .flatMap(item => splitEntityNames(lineupItemName(item)))
    .map(name => cleanText(name))
    .filter(name => name && !isPlaceholderPerformerName(name));
  return Array.from(new Set(names)).slice(0, limit);
}

function recommendationLineupPhrase(event = {}) {
  const names = recommendationPerformerNames(event);
  if (!names.length) return "the sound and room fit";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  const extra = names.length - 2;
  return `${names[0]}, ${names[1]}, and ${extra} more listed artist${extra === 1 ? "" : "s"}`;
}

function recommendationSoundLane(event = {}) {
  const text = recommendationSearchText(event).replace(/\bdirty house\b/g, "dirtyhouse");
  if (/\b(?:hard techno|industrial techno|hardcore|hard dance|ebm|warehouse rave|acid techno)\b/.test(text)) {
    return "hard/industrial/rave-pressure techno";
  }
  if (/\b(?:bass|dubstep|jungle|ukg|garage|breaks?|140|grime)\b/.test(text)) {
    return "bass, breaks, 140, or UKG";
  }
  if (/\b(?:rooftop|hotel|pool party|disco|house|sunset|date)\b/.test(text)) {
    return "social house, disco, or date-route electronic music";
  }
  if (/\b(?:ambient|outer music|idm|listening|downtempo|psychedelic|experimental)\b/.test(text)) {
    return "listening-first experimental electronics";
  }
  if (/\b(?:a\/v|live av|hypermodern|live electronic|audio visual)\b/.test(text)) {
    return "A/V live or hypermodern club music";
  }
  if (/\b(?:techno|acid|trance|electro|minimal)\b/.test(text)) {
    return "techno-first club listening";
  }
  if (isFestivalListing(event)) {
    return "festival-scale music programming";
  }
  return "Shanghai electronic nightlife context";
}

function recommendationRoomPhrase(event = {}) {
  const text = recommendationSearchText(event);
  if (/\b(?:abyss|dirty house|reactor|exit|potent|illum|heim|wigwam|fenrir|specters)\b/.test(text) && event.venue) {
    return ` at ${event.venue}`;
  }
  if (event.venue && !/^(?:check|tba|unknown|not listed)/i.test(event.venue)) {
    return ` at ${event.venue}`;
  }
  return "";
}

function defaultRecommendationReason(event = {}) {
  const lineup = recommendationLineupPhrase(event);
  const soundLane = recommendationSoundLane(event);
  const room = recommendationRoomPhrase(event);
  const lineupSubject = lineup === "the sound and room fit" ? lineup : `the lineup (${lineup})`;
  if (event.sourceStatus === "watchlist" || event.status === "watch" || event.confidence === "Watch") {
    return `Kept on Watch because ${lineupSubject} points toward ${soundLane}${room}; wait for firmer practical details before treating it as a pick.`;
  }
  if (event.confidence === "High") {
    return `Recommended because ${lineupSubject} gives the night a clear ${soundLane} draw${room}.`;
  }
  return `Included because ${lineupSubject} gives ${soundLane} readers a concrete reason to consider it${room}, even if it is not the hardest pick on the calendar.`;
}

function defaultBestFor(event = {}) {
  const text = [event.genre, event.description, event.decisionTags, event.vibe].flat().join(" ").toLowerCase();
  if (/\b(hard|industrial|warehouse|hard-techno|acid|rave)\b/.test(text)) {
    return "Best for hard-techno, industrial, acid, or late-room listeners.";
  }
  if (/\b(bass|dubstep|jungle|garage|ukg|break)\b/.test(text)) {
    return "Best for bass, breaks, dubstep, jungle, UKG, and high-energy club-adjacent listeners.";
  }
  if (/\b(date|rooftop|hotel|disco|house|daylight|sunset)\b/.test(text)) {
    return "Best for a more social, house-forward, rooftop, or date-friendly electronic route.";
  }
  if (event.sourceStatus === "watchlist" || event.status === "watch") {
    return "Best as a watchlist lead for readers willing to verify final lineup, ticketing, and venue details.";
  }
  return "Best for readers comparing Shanghai electronic rooms by sound, lineup, and room fit.";
}

function defaultVerifyBeforeGoing(event = {}) {
  if (event.sourceStatus === "trusted-ra" || /(^|\.)ra\.co\//i.test(event.source || "")) {
    return "Reopen the RA event page before going for same-day ticket status, final set times, and venue door policy.";
  }
  if (event.sourceStatus === "watchlist" || event.status === "watch" || event.confidence === "Watch") {
    return "Confirm the latest event page, ticket availability, lineup, start time, and venue address before making plans.";
  }
  return "Recheck the source link before going for ticket availability, final set times, address, age rules, and door policy.";
}

function defaultSourceConfidence(event = {}) {
  const sourceName = recommendationSourceName(event);
  const count = Array.isArray(event.sources) && event.sources.length ? event.sources.length : 1;
  if (event.sourceStatus === "trusted-ra" || /(^|\.)ra\.co\//i.test(event.source || "")) {
    return `High-confidence public nightlife source: Resident Advisor lead, ${count} attached source${count === 1 ? "" : "s"}.`;
  }
  if (event.sourceStatus === "watchlist" || event.status === "watch" || event.confidence === "Watch") {
    return `Watch-level confidence from ${sourceName}; keep visible but verify with direct venue, promoter, ticketing, RA, or official artist evidence.`;
  }
  if (count >= 2) {
    return `Source-backed with ${count} attached public sources; key facts should still be checked close to the event date.`;
  }
  return `Single public source from ${sourceName}; sufficient for archive visibility but still worth rechecking for live planning.`;
}

function ensureRecommendationFields(event = {}) {
  if (!hasRecommendationText(event.recommendationReason) || recommendationNeedsTasteRefresh(event.recommendationReason)) {
    event.recommendationReason = defaultRecommendationReason(event);
  }
  if (!hasRecommendationText(event.bestFor) || recommendationNeedsTasteRefresh(event.bestFor)) {
    event.bestFor = defaultBestFor(event);
  }
  if (!hasRecommendationText(event.verifyBeforeGoing)) {
    event.verifyBeforeGoing = defaultVerifyBeforeGoing(event);
  }
  if (!hasRecommendationText(event.sourceConfidence)) {
    event.sourceConfidence = defaultSourceConfidence(event);
  }
  return event;
}

function displayDateFromSortDate(sortDate) {
  const match = String(sortDate || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00+08:00`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
  }).format(date);
}

function timeRangeFromStartEnd(start, end) {
  const startMatch = String(start || "").match(/T(\d{2}:\d{2})/);
  if (!startMatch) return "";
  const endMatch = String(end || "").match(/T(\d{2}:\d{2})/);
  return endMatch ? `${startMatch[1]}-${endMatch[1]}` : startMatch[1];
}

function displayPriceFromTicket(ticket = {}) {
  if (!ticket || !Array.isArray(ticket.price) || !ticket.price.length) return "";
  const prices = ticket.price.filter(value => value !== undefined && value !== null && value !== "");
  if (!prices.length) return "";
  return prices.length === 1 ? `${prices[0]} RMB` : `${prices[0]}-${prices[prices.length - 1]} RMB`;
}

function coerceEventShape(event = {}) {
  const next = { ...event };
  next.sortDate = next.sortDate || String(next.start || "").slice(0, 10);
  next.title = next.title || next.name || next.id;
  next.venue = next.venue || next.venueName || "TBA";
  next.month = next.month || monthCodeFromDate(next.sortDate);
  next.date = next.date || displayDateFromSortDate(next.sortDate);
  next.time = next.time || timeRangeFromStartEnd(next.start, next.end) || "TBA";
  next.district = next.district || next.city || "Shanghai";
  next.vibe = ensureArray(next.vibe && next.vibe.length ? next.vibe : (next.soundTags || next.sound || next.decisionTags));
  if (!next.vibe.length) next.vibe = ["electronic"];
  next.genre = Array.isArray(next.genre) ? next.genre.join(", ") : (next.genre || (Array.isArray(next.sound) ? next.sound.join(", ") : ""));
  next.genre = next.genre || next.vibe.join(", ") || "electronic";
  next.confidence = next.confidence || (next.published ? "Watch" : "Watch");
  next.status = next.status || eventStatus(next.sortDate, next.confidence, next.status);
  next.price = next.price || displayPriceFromTicket(next.ticket) || "TBA";
  next.age = next.age || "TBA";
  next.source = next.source || next.sourceUrl;
  if (next.source === "poster-archive" || next.source === "poster-archive.html") next.source = "https://raveindexsh.top/poster-archive.html";
  next.sourceLabel = next.sourceLabel || sourceLabelFor(next.source);
  next.imageTheme = next.imageTheme || imageThemeFor(next.title);
  next.description = cleanText(next.description || next.notes || `Public event listing from ${next.sourceLabel}.`);
  next.ticketUrl = next.ticketUrl || (next.ticket && next.ticket.link) || "";
  next.ticketStatus = next.ticketStatus || (next.ticket && next.ticket.soldOut === false ? "Ticket source lists availability; verify before going." : "");
  if (next.posterUrl && !String(next.posterUrl).startsWith("assets/posters/") && !String(next.posterUrl).includes("supabase.co")) {
    delete next.posterUrl;
    if (next.posterEvidence) delete next.posterEvidence;
  }
  if (!next.posterUrl && next.posterEvidence) {
    const localFiles = Array.isArray(next.posterEvidence.localFiles) ? next.posterEvidence.localFiles : [];
    const localPoster = localFiles.find(file => String(file || "").startsWith("assets/posters/"));
    if (localPoster) {
      next.posterUrl = localPoster;
    } else {
      delete next.posterEvidence;
    }
  }
  return next;
}

function preserveArchiveEvent(event = {}) {
  const next = coerceEventShape(event);
  next.id = String(next.id || slugify(`${next.title || next.name || "archive-event"}`));
  next.date = next.date || "Date TBA";
  next.month = next.month || "Archive";
  next.confidence = next.confidence || "Watch";
  next.status = event.status || "archive";
  next.kind = next.kind || "event";
  next.source = next.source || next.sourceUrl || "";
  if (next.source === "poster-archive" || next.source === "poster-archive.html") next.source = "https://raveindexsh.top/poster-archive.html";
  next.sourceLabel = next.sourceLabel || sourceLabelFor(next.source);
  next.lastChecked = next.lastChecked || String(next.updatedAt || next.createdAt || "").slice(0, 10) || "2026-06-20";
  if (!Array.isArray(next.sources) || !next.sources.length) {
    next.sources = next.source ? [{
      label: next.sourceLabel,
      url: next.source,
      status: "archive",
      lastChecked: next.lastChecked,
    }] : [];
  }
  return ensureRecommendationFields(enrichEvent(next));
}

function normalizeEvent(event, sourceChecks) {
  const normalized = coerceEventShape(event);
  normalized.id = String(normalized.id || slugify(`${normalized.sortDate}-${normalized.title}`));
  normalized.kind = cleanText(normalized.kind || (normalized.festival ? "festival" : "event"));
  normalized.vibe = ensureArray(normalized.vibe);
  normalized.month = normalized.month || monthCodeFromDate(normalized.sortDate);
  normalized.source = normalizeUrl(normalized.source);
  normalized.sourceLabel = normalized.sourceLabel || sourceLabelFor(normalized.source);
  normalized.description = cleanText(normalized.description || `Public event listing from ${normalized.sourceLabel}.`);
  normalized.imageTheme = normalized.imageTheme || imageThemeFor(normalized.title);
  normalized.status = eventStatus(normalized.sortDate, normalized.confidence, normalized.status);
  normalized.sourceStatus = normalized.sourceStatus || (normalized.status === "watch" || normalized.confidence === "Watch" ? "watchlist" : "secondary");
  const shouldRefreshSourceState = !eventIsPastByCutoff(normalized.sortDate);
  const primarySourceCheck = sourceChecks.get(normalized.source);
  normalized.lastChecked = shouldRefreshSourceState && sourceCheckIsVerified(primarySourceCheck)
    ? primarySourceCheck.lastChecked
    : normalized.lastChecked || "2026-06-08";
  normalized.sources = Array.isArray(normalized.sources) && normalized.sources.length ? normalized.sources : [{
    label: normalized.sourceLabel,
    url: normalized.source,
    status: normalized.sourceStatus,
    lastChecked: normalized.lastChecked,
  }];
  normalized.sources = normalized.sources.map(source => {
    const sourceUrl = source.url === "poster-archive" || source.url === "poster-archive.html"
      ? "https://raveindexsh.top/poster-archive.html"
      : source.url;
    const url = normalizeUrl(sourceUrl);
    const check = sourceChecks.get(url);
    return {
      ...source,
      url,
      ...(shouldRefreshSourceState && sourceCheckIsVerified(check) ? { lastChecked: check.lastChecked } : {}),
    };
  });
  if (normalized.programHighlights !== undefined) {
    const highlights = normalizeProgramHighlights(normalized.programHighlights);
    if (highlights.length) {
      normalized.programHighlights = highlights;
    } else {
      delete normalized.programHighlights;
    }
  }
  if (normalized.lineup !== undefined) {
    const lineup = auditedLineupItems(normalized.lineup, normalized);
    if (lineup.length) {
      normalized.lineup = lineup;
    } else {
      delete normalized.lineup;
    }
  }
  if (normalized.setTimes !== undefined) {
    const setTimes = auditedSetTimes(normalized.setTimes, normalized);
    if (setTimes.length) {
      normalized.setTimes = setTimes;
    } else {
      delete normalized.setTimes;
    }
  }
  for (const field of REQUIRED_EVENT_FIELDS) {
    if (normalized[field] === undefined || normalized[field] === null || normalized[field] === "") {
      throw new Error(`Event ${normalized.id} missing required field: ${field}`);
    }
  }
  return ensureRecommendationFields(enrichEvent(normalized));
}

function missingRequiredEventFields(event = {}) {
  return REQUIRED_EVENT_FIELDS.filter(field => event[field] === undefined || event[field] === null || event[field] === "");
}

function mergeEvents(seedEvents, scrapedEvents) {
  const byKey = new Map();
  const byId = new Set();
  const merged = [];
  const add = event => {
    if (event.id && byId.has(event.id)) return;
    const sourceKey = normalizeUrl(event.source);
    const semanticKey = `${event.sortDate}|${String(event.title).toLowerCase()}|${String(event.venue).toLowerCase()}`;
    const key = sourceKey ? `${sourceKey}|${semanticKey}` : semanticKey;
    if (byKey.has(key)) return;
    byKey.set(key, event.id);
    if (event.id) byId.add(event.id);
    merged.push(event);
  };
  seedEvents.forEach(add);
  scrapedEvents.forEach(event => {
    let id = event.id;
    let suffix = 2;
    while (merged.some(existing => existing.id === id)) {
      id = `${event.id}-${suffix}`;
      suffix += 1;
    }
    add({ ...event, id });
  });
  return merged.sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.title.localeCompare(b.title));
}

function isCalendarFit(event, technoArtistSignals = []) {
  const text = [event.title, event.venue, event.genre, event.description].join(" ").toLowerCase();
  const positive = CALENDAR_FIT_PATTERN.test(text)
    || (/\bhouse\b/i.test(text) && HOUSE_CONTEXT_PATTERN.test(text))
    || technoArtistMatchesForEvent(event, technoArtistSignals).length > 0;
  const negative = CALENDAR_NEGATIVE_PATTERN.test(text);
  return positive && !negative;
}

function tokenSet(value) {
  const stopWords = new Set(["the", "and", "with", "feat", "ft", "pres", "presents", "party", "vol", "at"]);
  return new Set(String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(token => token.length > 2 && !stopWords.has(token)));
}

function tokenOverlapScore(first, second) {
  const a = tokenSet(first);
  const b = tokenSet(second);
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) {
    if (b.has(token)) overlap += 1;
  }
  return overlap / Math.min(a.size, b.size);
}

function isDuplicateOfSeed(event, seedEvents) {
  return seedEvents.some(seed => {
    if (seed.sortDate !== event.sortDate) return false;
    const titleScore = tokenOverlapScore(seed.title, event.title);
    const combinedScore = tokenOverlapScore(`${seed.title} ${seed.venue}`, `${event.title} ${event.venue}`);
    return titleScore >= 0.5 || combinedScore >= 0.55;
  });
}

function curatedMatchIndex(events, curated) {
  if (curated.id) {
    const idIndex = events.findIndex(event => event.id === curated.id);
    if (idIndex !== -1) return idIndex;
  }
  const curatedSource = normalizeUrl(curated.source);
  if (curatedSource) {
    const sourceIndex = events.findIndex(event => normalizeUrl(event.source) === curatedSource);
    if (sourceIndex !== -1) return sourceIndex;
  }
  return events.findIndex(event => {
    if (event.sortDate !== curated.sortDate) return false;
    const titleScore = tokenOverlapScore(event.title, curated.title);
    const combinedScore = tokenOverlapScore(`${event.title} ${event.venue}`, `${curated.title} ${curated.venue}`);
    return titleScore >= 0.62 || combinedScore >= 0.68;
  });
}

function mergeSourceLists(first = [], second = []) {
  const byUrl = new Map();
  for (const source of [...first, ...second]) {
    if (!source || !source.url) continue;
    const key = normalizeUrl(source.url);
    byUrl.set(key, {
      ...(byUrl.get(key) || {}),
      ...source,
      url: key,
    });
  }
  return Array.from(byUrl.values());
}

function eventSourceCount(event) {
  const urls = new Set(eventSourceRows(event).map(source => normalizeUrl(source.url)).filter(Boolean));
  return urls.size;
}

function eventSourceRows(event) {
  const rows = Array.isArray(event.sources) ? [...event.sources] : [];
  const primaryUrl = normalizeUrl(event.source);
  if (primaryUrl && !rows.some(source => normalizeUrl(source?.url) === primaryUrl)) {
    rows.unshift({
      label: event.sourceLabel,
      url: primaryUrl,
      status: event.sourceStatus,
      lastChecked: event.lastChecked,
    });
  }
  return rows;
}

function isConfirmationSource(source = {}) {
  const status = String(source.status || source.sourceStatus || "").toLowerCase();
  const label = String(source.label || source.sourceLabel || "").toLowerCase();
  const url = normalizeUrl(source.url);
  if (!url) return false;
  if (/(?:social(?:-index)?-lead|artist-profile|artist-itinerary-context|previous-(?:edition|series|lineup)-context|venue-context|festival-context|radio-context)/.test(status)) {
    return false;
  }
  if (/(?:profile|biography|bandcamp|soundcloud|previous|context)/.test(label)
    && !/(?:resident advisor|smartshanghai|ticket|official|program|listing|event|guide)/.test(label)) {
    return false;
  }
  return true;
}

function eventConfirmationSourceCount(event) {
  const urls = new Set();
  for (const source of eventSourceRows(event)) {
    const url = normalizeUrl(source.url);
    if (isConfirmationSource(source)) urls.add(url);
  }
  return urls.size;
}

function sourcePlatform(source = {}) {
  const explicit = cleanText(source.platform || source.sourcePlatform || "");
  if (explicit) return explicit;
  const url = normalizeUrl(source.url);
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("instagram.com")) return "Instagram";
    if (host.includes("xiaohongshu.com") || host.includes("xhslink.com")) return "Xiaohongshu / XHS";
    if (host.includes("weixin.qq.com") || host.includes("wechat")) return "WeChat";
    if (host.includes("weibo.com")) return "Weibo";
    if (host.includes("douyin.com")) return "Douyin";
    if (host.includes("showstart.com")) return "ShowStart";
    if (host.includes("damai.cn")) return "Damai";
    if (host.includes("piaoplanet")) return "PiaoPlanet";
    return host;
  } catch (_) {
    return "Platform source";
  }
}

function sourceNeedsPlatformVerification(source = {}) {
  const status = String(source.status || source.sourceStatus || "").toLowerCase();
  const url = normalizeUrl(source.url);
  if (!url) return false;
  if (/(?:social(?:-index)?-lead|computer-use|platform-verification|venue-social|promoter-social|official-social|browser-required|ticket-widget|mini-program|app-only)/.test(status)) {
    return true;
  }
  return /(?:instagram\.com|xiaohongshu\.com|xhslink\.com|weixin\.qq\.com|wechat|weibo\.com|douyin\.com|showstart\.com|damai\.cn|piaoplanet)/i.test(url);
}

function sourceVerificationState(source = {}) {
  const status = String(source.status || source.sourceStatus || "").toLowerCase();
  const note = cleanText([
    source.browserCheck,
    source.verificationNote,
    source.accessNote,
    source.note,
  ].filter(Boolean).join(" "));
  if (/logged-?in|login|gated|no usable search|placeholder|timed out|timeout/i.test(note)) {
    return "login-or-visual-check-required";
  }
  if (/social-index-lead/.test(status)) return "search-index-only";
  if (/social-lead/.test(status)) return "social-lead";
  if (/(?:mini-program|app-only|ticket-widget)/.test(status)) return "app-or-ticket-flow";
  if (/browser-required|computer-use/.test(status)) return "browser-required";
  return "platform-check-required";
}

function platformVerificationNextAction(source = {}) {
  const platform = sourcePlatform(source);
  const status = String(source.status || source.sourceStatus || "").toLowerCase();
  if (/xiaohongshu|xhs/i.test(platform)) {
    return "Use XHS platform search for venue, promoter, DJ, event title, and date; keep as lead unless an official post visibly confirms event facts.";
  }
  if (/instagram/i.test(platform)) {
    return "Enter through Instagram search/profile, then open the visible post; use logged-in Chrome only with user-provided session and record whether event facts are visible.";
  }
  if (/wechat|weixin/i.test(platform)) {
    return "Use WeChat official-account/article search or a shareable article route; record account name, article title, publish date, and visible event facts.";
  }
  if (/(?:showstart|damai|piaoplanet)/i.test(platform) || /(?:mini-program|ticket-widget|app-only)/.test(status)) {
    return "Inspect the final ticket flow with Chrome/Computer Use and record price, availability, age rule, and public/shareable ticket reference.";
  }
  return "Use platform-native search before opening known deep links; count it only after visible event title, date, venue, lineup, ticket, or set-time facts are confirmed.";
}

function platformSearchQueries(event = {}) {
  const lineup = Array.isArray(event.lineup)
    ? event.lineup.map(lineupItemName).filter(name => !isPlaceholderPerformerName(name)).slice(0, 4)
    : [];
  return Array.from(new Set([
    [event.venue, event.title, event.sortDate].filter(Boolean).join(" "),
    [event.title, event.sortDate, "Shanghai"].filter(Boolean).join(" "),
    lineup.length ? [event.venue, lineup.join(" "), event.sortDate].filter(Boolean).join(" ") : "",
  ].map(cleanText).filter(Boolean)));
}

function platformVerificationSourcesForEvent(event) {
  const byUrl = new Map();
  for (const source of eventSourceRows(event)) {
    const url = normalizeUrl(source.url);
    if (!url || !sourceNeedsPlatformVerification(source)) continue;
    byUrl.set(url, {
      label: cleanText(source.label || source.sourceLabel || "Platform source"),
      url,
      platform: sourcePlatform(source),
      status: source.status || source.sourceStatus || "",
      checked: source.lastChecked || source.checkedAt || source.checked || event.lastChecked || "",
      evidenceState: sourceVerificationState(source),
      hasBrowserCheck: Boolean(source.browserCheck),
      hasVerificationNote: Boolean(source.verificationNote),
      nextAction: platformVerificationNextAction(source),
    });
  }
  return Array.from(byUrl.values());
}

function buildPlatformVerificationQueue(futureWatch) {
  return futureWatch.map(event => {
    const platformSources = platformVerificationSourcesForEvent(event);
    if (!platformSources.length) return null;
    const fitScore = technoFitScore(event);
    const priority = watchPriority(event);
    return {
      id: event.id,
      date: event.sortDate,
      title: event.title,
      venue: event.venue,
      priority,
      fitScore,
      confirmationSourceCount: eventConfirmationSourceCount(event),
      platformSourceCount: platformSources.length,
      searchQueries: platformSearchQueries(event),
      platformSources,
      nextAction: "Resolve through platform-native search first; keep as Watch until a visible current-event source confirms practical facts.",
    };
  }).filter(Boolean).sort((first, second) => (
    ({ high: 0, medium: 1, low: 2 }[first.priority] ?? 3) - ({ high: 0, medium: 1, low: 2 }[second.priority] ?? 3)
    || second.fitScore - first.fitScore
    || first.confirmationSourceCount - second.confirmationSourceCount
    || String(first.date || "").localeCompare(String(second.date || ""))
    || String(first.title || "").localeCompare(String(second.title || ""))
  ));
}

function eventSourceUrls(event) {
  return [
    event.source,
    ...(Array.isArray(event.sources) ? event.sources.map(source => source.url) : []),
  ].map(value => normalizeUrl(value)).filter(Boolean);
}

function eventSearchText(event) {
  const lineupText = Array.isArray(event.lineup)
    ? event.lineup.map(item => {
      if (typeof item === "string") return item;
      return [item.name, item.artist, item.role, item.genre, item.bio].filter(Boolean).join(" ");
    }).join(" ")
    : "";
  return [
    event.title,
    event.venue,
    event.district,
    event.genre,
    event.description,
    event.ticketStatus,
    event.sourceStatus,
    ensureArray(event.vibe).join(" "),
    lineupText,
  ].filter(Boolean).join(" ").toLowerCase();
}

function technoFitScore(event) {
  const text = eventSearchText(event);
  let score = 0;
  if (/(hard techno|acid techno|industrial techno|warehouse rave|abyss|system|turbo|lethal distortion)/.test(text)) {
    score += 3;
  } else if (/\b(techno|acid|industrial|ebm|electro|trance|house|breaks?|jungle|ukg|garage|dubstep|ghettotech|hard dance)\b/.test(text)) {
    score += 2;
  } else if (/(club music|bass|experimental|ambient|a\/v|darkwave|minimal wave|cold wave|post-punk|minimal|nu-disco|baile funk)/.test(text)) {
    score += 1;
  }
  if (/\b(abyss|potent|exit|illum|heim|dirty house|reactor|fenrir|wigwam|specters)\b/.test(text)) score += 1;
  if (/(pool party|afrowave|afrobeats|amapiano|90s disco|rooftop lounge|soul|funk|jazz)/.test(text)) score -= 1;
  if (/(lower techno fit|more listening-session than rave|not a rave|not techno)/.test(text)) score -= 1;
  return Math.max(0, Math.min(3, score));
}

function watchPriority(event) {
  const score = technoFitScore(event);
  if (score >= 3) return "high";
  if (score >= 2) return "medium";
  return "low";
}

function watchReason(event) {
  const notes = [];
  if (eventSourceCount(event) <= 1) notes.push("single-source");
  else if (eventConfirmationSourceCount(event) <= 1) notes.push("single-confirmation-source");
  if (isFestivalListing(event) && event.includeInDjCoverage !== true) {
    if (!Array.isArray(event.programHighlights) || event.programHighlights.length === 0) notes.push("program details missing");
  } else if (!event.lineup || event.lineup.length === 0) {
    notes.push("lineup missing");
  }
  if (!event.ticketStatus) notes.push("ticket status missing");
  if (/tba|not found|not listed|only the/i.test(String(event.ticketStatus || event.description || ""))) {
    notes.push("needs source upgrade");
  }
  return notes.length ? Array.from(new Set(notes)).join(", ") : "watch-level confidence";
}

function watchNextAction(event, priority) {
  if (isFestivalListing(event) && event.includeInDjCoverage !== true) {
    return "Confirm exact dates, program, ticketing, and a direct official festival source before promotion.";
  }
  if (priority === "high") {
    return eventConfirmationSourceCount(event) <= 1
      ? "Prioritize direct venue, promoter, ticketing, RA, or official artist evidence before promotion."
      : "Recheck ticket, lineup, and set-time details before promotion.";
  }
  if (priority === "medium") {
    return eventConfirmationSourceCount(event) <= 1
      ? "Find a second source if it remains a likely techno-adjacent pick."
      : "Recheck practical details before featuring it.";
  }
  return "Keep as context unless a direct source confirms stronger techno relevance.";
}

function sourceUrlsForEvent(event) {
  const urls = new Set();
  if (event.source) urls.add(normalizeUrl(event.source));
  if (Array.isArray(event.sources)) {
    for (const source of event.sources) {
      if (source?.url) urls.add(normalizeUrl(source.url));
    }
  }
  return Array.from(urls).filter(Boolean);
}

function venueProfileKey(venue) {
  return normalizeEntityName(venue)
    .replace(/\bclub\b/g, "")
    .replace(/\bshanghai\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function addToSet(set, value) {
  const clean = cleanText(value);
  if (clean) set.add(clean);
}

function buildVenueCoverage(events, auditDate) {
  const byVenue = new Map();
  for (const event of events) {
    const key = venueProfileKey(event.venue);
    if (!key) continue;
    if (!byVenue.has(key)) {
      byVenue.set(key, {
        venue: event.venue,
        aliases: new Set(),
        districts: new Set(),
        genres: new Set(),
        sources: new Set(),
        totalEvents: 0,
        futureEvents: 0,
        highConfidenceEvents: 0,
        watchEvents: 0,
        maxFitScore: 0,
        lastChecked: "",
        nextEventDate: "",
      });
    }
    const profile = byVenue.get(key);
    profile.totalEvents += 1;
    profile.maxFitScore = Math.max(profile.maxFitScore, technoFitScore(event));
    if (event.confidence === "High") profile.highConfidenceEvents += 1;
    if (event.status === "watch" || event.confidence === "Watch") profile.watchEvents += 1;
    if (String(event.sortDate || "") >= auditDate) {
      profile.futureEvents += 1;
      if (!profile.nextEventDate || String(event.sortDate || "") < profile.nextEventDate) {
        profile.nextEventDate = event.sortDate;
      }
    }
    addToSet(profile.aliases, event.venue);
    addToSet(profile.districts, event.district);
    addToSet(profile.genres, event.genre);
    for (const url of sourceUrlsForEvent(event)) profile.sources.add(url);
    if (String(event.lastChecked || "") > profile.lastChecked) profile.lastChecked = event.lastChecked;
  }

  return Array.from(byVenue.values()).map(profile => ({
    venue: profile.venue,
    aliases: Array.from(profile.aliases).filter(alias => alias !== profile.venue),
    districts: Array.from(profile.districts),
    genres: Array.from(profile.genres).slice(0, 8),
    sourceCount: profile.sources.size,
    totalEvents: profile.totalEvents,
    futureEvents: profile.futureEvents,
    highConfidenceEvents: profile.highConfidenceEvents,
    watchEvents: profile.watchEvents,
    fitScore: profile.maxFitScore,
    priority: profile.maxFitScore >= 3 ? "high" : profile.maxFitScore >= 2 ? "medium" : "low",
    nextEventDate: profile.nextEventDate,
    lastChecked: profile.lastChecked,
  })).sort((first, second) => (
    second.futureEvents - first.futureEvents
    || second.fitScore - first.fitScore
    || second.totalEvents - first.totalEvents
    || first.venue.localeCompare(second.venue)
  ));
}

function buildDjCoverage(events, auditDate, djItineraryStats = {}) {
  const byArtist = new Map();
  const trackedProfileSourceCounts = djItineraryStats.profileSourceCounts || {};
  for (const event of events) {
    if (isFestivalListing(event) && event.includeInDjCoverage !== true) continue;
    const isFuture = String(event.sortDate || "") >= auditDate;
    const eventUrls = sourceUrlsForEvent(event);
    for (const item of auditedLineupItems(event.lineup || [], event)) {
      const name = lineupItemName(item);
      const key = performerProfileSlug(name);
      if (!key) continue;
      if (!byArtist.has(key)) {
        byArtist.set(key, {
          name,
          events: new Set(),
          futureEvents: new Set(),
          venues: new Set(),
          genres: new Set(),
          sources: new Set(),
          watchAppearances: 0,
          highConfidenceAppearances: 0,
          singleSourceFutureAppearances: 0,
          maxFitScore: 0,
          nextDate: "",
        });
      }
      const profile = byArtist.get(key);
      profile.events.add(event.id);
      profile.maxFitScore = Math.max(profile.maxFitScore, technoFitScore(event));
      addToSet(profile.venues, event.venue);
      addToSet(profile.genres, event.genre);
      for (const url of eventUrls) profile.sources.add(url);
      if (event.confidence === "High") profile.highConfidenceAppearances += 1;
      if (event.status === "watch" || event.confidence === "Watch") profile.watchAppearances += 1;
      if (isFuture) {
        profile.futureEvents.add(event.id);
        if (eventSourceCount(event) <= 1) profile.singleSourceFutureAppearances += 1;
        if (!profile.nextDate || String(event.sortDate || "") < profile.nextDate) profile.nextDate = event.sortDate;
      }
    }
  }

  const profiles = Array.from(byArtist.values()).map(profile => ({
    slug: performerProfileSlug(profile.name),
    name: profile.name,
    eventCount: profile.events.size,
    futureEventCount: profile.futureEvents.size,
    sourceCount: profile.sources.size,
    trackedProfileSourceCount: trackedProfileSourceCounts[performerProfileSlug(profile.name)] || 0,
    venues: Array.from(profile.venues).slice(0, 6),
    genres: Array.from(profile.genres).slice(0, 6),
    watchAppearances: profile.watchAppearances,
    highConfidenceAppearances: profile.highConfidenceAppearances,
    singleSourceFutureAppearances: profile.singleSourceFutureAppearances,
    fitScore: profile.maxFitScore,
    priority: profile.maxFitScore >= 3 ? "high" : profile.maxFitScore >= 2 ? "medium" : "low",
    nextDate: profile.nextDate,
  })).sort((first, second) => (
    second.futureEventCount - first.futureEventCount
    || second.fitScore - first.fitScore
    || second.eventCount - first.eventCount
    || first.name.localeCompare(second.name)
  ));

  const futureProfiles = profiles.filter(profile => profile.futureEventCount > 0);
  const sourceUpgradeQueue = futureProfiles
    .filter(profile => profile.trackedProfileSourceCount === 0 && profile.singleSourceFutureAppearances > 0)
    .map(profile => ({
      slug: profile.slug,
      name: profile.name,
      priority: profile.priority,
      fitScore: profile.fitScore,
      futureEventCount: profile.futureEventCount,
      singleSourceFutureAppearances: profile.singleSourceFutureAppearances,
      nextDate: profile.nextDate,
      venues: profile.venues,
      genres: profile.genres,
      nextAction: "Find an official artist, RA artist/event history, venue/promoter, radio, label, or public social source for this performer profile.",
    }));
  return {
    trackedItineraryProfiles: djItineraryStats.profileCount || 0,
    curatedSourceProfiles: djItineraryStats.curatedProfileCount || 0,
    trackedItineraryRows: djItineraryStats.rowCount || 0,
    futureProfiles,
    sourceUpgradeQueue,
    allProfileCount: profiles.length,
  };
}

function raVisibleUpcomingLabel(config) {
  const checks = Array.isArray(config?.listingChecks) ? config.listingChecks : [];
  const labeledChecks = checks
    .map(check => Number(check.visibleTotalLabel))
    .filter(value => Number.isFinite(value));
  if (!labeledChecks.length) return null;
  return labeledChecks[labeledChecks.length - 1];
}

function buildRaShanghaiCoverageSnapshot(config, events) {
  if (!config) {
    return {
      configured: false,
      expected: 0,
      covered: 0,
      missing: 0,
      primary: 0,
      supporting: 0,
      relatedContext: 0,
      rows: [],
    };
  }

  const rows = (Array.isArray(config.events) ? config.events : []).map(row => {
    const expectedUrl = normalizeUrl(row.url);
    const event = events.find(candidate => candidate.id === row.eventId)
      || events.find(candidate => eventSourceUrls(candidate).includes(expectedUrl));
    const sourceMatched = event ? eventSourceUrls(event).includes(expectedUrl) : false;
    const dateMatched = event ? String(event.sortDate || "") === String(row.date || "") : false;
    return {
      raEventId: row.raEventId,
      url: expectedUrl,
      eventId: row.eventId,
      title: row.title,
      date: row.date,
      venue: row.venue,
      coverageRole: row.coverageRole || "primary",
      covered: Boolean(event && sourceMatched),
      matchedEventId: event?.id || "",
      matchedTitle: event?.title || "",
      matchedDate: event?.sortDate || "",
      sourceMatched,
      dateMatched,
    };
  });

  const snapshotDate = String(config.updatedAt || "").trim();
  const visibleUpcomingLabel = raVisibleUpcomingLabel(config);
  const upcomingRows = rows.filter(row => snapshotDate && String(row.date || "") >= snapshotDate);

  return {
    configured: true,
    updatedAt: config.updatedAt,
    cityListingUrl: config.cityListingUrl,
    scope: config.scope,
    expected: rows.length,
    covered: rows.filter(row => row.covered).length,
    missing: rows.filter(row => !row.covered).length,
    visibleUpcomingLabel,
    upcomingExpected: upcomingRows.length,
    upcomingCovered: upcomingRows.filter(row => row.covered).length,
    upcomingMatchesListingLabel: visibleUpcomingLabel === null ? null : upcomingRows.length === visibleUpcomingLabel,
    primary: rows.filter(row => row.coverageRole === "primary").length,
    supporting: rows.filter(row => row.coverageRole === "supporting").length,
    relatedContext: Array.isArray(config.relatedContext) ? config.relatedContext.length : 0,
    rows,
  };
}

function valueText(value) {
  return String(value || "").trim();
}

function missingCoreValue(value) {
  const text = valueText(value);
  return !text || /^(?:check|tba|unknown|not listed)$/i.test(text) || /^(?:check|tba)\b/i.test(text);
}

function uncertainCoreValue(value) {
  return /\b(?:verify|tentative|lead only|social-index|search-index|needs .*confirmation|pending|not confirmed)\b/i.test(valueText(value));
}

function eventCoreFieldState(event) {
  const missing = [];
  const uncertain = [];
  const check = (field, value) => {
    if (missingCoreValue(value)) missing.push(field);
    else if (uncertainCoreValue(value)) uncertain.push(field);
  };

  check("date", event.sortDate || event.date);
  check("title", event.title);
  check("time", event.time);
  check("venue", event.venue);
  check("address", event.address);
  check("price", event.price);
  check("age", event.age);
  check("ticketUrl", event.ticketUrl);

  const sourceRows = eventSourceRows(event);
  if (!sourceRows.some(source => source.url)) {
    missing.push("sourceUrl");
  }
  if (!sourceRows.some(source => source.url && (source.lastChecked || source.checkedAt || source.checked))) {
    missing.push("checkedSource");
  }
  if (!valueText(event.ticketStatus)) missing.push("ticketStatus");

  if (!isFestivalListing(event)) {
    if (!Array.isArray(event.lineup) || event.lineup.length === 0) {
      missing.push("lineup");
    } else if (event.lineup.some(item => uncertainCoreValue(item.note))) {
      uncertain.push("lineup");
    }
  }

  return { missing, uncertain };
}

function eventNonCoreFieldState(event) {
  const missing = [];
  if (!event.posterUrl && !event.posterEvidence) missing.push("poster");
  for (const field of ["recommendationReason", "bestFor", "verifyBeforeGoing", "sourceConfidence"]) {
    if (!valueText(event[field])) missing.push(field);
  }
  if (!Array.isArray(event.soundTags) || event.soundTags.length === 0) missing.push("soundTags");
  if (!Array.isArray(event.decisionTags) || event.decisionTags.length === 0) missing.push("decisionTags");
  return { missing };
}

function buildCoreFieldQueue(futureEvents, djItineraryStats = {}) {
  const profileSourceCounts = djItineraryStats.profileSourceCounts || {};
  return futureEvents
    .map(event => {
      const core = eventCoreFieldState(event);
      const nonCore = eventNonCoreFieldState(event);
      const performerProfileGaps = performerNamesForEvent(event)
        .filter(name => !(profileSourceCounts[performerProfileSlug(name)] > 0));
      const hasCoreGap = core.missing.length || core.uncertain.length;
      return {
        id: event.id,
        date: event.sortDate,
        title: event.title,
        venue: event.venue,
        confidence: event.confidence,
        priority: watchPriority(event),
        fitScore: technoFitScore(event),
        missingCoreFields: core.missing,
        uncertainCoreFields: core.uncertain,
        missingNonCoreFields: nonCore.missing,
        performerProfileGaps,
        coreFieldGapStatus: hasCoreGap ? "public-source-gap" : "performer-profile-gap",
        sourceGapNote: hasCoreGap
          ? "Missing or uncertain core fields were not found in current public sources; keep marked and recheck organizer, venue, ticketing, RA, SmartShanghai, WeChat, XHS, or Instagram platform search in the next pass."
          : "Event core fields are usable, but performer profile sources are still missing from the DJ inventory.",
        nextAction: hasCoreGap
          ? "Mark missing/uncertain core fields as public-source gaps; recheck organizer or platform-native sources next pass before second-source promotion."
          : "Core fields usable; add performer profile sources before non-core enrichment."
      };
    })
    .filter(item => item.missingCoreFields.length || item.uncertainCoreFields.length || item.performerProfileGaps.length)
    .sort((first, second) => (
      second.fitScore - first.fitScore
      || second.missingCoreFields.length - first.missingCoreFields.length
      || second.uncertainCoreFields.length - first.uncertainCoreFields.length
      || String(first.date || "").localeCompare(String(second.date || ""))
      || String(first.title || "").localeCompare(String(second.title || ""))
    ));
}

function buildTechnoDiscoverySnapshot(events, technoArtistSignals = []) {
  const uniqueProfiles = new Map();
  for (const signal of technoArtistSignals) {
    if (signal.slug && !uniqueProfiles.has(signal.slug)) uniqueProfiles.set(signal.slug, signal.profile);
  }
  const matchedEvents = events.filter(event => Array.isArray(event.technoProfileSignals) && event.technoProfileSignals.length > 0);
  return {
    rule: "Use two complementary discovery gates: event keyword/source text fit OR tracked techno-relevant DJ/profile/alias fit.",
    caveat: "The DJ gate is not a complete scene graph. It only covers source-backed profiles in config/tracked-dj-profiles.json and must be expanded from RA artist pages, RA event history, venue/promoter lineups, label pages, and platform-native social checks.",
    eventKeywordGate: [
      "techno",
      "rave",
      "electronic",
      "electro",
      "acid",
      "industrial",
      "EBM",
      "trance",
      "warehouse",
      "hard dance",
      "bass/club crossover",
      "breaks",
      "jungle",
      "UKG",
      "experimental electronic"
    ],
    djProfileGate: {
      source: "config/tracked-dj-profiles.json",
      signalCount: technoArtistSignals.length,
      profileCount: uniqueProfiles.size,
      matchedEventCount: matchedEvents.length,
      matchedEvents: matchedEvents.slice(0, 20).map(event => ({
        id: event.id,
        date: event.sortDate,
        title: event.title,
        venue: event.venue,
        signals: event.technoProfileSignals,
      })),
    },
  };
}

function buildQualitySnapshot(events, sources, auditDate, curatedEventsApplied, generatedAt, djItineraryStats = {}, raShanghaiCoverageConfig = null, technoArtistSignals = [], promotionPlatformNetwork = null, promotionPlatformQueue = []) {
  const future = events.filter(event => String(event.sortDate || "") >= auditDate);
  const futureHigh = future.filter(event => event.confidence === "High");
  const futureWatch = future.filter(event => event.status === "watch" || event.confidence === "Watch");
  const failedSourceReports = sources.filter(source => source.ok === false);
  const staleFuture = future.filter(event => !eventCheckedDateIsFresh(event, auditDate));
  const missingTicketStatus = future.filter(event => !String(event.ticketStatus || "").trim());
  const highMissingLineup = futureHigh.filter(event => !isFestivalListing(event) && (!Array.isArray(event.lineup) || event.lineup.length === 0));
  const singleSourceWatch = futureWatch.filter(event => eventSourceCount(event) <= 1);
  const singleConfirmationWatch = futureWatch.filter(event => eventConfirmationSourceCount(event) <= 1);
  const watchQueue = futureWatch.map(event => ({
    event,
    fitScore: technoFitScore(event),
    priority: watchPriority(event),
  })).sort((first, second) => (
    second.fitScore - first.fitScore
    || String(first.event.sortDate || "").localeCompare(String(second.event.sortDate || ""))
    || String(first.event.title || "").localeCompare(String(second.event.title || ""))
  ));
  const venueCoverage = buildVenueCoverage(events, auditDate);
  const futureVenueCoverage = venueCoverage.filter(profile => profile.futureEvents > 0);
  const djCoverage = buildDjCoverage(events, auditDate, djItineraryStats);
  const futureDjProfiles = djCoverage.futureProfiles;
  const raShanghaiCoverage = buildRaShanghaiCoverageSnapshot(raShanghaiCoverageConfig, events);
  const platformVerificationQueue = buildPlatformVerificationQueue(futureWatch);
  const coreFieldQueue = buildCoreFieldQueue(future, djItineraryStats);
  const technoDiscovery = buildTechnoDiscoverySnapshot(events, technoArtistSignals);
  const promotionPlatformNetworkSnapshot = buildPromotionPlatformNetworkSnapshot(promotionPlatformNetwork, promotionPlatformQueue, events, auditDate);

  return {
    auditDate,
    generatedAt,
    freshnessPolicy: {
      eventSourceMaxAgeDays: EVENT_SOURCE_FRESHNESS_DAYS,
      nearEventWindowDays: EVENT_NEAR_WINDOW_DAYS,
      nearEventSourceMaxAgeDays: EVENT_NEAR_SOURCE_FRESHNESS_DAYS,
      djProfileSourceMaxAgeDays: DJ_PROFILE_SOURCE_FRESHNESS_DAYS,
      rule: "Future event sources are expected to be rechecked within the two-day scrape cadence; events within the near-event window use the stricter near-event freshness window. Profile-level DJ sources have a longer freshness window because they support identity/context, not live ticket state.",
    },
    totals: {
      events: events.length,
      future: future.length,
      futureHigh: futureHigh.length,
      futureWatch: futureWatch.length,
      singleSourceWatch: singleSourceWatch.length,
      singleConfirmationWatch: singleConfirmationWatch.length,
      venueProfiles: venueCoverage.length,
      futureVenueProfiles: futureVenueCoverage.length,
      futureVenueWatch: futureVenueCoverage.filter(profile => profile.watchEvents > 0).length,
      futurePerformerProfiles: futureDjProfiles.length,
      futurePerformerWatch: futureDjProfiles.filter(profile => profile.watchAppearances > 0).length,
      singleSourceFuturePerformers: futureDjProfiles.filter(profile => profile.singleSourceFutureAppearances > 0).length,
      futurePerformerProfileSources: futureDjProfiles.filter(profile => profile.trackedProfileSourceCount > 0).length,
      futurePerformerMissingProfileSources: futureDjProfiles.filter(profile => profile.trackedProfileSourceCount === 0).length,
      djSourceUpgradeQueue: djCoverage.sourceUpgradeQueue.length,
      trackedDjProfiles: djCoverage.trackedItineraryProfiles,
      curatedDjSourceProfiles: djCoverage.curatedSourceProfiles,
      technoArtistSignals: technoDiscovery.djProfileGate.signalCount,
      technoArtistSignalProfiles: technoDiscovery.djProfileGate.profileCount,
      eventsWithTechnoProfileSignals: technoDiscovery.djProfileGate.matchedEventCount,
      trackedDjItineraryRows: djCoverage.trackedItineraryRows,
      staleFuture: staleFuture.length,
      missingTicketStatus: missingTicketStatus.length,
      highMissingLineup: highMissingLineup.length,
      futureCoreFieldQueue: coreFieldQueue.length,
      futureMissingCoreFields: coreFieldQueue.reduce((total, item) => total + item.missingCoreFields.length, 0),
      futureUncertainCoreFields: coreFieldQueue.reduce((total, item) => total + item.uncertainCoreFields.length, 0),
      platformVerificationQueue: platformVerificationQueue.length,
      platformVerificationSources: platformVerificationQueue.reduce((total, item) => total + item.platformSourceCount, 0),
      promotionPlatformEntities: promotionPlatformNetworkSnapshot.entityCount,
      promotionPlatformRoutes: promotionPlatformNetworkSnapshot.routeCount,
      promotionPlatformQueue: promotionPlatformNetworkSnapshot.queueCount,
      promotionPlatformUnmappedFutureVenues: promotionPlatformNetworkSnapshot.unmappedFutureVenueCount,
      curatedEventsApplied,
      failedSourceReports: failedSourceReports.length,
    },
    watchQueue: watchQueue.map(({ event, fitScore, priority }) => ({
      id: event.id,
      date: event.sortDate,
      title: event.title,
      venue: event.venue,
      priority,
      fitScore,
      sourceLabel: event.sourceLabel,
      sourceCount: eventSourceCount(event),
      confirmationSourceCount: eventConfirmationSourceCount(event),
      reason: watchReason(event),
      nextAction: watchNextAction(event, priority),
    })),
    coreFieldPolicy: {
      coreFields: [
        "date",
        "title",
        "time",
        "venue",
        "address",
        "lineup",
        "price",
        "age",
        "ticketUrl",
        "ticketStatus",
        "sourceUrl",
        "checkedSource",
        "performerProfileSources"
      ],
      nonCoreFields: [
        "poster",
        "recommendationReason",
        "bestFor",
        "verifyBeforeGoing",
        "sourceConfidence",
        "soundTags",
        "decisionTags"
      ],
      rule: "Run the broad source sweep first, then fill missing or uncertain core fields for future events, venues, and DJs before attempting confidence promotion through second sources."
    },
    technoDiscovery,
    coreFieldQueue,
    platformVerificationQueue,
    promotionPlatformNetwork: promotionPlatformNetworkSnapshot,
    venueCoverage,
    djCoverage,
    raShanghaiCoverage,
    sourceHealth: sources.map(source => ({
      label: source.label,
      kind: source.kind,
      sourceStatus: source.sourceStatus,
      ok: source.ok,
      checkedAt: source.checkedAt,
      status: source.status,
      access: source.access,
      antiBotReason: source.antiBotReason,
      fromCache: source.fromCache,
      cacheAgeHours: source.cacheAgeHours,
      retryAfterMs: source.retryAfterMs,
      eventLinks: source.eventLinks,
      links: source.links,
      error: source.error,
    })),
    updateWorkflow: [
      "Start every credibility session with a broad source sweep: run npm run scrape or node scripts/scrape-events.js with reasonable timeouts to refresh RA, SmartShanghai, existing detail URLs, curated overlays, tracked DJ profiles, source health, discovered links, and browser-required queues.",
      "During the sweep, add newly discovered Shanghai techno-relevant activities through two complementary gates: event/source keyword fit and tracked techno-related DJ/profile/alias fit.",
      "Inspect source health before manual research: failed source reports, RA coverage gaps, discovered links, social leads, quality.platformVerificationQueue, and quality.coreFieldQueue.",
      "Only after the source sweep, run npm run audit to prioritize future freshness, ticket notes, High-confidence lineups, the Watch queue, active venue coverage, and future DJ profile coverage.",
      "Keep config/ra-shanghai-coverage.json aligned with Browser/Chrome-verified RA Shanghai city-listing rows when RA fetch is browser-required.",
      "Before generic keyword searches, run config/promotion-platform-network.json routes for known venue/promoter WeChat, XHS, ticketing, poster, and official-account networks.",
      "Promote Watch entries only after direct venue, promoter, ticketing, RA, SmartShanghai detail, or official artist evidence is captured in config/curated-events.json.",
      "Use Computer Use / Chrome for WeChat, Xiaohongshu, mini-program, image-only, or anti-bot sources, then preserve evidence notes and source links in curated overlays.",
      "Use quality.platformVerificationQueue for event-specific Instagram, XHS, WeChat, Weibo, and ticket-flow leads; always enter anti-scrape platforms through platform-native search before deep links.",
    ],
  };
}

function applyCuratedEvents(events, curatedEvents, sourceChecks) {
  const next = [...events];
  for (const curated of curatedEvents) {
    const index = curatedMatchIndex(next, curated);
    if (index === -1) {
      const missingRequiredFields = missingRequiredEventFields(curated);
      if (missingRequiredFields.length) {
        console.warn(`Skipping incomplete unmatched curated event ${curated.id || curated.title}: missing ${missingRequiredFields.join(", ")}`);
        continue;
      }
      next.push(normalizeEvent(curated, sourceChecks));
      continue;
    }
    const existing = next[index];
    const merged = {
      ...existing,
      ...curated,
      sources: mergeSourceLists(existing.sources, curated.sources),
    };
    next[index] = normalizeEvent(merged, sourceChecks);
  }
  return next.sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.title.localeCompare(b.title));
}

function readExistingDjSourceData() {
  if (!fs.existsSync(DJ_DATA_FILE)) return { events: [], lineups: {} };
  const context = { window: {} };
  try {
    vm.runInNewContext(readText(DJ_DATA_FILE), context, { timeout: 1000 });
    return context.window.DJ_SOURCE_DATA || { events: [], lineups: {} };
  } catch (_) {
    return { events: [], lineups: {} };
  }
}

function writeDjSourceData(events) {
  const existing = readExistingDjSourceData();
  const eventById = new Map(events.map(event => [event.id, event]));
  const existingEventById = new Map((existing.events || []).map(event => [event.id, event]));
  const djEvents = events.filter(event => !isFestivalListing(event) || event.includeInDjCoverage === true);
  const lineups = {};
  const mergeLineupItems = (first, second) => {
    const merged = [];
    const seen = new Set();
    for (const item of [...first, ...second]) {
      const name = lineupItemName(item);
      const key = normalizeEntityName(name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
    return merged;
  };

  for (const [eventId, items] of Object.entries(existing.lineups || {})) {
    const event = eventById.get(eventId) || existingEventById.get(eventId) || { id: eventId };
    if (isFestivalListing(event) && event.includeInDjCoverage !== true) continue;
    if (eventById.has(eventId) && Array.isArray(event.lineup) && event.lineup.length > 0) continue;
    const audited = auditedLineupItems(items, event);
    if (audited.length) lineups[eventId] = audited;
  }

  for (const event of events) {
    if (isFestivalListing(event) && event.includeInDjCoverage !== true) continue;
    const audited = auditedLineupItems(event.lineup || [], event);
    if (!audited.length) continue;
    lineups[event.id] = mergeLineupItems(lineups[event.id] || [], audited);
  }

  const payload = {
    generatedAt: shanghaiDateString(),
    externalDataPath: "data/events.json",
    calendarPath: "index.html",
    events: djEvents,
    lineups,
  };
  fs.writeFileSync(DJ_DATA_FILE, `window.DJ_SOURCE_DATA = ${JSON.stringify(payload)};\n`);
}

function readExistingDjItineraryData() {
  if (!fs.existsSync(DJ_ITINERARY_FILE)) return {};
  const context = { window: {} };
  try {
    vm.runInNewContext(readText(DJ_ITINERARY_FILE), context, { timeout: 1000 });
    return sanitizeDjItineraryData(context.window.DJ_ITINERARY_DATA || {});
  } catch (_) {
    return {};
  }
}

function localEvidenceSourceStillExists(source) {
  const rawUrl = String(source?.url || "").trim();
  if (!rawUrl || /^https?:\/\//i.test(rawUrl) || /^[a-z]+:/i.test(rawUrl)) return true;
  const cleanUrl = rawUrl.split(/[?#]/)[0].replace(/\\/g, "/").replace(/^\/+/, "");
  if (!cleanUrl.startsWith("assets/")) return true;
  const fullPath = path.resolve(ROOT, ...cleanUrl.split("/"));
  if (!fullPath.startsWith(ROOT + path.sep)) return true;
  return fs.existsSync(fullPath);
}

function sanitizeDjItineraryData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const profiles = {};
  for (const [slug, profile] of Object.entries(data)) {
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) continue;
    const name = cleanText(profile.name || profile.artist || "");
    if (!name) continue;
    const key = slugify(profile.slug || slug || name) || performerProfileSlug(name);
    profiles[key] = {
      ...profile,
      slug: profile.slug ? slugify(profile.slug) : key,
      name,
      sources: Array.isArray(profile.sources) ? profile.sources.filter(localEvidenceSourceStillExists) : [],
      itinerary: Array.isArray(profile.itinerary) ? profile.itinerary : [],
      genres: ensureArray(profile.genres),
      aliases: ensureArray(profile.aliases),
    };
  }
  return profiles;
}

function inferCountryForCity(city) {
  const normalized = normalizeEntityName(city);
  const chinaCities = new Set(["shanghai", "guangzhou", "beijing", "shenzhen", "chengdu", "hangzhou", "nanjing", "wuhan", "xian", "chongqing"]);
  if (chinaCities.has(normalized)) return "China";
  return "Check source";
}

function tourSourceUrl(item, event) {
  const direct = normalizeUrl(item.url || item.sourceUrl || "");
  if (direct) return direct;
  const source = String(item.source || "").trim();
  if (/^https?:\/\//i.test(source)) return normalizeUrl(source);
  return normalizeUrl(event.detailsUrl || event.source);
}

function tourSourceLabel(item, event, url) {
  if (item.sourceLabel) return cleanText(item.sourceLabel);
  const sourceText = cleanText(item.source || "");
  if (sourceText && !/^https?:\/\//i.test(sourceText)) return sourceText;
  return event.sourceLabel || sourceLabelFor(url);
}

function artistNamesForTourItem(item, event) {
  if (isFestivalListing(event) && event.includeInDjCoverage !== true) return [];
  const explicit = splitEntityNames(item.artist || item.name || item.dj || item.performer || item.artistName);
  if (explicit.length) return explicit.filter(name => !isNonPerformerName(name, item, event));
  const lineup = auditedLineupItems(event.lineup || [], event);
  if (lineup.length === 1) return splitEntityNames(lineupItemName(lineup[0]));
  return [];
}

function normalizeFutureTourRows(events, checkedAt) {
  const generated = {};

  for (const event of events) {
    if (!Array.isArray(event.futureTourPlan) || !event.futureTourPlan.length) continue;

    for (const item of event.futureTourPlan) {
      const date = String(item.date || item.sortDate || item.startDate || "").match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
      const city = cleanText(item.city || item.location || "");
      if (!date || !city) continue;

      const artistNames = artistNamesForTourItem(item, event);
      if (!artistNames.length) continue;

      const source = tourSourceUrl(item, event);
      if (!source) continue;

      const sourceLabel = tourSourceLabel(item, event, source);
      const country = cleanText(item.country || item.region || inferCountryForCity(city));
      const venue = cleanText(item.venue || item.venueName || (normalizeEntityName(city) === "shanghai" ? event.venue : "TBA"));

      for (const artistName of artistNames) {
        const slug = performerProfileSlug(artistName);
        if (!generated[slug]) {
          generated[slug] = {
            slug,
            name: artistName,
            trackedAt: checkedAt,
            checkedByTimezone: TIME_ZONE,
            scope: "Worldwide itinerary rows generated from scraped and curated event data",
            imageTheme: event.imageTheme || imageThemeFor(artistName),
            genres: ensureArray(event.genre),
            summary: `Source-backed itinerary overlay for ${artistName}, generated from scraped event future-tour data.`,
            sourceNote: "Rows in this overlay come from event-level futureTourPlan fields collected by the scraper or Computer Use handoff. Keep rows source-backed; do not infer tour stops from unsourced social chatter.",
            sources: [],
            itinerary: [],
          };
        }

        generated[slug].sources.push({
          label: sourceLabel,
          url: source,
          status: item.sourceStatus || event.sourceStatus || "secondary",
          checked: item.checked || event.lastChecked || checkedAt,
        });
        generated[slug].itinerary.push({
          date,
          title: cleanText(item.title || event.title || `${artistName} tour stop`),
          city,
          country,
          venue,
          sourceLabel,
          source,
          sourceStatus: item.sourceStatus || event.sourceStatus || "secondary",
          status: item.status || (event.status === "watch" ? "watch" : undefined),
          note: cleanText(item.note || `Future-tour row captured from ${event.title}.`),
        });
      }
    }
  }

  for (const profile of Object.values(generated)) {
    profile.genres = Array.from(new Set(profile.genres)).slice(0, 12);
    profile.sources = mergeSourceLists(profile.sources, []);
    const seenRows = new Set();
    profile.itinerary = profile.itinerary
      .filter(row => {
        const key = [row.date, normalizeEntityName(row.city), normalizeEntityName(row.country), normalizeEntityName(row.title)].join("|");
        if (seenRows.has(key)) return false;
        seenRows.add(key);
        return true;
      })
      .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.city).localeCompare(String(b.city)));
  }

  return generated;
}

function mergeItineraryProfiles(existingProfile = {}, generatedProfile = {}) {
  const merged = {
    ...existingProfile,
    ...generatedProfile,
    sources: mergeSourceLists(existingProfile.sources || [], generatedProfile.sources || []),
  };
  const rows = [];
  const seenRows = new Set();
  for (const row of [...(existingProfile.itinerary || []), ...(generatedProfile.itinerary || [])]) {
    if (!row || !row.date || !row.city || !row.source) continue;
    const key = [
      row.date,
      normalizeEntityName(row.city),
      normalizeEntityName(row.country),
      normalizeEntityName(row.title || merged.name),
      normalizeUrl(row.source),
    ].join("|");
    if (seenRows.has(key)) continue;
    seenRows.add(key);
    rows.push(row);
  }
  merged.itinerary = rows.sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.city || "").localeCompare(String(b.city || "")));
  merged.genres = Array.from(new Set([...(existingProfile.genres || []), ...(generatedProfile.genres || [])].filter(Boolean))).slice(0, 12);
  merged.aliases = Array.from(new Set([
    ...ensureArray(existingProfile.aliases),
    ...ensureArray(generatedProfile.aliases),
  ])).slice(0, 12);
  merged.trackedAt = generatedProfile.trackedAt || existingProfile.trackedAt || shanghaiDateString();
  return merged;
}

function writeDjItineraryData(events) {
  const checkedAt = shanghaiDateString();
  const existing = readExistingDjItineraryData();
  const curated = readTrackedDjProfiles();
  const generated = normalizeFutureTourRows(events, checkedAt);
  const merged = { ...existing };

  for (const [slug, profile] of Object.entries(curated)) {
    merged[slug] = mergeItineraryProfiles(existing[slug], profile);
  }

  for (const [slug, profile] of Object.entries(generated)) {
    merged[slug] = mergeItineraryProfiles(merged[slug], profile);
  }

  const profileSourceCounts = {};
  for (const [slug, profile] of Object.entries(merged)) {
    const sourceCount = Array.isArray(profile.sources) ? profile.sources.length : 0;
    const profileKeys = new Set([
      slug,
      performerProfileSlug(profile.name),
      ...ensureArray(profile.aliases).map(alias => performerProfileSlug(alias)),
    ].filter(Boolean));
    for (const key of profileKeys) {
      profileSourceCounts[key] = Math.max(profileSourceCounts[key] || 0, sourceCount);
    }
  }

  fs.writeFileSync(DJ_ITINERARY_FILE, `window.DJ_ITINERARY_DATA = ${JSON.stringify(merged, null, 2)};\n`);
  return {
    profileCount: Object.keys(merged).length,
    curatedProfileCount: Object.keys(curated).length,
    generatedProfileCount: Object.keys(generated).length,
    profileSourceCounts,
    rowCount: Object.values(merged).reduce((total, profile) => total + (Array.isArray(profile.itinerary) ? profile.itinerary.length : 0), 0),
  };
}

async function main() {
  const canonicalEvents = readCanonicalEvents();
  const preservedUndatedArchiveRows = canonicalEvents.filter(event => !hasEventDate(event)).map(preserveArchiveEvent);
  const seedEvents = extractSeedEvents();
  const keywordConfig = readKeywordConfig();
  const curatedEvents = readCuratedEvents();
  const trackedDjProfiles = readTrackedDjProfiles();
  const technoArtistSignals = buildTechnoArtistSignals(trackedDjProfiles);
  const raShanghaiCoverageConfig = readRaShanghaiCoverage();
  const promotionPlatformNetwork = readPromotionPlatformNetwork();
  const sourceChecks = new Map();
  const sourceReports = [];
  const detailLinks = new Map();
  const discovered = [];
  const socialLeads = [];

  for (const source of SOURCE_PAGES) {
    // Use random delay (1.5-4s) to avoid rate limiting on listing pages
    const delay = getRandomDelay(1500, 4000);
    await sleep(delay);
    const report = { ...source, checkedAt: shanghaiDateString(), ok: false, status: null, eventLinks: 0 };
    try {
      const result = await fetchText(source.url, FETCH_TIMEOUT_MS, { isRaSource: false });
      applyFetchResultToReport(report, result);
      sourceChecks.set(normalizeUrl(source.url), { lastChecked: report.checkedAt, ok: result.ok, status: result.status });
      if (result.access === "robots-disallowed" || result.status === "robots-disallowed") {
        sourceReports.push(report);
        continue;
      }
      if (result.browserRequired || requiresBrowserVerification(result.text)) {
        report.access = "browser-required";
        report.error = report.error || "Public HTTP fetch hit an anti-bot or JavaScript challenge; use Browser/Chrome visible verification instead of treating this as an empty source.";
        sourceChecks.set(normalizeUrl(source.url), { lastChecked: report.checkedAt, ok: false, status: "browser-required" });
        sourceReports.push(report);
        continue;
      }
      if (result.ok) {
        const links = extractEventLinks(result.text, source.url);
        report.eventLinks = links.length;
        for (const link of links) detailLinks.set(link.url, link);
      }
    } catch (error) {
      report.error = error.message;
    }
    sourceReports.push(report);
  }

  if (keywordConfig.x.enabled) {
    const keywords = keywordConfig.x.keywords.slice(0, MAX_X_KEYWORDS);
    for (const keyword of keywords) {
      await sleep(REQUEST_DELAY_MS);
      const publicSearchUrl = xSearchUrl(keyword);
      const apiSearchUrl = xApiSearchUrl(keyword);
      const report = {
        label: `X/Twitter keyword: ${keyword}`,
        url: X_BEARER_TOKEN ? apiSearchUrl : publicSearchUrl,
        publicSearchUrl,
        kind: "social-keyword",
        sourceStatus: "social-lead",
        access: X_BEARER_TOKEN ? "api-v2-recent-search" : "requires-token",
        checkedAt: shanghaiDateString(),
        ok: false,
        status: null,
        links: 0,
      };

      try {
        if (X_BEARER_TOKEN) {
          const result = await fetchJson(apiSearchUrl, { authorization: `Bearer ${X_BEARER_TOKEN}` }, X_FETCH_TIMEOUT_MS);
          applyFetchResultToReport(report, result);
          sourceChecks.set(normalizeUrl(apiSearchUrl), { lastChecked: report.checkedAt, ok: result.ok, status: result.status });
          if (result.ok && result.json) {
            const links = parseXApiLeads(result.json, keyword);
            report.links = links.length;
            socialLeads.push(...links.map(link => ({ ...link, checkedAt: report.checkedAt, searchUrl: publicSearchUrl, apiUrl: apiSearchUrl })));
          } else if (result.json?.detail || result.json?.title) {
            report.error = result.json.detail || result.json.title;
          }
        } else if (X_PUBLIC_SEARCH_ENABLED) {
          report.access = "public-search-html";
          const result = await fetchText(publicSearchUrl, X_FETCH_TIMEOUT_MS);
          applyFetchResultToReport(report, result);
          sourceChecks.set(normalizeUrl(publicSearchUrl), { lastChecked: report.checkedAt, ok: result.ok, status: result.status });
          if (result.browserRequired || result.access === "robots-disallowed" || result.status === "robots-disallowed") {
            report.links = 0;
          } else if (result.ok) {
            const links = extractXPostLinks(result.text, keyword);
            report.links = links.length;
            socialLeads.push(...links.map(link => ({ ...link, checkedAt: report.checkedAt, searchUrl: publicSearchUrl })));
          }
        } else {
          report.error = "Set X_BEARER_TOKEN or TWITTER_BEARER_TOKEN to collect recent X/Twitter posts. Set SCRAPE_X_PUBLIC_SEARCH=true for best-effort unauthenticated HTML search.";
        }
      } catch (error) {
        report.error = error.message;
      }

      sourceReports.push(report);
    }
  }

  for (const event of seedEvents) {
    if (!eventIsPastByCutoff(event.sortDate) && event.source) {
      detailLinks.set(normalizeUrl(event.source), {
        url: normalizeUrl(event.source),
        title: event.title,
        sourceLabel: event.sourceLabel,
      });
    }
  }

  const scrapedEvents = [];
  const detailQueue = Array.from(detailLinks.values()).slice(0, MAX_DETAIL_PAGES);
  for (const link of detailQueue) {
    // Use random delay (1.5-4s) for detail pages to avoid rate limiting
    const delay = getRandomDelay(1500, 4000);
    await sleep(delay);
    try {
      const result = await fetchText(link.url, FETCH_TIMEOUT_MS, { isRaSource: false });
      const checkedAt = result.checkedAt || shanghaiDateString();
      sourceChecks.set(normalizeUrl(link.url), { lastChecked: checkedAt, ok: result.ok, status: result.status });
      if (result.access === "robots-disallowed" || result.status === "robots-disallowed") {
        discovered.push({ ...link, status: "robots-disallowed", parsed: false, access: "robots-disallowed", checkedAt, error: result.error });
        continue;
      }
      if (result.browserRequired || requiresBrowserVerification(result.text)) {
        discovered.push({ ...link, status: "browser-required", parsed: false, access: "browser-required", checkedAt, antiBotReason: result.antiBotReason || "anti-bot-challenge" });
        continue;
      }
      if (!result.ok) {
        discovered.push({ ...link, status: result.status, parsed: false, checkedAt, error: result.error });
        continue;
      }
      const parsed = parseEventPage(link.url, result.text, link.title);
      if (parsed) {
        scrapedEvents.push(parsed);
        discovered.push({ url: link.url, title: parsed.title, parsed: true, checkedAt, fromCache: result.fromCache || undefined });
      } else {
        discovered.push({ ...link, parsed: false, checkedAt, fromCache: result.fromCache || undefined });
      }
    } catch (error) {
      discovered.push({ ...link, parsed: false, error: error.message });
    }
  }

  // SmartShanghai API - structured event data source
  try {
    await sleep(getRandomDelay(2000, 5000));
    const ssApi = await fetchSmartShanghaiApiEvents();
    sourceReports.push(ssApi.report);
    if (ssApi.events.length > 0) {
      const existingUrls = new Set([...seedEvents.map(e => normalizeUrl(e.source)), ...scrapedEvents.map(e => normalizeUrl(e.source))]);
      let added = 0;
      for (const e of ssApi.events) {
        const url = normalizeUrl(e.source);
        if (url && !existingUrls.has(url)) {
          scrapedEvents.push(e);
          existingUrls.add(url);
          added++;
        }
      }
      discovered.push({
        label: "SmartShanghai API events",
        source: "api2",
        added,
        parsed: true,
        checkedAt: shanghaiDateString(),
      });
    }
  } catch (error) {
    sourceReports.push({
      label: "SmartShanghai API: error",
      url: `${SMART_SHANGHAI_API_BASE}events/`,
      kind: "api-listing",
      sourceStatus: "failed",
      checkedAt: shanghaiDateString(),
      ok: false,
      error: error.message,
    });
  }

  const seedSources = new Set(seedEvents.map(event => normalizeUrl(event.source)).filter(Boolean));
  const normalizedSeeds = seedEvents.map(event => normalizeEvent(event, sourceChecks));
  const normalizedScraped = scrapedEvents
    .map(event => annotateTechnoArtistSignals(event, technoArtistSignals))
    .filter(event => !seedSources.has(normalizeUrl(event.source)))
    .filter(event => !isDuplicateOfSeed(event, seedEvents))
    .filter(event => event.status !== "past")
    .filter(event => isCalendarFit(event, technoArtistSignals))
    .map(event => normalizeEvent(event, sourceChecks));
  const events = applyCuratedEvents(mergeEvents(normalizedSeeds, normalizedScraped), curatedEvents, sourceChecks);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const djItineraryStats = writeDjItineraryData(events);
  const generatedAt = new Date().toISOString();
  const verified = shanghaiDateString();
  const promotionPlatformQueue = buildPromotionPlatformQueue(promotionPlatformNetwork, verified);
  const computerUseQueue = buildComputerUseQueue(verified, promotionPlatformQueue);
  const sourceReportsAll = [...sourceReports, ...computerUseSourceReports(computerUseQueue)];
  const payload = {
    generatedAt,
    verified,
    timezone: TIME_ZONE,
    sourcePriority: [
      "Respect robots.txt, per-host pacing, Retry-After, cache reuse, and anti-bot challenge boundaries; blocked sources are queued for browser/manual verification instead of bypassed.",
      "Chrome + Computer Use for anti-bot, logged-in, app-only, image/poster, and mini-program sources",
      "SmartShanghai event pages and monthly clubbing guide as the highest-priority public nightlife source for Shanghai electronic event facts",
      "Direct venue, promoter, ticketing, or official artist pages for corroboration, conflict resolution, and live ticket state",
      "config/promotion-platform-network.json as the venue/promoter-first platform graph before generic discovery",
      "Public social posts and app-only references as discovery leads only",
    ],
    sources: sourceReportsAll,
    events,
    undatedArchiveRows: preservedUndatedArchiveRows,
    socialLeads: socialLeads.slice(0, 80),
    discovered: discovered.slice(0, 80),
    promotionPlatformNetwork: {
      source: "config/promotion-platform-network.json",
      updatedAt: promotionPlatformNetwork.updatedAt || "",
      entityCount: Array.isArray(promotionPlatformNetwork.entities) ? promotionPlatformNetwork.entities.length : 0,
      routeCount: promotionPlatformRouteCount(promotionPlatformNetwork),
      globalRouteCount: Array.isArray(promotionPlatformNetwork.globalRoutes) ? promotionPlatformNetwork.globalRoutes.length : 0,
      scrapeOrder: promotionPlatformNetwork.scrapeOrder || [],
      antiScrapePolicy: promotionPlatformNetwork.antiScrapePolicy || {},
    },
    promotionPlatformQueue,
    computerUseQueue,
    curatedEventsApplied: curatedEvents.length,
    djItineraryStats,
    quality: buildQualitySnapshot(events, sourceReportsAll, verified, curatedEvents.length, generatedAt, djItineraryStats, raShanghaiCoverageConfig, technoArtistSignals, promotionPlatformNetwork, promotionPlatformQueue),
    notes: [
      "This v1 scraper keeps curated embedded events as the seed dataset, refreshes source metadata, and adds parsable public event pages as watch/secondary entries.",
      "Computer Use collected event updates in config/curated-events.json are merged after the automated source refresh.",
      "Events from listing/editorial pages remain watch-level until a direct venue, promoter, ticketing, or event page confirms details.",
      "Venue/promoter promotion networks from config/promotion-platform-network.json are queued before generic social discovery so XHS, WeChat, ticketing, and official account routes are checked first.",
      "New-event discovery uses complementary gates: event/source keyword fit plus tracked techno-related DJ profile and alias signals, so generic event pages can still enter the Watch queue when the lineup points to techno, hard techno, acid, industrial, EBM, electro, trance, rave, warehouse, hard dance, bass/club crossover, breaks, jungle, UKG, or experimental electronic context.",
      "X keyword searches are discovery-only social leads and never promote an event into the calendar without confirmation from a stronger source.",
      "Known anti-bot or app-only sources are queued for agent-operated Chrome + Computer Use collection instead of being scraped with plain fetch.",
      "HTTP fetching uses a descriptive scraper user agent, robots checks, per-host pacing, retry-after/backoff, and a short local cache to avoid repeated requests during development.",
      "Do not use proxy rotation, CAPTCHA solving, or challenge-bypass services; record antiBotReason/access fields and collect those facts through a visible, user-operated browser when allowed.",
      "Resident Advisor HTTP or headless-browser challenges are recorded as browser-required; do not treat challenge pages as empty listings.",
      "Computer Use collection must follow second-layer links and image/poster text to capture time, venue, lineup, poster evidence, artist introductions, future tour dates, and ticketing status.",
      "DJ itinerary overlays are regenerated from source-backed futureTourPlan fields while preserving curated worldwide overlays in data/tracked-dj-itineraries.js.",
    ],
  };

  fs.writeFileSync(DATA_FILE, `${JSON.stringify(payload, null, 2)}\n`);
  writeDjSourceData(events);
  console.log(`Wrote ${path.relative(ROOT, DATA_FILE)}, ${path.relative(ROOT, DJ_DATA_FILE)}, and ${path.relative(ROOT, DJ_ITINERARY_FILE)} with ${events.length} events, ${payload.discovered.length} discovered links, ${payload.socialLeads.length} social leads, ${payload.promotionPlatformQueue.length} promotion-platform routes, ${payload.computerUseQueue.length} Computer Use sources, ${payload.curatedEventsApplied} curated updates, and ${djItineraryStats.rowCount} tracked DJ itinerary rows.`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
