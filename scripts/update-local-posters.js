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

function deriveSortDate(event) {
  const existing = cleanText(event.sortDate || event.sort_date);
  if (/^\d{4}-\d{2}-\d{2}$/.test(existing)) return existing;

  const dateLabel = cleanText(event.date);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateLabel)) return dateLabel;

  const idDate = cleanText(event.id).match(/^(\d{4}-\d{2}-\d{2})\b/);
  if (idDate) return idDate[1];

  return "";
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

  }

  return { events, repairs };
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
  deriveSortDate,
  repairPosterEventsForWall,
  summarizePosterEvents,
};
