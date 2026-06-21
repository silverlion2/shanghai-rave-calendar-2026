const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const EVENTS_FILE = path.join(ROOT, "data", "events.json");
const DEFAULT_CITY = "Shanghai";

function hasPoster(event) {
  return Boolean(event && (event.posterUrl || event.posterImageUrl || event.imageUrl));
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function comparableText(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compactTitle(value) {
  return comparableText(value).replace(/\s+/g, "");
}

function compactBaseTitle(value) {
  return comparableText(cleanText(value).replace(/\([^)]*\)/g, " ")).replace(/\s+/g, "");
}

function deriveSortDate(event) {
  const existing = cleanText(event.sortDate || event.sort_date);
  if (/^\d{4}-\d{2}-\d{2}$/.test(existing)) return existing;

  const dateLabel = cleanText(event.date);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateLabel)) return dateLabel;

  const idDate = cleanText(event.id).match(/^(\d{4}-\d{2}-\d{2})\b/);
  if (idDate) return idDate[1];

  return "";
}

function duplicateKeys(event) {
  const sortDate = deriveSortDate(event);
  const venue = comparableText(event.venueName || event.venue);
  const title = compactTitle(event.title || event.name);
  const baseTitle = compactBaseTitle(event.title || event.name);
  const keys = [];
  if (sortDate && venue && title) keys.push(["exact", sortDate, venue, title].join("|"));
  if (sortDate && baseTitle && baseTitle.length >= 8) keys.push(["date-title", sortDate, baseTitle].join("|"));
  return keys;
}

function uniqueValues(values) {
  return Array.from(new Set((values || []).map(value => cleanText(value)).filter(Boolean)));
}

function otherCityTags(city) {
  const cityName = cleanText(city);
  if (!cityName || cityName.toLowerCase() === DEFAULT_CITY.toLowerCase()) return [];
  return ["other city", cityName.toLowerCase()];
}

function ensureOtherCityTags(event) {
  const tags = otherCityTags(event.city);
  if (!tags.length) return [];
  const repairs = [];
  for (const field of ["tags", "decisionTags"]) {
    const existing = Array.isArray(event[field]) ? event[field] : [];
    const next = uniqueValues([...existing, ...tags]);
    if (next.length !== existing.length || next.some((value, index) => value !== existing[index])) {
      event[field] = next;
      repairs.push({ id: cleanText(event.id) || "(missing id)", field, value: tags.join(", ") });
    }
  }
  return repairs;
}

function eventQualityScore(event) {
  const sourceLabel = comparableText(event.sourceLabel || event.sourcePlatform);
  const source = cleanText(event.sourceUrl || event.source);
  const sourceScore = source && sourceLabel !== "poster archive" ? 50 : 0;
  const cityScore = comparableText(event.city) === "shanghai" ? 20 : 0;
  return [
    cityScore,
    sourceScore,
    Array.isArray(event.lineup) ? event.lineup.length * 5 : 0,
    cleanText(event.description) ? 6 : 0,
    cleanText(event.sourceStatus) ? 4 : 0,
    cleanText(event.lastChecked || event.checkedSource) ? 3 : 0,
    cleanText(event.recommendationReason) ? 2 : 0,
    hasPoster(event) ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0);
}

function dedupePosterEvents(events) {
  const result = [];
  const byKey = new Map();
  const removals = [];

  for (const event of events) {
    const keys = hasPoster(event) ? duplicateKeys(event) : [];
    if (!keys.length) {
      result.push(event);
      continue;
    }

    const existingIndex = keys.map(key => byKey.get(key)).find(index => index !== undefined);
    if (existingIndex === undefined) {
      keys.forEach(key => byKey.set(key, result.length));
      result.push(event);
      continue;
    }

    const existing = result[existingIndex];
    if (eventQualityScore(event) > eventQualityScore(existing)) {
      removals.push({ droppedId: cleanText(existing.id), keptId: cleanText(event.id), key: keys[0] });
      result[existingIndex] = event;
      keys.forEach(key => byKey.set(key, existingIndex));
    } else {
      removals.push({ droppedId: cleanText(event.id), keptId: cleanText(existing.id), key: keys[0] });
    }
  }

  return { events: result, removals };
}

function repairPosterEventsForWall(payload) {
  const events = Array.isArray(payload?.events) ? payload.events : [];
  const repairs = [];

  for (const event of events) {
    if (!hasPoster(event)) continue;
    const id = cleanText(event.id) || "(missing id)";

    if (!cleanText(event.title) && cleanText(event.name)) {
      event.title = cleanText(event.name);
      repairs.push({ id, field: "title", value: event.title });
    }

    if (!cleanText(event.sortDate)) {
      const sortDate = deriveSortDate(event);
      if (sortDate) {
        event.sortDate = sortDate;
        repairs.push({ id, field: "sortDate", value: sortDate });
      }
    }

    repairs.push(...ensureOtherCityTags(event));
  }

  const deduped = dedupePosterEvents(events);
  if (deduped.removals.length && payload && Array.isArray(payload.events)) {
    payload.events = deduped.events;
    for (const removal of deduped.removals) {
      repairs.push({
        id: removal.droppedId || "(missing id)",
        field: "duplicate",
        value: `kept ${removal.keptId || "(missing id)"}`,
      });
    }
  }

  return { events: payload?.events || deduped.events, repairs };
}

function summarizePosterEvents(payload) {
  const events = Array.isArray(payload?.events) ? payload.events : [];
  const posterEvents = events.filter(hasPoster);
  const wallReadyPosterEvents = posterEvents.filter(event => cleanText(event.id) && cleanText(event.title));
  const cityCounts = {};
  for (const event of posterEvents) {
    const city = cleanText(event.city) || DEFAULT_CITY;
    cityCounts[city] = (cityCounts[city] || 0) + 1;
  }

  return {
    totalEvents: events.length,
    posterEvents: posterEvents.length,
    wallReadyPosterEvents: wallReadyPosterEvents.length,
    shanghaiPosterEvents: cityCounts[DEFAULT_CITY] || 0,
    cityCounts,
    missingTitle: posterEvents.filter(event => !cleanText(event.title)).length,
    missingSortDate: posterEvents.filter(event => !cleanText(event.sortDate)).length,
  };
}

function main() {
  const checkOnly = process.argv.includes("--check");
  const payload = JSON.parse(fs.readFileSync(EVENTS_FILE, "utf8"));
  const before = summarizePosterEvents(payload);
  const { repairs } = repairPosterEventsForWall(payload);
  const after = summarizePosterEvents(payload);

  if (repairs.length && !checkOnly) {
    fs.writeFileSync(EVENTS_FILE, `${JSON.stringify(payload, null, 2)}\n`);
  }

  console.log("Poster wall local update");
  console.log(`  events: ${after.totalEvents}`);
  console.log(`  poster events: ${after.posterEvents}`);
  console.log(`  wall-ready poster events: ${after.wallReadyPosterEvents}`);
  console.log(`  Shanghai poster events: ${after.shanghaiPosterEvents}`);
  console.log(`  repairs ${checkOnly ? "needed" : "applied"}: ${repairs.length}`);
  console.log(`  missing title: ${before.missingTitle} -> ${after.missingTitle}`);
  console.log(`  missing sortDate: ${before.missingSortDate} -> ${after.missingSortDate}`);
  console.log(`  cities: ${Object.entries(after.cityCounts).map(([city, count]) => `${city}=${count}`).join(", ")}`);

  if (checkOnly && repairs.length) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  dedupePosterEvents,
  deriveSortDate,
  repairPosterEventsForWall,
  summarizePosterEvents,
};
