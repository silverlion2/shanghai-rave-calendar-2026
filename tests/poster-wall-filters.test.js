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
  const helperSource = [
    "eventDate",
    "eventArchiveCutoff",
    "eventIsPastByCutoff",
    "eventTemporalStatus",
    "eventIsWatchStatus",
    "eventEffectiveStatus",
    "eventMatchesStatus",
    "eventCity",
    "eventMatchesCity",
    "filteredEvents",
  ].map(name => extractFunction(html, name)).join("\n");
  return Function(`
    let events = [];
    const archiveCutoffHour = 6;
    const statusNow = new Date("2026-06-15T12:00:00+08:00");
    const today = new Date(2026, 5, 15);
    const searchInput = { value: "" };
    const statusFilter = { value: "active" };
    const cityFilter = { value: "Shanghai" };
    const vibeFilter = { value: "all" };
    function eventSoundTags() {
      return [];
    }
    function eventDecisionTags() {
      return [];
    }
    function searchable(event) {
      return String(event.title || "").toLowerCase();
    }
    ${helperSource}
    return {
      setEvents(next) {
        events = next;
      },
      setStatus(next) {
        statusFilter.value = next;
      },
      setCity(next) {
        cityFilter.value = next;
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

test("poster wall default active filter excludes past dates and past status rows", () => {
  const filters = posterWallFiltersForTest();
  filters.setEvents([
    { id: "past-date", title: "Past date", sortDate: "2026-06-14", status: "upcoming" },
    { id: "current-watch", title: "Current watch", sortDate: "2026-06-15", status: "watch" },
    { id: "current-upcoming", title: "Current upcoming", sortDate: "2026-06-15", status: "upcoming" },
    { id: "future-past-status", title: "Future past status", sortDate: "2026-06-16", status: "past" },
    { id: "future-watch", title: "Future watch", sortDate: "2026-06-17", status: "watch" },
    { id: "future-upcoming", title: "Future upcoming", sortDate: "2026-06-18", status: "upcoming" },
  ]);

  assert.deepEqual(
    filters.filteredEvents().map(event => event.id),
    ["current-watch", "current-upcoming", "future-watch", "future-upcoming"],
  );
});

test("poster wall status filter can isolate current and future upcoming events", () => {
  const filters = posterWallFiltersForTest();
  filters.setEvents([
    { id: "past-date", title: "Past date", sortDate: "2026-06-14", status: "upcoming" },
    { id: "current-watch", title: "Current watch", sortDate: "2026-06-15", status: "watch" },
    { id: "current-upcoming", title: "Current upcoming", sortDate: "2026-06-15", status: "upcoming" },
    { id: "future-watch", title: "Future watch", sortDate: "2026-06-17", status: "watch" },
    { id: "future-upcoming", title: "Future upcoming", sortDate: "2026-06-18", status: "upcoming" },
  ]);

  filters.setStatus("current");
  assert.deepEqual(
    filters.filteredEvents().map(event => event.id),
    ["current-watch", "current-upcoming"],
  );

  filters.setStatus("upcoming");
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

test("poster wall city filter defaults to Shanghai and supports all cities", () => {
  const filters = posterWallFiltersForTest();
  filters.setEvents([
    { id: "legacy-shanghai", title: "Legacy Shanghai", sortDate: "2026-06-16", status: "upcoming" },
    { id: "explicit-shanghai", title: "Explicit Shanghai", city: "Shanghai", sortDate: "2026-06-17", status: "upcoming" },
    { id: "hangzhou-upload", title: "Hangzhou Upload", city: "Hangzhou", sortDate: "2026-06-18", status: "upcoming" },
  ]);

  assert.deepEqual(
    filters.filteredEvents().map(event => event.id),
    ["legacy-shanghai", "explicit-shanghai"],
  );

  filters.setCity("all");
  assert.deepEqual(
    filters.filteredEvents().map(event => event.id),
    ["legacy-shanghai", "explicit-shanghai", "hangzhou-upload"],
  );
});

test("poster wall uses dense grid card layout across desktop tablet and mobile", () => {
  const html = readSiteFile("poster-wall.html");
  assert.match(html, /\.poster-waterfall\s*{\s*display: grid;/);
  assert.match(html, /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(html, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(html, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(html, /\.wall-card\s*{[\s\S]*grid-template-rows: auto 162px/);
  assert.match(html, /\.wall-card-body\s*{[\s\S]*height: 162px/);
  assert.match(html, /\.wall-column\s*{[\s\S]*flex-direction: column/);
  assert.match(html, /function posterWallColumnCount/);
  assert.match(html, /\.wall-card-poster img\s*{[\s\S]*object-fit: cover/);
  assert.match(html, /\.wall-column:nth-child\(2\)/);
  assert.doesNotMatch(html, /\.wall-card:nth-child\(10n/);
  assert.doesNotMatch(html, /wall-stamp-row/);
  assert.doesNotMatch(html, /status-pin/);
  assert.doesNotMatch(html, /wall-date-stamp/);
});

test("poster wall detail view includes a large poster lightbox", () => {
  const html = readSiteFile("poster-wall.html");
  assert.match(html, /id="modalPosterOpen"/);
  assert.match(html, /id="modalPosterLarge"/);
  assert.match(html, /id="posterLightbox"/);
  assert.match(html, /id="posterLightboxImage"/);
  assert.match(html, /function openPosterLightbox/);
  assert.match(html, /function closePosterLightbox/);
});

test("poster wall keeps source UI hidden and exposes ticket actions separately", () => {
  const html = readSiteFile("poster-wall.html");
  assert.match(html, /id="modalTicket"/);
  assert.match(html, /function ticketActionHref/);
  assert.match(html, /function showTicketAction/);
  assert.doesNotMatch(html, /id="modalSource"/);
  assert.doesNotMatch(html, />Source<\/a>/);
  assert.doesNotMatch(html, /Open the source link/);
  assert.doesNotMatch(html, /Source first/);
  assert.doesNotMatch(html, /Source confidence/);
  assert.doesNotMatch(html, /\["Source",/);
  assert.doesNotMatch(html, /event\.sourceLabel \|\| "Source"/);
});

test("poster wall loads through shared data adapter instead of direct JSON Promise.all", () => {
  const html = readSiteFile("poster-wall.html");
  assert.match(html, /assets\/poster-wall-data\.js/);
  assert.match(html, /PosterWallData\.loadPosterWallData/);
  assert.doesNotMatch(html, /Promise\.all\(\s*\[\s*fetch\("data\/events\.json"\)/);
});
