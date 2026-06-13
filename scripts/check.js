const fs = require("fs");
const path = require("path");
const {
  readWebsiteStructure,
  assertWebsiteStructure,
  topLevelHtmlFiles,
  syntaxOnlyHtmlFiles: trackedSyntaxOnlyHtmlFiles,
  sharedDispatchHtmlFiles: trackedSharedDispatchHtmlFiles,
  secondaryDispatchHtmlFiles: trackedSecondaryDispatchHtmlFiles,
  homepageCalendarHtmlFiles: trackedHomepageCalendarHtmlFiles,
  externalJsFiles: trackedExternalJsFiles,
  sitemapPages,
  canonicalUrl,
} = require("./site-structure");

const scriptPattern = new RegExp("<script>([\\s\\S]*?)</script>", "g");
const jsonLdPattern = new RegExp('<script type="application/ld\\+json">([\\s\\S]*?)</script>', "g");
const websiteStructure = readWebsiteStructure();
const htmlFiles = topLevelHtmlFiles(websiteStructure);
const syntaxOnlyHtmlFiles = trackedSyntaxOnlyHtmlFiles(websiteStructure);
const googleTrackedHtmlFiles = [...htmlFiles, ...syntaxOnlyHtmlFiles];
const expectedGoogleTagId = websiteStructure.site.googleTagId;
const sharedDispatchHtmlFiles = trackedSharedDispatchHtmlFiles(websiteStructure);
const secondaryDispatchHtmlFiles = trackedSecondaryDispatchHtmlFiles(websiteStructure);
const homepageCalendarHtmlFiles = trackedHomepageCalendarHtmlFiles(websiteStructure);
const externalJsFiles = trackedExternalJsFiles(websiteStructure);
const siteUrl = websiteStructure.site.baseUrl;
const ROOT = process.cwd();
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

function assertLocalImageAsset(asset, contextLabel) {
  const imagePath = String(asset || "").trim();
  if (!/^assets\/posters\/[^/]+\.(?:jpe?g|png|webp)$/i.test(imagePath)) {
    throw new Error(`${contextLabel} must point to a local assets/posters image: ${imagePath}`);
  }
  if (!fs.existsSync(imagePath)) {
    throw new Error(`${contextLabel} file does not exist: ${imagePath}`);
  }
  const bytes = fs.readFileSync(imagePath);
  if (bytes.length < 1024) {
    throw new Error(`${contextLabel} file is too small to be a real poster: ${imagePath}`);
  }
  const signature = bytes.subarray(0, 8).toString("hex");
  const isJpeg = signature.startsWith("ffd8");
  const isPng = signature === "89504e470d0a1a0a";
  const isWebp = bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (!isJpeg && !isPng && !isWebp) {
    throw new Error(`${contextLabel} is not a valid local JPEG, PNG, or WebP image: ${imagePath}`);
  }
  return bytes.length;
}

function assertPosterArchiveData() {
  const archiveFile = "data/poster-archive.json";
  if (!fs.existsSync(archiveFile)) {
    throw new Error("data/poster-archive.json must be generated by npm run poster-archive");
  }

  const archive = JSON.parse(fs.readFileSync(archiveFile, "utf8"));
  const posters = archive.posters;
  if (!Array.isArray(posters) || posters.length === 0) {
    throw new Error("data/poster-archive.json must contain a non-empty posters array");
  }
  if (!archive.storagePolicy || archive.storagePolicy.mode !== "static-json-plus-local-optimized-assets") {
    throw new Error("poster archive must declare the static optimized asset storage policy");
  }

  const ids = new Set();
  let displayBytes = 0;
  let sourceBytes = 0;
  let optimizedCount = 0;
  for (const poster of posters) {
    for (const field of ["id", "title", "year", "date", "sortDate", "venue", "collection", "image"]) {
      if (poster[field] === undefined || poster[field] === null || poster[field] === "") {
        throw new Error(`poster archive record missing ${field}: ${poster.id || "(unknown)"}`);
      }
    }
    if (ids.has(poster.id)) {
      throw new Error(`duplicate poster archive id: ${poster.id}`);
    }
    ids.add(poster.id);
    if (!Array.isArray(poster.tags) || poster.tags.length === 0) {
      throw new Error(`poster archive record ${poster.id} must have tags`);
    }

    const image = poster.image;
    const actualDisplayBytes = assertLocalImageAsset(image.display || image.thumbnail, `poster archive ${poster.id} display image`);
    const actualSourceBytes = assertLocalImageAsset(image.sourceAsset, `poster archive ${poster.id} source image`);
    if (Number(image.displayBytes) !== actualDisplayBytes) {
      throw new Error(`poster archive ${poster.id} displayBytes does not match file size`);
    }
    if (Number(image.sourceBytes) !== actualSourceBytes) {
      throw new Error(`poster archive ${poster.id} sourceBytes does not match file size`);
    }
    displayBytes += actualDisplayBytes;
    sourceBytes += actualSourceBytes;
    if (image.optimized) optimizedCount += 1;
  }

  const stats = archive.stats || {};
  if (stats.posters !== posters.length) {
    throw new Error("poster archive stats.posters must match posters.length");
  }
  if (stats.displayBytes !== displayBytes || stats.sourceBytes !== sourceBytes) {
    throw new Error("poster archive byte totals must match image file sizes");
  }
  if (stats.optimizedCount !== optimizedCount) {
    throw new Error("poster archive optimizedCount must match optimized records");
  }
  if (!stats.freeTierSoftCapBytes || displayBytes > stats.freeTierSoftCapBytes) {
    throw new Error("poster archive display payload must stay under the free-tier soft cap");
  }
}

function jsonLdBlocks(file, html) {
  const blocks = Array.from(html.matchAll(jsonLdPattern), match => match[1]);
  for (const block of blocks) {
    try {
      JSON.parse(block);
    } catch (error) {
      throw new Error(`${file} has invalid JSON-LD: ${error.message}`);
    }
  }
  return blocks;
}

