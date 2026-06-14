const fs = require("fs");

const DATA_FILE = "data/events.json";
const TRACKED_DJ_PROFILES_FILE = "config/tracked-dj-profiles.json";
const RA_SHANGHAI_COVERAGE_FILE = "config/ra-shanghai-coverage.json";
const payload = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
const events = Array.isArray(payload.events) ? payload.events : [];
const auditDate = process.env.EVENT_AUDIT_DATE || payload.verified;
const trackedDjProfileConfig = fs.existsSync(TRACKED_DJ_PROFILES_FILE)
  ? JSON.parse(fs.readFileSync(TRACKED_DJ_PROFILES_FILE, "utf8"))
  : { profiles: [] };
const curatedDjProfiles = Array.isArray(trackedDjProfileConfig)
  ? trackedDjProfileConfig
  : (Array.isArray(trackedDjProfileConfig.profiles) ? trackedDjProfileConfig.profiles : []);
const raShanghaiCoverageConfig = fs.existsSync(RA_SHANGHAI_COVERAGE_FILE)
  ? JSON.parse(fs.readFileSync(RA_SHANGHAI_COVERAGE_FILE, "utf8"))
  : null;

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
  const urls = new Set(eventSourceRows(event).map(source => String(source.url || "").trim()).filter(Boolean));
  return urls.size;
}

function eventSourceRows(event) {
  const rows = Array.isArray(event.sources) ? [...event.sources] : [];
  const primaryUrl = String(event.source || "").trim();
  if (primaryUrl && !rows.some(source => String(source?.url || "").trim() === primaryUrl)) {
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
  const url = String(source.url || "").trim();
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
    const url = String(source.url || "").trim();
    if (isConfirmationSource(source)) urls.add(url);
  }
  return urls.size;
}

