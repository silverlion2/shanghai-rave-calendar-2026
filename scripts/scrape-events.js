const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { enrichEvent } = require("./techno-taxonomy");

const ROOT = path.resolve(__dirname, "..");
const INDEX_HTML = path.join(ROOT, "index.html");
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "events.json");
const DJ_DATA_FILE = path.join(DATA_DIR, "dj-data.js");
const DJ_ITINERARY_FILE = path.join(DATA_DIR, "tracked-dj-itineraries.js");
const KEYWORD_CONFIG_FILE = path.join(ROOT, "config", "scrape-keywords.json");
const CURATED_EVENTS_FILE = path.join(ROOT, "config", "curated-events.json");
const TRACKED_DJ_PROFILES_FILE = path.join(ROOT, "config", "tracked-dj-profiles.json");
const RA_SHANGHAI_COVERAGE_FILE = path.join(ROOT, "config", "ra-shanghai-coverage.json");
const TIME_ZONE = "Asia/Shanghai";
const CURRENT_YEAR = 2026;
const USER_AGENT = "ShanghaiRaveCalendar/1.0 (+https://github.com/) public-event-refresh";
const REQUEST_DELAY_MS = Number(process.env.SCRAPE_DELAY_MS || 300);
const FETCH_TIMEOUT_MS = Number(process.env.SCRAPE_FETCH_TIMEOUT_MS || 8000);
const X_FETCH_TIMEOUT_MS = Number(process.env.SCRAPE_X_FETCH_TIMEOUT_MS || 5000);
const MAX_DETAIL_PAGES = Number(process.env.SCRAPE_MAX_DETAIL_PAGES || 18);
const MAX_X_KEYWORDS = Number(process.env.SCRAPE_MAX_X_KEYWORDS || 16);
const MAX_X_LINKS_PER_KEYWORD = Number(process.env.SCRAPE_MAX_X_LINKS_PER_KEYWORD || 8);
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN || "";
const X_PUBLIC_SEARCH_ENABLED = process.env.SCRAPE_X_PUBLIC_SEARCH === "true";

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

