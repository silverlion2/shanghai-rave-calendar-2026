const fs = require("fs");

const DATA_FILE = "data/events.json";
const TRACKED_DJ_PROFILES_FILE = "config/tracked-dj-profiles.json";
const payload = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
const events = Array.isArray(payload.events) ? payload.events : [];
const auditDate = process.env.EVENT_AUDIT_DATE || payload.verified;
const trackedDjProfileConfig = fs.existsSync(TRACKED_DJ_PROFILES_FILE)
  ? JSON.parse(fs.readFileSync(TRACKED_DJ_PROFILES_FILE, "utf8"))
  : { profiles: [] };
const curatedDjProfiles = Array.isArray(trackedDjProfileConfig)
  ? trackedDjProfileConfig
  : (Array.isArray(trackedDjProfileConfig.profiles) ? trackedDjProfileConfig.profiles : []);

if (!auditDate || !/^\d{4}-\d{2}-\d{2}$/.test(auditDate)) {
  throw new Error("data/events.json must define a YYYY-MM-DD verified date, or set EVENT_AUDIT_DATE");
}

function sourceUrl(source) {
  return String(source?.url || "").trim();
}

function sourceChecked(source) {
  return String(source?.lastChecked || source?.checkedAt || source?.checked || "").trim();
}

function count(items) {
  return Array.isArray(items) ? items.length : 0;
}

