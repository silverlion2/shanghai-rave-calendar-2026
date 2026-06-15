const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

function readSiteFile(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function extractFunction(source, name) {
  const marker = `function ${name}`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${name} should be defined`);

  const bodyStart = source.indexOf("{", start);
  assert.notEqual(bodyStart, -1, `${name} should have a body`);

  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }

  assert.fail(`${name} body should close`);
}

function posterWallFiltersForTest() {
  const html = readSiteFile("poster-wall.html");
  const filteredEvents = extractFunction(html, "filteredEvents");
  return Function(`
    let events = [];
    const today = new Date(2026, 5, 15);
    const searchInput = { value: "" };
    const statusFilter = { value: "upcoming" };
    const vibeFilter = { value: "all" };
    function eventDate(event) {
      const [year, month, day] = String(event.sortDate).split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    function eventSoundTags() {
      return [];
    }
    function eventDecisionTags() {
      return [];
    }
    function searchable(event) {
      return String(event.title || "").toLowerCase();
    }
    ${filteredEvents}
    return {
      setEvents(next) {
        events = next;
      },
      setStatus(next) {
        statusFilter.value = next;
      },
      filteredEvents,
    };
  `)();
}

function posterWallImagesForTest() {
  const html = readSiteFile("poster-wall.html");
  const posterUrl = extractFunction(html, "posterUrl");
  const loadPosterArchive = extractFunction(html, "loadPosterArchive");
  return Function(`
    const posterUrlOverrides = {};
    const optimizedPosterUrlOverrides = {
      "assets/posters/raw.jpg": "assets/posters/raw-optimized.jpg",
    };
    let posterDisplayByEventId = new Map();
    ${posterUrl}
    ${loadPosterArchive}
    return { posterUrl, loadPosterArchive };
  `)();
}

test("poster wall default upcoming filter excludes past dates and past status rows", () => {
  const filters = posterWallFiltersForTest();
  filters.setEvents([
    { id: "past-date", title: "Past date", sortDate: "2026-06-14", status: "past" },
    { id: "future-past-status", title: "Future past status", sortDate: "2026-06-16", status: "past" },
    { id: "future-watch", title: "Future watch", sortDate: "2026-06-17", status: "watch" },
    { id: "future-upcoming", title: "Future upcoming", sortDate: "2026-06-18", status: "upcoming" },
  ]);

  assert.deepEqual(
    filters.filteredEvents().map(event => event.id),
    ["future-watch", "future-upcoming"],
  );
});

test("poster wall prefers poster archive display images over raw event poster paths", () => {
  const images = posterWallImagesForTest();
  images.loadPosterArchive([
    {
      eventId: "event-with-archive",
      image: {
        sourceAsset: "assets/posters/raw.jpg",
        display: "assets/posters/archive-display-optimized.jpg",
      },
    },
  ]);

  assert.equal(
    images.posterUrl({
      id: "event-with-archive",
      posterUrl: "assets/posters/raw.jpg",
    }),
    "assets/posters/archive-display-optimized.jpg",
  );

  assert.equal(
    images.posterUrl({
      id: "fallback-event",
      posterUrl: "assets/posters/raw.jpg",
    }),
    "assets/posters/archive-display-optimized.jpg",
  );
});

test("poster wall past archive includes both past dates and explicit past status rows", () => {
  const filters = posterWallFiltersForTest();
  filters.setStatus("past");
  filters.setEvents([
    { id: "past-date", title: "Past date", sortDate: "2026-06-14", status: "past" },
    { id: "future-past-status", title: "Future past status", sortDate: "2026-06-16", status: "past" },
    { id: "future-watch", title: "Future watch", sortDate: "2026-06-17", status: "watch" },
  ]);

  assert.deepEqual(
    filters.filteredEvents().map(event => event.id),
    ["past-date", "future-past-status"],
  );
});
