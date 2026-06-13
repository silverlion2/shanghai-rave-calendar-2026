const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const EVENTS_FILE = path.join(ROOT, "data", "events.json");
const OUT_FILE = path.join(ROOT, "data", "poster-archive.json");
const POSTER_PREFIX = "assets/posters/";
const FREE_TIER_SOFT_CAP_BYTES = 80 * 1024 * 1024;

const payload = JSON.parse(fs.readFileSync(EVENTS_FILE, "utf8"));
const events = Array.isArray(payload) ? payload : payload.events || [];

if (!Array.isArray(events) || !events.length) {
  throw new Error("data/events.json must contain events before generating the poster archive");
}

const posters = events
  .filter(event => event && event.id && event.posterUrl)
  .map(event => archivePoster(event))
  .filter(Boolean)
  .sort((a, b) => {
    const dateSort = String(b.sortDate || "").localeCompare(String(a.sortDate || ""));
    return dateSort || String(a.title).localeCompare(String(b.title));
  });

const stats = archiveStats(posters);
const archive = {
  generatedAt: new Date().toISOString(),
  sourceData: "data/events.json",
  storagePolicy: {
    mode: "static-json-plus-local-optimized-assets",
    freeTierSoftCapBytes: FREE_TIER_SOFT_CAP_BYTES,
    rule: "Use optimized display assets in the wall; keep raw poster files out of the default browsing path when the archive grows.",
  },
  stats,
  posters,
};

fs.writeFileSync(OUT_FILE, `${JSON.stringify(archive, null, 2)}\n`, "utf8");
console.log(`Generated ${path.relative(ROOT, OUT_FILE)} with ${posters.length} poster records (${formatBytes(stats.displayBytes)} display payload).`);

function archivePoster(event) {
  const sourceAsset = normalizeAssetPath(event.posterUrl);
  if (!sourceAsset) return null;

  const sourceInfo = assetInfo(sourceAsset);
  if (!sourceInfo.exists) return null;

  const displayAsset = optimizedAssetFor(sourceAsset);
  const displayInfo = assetInfo(displayAsset);
  const year = Number(String(event.sortDate || "").slice(0, 4)) || null;
  const evidence = event.posterEvidence || {};

  return {
    id: `shanghai-${year || "undated"}-${event.id}`,
    eventId: event.id,
    title: event.title,
    year,
    city: "Shanghai",
    country: "CN",
    date: event.date || event.sortDate,
    sortDate: event.sortDate,
    time: event.time || "",
    venue: event.venue || "",
    district: event.district || "",
    sound: event.genre || "",
    tags: archiveTags(event),
    status: event.status || "",
    confidence: event.confidence || "",
    collection: "Shanghai Rave Index seed archive",
    source: {
      label: event.sourceLabel || evidence.source || "Event source",
      url: event.source || evidence.url || "",
      posterEvidenceUrl: evidence.url || "",
      posterEvidenceSource: evidence.source || "",
      posterEvidenceStatus: evidence.status || "",
    },
    image: {
      thumbnail: displayAsset,
      display: displayAsset,
      sourceAsset,
      displayBytes: displayInfo.bytes,
      sourceBytes: sourceInfo.bytes,
      optimized: displayAsset !== sourceAsset,
      mime: displayInfo.mime,
    },
    eventUrl: `events/${event.id}.html`,
    notes: event.description || "",
  };
}

function normalizeAssetPath(value) {
  const asset = String(value || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!asset.startsWith(POSTER_PREFIX)) return "";
  if (!/\.(jpe?g|png|webp)$/i.test(asset)) return "";
  return asset;
}

function optimizedAssetFor(asset) {
  const parsed = path.posix.parse(asset);
  const candidate = path.posix.join(parsed.dir, `${parsed.name}-optimized.jpg`);
  return fs.existsSync(path.join(ROOT, candidate)) ? candidate : asset;
}

function assetInfo(asset) {
  const absolute = path.join(ROOT, asset);
  if (!fs.existsSync(absolute)) {
    return { exists: false, bytes: 0, mime: "" };
  }
  return {
    exists: true,
    bytes: fs.statSync(absolute).size,
    mime: mimeFor(asset),
  };
}

function mimeFor(asset) {
  const ext = path.extname(asset).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

function archiveTags(event) {
  const values = [
    event.status,
    event.confidence,
    event.district,
    ...(Array.isArray(event.vibe) ? event.vibe : []),
    ...String(event.genre || "").split(","),
  ];
  const seen = new Set();
  return values
    .map(value => String(value || "").trim().toLowerCase())
    .filter(value => value && !seen.has(value) && seen.add(value))
    .slice(0, 12);
}

function archiveStats(items) {
  const displayBytes = sum(items, item => item.image.displayBytes);
  const sourceBytes = sum(items, item => item.image.sourceBytes);
  const optimizedCount = items.filter(item => item.image.optimized).length;
  const years = [...new Set(items.map(item => item.year).filter(Boolean))].sort((a, b) => b - a);
  const venues = [...new Set(items.map(item => item.venue).filter(Boolean))].sort();
  return {
    posters: items.length,
    years,
    venues: venues.length,
    optimizedCount,
    displayBytes,
    sourceBytes,
    displayMegabytes: Number((displayBytes / 1024 / 1024).toFixed(2)),
    sourceMegabytes: Number((sourceBytes / 1024 / 1024).toFixed(2)),
    freeTierSoftCapBytes: FREE_TIER_SOFT_CAP_BYTES,
    freeTierSoftCapMegabytes: Number((FREE_TIER_SOFT_CAP_BYTES / 1024 / 1024).toFixed(0)),
  };
}

function sum(items, mapper) {
  return items.reduce((total, item) => total + Number(mapper(item) || 0), 0);
}

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