function eventSourceCount(event) {
  return count(event.sources) || (event.source ? 1 : 0);
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeEntityName(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
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

function profileSourceCount(profileKey) {
  const counts = payload.djItineraryStats?.profileSourceCounts || {};
  return counts[profileKey] || 0;
}

function splitEntityNames(value) {
  return String(value || "")
    .split(/\s+\/\s+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function venueProfileKey(venue) {
  return normalizeEntityName(venue)
    .replace(/\bclub\b/g, "")
    .replace(/\bshanghai\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function lineupItemName(item) {
  if (typeof item === "string") return item;
  return item?.name || item?.dj || item?.artist || "";
}

function isPlaceholderPerformerName(name) {
  const normalized = normalizeEntityName(name);
  return !normalized
    || /\btba\b/.test(normalized)
    || /\b\d+\s*djs?\b/.test(normalized)
    || /\bmulti\s*floor\s*djs?\b/.test(normalized)
    || /\bdj\s*music\b/.test(normalized);
}

function isFestivalListing(event = {}) {
  return normalizeEntityName(event.kind) === "festival" || Boolean(event.festival);
}

function performerNamesForEvent(event) {
  if (isFestivalListing(event) && event.includeInDjCoverage !== true) return [];
  if (!Array.isArray(event.lineup)) return [];
  return event.lineup.flatMap(item => splitEntityNames(lineupItemName(item)))
    .filter(name => !isPlaceholderPerformerName(name));
}

function validLocalPosterAsset(event) {
  const posterUrl = String(event.posterUrl || "").trim();
  if (!posterUrl || !/^assets\/posters\/[^/]+\.(?:jpe?g|png|webp)$/i.test(posterUrl)) {
    return false;
  }
  if (!fs.existsSync(posterUrl)) return false;
  const bytes = fs.readFileSync(posterUrl);
  if (bytes.length < 1024) return false;
  const signature = bytes.subarray(0, 8).toString("hex");
  if (signature.startsWith("ffd8")) return true;
  if (signature === "89504e470d0a1a0a") return true;
  return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
}

function futureEvents() {
  return events.filter(event => String(event.sortDate || "") >= auditDate);
}

const future = futureEvents();
const issues = [];
const warnings = [];

for (const event of future) {
  const id = event.id || event.title || "(unknown)";
  const lastChecked = String(event.lastChecked || "");
  const sources = Array.isArray(event.sources) ? event.sources : [];

  if (!lastChecked || lastChecked < auditDate) {
    issues.push(`${id} has stale or missing lastChecked (${lastChecked || "missing"})`);
  }

  if (!String(event.source || "").trim()) {
    issues.push(`${id} is missing primary source URL`);
  }

  if (!sources.length || sources.some(source => !sourceUrl(source))) {
    issues.push(`${id} must include source rows with URLs`);
  }

  for (const source of sources) {
    const checked = sourceChecked(source);
    if (checked && checked < auditDate) {
      issues.push(`${id} source ${sourceUrl(source)} is stale (${checked})`);
    }
  }

  if (!String(event.ticketStatus || "").trim()) {
    issues.push(`${id} is missing ticketStatus / ticket uncertainty note`);
  }

  if (event.posterEvidence && !validLocalPosterAsset(event)) {
    issues.push(`${id} has posterEvidence but is missing a valid local assets/posters posterUrl`);
  }

  if (!isFestivalListing(event) && event.confidence === "High" && count(event.lineup) === 0) {
    issues.push(`${id} is High confidence but has no source-backed lineup`);
  }

  if (event.status === "watch" && !/watch/i.test(String(event.sourceStatus || ""))) {
    warnings.push(`${id} is watch status but sourceStatus is ${event.sourceStatus || "missing"}`);
  }
}

const sourceReports = Array.isArray(payload.sources) ? payload.sources : [];
const failedSourceReports = sourceReports.filter(source => source.ok === false);
const mojibakeCodepoints = new Set([
  0x6d93,
  0x9422,
  0x7ec9,
  0x6fb6,
  0x7ec1,
  0x9358,
  0x5a32,
  0x9366,
  0x95ca,
  0x6363,
]);
function hasLikelyMojibake(value) {
  return Array.from(String(value || "")).some(char => mojibakeCodepoints.has(char.codePointAt(0)));
}
for (const source of sourceReports) {
  if (hasLikelyMojibake(source.label)) {
    issues.push(`source label appears mojibake: ${source.label}`);
  }
}

for (const profile of curatedDjProfiles) {
  const id = profile.slug || profile.name || "(unknown DJ profile)";
  if (!String(profile.name || "").trim()) {
    issues.push(`${id} tracked DJ profile is missing name`);
  }
  if (!Array.isArray(profile.sources) || profile.sources.length === 0) {
    issues.push(`${id} tracked DJ profile must include at least one source`);
    continue;
  }
  for (const source of profile.sources) {
    if (!sourceUrl(source)) {
      issues.push(`${id} tracked DJ profile source is missing url`);
    }
    const checked = sourceChecked(source);
    if (!checked || checked < auditDate) {
      issues.push(`${id} tracked DJ profile source ${sourceUrl(source) || "(missing url)"} is stale or missing checked date`);
    }
  }
}

const watchFuture = future.filter(event => event.status === "watch" || event.confidence === "Watch");
const highFuture = future.filter(event => event.confidence === "High");
const singleSourceWatch = watchFuture.filter(event => eventSourceCount(event) <= 1);
const staleFuture = future.filter(event => String(event.lastChecked || "") < auditDate);
const missingTicketStatus = future.filter(event => !String(event.ticketStatus || "").trim());
const highMissingLineup = highFuture.filter(event => !isFestivalListing(event) && count(event.lineup) === 0);
const venueKeys = new Set(events.map(event => venueProfileKey(event.venue)).filter(Boolean));
const futureVenueKeys = new Set(future.map(event => venueProfileKey(event.venue)).filter(Boolean));
const futureVenueWatchKeys = new Set(
  watchFuture.map(event => venueProfileKey(event.venue)).filter(Boolean)
);
const futurePerformerKeys = new Set();
const futurePerformerWatchKeys = new Set();
const singleSourceFuturePerformerKeys = new Set();
for (const event of future) {
  for (const name of performerNamesForEvent(event)) {
    const key = performerProfileSlug(name);
    if (!key) continue;
    futurePerformerKeys.add(key);
    if (event.status === "watch" || event.confidence === "Watch") futurePerformerWatchKeys.add(key);
    if (eventSourceCount(event) <= 1) singleSourceFuturePerformerKeys.add(key);
  }
}
const qualityWatchById = new Map(
  (Array.isArray(payload.quality?.watchQueue) ? payload.quality.watchQueue : [])
    .map(item => [item.id, item])
);

const totals = {
  events: events.length,
  future: future.length,
  futureHigh: highFuture.length,
  futureWatch: watchFuture.length,
  singleSourceWatch: singleSourceWatch.length,
  venueProfiles: venueKeys.size,
  futureVenueProfiles: futureVenueKeys.size,
  futureVenueWatch: futureVenueWatchKeys.size,
  futurePerformerProfiles: futurePerformerKeys.size,
  futurePerformerWatch: futurePerformerWatchKeys.size,
  singleSourceFuturePerformers: singleSourceFuturePerformerKeys.size,
  futurePerformerProfileSources: Array.from(futurePerformerKeys)
    .filter(key => profileSourceCount(key) > 0).length,
  futurePerformerMissingProfileSources: Array.from(futurePerformerKeys)
    .filter(key => !(profileSourceCount(key) > 0)).length,
  djSourceUpgradeQueue: Array.from(singleSourceFuturePerformerKeys)
    .filter(key => !(profileSourceCount(key) > 0)).length,
  trackedDjProfiles: payload.djItineraryStats?.profileCount || 0,
  curatedDjSourceProfiles: payload.djItineraryStats?.curatedProfileCount || 0,
  trackedDjItineraryRows: payload.djItineraryStats?.rowCount || 0,
  staleFuture: staleFuture.length,
  missingTicketStatus: missingTicketStatus.length,
  highMissingLineup: highMissingLineup.length,
  curatedEventsApplied: payload.curatedEventsApplied,
  failedSourceReports: failedSourceReports.length,
};

if (payload.quality?.totals) {
  for (const [key, value] of Object.entries(totals)) {
    if (payload.quality.totals[key] !== value) {
      issues.push(`quality.totals.${key} is ${payload.quality.totals[key]}, expected ${value}`);
    }
  }
}

if (payload.quality) {
  if (!Array.isArray(payload.quality.venueCoverage) || payload.quality.venueCoverage.length !== venueKeys.size) {
    issues.push("quality.venueCoverage must cover every sourced venue profile");
  }
  if (!Array.isArray(payload.quality.djCoverage?.futureProfiles) || payload.quality.djCoverage.futureProfiles.length !== futurePerformerKeys.size) {
    issues.push("quality.djCoverage.futureProfiles must cover every future sourced performer profile");
  }
  if (!Array.isArray(payload.quality.djCoverage?.sourceUpgradeQueue)
    || payload.quality.djCoverage.sourceUpgradeQueue.length !== totals.djSourceUpgradeQueue) {
    issues.push("quality.djCoverage.sourceUpgradeQueue must match future performers needing profile-source upgrades");
  }
}

console.log(JSON.stringify({
  auditDate,
  generatedAt: payload.generatedAt,
  totals,
  venueCoverage: Array.isArray(payload.quality?.venueCoverage)
    ? payload.quality.venueCoverage.filter(venue => venue.futureEvents > 0).slice(0, 12).map(venue => ({
      venue: venue.venue,
      futureEvents: venue.futureEvents,
      highConfidenceEvents: venue.highConfidenceEvents,
      watchEvents: venue.watchEvents,
      priority: venue.priority,
      fitScore: venue.fitScore,
      sourceCount: venue.sourceCount,
      nextEventDate: venue.nextEventDate,
    }))
    : [],
  djCoverage: {
    trackedItineraryProfiles: payload.quality?.djCoverage?.trackedItineraryProfiles,
    curatedSourceProfiles: payload.quality?.djCoverage?.curatedSourceProfiles,
    trackedItineraryRows: payload.quality?.djCoverage?.trackedItineraryRows,
    sourceUpgradeQueue: Array.isArray(payload.quality?.djCoverage?.sourceUpgradeQueue)
      ? payload.quality.djCoverage.sourceUpgradeQueue.slice(0, 12).map(profile => ({
        name: profile.name,
        priority: profile.priority,
        fitScore: profile.fitScore,
        futureEventCount: profile.futureEventCount,
        singleSourceFutureAppearances: profile.singleSourceFutureAppearances,
        nextDate: profile.nextDate,
        venues: profile.venues,
      }))
      : [],
    futureProfiles: Array.isArray(payload.quality?.djCoverage?.futureProfiles)
      ? payload.quality.djCoverage.futureProfiles.slice(0, 12).map(profile => ({
        name: profile.name,
        futureEventCount: profile.futureEventCount,
        watchAppearances: profile.watchAppearances,
        singleSourceFutureAppearances: profile.singleSourceFutureAppearances,
        trackedProfileSourceCount: profile.trackedProfileSourceCount,
        priority: profile.priority,
        fitScore: profile.fitScore,
        nextDate: profile.nextDate,
      }))
      : [],
  },
  watchQueue: (Array.isArray(payload.quality?.watchQueue) ? payload.quality.watchQueue : watchFuture).map(item => {
    const event = item.id ? events.find(candidate => candidate.id === item.id) || item : item;
    const quality = qualityWatchById.get(event.id) || item;
    return {
      id: event.id,
      date: event.sortDate || item.date,
      title: event.title || item.title,
      venue: event.venue || item.venue,
      priority: quality.priority,
      fitScore: quality.fitScore,
      sourceLabel: event.sourceLabel || item.sourceLabel,
      sourceCount: eventSourceCount(event),
      reason: quality.reason,
      nextAction: quality.nextAction,
    };
  }),
  warnings,
}, null, 2));

if (issues.length) {
  throw new Error(`event audit failed:\n- ${issues.join("\n- ")}`);
}