function sourcePlatform(source = {}) {
  const explicit = cleanText(source.platform || source.sourcePlatform || "");
  if (explicit) return explicit;
  const url = String(source.url || "").trim();
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
  const url = String(source.url || "").trim();
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
    const url = String(source.url || "").trim();
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

function buildPlatformVerificationQueue(watchEvents, qualityWatchById = new Map()) {
  return watchEvents.map(event => {
    const platformSources = platformVerificationSourcesForEvent(event);
    if (!platformSources.length) return null;
    const quality = qualityWatchById.get(event.id) || {};
    return {
      id: event.id,
      date: event.sortDate,
      title: event.title,
      venue: event.venue,
      priority: quality.priority || "",
      fitScore: Number(quality.fitScore || 0),
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
  ].map(value => String(value || "").trim()).filter(Boolean);
}

function raVisibleUpcomingLabel(config) {
  const checks = Array.isArray(config?.listingChecks) ? config.listingChecks : [];
  const labeledChecks = checks
    .map(check => Number(check.visibleTotalLabel))
    .filter(value => Number.isFinite(value));
  if (!labeledChecks.length) return null;
  return labeledChecks[labeledChecks.length - 1];
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

function buildRaShanghaiCoverageSnapshot(config) {
  if (!config) {
    return {
      configured: false,
      expected: 0,
      covered: 0,
      missing: 0,
      supporting: 0,
      relatedContext: 0,
      rows: [],
    };
  }

  const rows = Array.isArray(config.events) ? config.events : [];
  const coverageRows = rows.map(row => {
    const expectedUrl = String(row.url || "").trim();
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
  const upcomingRows = coverageRows.filter(row => snapshotDate && String(row.date || "") >= snapshotDate);

  return {
    configured: true,
    updatedAt: config.updatedAt,
    cityListingUrl: config.cityListingUrl,
    expected: coverageRows.length,
    covered: coverageRows.filter(row => row.covered).length,
    missing: coverageRows.filter(row => !row.covered).length,
    visibleUpcomingLabel,
    upcomingExpected: upcomingRows.length,
    upcomingCovered: upcomingRows.filter(row => row.covered).length,
    upcomingMatchesListingLabel: visibleUpcomingLabel === null ? null : upcomingRows.length === visibleUpcomingLabel,
    supporting: coverageRows.filter(row => row.coverageRole === "supporting").length,
    relatedContext: Array.isArray(config.relatedContext) ? config.relatedContext.length : 0,
    rows: coverageRows,
  };
}

const future = futureEvents();
const issues = [];
const warnings = [];
const raShanghaiCoverage = buildRaShanghaiCoverageSnapshot(raShanghaiCoverageConfig);

if (raShanghaiCoverage.configured) {
  if (String(raShanghaiCoverage.updatedAt || "") < auditDate) {
    warnings.push(`RA Shanghai coverage manifest is stale (${raShanghaiCoverage.updatedAt || "missing"})`);
  }
  if (raShanghaiCoverage.visibleUpcomingLabel !== null && !raShanghaiCoverage.upcomingMatchesListingLabel) {
    issues.push(`RA Shanghai coverage has ${raShanghaiCoverage.upcomingExpected} upcoming manifest rows for ${raShanghaiCoverage.updatedAt}, expected listing label ${raShanghaiCoverage.visibleUpcomingLabel}`);
  }
  for (const row of raShanghaiCoverage.rows) {
    if (!row.covered) {
      issues.push(`RA Shanghai coverage missing ${row.raEventId} (${row.title}) -> ${row.url}`);
    } else if (!row.dateMatched) {
      warnings.push(`RA Shanghai coverage ${row.raEventId} maps to ${row.matchedEventId} with date ${row.matchedDate || "missing"}, expected ${row.date}`);
    }
  }
}

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
const singleConfirmationWatch = watchFuture.filter(event => eventConfirmationSourceCount(event) <= 1);
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
const qualityWatchQueue = Array.isArray(payload.quality?.watchQueue) ? payload.quality.watchQueue : [];
const platformVerificationQueue = buildPlatformVerificationQueue(watchFuture, qualityWatchById);
const qualityPlatformVerificationQueue = Array.isArray(payload.quality?.platformVerificationQueue)
  ? payload.quality.platformVerificationQueue
  : [];

const totals = {
  events: events.length,
  future: future.length,
  futureHigh: highFuture.length,
  futureWatch: watchFuture.length,
  singleSourceWatch: singleSourceWatch.length,
  singleConfirmationWatch: singleConfirmationWatch.length,
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
  platformVerificationQueue: platformVerificationQueue.length,
  platformVerificationSources: platformVerificationQueue.reduce((total, item) => total + item.platformSourceCount, 0),
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
  for (const item of qualityWatchQueue) {
    const event = events.find(candidate => candidate.id === item.id);
    if (!event) continue;
    if (eventSourceCount(event) > 1 && /\bsingle-source\b/i.test(String(item.reason || ""))) {
      issues.push(`quality.watchQueue.${item.id}.reason says single-source but event has ${eventSourceCount(event)} sources`);
    }
    if (item.confirmationSourceCount !== eventConfirmationSourceCount(event)) {
      issues.push(`quality.watchQueue.${item.id}.confirmationSourceCount is ${item.confirmationSourceCount}, expected ${eventConfirmationSourceCount(event)}`);
    }
    if (eventConfirmationSourceCount(event) <= 1 && eventSourceCount(event) > 1 && !/\bsingle-confirmation-source\b/i.test(String(item.reason || ""))) {
      issues.push(`quality.watchQueue.${item.id}.reason should flag single-confirmation-source`);
    }
  }
  if (!Array.isArray(payload.quality.platformVerificationQueue)) {
    issues.push("quality.platformVerificationQueue must list Watch rows with platform-native verification leads");
  } else if (payload.quality.platformVerificationQueue.length !== platformVerificationQueue.length) {
    issues.push(`quality.platformVerificationQueue has ${payload.quality.platformVerificationQueue.length} rows, expected ${platformVerificationQueue.length}`);
  }
  const qualityPlatformById = new Map(qualityPlatformVerificationQueue.map(item => [item.id, item]));
  for (const expected of platformVerificationQueue) {
    const actual = qualityPlatformById.get(expected.id);
    if (!actual) {
      issues.push(`quality.platformVerificationQueue missing ${expected.id}`);
      continue;
    }
    if (actual.confirmationSourceCount !== expected.confirmationSourceCount) {
      issues.push(`quality.platformVerificationQueue.${expected.id}.confirmationSourceCount is ${actual.confirmationSourceCount}, expected ${expected.confirmationSourceCount}`);
    }
    if (actual.platformSourceCount !== expected.platformSourceCount) {
      issues.push(`quality.platformVerificationQueue.${expected.id}.platformSourceCount is ${actual.platformSourceCount}, expected ${expected.platformSourceCount}`);
    }
    const actualUrls = new Set((Array.isArray(actual.platformSources) ? actual.platformSources : []).map(source => String(source.url || "").trim()).filter(Boolean));
    const expectedUrls = expected.platformSources.map(source => source.url);
    for (const url of expectedUrls) {
      if (!actualUrls.has(url)) {
        issues.push(`quality.platformVerificationQueue.${expected.id} missing platform source ${url}`);
      }
    }
    if (!Array.isArray(actual.searchQueries) || actual.searchQueries.length === 0) {
      issues.push(`quality.platformVerificationQueue.${expected.id} must include platform-native search queries`);
    }
  }
  if (payload.quality.raShanghaiCoverage) {
    const qualityRaCoverage = payload.quality.raShanghaiCoverage;
    for (const field of ["expected", "covered", "missing", "visibleUpcomingLabel", "upcomingExpected", "upcomingCovered", "supporting", "relatedContext"]) {
      if (qualityRaCoverage[field] !== raShanghaiCoverage[field]) {
        issues.push(`quality.raShanghaiCoverage.${field} is ${qualityRaCoverage[field]}, expected ${raShanghaiCoverage[field]}`);
      }
    }
    if (qualityRaCoverage.upcomingMatchesListingLabel !== raShanghaiCoverage.upcomingMatchesListingLabel) {
      issues.push(`quality.raShanghaiCoverage.upcomingMatchesListingLabel is ${qualityRaCoverage.upcomingMatchesListingLabel}, expected ${raShanghaiCoverage.upcomingMatchesListingLabel}`);
    }
    if (!Array.isArray(qualityRaCoverage.rows) || qualityRaCoverage.rows.length !== raShanghaiCoverage.rows.length) {
      issues.push("quality.raShanghaiCoverage.rows must match the RA Shanghai coverage manifest length");
    }
  } else if (raShanghaiCoverage.configured) {
    issues.push("quality.raShanghaiCoverage is missing while config/ra-shanghai-coverage.json is configured");
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
  watchQueue: (qualityWatchQueue.length ? qualityWatchQueue : watchFuture).map(item => {
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
      confirmationSourceCount: eventConfirmationSourceCount(event),
      reason: quality.reason,
      nextAction: quality.nextAction,
    };
  }),
  platformVerificationQueue: (qualityPlatformVerificationQueue.length ? qualityPlatformVerificationQueue : platformVerificationQueue).map(item => ({
    id: item.id,
    date: item.date,
    title: item.title,
    venue: item.venue,
    priority: item.priority,
    fitScore: item.fitScore,
    confirmationSourceCount: item.confirmationSourceCount,
    platformSourceCount: item.platformSourceCount,
    platforms: Array.isArray(item.platformSources)
      ? Array.from(new Set(item.platformSources.map(source => source.platform).filter(Boolean)))
      : [],
    evidenceStates: Array.isArray(item.platformSources)
      ? Array.from(new Set(item.platformSources.map(source => source.evidenceState).filter(Boolean)))
      : [],
    searchQueries: Array.isArray(item.searchQueries) ? item.searchQueries.slice(0, 3) : [],
    nextAction: item.nextAction,
  })),
  raShanghaiCoverage: {
    configured: raShanghaiCoverage.configured,
    updatedAt: raShanghaiCoverage.updatedAt,
    cityListingUrl: raShanghaiCoverage.cityListingUrl,
    expected: raShanghaiCoverage.expected,
    covered: raShanghaiCoverage.covered,
    missing: raShanghaiCoverage.missing,
    visibleUpcomingLabel: raShanghaiCoverage.visibleUpcomingLabel,
    upcomingExpected: raShanghaiCoverage.upcomingExpected,
    upcomingCovered: raShanghaiCoverage.upcomingCovered,
    upcomingMatchesListingLabel: raShanghaiCoverage.upcomingMatchesListingLabel,
    supporting: raShanghaiCoverage.supporting,
    relatedContext: raShanghaiCoverage.relatedContext,
    rows: raShanghaiCoverage.rows.map(row => ({
      raEventId: row.raEventId,
      eventId: row.eventId,
      matchedEventId: row.matchedEventId,
      title: row.title,
      date: row.date,
      coverageRole: row.coverageRole,
      covered: row.covered,
      dateMatched: row.dateMatched,
    })),
  },
  warnings,
}, null, 2));

if (issues.length) {
  throw new Error(`event audit failed:\n- ${issues.join("\n- ")}`);
}
