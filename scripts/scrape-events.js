const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const INDEX_HTML = path.join(ROOT, "index.html");
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "events.json");
const KEYWORD_CONFIG_FILE = path.join(ROOT, "config", "scrape-keywords.json");
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
    sourceStatus: "secondary",
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
    url: "https://www.xiaohongshu.com/search_result?keyword=%E4%B8%8A%E6%B5%B7%20techno",
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
    requiredFields: [
      "title",
      "absolute date",
      "start time",
      "venue",
      "city/district",
      "lineup",
      "ticket/source URL or shareable app reference",
      "source publication date",
    ],
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

function normalizeEvent(event, sourceChecks) {
  const normalized = { ...event };
  normalized.id = String(normalized.id || slugify(`${normalized.sortDate}-${normalized.title}`));
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
  for (const field of REQUIRED_EVENT_FIELDS) {
    if (normalized[field] === undefined || normalized[field] === null || normalized[field] === "") {
      throw new Error(`Event ${normalized.id} missing required field: ${field}`);
    }
  }
  return normalized;
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
  const positive = /\b(techno|rave|electronic|electro|acid|industrial|ebm|trance|ambient|idm|bass|warehouse|a\/v|experimental)\b/.test(text);
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

async function main() {
  const seedEvents = extractEmbeddedEvents();
  const keywordConfig = readKeywordConfig();
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
  const events = mergeEvents(normalizedSeeds, normalizedScraped);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    verified: shanghaiDateString(),
    timezone: TIME_ZONE,
    sourcePriority: [
      "Chrome + Computer Use for anti-bot, logged-in, app-only, image/poster, and mini-program sources",
      "Direct venue, promoter, ticketing, or official artist pages",
      "Resident Advisor event pages and city listings",
      "SmartShanghai event pages and monthly clubbing guide",
      "Public social posts and app-only references as discovery leads only",
    ],
    sources: [...sourceReports, ...computerUseSourceReports(computerUseQueue)],
    events,
    socialLeads: socialLeads.slice(0, 80),
    discovered: discovered.slice(0, 80),
    computerUseQueue,
    notes: [
      "This v1 scraper keeps curated embedded events as the seed dataset, refreshes source metadata, and adds parsable public event pages as watch/secondary entries.",
      "Events from listing/editorial pages remain watch-level until a direct venue, promoter, ticketing, or event page confirms details.",
      "X keyword searches are discovery-only social leads and never promote an event into the calendar without confirmation from a stronger source.",
      "Known anti-bot or app-only sources are queued for agent-operated Chrome + Computer Use collection instead of being scraped with plain fetch.",
    ],
  };

  fs.writeFileSync(DATA_FILE, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${path.relative(ROOT, DATA_FILE)} with ${events.length} events, ${payload.discovered.length} discovered links, ${payload.socialLeads.length} social leads, and ${payload.computerUseQueue.length} Computer Use sources.`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