const SOURCE_PAGES = [
  {
    label: "Resident Advisor Shanghai",
    url: "https://ra.co/events/cn/shanghai",
    kind: "listing",
    sourceStatus: "trusted-ra",
  },
  {
    label: "SmartShanghai June 2026 clubbing guide",
    url: "https://www.smartshanghai.com/articles/nightlife/the-shanghai-clubbing-guide-june-2026",
    kind: "guide",
    sourceStatus: "secondary",
  },
  {
    label: "SmartShanghai clubbing listings",
    url: "https://www.smartshanghai.com/events/clubbing/",
    kind: "listing",
    sourceStatus: "secondary",
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
    cadence: "Daily; repeat Thu/Fri before the weekend",
    trigger: "Use Chrome + Computer Use when fetch returns 403, empty listings, or stale results.",
    collectionGoal: "Confirm event pages, dates, lineup, venue, price, and ticket links.",
    queries: ["Shanghai", "techno", "rave", "warehouse", "Shanghai events"],
    evidence: ["public event URL", "event title", "absolute date/time", "venue", "ticket/source link"],
  },
  {
    label: "SmartShanghai nightlife",
    platform: "SmartShanghai",
    url: "https://www.smartshanghai.com/events/clubbing/",
    priority: 1,
    cadence: "Daily; repeat after monthly clubbing guide updates",
    trigger: "Use Chrome + Computer Use when public fetch times out, returns incomplete markup, or misses event cards.",
    collectionGoal: "Collect clubbing listings, monthly guide leads, venue pages, ticket links, and English descriptions.",
    queries: ["clubbing", "nightlife", "techno", "electronic", "rave"],
    evidence: ["listing URL", "event URL", "guide URL", "date/time", "venue", "ticket/source link"],
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

function shanghaiDateString(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).filter(part => part.type !== "literal").map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
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
    const isRaEvent = host === "ra.co" && /^\/events\/\d+/.test(pathName);
    const isSmartShanghaiEvent = host === "www.smartshanghai.com" && /^\/event\//.test(pathName);
    if (!isRaEvent && !isSmartShanghaiEvent) continue;
    seen.add(url);
    links.push({
      url,
      title: cleanText(match[2]),
      sourceLabel: host === "ra.co" ? "Resident Advisor" : "SmartShanghai",
    });
  }
  return links;
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

async function fetchText(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "user-agent": USER_AGENT,
      },
      signal: controller.signal,
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      text,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url, headers = {}, timeoutMs = FETCH_TIMEOUT_MS) {
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
    return {
      ok: response.ok,
      status: response.status,
      json,
      text,
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

function eventStatus(sortDate, confidence) {
  const today = shanghaiDateString();
  if (sortDate < today) return "past";
  return confidence === "Watch" ? "watch" : "upcoming";
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

function buildComputerUseQueue(checkedAt) {
  return COMPUTER_USE_SOURCES.map(source => ({
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
  const confidence = sourceLabel === "Resident Advisor" ? "Medium" : "Watch";
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
    source: normalizeUrl(url),
    sourceLabel,
    imageTheme: imageThemeFor(title),
    ...(posterUrl ? { posterUrl } : {}),
    description: description || `Public event listing from ${sourceLabel}.`,
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
  return /datadome|captcha-delivery|attention required|cloudflare|please enable js|enable javascript|disable any ad blocker|you have been blocked/i.test(String(text || ""));
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

function recommendationSourceName(event = {}) {
  return event.sourceLabel || sourceLabelFor(event.source) || "the attached source";
}

function defaultRecommendationReason(event = {}) {
  const sourceName = recommendationSourceName(event);
  if (event.sourceStatus === "watchlist" || event.status === "watch" || event.confidence === "Watch") {
    return `Kept on Watch because ${sourceName} gives a useful lead, but key practical details still need a stronger second source before promotion.`;
  }
  if (event.sourceStatus === "trusted-ra" || /(^|\.)ra\.co\//i.test(event.source || "")) {
    return `Included from Resident Advisor because it gives the public date, venue, lineup or ticket context, then checked against this site's Shanghai underground fit rubric.`;
  }
  if (event.confidence === "High") {
    return `Recommended because the source trail supports the date, venue, and scene fit strongly enough for a calendar pick.`;
  }
  return `Included because ${sourceName} supports the event basics and the sound or venue context is relevant to Shanghai electronic nightlife.`;
}

function defaultBestFor(event = {}) {
  const text = [event.genre, event.description, event.decisionTags, event.vibe].flat().join(" ").toLowerCase();
  if (/\b(hard|industrial|warehouse|hard-techno|acid|rave)\b/.test(text)) {
    return "Best for readers looking for a harder late-room or warehouse-leaning club night.";
  }
  if (/\b(bass|dubstep|jungle|garage|ukg|break)\b/.test(text)) {
    return "Best for readers tracking bass, breaks, and high-energy club-adjacent rooms.";
  }
  if (/\b(date|rooftop|hotel|disco|house|daylight|sunset)\b/.test(text)) {
    return "Best for a more social, house-forward, or date-friendly electronic music route.";
  }
  if (event.sourceStatus === "watchlist" || event.status === "watch") {
    return "Best as a monitoring lead until lineup, ticketing, and venue details are firmer.";
  }
  return "Best for readers comparing source-backed electronic music options across the city.";
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
  if (!hasRecommendationText(event.recommendationReason)) {
    event.recommendationReason = defaultRecommendationReason(event);
  }
  if (!hasRecommendationText(event.bestFor)) {
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

function normalizeEvent(event, sourceChecks) {
  const normalized = { ...event };
  normalized.id = String(normalized.id || slugify(`${normalized.sortDate}-${normalized.title}`));
  normalized.kind = cleanText(normalized.kind || (normalized.festival ? "festival" : "event"));
  normalized.vibe = ensureArray(normalized.vibe);
  normalized.month = normalized.month || monthCodeFromDate(normalized.sortDate);
  normalized.source = normalizeUrl(normalized.source);
  normalized.sourceLabel = normalized.sourceLabel || sourceLabelFor(normalized.source);
  normalized.description = cleanText(normalized.description || `Public event listing from ${normalized.sourceLabel}.`);
  normalized.imageTheme = normalized.imageTheme || imageThemeFor(normalized.title);
  normalized.sourceStatus = normalized.sourceStatus || (normalized.status === "watch" || normalized.confidence === "Watch" ? "watchlist" : "secondary");
  normalized.lastChecked = normalized.lastChecked || sourceChecks.get(normalized.source)?.lastChecked || "2026-06-08";
  normalized.sources = Array.isArray(normalized.sources) && normalized.sources.length ? normalized.sources : [{
    label: normalized.sourceLabel,
    url: normalized.source,
    status: normalized.sourceStatus,
    lastChecked: normalized.lastChecked,
  }];
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

function mergeEvents(seedEvents, scrapedEvents) {
  const byKey = new Map();
  const merged = [];
  const add = event => {
    const sourceKey = normalizeUrl(event.source);
    const semanticKey = `${event.sortDate}|${String(event.title).toLowerCase()}|${String(event.venue).toLowerCase()}`;
    const key = sourceKey ? `${sourceKey}|${semanticKey}` : semanticKey;
    if (byKey.has(key)) return;
    byKey.set(key, event.id);
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

function isCalendarFit(event) {
  const text = [event.title, event.venue, event.genre, event.description].join(" ").toLowerCase();
  const positive = /\b(techno|rave|electronic|electro|acid|industrial|ebm|trance|ambient|idm|bass|warehouse|a\/v|experimental|club music|hard dance|breaks?|jungle|ukg|garage|dubstep|ghettotech|baile funk|minimal|nu-disco)\b/.test(text)
    || (/\bhouse\b/.test(text) && /\b(dj|club|rave|dance|dancefloor|electronic|music|selector|lineup|venue|promoter)\b/.test(text));
  const negative = /\b(girls night|pool party|disco ball|disco night|afrowave|sunset sessions)\b/.test(text);
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

function buildQualitySnapshot(events, sources, auditDate, curatedEventsApplied, generatedAt, djItineraryStats = {}, raShanghaiCoverageConfig = null) {
  const future = events.filter(event => String(event.sortDate || "") >= auditDate);
  const futureHigh = future.filter(event => event.confidence === "High");
  const futureWatch = future.filter(event => event.status === "watch" || event.confidence === "Watch");
  const failedSourceReports = sources.filter(source => source.ok === false);
  const staleFuture = future.filter(event => String(event.lastChecked || "") < auditDate);
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

  return {
    auditDate,
    generatedAt,
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
      trackedDjItineraryRows: djCoverage.trackedItineraryRows,
      staleFuture: staleFuture.length,
      missingTicketStatus: missingTicketStatus.length,
      highMissingLineup: highMissingLineup.length,
      platformVerificationQueue: platformVerificationQueue.length,
      platformVerificationSources: platformVerificationQueue.reduce((total, item) => total + item.platformSourceCount, 0),
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
    platformVerificationQueue,
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
      eventLinks: source.eventLinks,
      links: source.links,
      error: source.error,
    })),
    updateWorkflow: [
      "Run npm run scrape with reasonable timeouts to refresh public pages and curated overlays.",
      "Run npm run audit to inspect future freshness, ticket notes, High-confidence lineups, the Watch queue, active venue coverage, and future DJ profile coverage.",
      "Keep config/ra-shanghai-coverage.json aligned with Browser/Chrome-verified RA Shanghai city-listing rows when RA fetch is browser-required.",
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
      sources: Array.isArray(profile.sources) ? profile.sources : [],
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
  const seedEvents = extractEmbeddedEvents();
  const keywordConfig = readKeywordConfig();
  const curatedEvents = readCuratedEvents();
  const raShanghaiCoverageConfig = readRaShanghaiCoverage();
  const sourceChecks = new Map();
  const sourceReports = [];
  const detailLinks = new Map();
  const discovered = [];
  const socialLeads = [];
  const computerUseQueue = buildComputerUseQueue(shanghaiDateString());

  for (const source of SOURCE_PAGES) {
    await sleep(REQUEST_DELAY_MS);
    const report = { ...source, checkedAt: shanghaiDateString(), ok: false, status: null, eventLinks: 0 };
    try {
      const result = await fetchText(source.url);
      report.ok = result.ok;
      report.status = result.status;
      sourceChecks.set(normalizeUrl(source.url), { lastChecked: report.checkedAt, ok: result.ok, status: result.status });
      if (requiresBrowserVerification(result.text)) {
        report.access = "browser-required";
        report.error = "Public HTTP fetch hit an anti-bot or JavaScript challenge; use Browser/Chrome visible verification instead of treating this as an empty source.";
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
          report.ok = result.ok;
          report.status = result.status;
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
          report.ok = result.ok;
          report.status = result.status;
          sourceChecks.set(normalizeUrl(publicSearchUrl), { lastChecked: report.checkedAt, ok: result.ok, status: result.status });
          if (result.ok) {
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
    if (event.status !== "past" && event.source) {
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
    await sleep(REQUEST_DELAY_MS);
    try {
      const result = await fetchText(link.url);
      sourceChecks.set(normalizeUrl(link.url), { lastChecked: shanghaiDateString(), ok: result.ok, status: result.status });
      if (requiresBrowserVerification(result.text)) {
        discovered.push({ ...link, status: "browser-required", parsed: false, access: "browser-required" });
        continue;
      }
      if (!result.ok) {
        discovered.push({ ...link, status: result.status, parsed: false });
        continue;
      }
      const parsed = parseEventPage(link.url, result.text, link.title);
      if (parsed) {
        scrapedEvents.push(parsed);
        discovered.push({ url: link.url, title: parsed.title, parsed: true });
      } else {
        discovered.push({ ...link, parsed: false });
      }
    } catch (error) {
      discovered.push({ ...link, parsed: false, error: error.message });
    }
  }

  const seedSources = new Set(seedEvents.map(event => normalizeUrl(event.source)).filter(Boolean));
  const normalizedSeeds = seedEvents.map(event => normalizeEvent(event, sourceChecks));
  const normalizedScraped = scrapedEvents
    .filter(event => !seedSources.has(normalizeUrl(event.source)))
    .filter(event => !isDuplicateOfSeed(event, seedEvents))
    .filter(event => event.status !== "past")
    .filter(isCalendarFit)
    .map(event => normalizeEvent(event, sourceChecks));
  const events = applyCuratedEvents(mergeEvents(normalizedSeeds, normalizedScraped), curatedEvents, sourceChecks);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const djItineraryStats = writeDjItineraryData(events);
  const generatedAt = new Date().toISOString();
  const verified = shanghaiDateString();
  const sourceReportsAll = [...sourceReports, ...computerUseSourceReports(computerUseQueue)];
  const payload = {
    generatedAt,
    verified,
    timezone: TIME_ZONE,
    sourcePriority: [
      "Chrome + Computer Use for anti-bot, logged-in, app-only, image/poster, and mini-program sources",
      "Resident Advisor event pages and city listings as the highest-priority public nightlife source for Shanghai electronic event facts",
      "config/ra-shanghai-coverage.json as the durable RA city-listing manifest when RA fetch is browser-required",
      "Direct venue, promoter, ticketing, or official artist pages for corroboration, conflict resolution, and live ticket state",
      "SmartShanghai event pages and monthly clubbing guide",
      "Public social posts and app-only references as discovery leads only",
    ],
    sources: sourceReportsAll,
    events,
    socialLeads: socialLeads.slice(0, 80),
    discovered: discovered.slice(0, 80),
    computerUseQueue,
    curatedEventsApplied: curatedEvents.length,
    djItineraryStats,
    quality: buildQualitySnapshot(events, sourceReportsAll, verified, curatedEvents.length, generatedAt, djItineraryStats, raShanghaiCoverageConfig),
    notes: [
      "This v1 scraper keeps curated embedded events as the seed dataset, refreshes source metadata, and adds parsable public event pages as watch/secondary entries.",
      "Computer Use collected event updates in config/curated-events.json are merged after the automated source refresh.",
      "Events from listing/editorial pages remain watch-level until a direct venue, promoter, ticketing, or event page confirms details.",
      "X keyword searches are discovery-only social leads and never promote an event into the calendar without confirmation from a stronger source.",
      "Known anti-bot or app-only sources are queued for agent-operated Chrome + Computer Use collection instead of being scraped with plain fetch.",
      "Resident Advisor HTTP or headless-browser challenges are recorded as browser-required; do not treat challenge pages as empty listings.",
      "RA Shanghai coverage completeness is audited against config/ra-shanghai-coverage.json and written to quality.raShanghaiCoverage.",
      "Computer Use collection must follow second-layer links and image/poster text to capture time, venue, lineup, poster evidence, artist introductions, future tour dates, and ticketing status.",
      "DJ itinerary overlays are regenerated from source-backed futureTourPlan fields while preserving curated worldwide overlays in data/tracked-dj-itineraries.js.",
    ],
  };

  fs.writeFileSync(DATA_FILE, `${JSON.stringify(payload, null, 2)}\n`);
  writeDjSourceData(events);
  console.log(`Wrote ${path.relative(ROOT, DATA_FILE)}, ${path.relative(ROOT, DJ_DATA_FILE)}, and ${path.relative(ROOT, DJ_ITINERARY_FILE)} with ${events.length} events, ${payload.discovered.length} discovered links, ${payload.socialLeads.length} social leads, ${payload.computerUseQueue.length} Computer Use sources, ${payload.curatedEventsApplied} curated updates, and ${djItineraryStats.rowCount} tracked DJ itinerary rows.`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