function isPublicSeoEvent(event = {}) {
  return event.status !== "watch" && event.sourceStatus !== "watchlist" && event.confidence !== "Watch";
}

function assertSeoHeadMarkers(file, html) {
  for (const required of [
    '<meta name="description"',
    '<meta property="og:title"',
    '<meta property="og:url"',
    '<meta property="og:image"',
    '<meta property="og:image:alt"',
    '<link rel="canonical"',
    '<link rel="manifest"',
    'type="application/ld+json"',
  ]) {
    if (!html.includes(required)) {
      throw new Error(`${file} missing required SEO marker: ${required}`);
    }
  }
  jsonLdBlocks(file, html);
}

function assertGoogleTracking(file, html) {
  const loaderMatch = html.match(/<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=(G-[A-Z0-9]+)"><\/script>/);
  if (!loaderMatch) {
    throw new Error(`${file} missing Google tracking loader`);
  }

  const googleTagId = loaderMatch[1];
  if (googleTagId !== expectedGoogleTagId) {
    throw new Error(`${file} must use Google tracking ID ${expectedGoogleTagId}, found ${googleTagId}`);
  }
  if (!html.includes(`gtag("config", "${googleTagId}")`)) {
    throw new Error(`${file} missing Google tracking config for ${googleTagId}`);
  }
}

function assertRootDispatchFormat(file, html) {
  if (!hasStylesheet(html, "assets/basement-dispatch.css")) {
    throw new Error(`${file} must load the shared Basement Dispatch stylesheet`);
  }
  if (!html.includes("bottom-dispatch-bar")) {
    throw new Error(`${file} must use the shared Basement Dispatch footer format`);
  }
  if (secondaryDispatchHtmlFiles.includes(file) && !/<main\s+class="[^"]*\bdispatch-shell\b[^"]*"/.test(html)) {
    throw new Error(`${file} must use the shared dispatch shell page format`);
  }
}

function assertGeneratedDispatchFormat(file, html) {
  if (websiteStructure.site.eventDetailStylesheet && !html.includes(`href="../${websiteStructure.site.eventDetailStylesheet}"`)) {
    throw new Error(`${file} must load the generated event detail stylesheet`);
  }
  if (!hasStylesheet(html, "../assets/basement-dispatch.css")) {
    throw new Error(`${file} must load the shared Basement Dispatch stylesheet`);
  }
  if (!/<main\s+class="[^"]*\bdispatch-shell\b[^"]*"/.test(html)) {
    throw new Error(`${file} must use the shared dispatch shell page format`);
  }
  if (!html.includes("bottom-dispatch-bar")) {
    throw new Error(`${file} must use the shared Basement Dispatch footer format`);
  }
}

function hasStylesheet(html, href) {
  return new RegExp(`<link\\s+rel="stylesheet"\\s+href="${escapeRegExp(href)}(?:\\?[^"]*)?">`).test(html);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertNoDuplicateEventsIndexLinks(file, html) {
  if (html.includes('href="events/index.html"') || html.includes('href="../events/index.html"') || html.includes('href="index.html">Events</a>')) {
    throw new Error(`${file} must link to poster-wall.html instead of the duplicate events index`);
  }
}

function assertNoPosterArchiveLinks(file, html) {
  if (file === "poster-archive.html") return;
  if (html.includes('href="poster-archive.html"') || html.includes('href="../poster-archive.html"')) {
    throw new Error(`${file} must keep Wall as the single poster surface; remove poster-archive navigation links`);
  }
}

function assertHomepageStatsPlacement(file, html) {
  const statsIndex = html.indexOf('<section class="stats" aria-label="Calendar statistics">');
  const highlightIndex = html.indexOf('<section class="highlight-wall"');
  const footerIndex = html.indexOf('<footer class="footnotes bottom-dispatch-bar"');

  if (statsIndex === -1) {
    throw new Error(`${file} missing calendar statistics strip`);
  }
  if (highlightIndex === -1) {
    throw new Error(`${file} missing highlight wall`);
  }
  if (footerIndex === -1) {
    throw new Error(`${file} missing bottom dispatch bar`);
  }
  if (!(highlightIndex < statsIndex && statsIndex < footerIndex)) {
    throw new Error(`${file} must place calendar statistics after the highlight wall and directly above the bottom dispatch bar`);
  }
}

function generatedEventPageGraph(file, html) {
  const nodes = jsonLdBlocks(file, html)
    .flatMap(block => {
      const parsed = JSON.parse(block);
      return Array.isArray(parsed["@graph"]) ? parsed["@graph"] : [parsed];
    });
  if (!nodes.some(node => node["@type"] === "WebSite")) {
    throw new Error(`${file} missing WebSite JSON-LD graph node`);
  }
  if (!nodes.some(node => node["@type"] === "BreadcrumbList")) {
    throw new Error(`${file} missing BreadcrumbList JSON-LD graph node`);
  }
  return nodes;
}

function assertGeneratedSeoPages(events) {
  const eventIndexFile = "events/index.html";
  if (fs.existsSync(eventIndexFile)) {
    throw new Error("events/index.html duplicates poster-wall.html and must not be shipped");
  }

  if (!fs.existsSync("sitemap.xml")) {
    throw new Error("sitemap.xml must exist");
  }
  const sitemap = fs.readFileSync("sitemap.xml", "utf8");
  if (sitemap.includes(`<loc>${siteUrl}/events</loc>`)) {
    throw new Error("sitemap.xml must not list duplicate /events index; use /poster-wall");
  }
  for (const page of sitemapPages(websiteStructure)) {
    const loc = canonicalUrl(page, websiteStructure);
    if (!sitemap.includes(`<loc>${loc}</loc>`)) {
      throw new Error(`sitemap.xml missing URL: ${loc}`);
    }
  }

  for (const event of events) {
    const file = `events/${event.id}.html`;
    if (!fs.existsSync(file)) {
      throw new Error(`${file} must be generated by npm run seo`);
    }
    const html = fs.readFileSync(file, "utf8");
    assertSeoHeadMarkers(file, html);
    assertGoogleTracking(file, html);
    assertGeneratedDispatchFormat(file, html);
    assertNoDuplicateEventsIndexLinks(file, html);
    assertNoPosterArchiveLinks(file, html);
    if (!html.includes(`<link rel="canonical" href="${siteUrl}/events/${event.id}">`)) {
      throw new Error(`${file} missing clean canonical URL`);
    }
    const displayPoster = bestDisplayPosterAsset(event);
    if (displayPoster && !html.includes(`src="../${displayPoster}"`)) {
      throw new Error(`${file} must use smallest local display poster asset: ${displayPoster}`);
    }
    const nodes = generatedEventPageGraph(file, html);
    const eventUrl = `${siteUrl}/events/${event.id}`;
    if (isPublicSeoEvent(event)) {
      if (!sitemap.includes(`<loc>${eventUrl}</loc>`)) {
        throw new Error(`sitemap.xml missing public event page: ${eventUrl}`);
      }
      if (!html.includes('content="index,follow,max-image-preview:large"')) {
        throw new Error(`${file} must be indexable`);
      }
      if (!nodes.some(node => node["@type"] === "MusicEvent" && node.url === eventUrl)) {
        throw new Error(`${file} missing MusicEvent JSON-LD node`);
      }
    } else {
      if (sitemap.includes(`<loc>${eventUrl}</loc>`)) {
        throw new Error(`watchlist event must not be in sitemap.xml: ${eventUrl}`);
      }
      if (!html.includes('content="noindex,follow"')) {
        throw new Error(`${file} must noindex watchlist leads`);
      }
      if (nodes.some(node => node["@type"] === "MusicEvent")) {
        throw new Error(`${file} must not expose MusicEvent JSON-LD for watchlist leads`);
      }
    }
  }
}

function bestDisplayPosterAsset(event) {
  const poster = normalizePosterAsset(event.posterUrl || "");
  if (!poster) return "";

  const posterFile = path.join(ROOT, poster);
  if (!fs.existsSync(posterFile)) return "";

  const optimized = optimizedPosterAsset(poster);
  const optimizedFile = path.join(ROOT, optimized);
  if (!fs.existsSync(optimizedFile)) return poster;

  const sourceBytes = fs.statSync(posterFile).size;
  const optimizedBytes = fs.statSync(optimizedFile).size;
  return optimizedBytes <= sourceBytes ? optimized : poster;
}

function normalizePosterAsset(asset) {
  const normalized = String(asset || "").trim().replace(/\\/g, "/");
  return /^assets\/posters\/[^/]+\.(?:jpe?g|png|webp)$/i.test(normalized) ? normalized : "";
}

function optimizedPosterAsset(asset) {
  const parsed = path.posix.parse(asset);
  return path.posix.join(parsed.dir, `${parsed.name}-optimized.jpg`);
}

function projectFiles(dir = ROOT, skipDirs = new Set(["node_modules", ".git", ".vercel", "output"])) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...projectFiles(fullPath, skipDirs));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function projectPath(file) {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

function isInsideProject(file) {
  const resolvedRoot = path.resolve(ROOT);
  const resolvedFile = path.resolve(file);
  return resolvedFile === resolvedRoot || resolvedFile.startsWith(`${resolvedRoot}${path.sep}`);
}

function htmlFragmentIds(html) {
  const ids = new Set();
  for (const match of html.matchAll(/\s(?:id|name)\s*=\s*(["'])(.*?)\1/gi)) {
    ids.add(match[2]);
  }
  return ids;
}

function decodeFragment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isExternalReference(value) {
  return /^(?:https?:)?\/\//i.test(value);
}

function shouldSkipReference(value) {
  if (!value) return true;
  if (value === "#" || value.startsWith("#")) return false;
  if (value.includes("${") || value.startsWith("{{")) return true;
  if (/^(?:data:|mailto:|tel:|javascript:|blob:|sms:|whatsapp:|weixin:)/i.test(value)) return true;
  return /^[a-z][a-z0-9+.-]*:/i.test(value) && !isExternalReference(value);
}

function stripQueryAndHash(value) {
  return value.replace(/[?#].*$/, "");
}

function referenceHash(value) {
  const hashIndex = value.indexOf("#");
  if (hashIndex === -1) return "";
  return value.slice(hashIndex + 1).split(/[?&]/)[0];
}

function absoluteRouteCandidates(route) {
  const cleanRoute = route.replace(/^\/+/, "");
  const candidates = [cleanRoute || "index.html"];
  if (cleanRoute && !/\.[a-z0-9]+$/i.test(cleanRoute)) {
    candidates.push(`${cleanRoute}.html`);
    candidates.push(path.join(cleanRoute, "index.html"));
  }
  return candidates.map(candidate => path.normalize(path.join(ROOT, candidate)));
}

function relativeRouteCandidates(fromFile, route) {
  const baseDir = path.dirname(fromFile);
  const candidates = [path.normalize(path.join(baseDir, route))];
  if (!/\.[a-z0-9]+$/i.test(route)) {
    candidates.push(path.normalize(path.join(baseDir, `${route}.html`)));
    candidates.push(path.normalize(path.join(baseDir, route, "index.html")));
  }
  return candidates;
}

function assertLocalLinkIntegrity() {
  const files = projectFiles();
  const htmlCandidates = files.filter(file => /\.html$/i.test(file));
  const cssCandidates = files.filter(file => /\.css$/i.test(file));
  const htmlIdCache = new Map(htmlCandidates.map(file => [path.resolve(file), htmlFragmentIds(fs.readFileSync(file, "utf8"))]));
  const references = [];
  const attrPattern = /\s(href|src|action|poster|data-src|data-href)\s*=\s*(["'])(.*?)\2/gi;
  const srcsetPattern = /\ssrcset\s*=\s*(["'])(.*?)\1/gi;
  const cssUrlPattern = /url\(\s*(["']?)(?!data:)([^"')]+)\1\s*\)/gi;

  function addReference(fromFile, rawValue, kind) {
    const value = String(rawValue || "").trim();
    if (shouldSkipReference(value) || isExternalReference(value)) return;
    references.push({ fromFile, from: projectPath(fromFile), value, kind });
  }

  for (const file of htmlCandidates) {
    const html = fs.readFileSync(file, "utf8");
    for (const match of html.matchAll(attrPattern)) {
      addReference(file, match[3], match[1].toLowerCase());
    }
    for (const match of html.matchAll(srcsetPattern)) {
      for (const item of match[2].split(",")) {
        addReference(file, item.trim().split(/\s+/)[0], "srcset");
      }
    }
  }

  for (const file of cssCandidates) {
    const css = fs.readFileSync(file, "utf8");
    for (const match of css.matchAll(cssUrlPattern)) {
      addReference(file, match[2], "css-url");
    }
  }

  for (const reference of references) {
    const targetPath = stripQueryAndHash(reference.value);
    const hash = referenceHash(reference.value);
    let candidates;
    if (!targetPath) {
      candidates = [reference.fromFile];
    } else if (targetPath.startsWith("/")) {
      candidates = absoluteRouteCandidates(targetPath);
    } else {
      candidates = relativeRouteCandidates(reference.fromFile, targetPath);
    }

    const existing = candidates.find(candidate => isInsideProject(candidate) && fs.existsSync(candidate));
    if (!existing) {
      throw new Error(`${reference.from} has dead local ${reference.kind} link: ${reference.value}`);
    }
    if (hash && /\.html$/i.test(existing)) {
      const fragmentIds = htmlIdCache.get(path.resolve(existing)) || htmlFragmentIds(fs.readFileSync(existing, "utf8"));
      if (!fragmentIds.has(decodeFragment(hash))) {
        throw new Error(`${reference.from} links to missing fragment #${hash}: ${reference.value}`);
      }
    }
  }

  return {
    files: htmlCandidates.length + cssCandidates.length,
    references: references.length,
  };
}

function assertStaticDataFetchCaching() {
  const files = projectFiles()
    .filter(file => /\.(?:html|js)$/i.test(file));
  const staticDataCacheBypassPattern = /fetch\(\s*(["'])data\/(?:events|poster-archive)\.json\1\s*,\s*\{[^}]*cache\s*:\s*(["'])no-(?:store|cache)\2/;

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    if (staticDataCacheBypassPattern.test(text)) {
      throw new Error(`${projectPath(file)} must not bypass cache for static JSON data`);
    }
  }
}

assertWebsiteStructure();
const localLinkSummary = assertLocalLinkIntegrity();
assertStaticDataFetchCaching();

for (const file of homepageCalendarHtmlFiles) {
  assertHomepageStatsPlacement(file, fs.readFileSync(file, "utf8"));
}

for (const file of [...htmlFiles, ...syntaxOnlyHtmlFiles]) {
  const html = fs.readFileSync(file, "utf8");
  const scripts = Array.from(html.matchAll(scriptPattern), match => match[1]);
  scriptCount += scripts.length;

  for (const script of scripts) {
    new Function(script);
  }

  if (syntaxOnlyHtmlFiles.includes(file)) {
    jsonLdBlocks(file, html);
    continue;
  }

  assertSeoHeadMarkers(file, html);
  assertNoDuplicateEventsIndexLinks(file, html);
  assertNoPosterArchiveLinks(file, html);
}

for (const file of googleTrackedHtmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  assertGoogleTracking(file, html);
}

for (const file of sharedDispatchHtmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  assertRootDispatchFormat(file, html);
  assertNoDuplicateEventsIndexLinks(file, html);
  assertNoPosterArchiveLinks(file, html);
  if (homepageCalendarHtmlFiles.includes(file)) {
    assertHomepageStatsPlacement(file, html);
  }
}

for (const file of externalJsFiles) {
  if (!fs.existsSync(file)) {
    throw new Error(`${file} is required for the DJ database page`);
  }
  new Function(fs.readFileSync(file, "utf8"));
}

const djTrialListener = require("../assets/dj-trial-listen.js");
if (
  !djTrialListener
  || typeof djTrialListener.listenLinksFor !== "function"
  || typeof djTrialListener.directAudioLinksFor !== "function"
  || typeof djTrialListener.chinaListenLinksFor !== "function"
  || typeof djTrialListener.listeningDeckFor !== "function"
) {
  throw new Error("assets/dj-trial-listen.js must export links-only DJ listening helpers");
}
if (typeof djTrialListener.previewPlanFor === "function") {
  throw new Error("DJ listening helper must not export synthetic preview/audio generation");
}
const directAudioLinks = djTrialListener.directAudioLinksFor({
  name: "PASHRAWBOI",
  genres: ["hard techno", "hardcore"],
  tracked: {
    sources: [{
      label: "byyb.radio PASHRAWBOI set",
      url: "https://byyb.live/set/pashrawboi-chaos-radio-radio-takeover-2026-06-06",
      status: "secondary",
    }],
  },
});
if (!directAudioLinks.some(link => link.label === "byyb.radio PASHRAWBOI set" && link.url.includes("byyb.live/set/pashrawboi"))) {
  throw new Error("DJ listening helper must surface individual direct audio/set links before search links");
}
const listenLinks = djTrialListener.listenLinksFor({ name: "PASHRAWBOI", genres: ["hard techno"] });
if (!listenLinks.some(link => link.label === "SoundCloud" && link.url.includes("PASHRAWBOI%20hard%20techno"))) {
  throw new Error("DJ listening links must include encoded SoundCloud artist/genre search");
}
if (!listenLinks.some(link => link.label === "YouTube" && link.url.includes("PASHRAWBOI%20hard%20techno"))) {
  throw new Error("DJ listening links must include encoded YouTube artist/genre search");
}
const chinaListenLinks = djTrialListener.chinaListenLinksFor({ name: "PASHRAWBOI", genres: ["hard techno"] });
if (!chinaListenLinks.some(link => link.label === "QQ Music" && link.url.includes("y.qq.com") && link.url.includes("PASHRAWBOI%20hard%20techno"))) {
  throw new Error("China listening links must include QQ Music artist/genre search");
}
if (!chinaListenLinks.some(link => link.label === "NetEase Cloud Music" && link.url.includes("music.163.com") && link.url.includes("PASHRAWBOI%20hard%20techno"))) {
  throw new Error("China listening links must include NetEase Cloud Music artist/genre search");
}
if (!chinaListenLinks.some(link => link.label === "Bilibili sets" && link.url.includes("search.bilibili.com") && link.url.includes("DJ%20set"))) {
  throw new Error("China listening links must include Bilibili DJ set/video search");
}
const listeningDeck = djTrialListener.listeningDeckFor({ name: "PASHRAWBOI", genres: ["hard techno"] });
if (listeningDeck.policy !== "links-only" || !Array.isArray(listeningDeck.chinaLinks) || !Array.isArray(listeningDeck.globalFallbackLinks)) {
  throw new Error("DJ listening deck must expose a links-only China-first listening plan");
}
const djPageHtml = fs.readFileSync("djs.html", "utf8");
for (const forbidden of ["id=\"trialListenNow\"", "function playTrialListen(", "AudioContext", "Synthetic soundcheck", "trial-meter"]) {
  if (djPageHtml.includes(forbidden)) {
    throw new Error(`links-only DJ listening must not include old preview/audio path: ${forbidden}`);
  }
}

const raveEverywhere = require("../assets/rave-everywhere.js");
if (!raveEverywhere || typeof raveEverywhere.generateVirtualEvent !== "function" || typeof raveEverywhere.profileSeedsFromSourceData !== "function") {
  throw new Error("assets/rave-everywhere.js must export Rave Everywhere generation helpers");
}
const previewRoomRealtime = require("../assets/preview-room-realtime.js");
if (
  !previewRoomRealtime
  || typeof previewRoomRealtime.createRoomTopic !== "function"
  || typeof previewRoomRealtime.presenceCountFromState !== "function"
  || typeof previewRoomRealtime.reactionsAfterRemote !== "function"
  || typeof previewRoomRealtime.realtimeAccessState !== "function"
) {
  throw new Error("assets/preview-room-realtime.js must export Preview Room Realtime helpers");
}
if (previewRoomRealtime.createRoomTopic({ id: "Rave Everywhere Heavy Current!" }) !== "preview-room:rave-everywhere-heavy-current") {
  throw new Error("Preview Room Realtime topic must be stable and Supabase-safe");
}
if (previewRoomRealtime.presenceCountFromState({ a: [{}], b: [{}, {}] }) !== 3) {
  throw new Error("Preview Room Realtime presence must count all clients in the room");
}
if (previewRoomRealtime.reactionsAfterRemote({ locked: 0, heat: 1, again: 0 }, { reaction: "heat" }).heat !== 2) {
  throw new Error("Preview Room Realtime must merge valid remote reactions");
}
const liveRoomRealtime = require("../assets/live-room-realtime.js");
if (
  !liveRoomRealtime
  || typeof liveRoomRealtime.createLiveRoomTopic !== "function"
  || typeof liveRoomRealtime.eventRoomSignalOptions !== "function"
  || typeof liveRoomRealtime.todayEventRooms !== "function"
  || typeof liveRoomRealtime.loveWallSignalForNote !== "function"
  || typeof liveRoomRealtime.reactionCountsAfterBroadcast !== "function"
  || typeof liveRoomRealtime.roomFeedAfterSignal !== "function"
  || typeof liveRoomRealtime.roomShareUrl !== "function"
) {
  throw new Error("assets/live-room-realtime.js must export Love Wall and event live-room helpers");
}
if (liveRoomRealtime.createLiveRoomTopic("event", { id: "Santa K / TURBO!" }) !== "live-room:event:santa-k-turbo") {
  throw new Error("event live-room topics must be stable and Supabase-safe");
}
const checkLiveRooms = liveRoomRealtime.todayEventRooms([
  { id: "santa-k", sortDate: "2026-06-13", title: "Santa K", venue: "Abyss", status: "upcoming" },
  { id: "past", sortDate: "2026-06-13", title: "Past", venue: "Old", status: "past" },
], "2026-06-13");
if (checkLiveRooms.length !== 1 || checkLiveRooms[0].topic !== "live-room:event:santa-k") {
  throw new Error("event live-room helper must open rooms for non-past same-day events");
}
const loveSignal = liveRoomRealtime.loveWallSignalForNote({ pulse: "care", message: "private pending copy" });
if (loveSignal.message || loveSignal.author || loveSignal.pulse !== "care") {
  throw new Error("Love Wall live signal must not broadcast unapproved note content");
}
if (!liveRoomRealtime.eventRoomSignalOptions().some(option => option.key === "set-now")) {
  throw new Error("event live rooms must expose richer canned room signals");
}
const feedCheck = liveRoomRealtime.roomFeedAfterSignal([], { targetId: "santa-k", reaction: "water" }, liveRoomRealtime.eventRoomSignalOptions());
if (feedCheck.length !== 1 || feedCheck[0].label !== "Water") {
  throw new Error("event live rooms must create sanitized room feed items from signals");
}
if (liveRoomRealtime.roomShareUrl("https://example.com/index.html#old", "santa-k") !== "https://example.com/index.html#live-room=santa-k") {
  throw new Error("event live-room share links must use stable live-room hashes");
}
const betaVirtualEvent = raveEverywhere.generateVirtualEvent({
  seed: "check-seed",
  now: "2026-06-13T12:00:00+08:00",
  selectedDjs: [
    { name: "PASHRAWBOI", genres: ["hard techno", "hardcore"], soundFamilies: ["hard"], sourceStatus: "secondary" },
    { name: "Illsee", genres: ["electro", "industrial", "techno"], soundFamilies: ["experimental"], sourceStatus: "artist-profile" },
    { name: "Anyma", genres: ["melodic techno", "audiovisual"], soundFamilies: ["date"], sourceStatus: "official" },
  ],
  sourceEvents: [
    { title: "Abyss source row", venue: "Abyss Shanghai", district: "Huangpu", genre: "hard techno", vibe: ["hard", "underground"], time: "22:30-05:00" },
  ],
});
if (betaVirtualEvent.kind !== "virtual" || betaVirtualEvent.beta !== true || betaVirtualEvent.sourceStatus !== "virtual") {
  throw new Error("Rave Everywhere output must be explicitly marked beta and virtual");
}
if (!Array.isArray(betaVirtualEvent.lineup) || betaVirtualEvent.lineup.length !== 3) {
  throw new Error("Rave Everywhere output must preserve the selected DJ lineup");
}
if (!betaVirtualEvent.location?.name || !betaVirtualEvent.location?.address || !betaVirtualEvent.poster?.palette?.length) {
  throw new Error("Rave Everywhere output must include a generated location and poster palette");
}
if (!/virtual/i.test(betaVirtualEvent.disclaimer || "")) {
  throw new Error("Rave Everywhere output must warn that it is a virtual event");
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

const mainScripts = Array.from(fs.readFileSync("index.html", "utf8").matchAll(scriptPattern), match => match[1]);
const archiveScripts = Array.from(fs.readFileSync("shanghai-rave-calendar-2026.html", "utf8").matchAll(scriptPattern), match => match[1]);
const mainScript = mainScripts[mainScripts.length - 1];
const archiveScript = archiveScripts[archiveScripts.length - 1];
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
  { file: "djs.html", text: "assets/dj-trial-listen.js", label: "DJ listening links module" },
  { file: "djs.html", text: "Direct listening links", label: "DJ direct listening links panel" },
  { file: "djs.html", text: "function renderListenLinks(", label: "DJ listening links renderer" },
  { file: "djs.html", text: "data-listen-source", label: "DJ listening source links" },
];

const publicAdminCornerFiles = [
  "index.html",
  "shanghai-rave-calendar-2026.html",
  "poster-wall.html",
  "love-wall.html",
  "planner.html",
  "rave-everywhere.html",
  "venues.html",
  "djs.html",
  "account.html",
];

const opsRequirements = [
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
  { file: "ops.html", text: 'data-ops-admin-gate', label: "ops admin gate mount" },
  { file: "ops.html", text: 'data-ops-private hidden', label: "ops private console hidden by default" },
  { file: "ops.html", text: "assets/love-wall-supabase-config.js", label: "ops Supabase config" },
  { file: "ops.html", text: "assets/ops-admin-gate.js", label: "ops admin gate script" },
  { file: "assets/ops-admin-gate.js", text: "adminAccessState", label: "ops admin role gate" },
  { file: "assets/account-system.js", text: "function adminAccessState(", label: "account admin access state" },
];

const adminCornerRequirements = publicAdminCornerFiles.map(file => ({
  file,
  text: "data-admin-corner",
  label: `${file} small admin corner`,
}));

const scrapeRequirements = [
  { file: "scripts/scrape-events.js", text: "DJ_ITINERARY_FILE", label: "scraper tracked itinerary output path" },
  { file: "scripts/scrape-events.js", text: "function writeDjItineraryData(", label: "scraper tracked itinerary writer" },
  { file: "scripts/scrape-events.js", text: "function normalizeFutureTourRows(", label: "futureTourPlan to DJ itinerary conversion" },
  { file: "scripts/scrape-events.js", text: "djItineraryStats", label: "scrape payload itinerary stats" },
  { file: ".github/workflows/scrape-events.yml", text: "data/tracked-dj-itineraries.js", label: "workflow commits tracked itinerary data" },
  { file: ".github/workflows/scrape-events.yml", text: "data/poster-archive.json", label: "workflow commits poster archive data" },
  { file: ".github/workflows/scrape-events.yml", text: "assets/posters", label: "workflow commits optimized poster assets" },
  { file: ".github/workflows/scrape-events.yml", text: "events sitemap.xml", label: "workflow commits generated SEO pages" },
  { file: "package.json", text: "\"seo\": \"node scripts/generate-seo-pages.js\"", label: "SEO generator script" },
  { file: "package.json", text: "\"poster-archive\": \"npm run posters:prepare\"", label: "poster archive prepare script" },
  { file: "package.json", text: "\"posters:prepare\": \"node scripts/optimize-posters.js --archive --all --allow-larger\"", label: "poster optimizer archive script" },
  { file: "package.json", text: "\"posters:upload\": \"npm run posters:prepare && npm run supabase:import\"", label: "poster Supabase upload script" },
  { file: "package.json", text: "scripts/generate-seo-pages.js", label: "SEO generator syntax check" },
  { file: "package.json", text: "scripts/generate-poster-archive.js", label: "poster archive generator syntax check" },
  { file: "package.json", text: "scripts/optimize-posters.js", label: "poster optimizer syntax check" },
  { file: "scripts/generate-seo-pages.js", text: "MusicEvent", label: "generated event structured data" },
  { file: "scripts/generate-seo-pages.js", text: "BreadcrumbList", label: "generated breadcrumb structured data" },
  { file: "scripts/generate-seo-pages.js", text: "sitemap.xml", label: "generated sitemap writer" },
  { file: "poster-wall.html", text: 'id="modalEventPage"', label: "poster wall event page link" },
];

const posterArchiveRequirements = [
  { file: "scripts/generate-poster-archive.js", text: "FREE_TIER_SOFT_CAP_BYTES", label: "poster archive free-tier soft cap" },
  { file: "package.json", text: "\"poster-archive\": \"npm run posters:prepare\"", label: "poster archive metadata prepare script" },
];

const everywhereRequirements = [
  { file: "index.html", text: 'href="rave-everywhere.html"', label: "calendar Rave Everywhere link" },
  { file: "shanghai-rave-calendar-2026.html", text: 'href="rave-everywhere.html"', label: "archive Rave Everywhere link" },
  { file: "poster-wall.html", text: 'href="rave-everywhere.html"', label: "wall Rave Everywhere link" },
  { file: "planner.html", text: 'href="rave-everywhere.html"', label: "planner Rave Everywhere link" },
  { file: "venues.html", text: 'href="rave-everywhere.html"', label: "venues Rave Everywhere link" },
  { file: "djs.html", text: 'href="rave-everywhere.html"', label: "DJ database Rave Everywhere link" },
  { file: "ops.html", text: 'href="rave-everywhere.html"', label: "ops Rave Everywhere link" },
  { file: "rave-everywhere.html", text: "Rave Everywhere", label: "Rave Everywhere page title" },
  { file: "rave-everywhere.html", text: 'id="djPicker"', label: "Rave Everywhere DJ picker" },
  { file: "rave-everywhere.html", text: 'id="generateEverywhere"', label: "Rave Everywhere generate action" },
  { file: "rave-everywhere.html", text: 'id="downloadPoster"', label: "Rave Everywhere poster export" },
  { file: "rave-everywhere.html", text: "assets/rave-everywhere.js", label: "Rave Everywhere generation module" },
  { file: "rave-everywhere.html", text: "assets/dj-trial-listen.js", label: "Rave Everywhere China listening module" },
  { file: "rave-everywhere.html", text: "assets/preview-room-realtime.js", label: "Rave Everywhere Preview Room Realtime module" },
  { file: "rave-everywhere.html", text: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", label: "Rave Everywhere Supabase client" },
  { file: "rave-everywhere.html", text: "assets/love-wall-supabase-config.js", label: "Rave Everywhere Supabase config" },
  { file: "rave-everywhere.html", text: "Preview Room", label: "Rave Everywhere preview room panel" },
  { file: "rave-everywhere.html", text: 'id="previewRoom"', label: "Rave Everywhere preview room mount" },
  { file: "rave-everywhere.html", text: 'id="roomRealtimeStatus"', label: "Rave Everywhere preview room realtime status" },
  { file: "rave-everywhere.html", text: "Supabase Presence", label: "Rave Everywhere preview room presence copy" },
  { file: "rave-everywhere.html", text: "Broadcast for reactions", label: "Rave Everywhere preview room broadcast copy" },
  { file: "rave-everywhere.html", text: "China Listening Deck", label: "Rave Everywhere China listening deck label" },
  { file: "rave-everywhere.html", text: 'id="listeningDeck"', label: "Rave Everywhere listening deck mount" },
  { file: "rave-everywhere.html", text: "No audio is hosted here", label: "Rave Everywhere links-only music policy" },
  { file: "rave-everywhere.html", text: "drawVirtualPoster(", label: "Rave Everywhere canvas poster renderer" },
  { file: "rave-everywhere.html", text: "Virtual event, not a verified listing", label: "Rave Everywhere virtual disclaimer" },
  { file: "sitemap.xml", text: `${siteUrl}/rave-everywhere`, label: "Rave Everywhere sitemap URL" },
];

const loveWallRequirements = [
  { file: "index.html", text: 'href="love-wall.html"', label: "calendar Love Wall link" },
  { file: "shanghai-rave-calendar-2026.html", text: 'href="love-wall.html"', label: "archive Love Wall link" },
  { file: "poster-wall.html", text: 'href="love-wall.html"', label: "wall Love Wall link" },
  { file: "planner.html", text: 'href="love-wall.html"', label: "planner Love Wall link" },
  { file: "venues.html", text: 'href="love-wall.html"', label: "venues Love Wall link" },
  { file: "djs.html", text: 'href="love-wall.html"', label: "DJ database Love Wall link" },
  { file: "ops.html", text: 'href="love-wall.html"', label: "ops Love Wall link" },
  { file: "rave-everywhere.html", text: 'href="love-wall.html"', label: "Rave Everywhere Love Wall link" },
  { file: "love-wall.html", text: "Rave Love Wall", label: "Love Wall page title" },
  { file: "love-wall.html", text: "window.localStorage", label: "Love Wall local note persistence" },
  { file: "love-wall.html", text: 'id="loveWall"', label: "Love Wall note renderer" },
  { file: "love-wall.html", text: "emojiOptions", label: "Love Wall emoji reaction options" },
  { file: "love-wall.html", text: "submitRemoteReaction", label: "Love Wall Supabase emoji reaction writer" },
  { file: "love-wall.html", text: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", label: "Love Wall Supabase Realtime client" },
  { file: "love-wall.html", text: "assets/live-room-realtime.js", label: "Love Wall realtime room helper" },
  { file: "love-wall.html", text: 'id="liveWallOnline"', label: "Love Wall live online readout" },
  { file: "love-wall.html", text: 'id="livePulseFeed"', label: "Love Wall live pulse feed" },
  { file: "love-wall.html", text: "love-wall-signal", label: "Love Wall moderation-safe realtime signal" },
  { file: "assets/love-wall-supabase-config.js", text: 'reactionTable: "love_wall_reactions"', label: "Love Wall reaction table config" },
  { file: "supabase/migrations/202606130002_love_wall_reactions.sql", text: "love_wall_reactions", label: "Love Wall reaction migration" },
  { file: "sitemap.xml", text: `${siteUrl}/love-wall`, label: "Love Wall sitemap URL" },
];

const liveRoomRequirements = [
  { file: "index.html", text: 'href="live-room.html"', label: "calendar Live Room link" },
  { file: "shanghai-rave-calendar-2026.html", text: 'href="live-room.html"', label: "archive Live Room link" },
  { file: "live-room.html", text: "Shanghai Rave Live Room", label: "Live Room page title" },
  { file: "live-room.html", text: "assets/live-room-realtime.js", label: "Live Room realtime helper" },
  { file: "live-room.html", text: 'id="todayLiveRooms"', label: "Live Room room mount" },
  { file: "live-room.html", text: "event-room-signal", label: "Live Room signal broadcast" },
  { file: "live-room.html", text: "event-room-reaction", label: "Live Room reaction broadcast" },
  { file: "live-room.html", text: "Copy room", label: "Live Room share action" },
  { file: "live-room.html", text: "data/events.json", label: "Live Room event data loader" },
  { file: "sitemap.xml", text: `${siteUrl}/live-room`, label: "Live Room sitemap URL" },
];

const accountRequirements = [
  { file: "index.html", text: 'href="account.html"', label: "calendar Account link" },
  { file: "shanghai-rave-calendar-2026.html", text: 'href="account.html"', label: "archive Account link" },
  { file: "poster-wall.html", text: 'href="account.html"', label: "wall Account link" },
  { file: "love-wall.html", text: 'href="account.html"', label: "Love Wall Account link" },
  { file: "planner.html", text: 'href="account.html"', label: "planner Account link" },
  { file: "rave-everywhere.html", text: 'href="account.html"', label: "Rave Everywhere Account link" },
  { file: "venues.html", text: 'href="account.html"', label: "venues Account link" },
  { file: "djs.html", text: 'href="account.html"', label: "DJ database Account link" },
  { file: "ops.html", text: 'href="account.html"', label: "ops Account link" },
  { file: "account.html", text: "Personal Dispatch", label: "account page title" },
  { file: "account.html", text: "Your rave signal lives here", label: "account value proposition copy" },
  { file: "account.html", text: "data-account-app", label: "account app mount" },
  { file: "account.html", text: "assets/account-system.js", label: "account browser module" },
  { file: "account.html", text: "assets/account-system.css", label: "account styles" },
  { file: "account.html", text: "assets/love-wall-supabase-config.js", label: "account Supabase public config" },
  { file: "index.html", text: 'id="personalizedDispatch"', label: "calendar personalized dispatch panel" },
  { file: "index.html", text: "syncAccountPersonalization", label: "calendar personalization bridge" },
  { file: "assets/account-system.js", text: "function normalizePreferences(", label: "account preference normalizer" },
  { file: "assets/account-system.js", text: "function rankEvents(", label: "account event ranking" },
  { file: "assets/account-system.js", text: "function accountAccessState(", label: "account login wall state" },
  { file: "assets/account-system.js", text: "function accountFeatureCatalog(", label: "account feature catalog" },
  { file: "assets/account-system.js", text: "function enhanceCalendarPage(", label: "calendar account enhancement" },
  { file: "supabase/migrations/202606130001_full_backend_schema.sql", text: "create table if not exists public.user_event_preferences", label: "account preferences table" },
  { file: "supabase/migrations/202606130001_full_backend_schema.sql", text: "create table if not exists public.saved_events", label: "saved events table" },
  { file: "sitemap.xml", text: `${siteUrl}/account`, label: "Account sitemap URL" },
];

const accountGuidePages = [
  { file: "index.html", context: "calendar" },
  { file: "shanghai-rave-calendar-2026.html", context: "calendar" },
  { file: "poster-wall.html", context: "wall" },
  { file: "love-wall.html", context: "love" },
  { file: "planner.html", context: "planner" },
  { file: "rave-everywhere.html", context: "everywhere" },
  { file: "venues.html", context: "venues" },
  { file: "djs.html", context: "djs" },
];

const accountGuideRequirements = accountGuidePages.flatMap(page => [
  { file: page.file, text: `data-account-guide="${page.context}"`, label: `${page.file} public account guide mount` },
  { file: page.file, text: "assets/account-system.css", label: `${page.file} public account guide styles` },
  { file: page.file, text: "assets/account-system.js", label: `${page.file} public account guide script` },
]);

for (const requirement of [...itineraryRequirements, ...opsRequirements, ...adminCornerRequirements, ...scrapeRequirements, ...posterArchiveRequirements, ...everywhereRequirements, ...loveWallRequirements, ...liveRoomRequirements, ...accountRequirements, ...accountGuideRequirements]) {
  const html = fs.readFileSync(requirement.file, "utf8");
  if (!html.includes(requirement.text)) {
    throw new Error(`${requirement.file} missing feature marker: ${requirement.label}`);
  }
}

for (const file of publicAdminCornerFiles) {
  const html = fs.readFileSync(file, "utf8");
  const navBlocks = Array.from(html.matchAll(/<nav\b[\s\S]*?<\/nav>/gi)).map(match => match[0]);
  if (navBlocks.some(block => block.includes('href="ops.html"'))) {
    throw new Error(`${file} must keep admin out of public navigation`);
  }
}

assertPosterArchiveData();

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
  assertGeneratedSeoPages(events);

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
    if (/xiaohongshu\.com\/search_result/i.test(source.url) && !/[?&]source=web_explore_feed(?:&|$)/.test(source.url)) {
      throw new Error(`computerUseQueue source ${source.label} must use the live Xiaohongshu search URL format`);
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

console.log(`local link integrity OK: ${localLinkSummary.references} local links across ${localLinkSummary.files} HTML/CSS files`);
console.log(`inline scripts syntax OK: ${scriptCount} scripts across ${htmlFiles.length + syntaxOnlyHtmlFiles.length} HTML files`);
