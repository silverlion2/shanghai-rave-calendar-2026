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
    "pad2",
    "eventDate",
    "eventArchiveCutoff",
    "eventIsPastByCutoff",
    "eventTemporalStatus",
    "eventIsWatchStatus",
    "eventEffectiveStatus",
    "eventMatchesStatus",
    "eventCity",
    "eventMatchesCity",
    "posterUrl",
    "eventHasPoster",
    "eventMatchesPoster",
    "eventStartTimestamp",
    "eventTemporalRank",
    "compareEventText",
    "compareEventsForSort",
    "filteredEvents",
  ].map(name => extractFunction(html, name)).join("\n");
  return Function(`
    let events = [];
    const archiveCutoffHour = 6;
    const statusNow = new Date("2026-06-15T12:00:00+08:00");
    const today = new Date(2026, 5, 15);
    const posterUrlOverrides = {};
    const optimizedPosterUrlOverrides = {};
    const posterDisplayByEventId = new Map();
    const searchInput = { value: "" };
    const statusFilter = { value: "all" };
    const cityFilter = { value: "all" };
    const posterFilter = { value: "with-poster" };
    const vibeFilter = { value: "all" };
    const sortFilter = { value: "smart" };
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
      setPoster(next) {
        posterFilter.value = next;
      },
      setSort(next) {
        sortFilter.value = next;
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

test("poster wall defaults to poster-backed rows while keeping dates and cities broad", () => {
  const html = readSiteFile("poster-wall.html");
  assert.match(html, /<select class="select" id="statusFilter"[\s\S]*?>\s*<option value="all">All dates<\/option>/);
  assert.match(html, /<select class="select" id="cityFilter"[\s\S]*?>\s*<option value="all">All cities<\/option>/);
  assert.match(html, /<select class="select" id="posterFilter"[\s\S]*?>\s*<option value="with-poster">Has poster<\/option>/);

  const filters = posterWallFiltersForTest();
  filters.setEvents([
    { id: "past-date", title: "Past date", sortDate: "2026-06-14", status: "upcoming", posterUrl: "assets/posters/past.jpg" },
    { id: "current-watch", title: "Current watch", sortDate: "2026-06-15", status: "watch", posterUrl: "assets/posters/current-watch.jpg" },
    { id: "current-upcoming", title: "Current upcoming", sortDate: "2026-06-15", status: "upcoming", posterUrl: "assets/posters/current-upcoming.jpg" },
    { id: "future-past-status", title: "Future past status", sortDate: "2026-06-16", status: "past", posterUrl: "assets/posters/future-past.jpg" },
    { id: "future-watch", title: "Future watch", sortDate: "2026-06-17", status: "watch", posterUrl: "assets/posters/future-watch.jpg" },
    { id: "future-upcoming", title: "Future upcoming", sortDate: "2026-06-18", status: "upcoming", posterUrl: "assets/posters/future-upcoming.jpg" },
    { id: "other-city", title: "Other city", city: "Hangzhou", sortDate: "2026-06-19", status: "upcoming", posterUrl: "assets/posters/other-city.jpg" },
    { id: "no-poster", title: "No Poster", sortDate: "2026-06-20", status: "upcoming" },
  ]);

  assert.deepEqual(
    filters.filteredEvents().map(event => event.id),
    ["current-watch", "current-upcoming", "future-watch", "future-upcoming", "other-city", "past-date", "future-past-status"],
  );
});

test("poster wall poster filter can isolate missing poster rows or show all rows", () => {
  const filters = posterWallFiltersForTest();
  filters.setEvents([
    { id: "with-poster", title: "With Poster", sortDate: "2026-06-16", status: "upcoming", posterUrl: "assets/posters/with.jpg" },
    { id: "with-archive", title: "With Archive", sortDate: "2026-06-17", status: "upcoming", imageUrl: "assets/posters/archive.jpg" },
    { id: "missing-poster", title: "Missing Poster", sortDate: "2026-06-18", status: "upcoming" },
  ]);

  assert.deepEqual(
    filters.filteredEvents().map(event => event.id),
    ["with-poster", "with-archive"],
  );

  filters.setPoster("no-poster");
  assert.deepEqual(
    filters.filteredEvents().map(event => event.id),
    ["missing-poster"],
  );

  filters.setPoster("all");
  assert.deepEqual(
    filters.filteredEvents().map(event => event.id),
    ["with-poster", "with-archive", "missing-poster"],
  );
});

test("poster wall status filter can isolate current and future upcoming events", () => {
  const filters = posterWallFiltersForTest();
  filters.setEvents([
    { id: "past-date", title: "Past date", sortDate: "2026-06-14", status: "upcoming", posterUrl: "assets/posters/past.jpg" },
    { id: "current-watch", title: "Current watch", sortDate: "2026-06-15", status: "watch", posterUrl: "assets/posters/current-watch.jpg" },
    { id: "current-upcoming", title: "Current upcoming", sortDate: "2026-06-15", status: "upcoming", posterUrl: "assets/posters/current-upcoming.jpg" },
    { id: "future-watch", title: "Future watch", sortDate: "2026-06-17", status: "watch", posterUrl: "assets/posters/future-watch.jpg" },
    { id: "future-upcoming", title: "Future upcoming", sortDate: "2026-06-18", status: "upcoming", posterUrl: "assets/posters/future-upcoming.jpg" },
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
    { id: "past-date", title: "Past date", sortDate: "2026-06-14", status: "past", posterUrl: "assets/posters/past.jpg" },
    { id: "future-past-status", title: "Future past status", sortDate: "2026-06-16", status: "past", posterUrl: "assets/posters/future-past.jpg" },
    { id: "future-watch", title: "Future watch", sortDate: "2026-06-17", status: "watch", posterUrl: "assets/posters/future-watch.jpg" },
  ]);

  assert.deepEqual(
    filters.filteredEvents().map(event => event.id),
    ["past-date", "future-past-status"],
  );
});

test("poster wall city filter defaults to all cities and can isolate Shanghai", () => {
  const filters = posterWallFiltersForTest();
  filters.setEvents([
    { id: "legacy-shanghai", title: "Legacy Shanghai", sortDate: "2026-06-16", status: "upcoming", posterUrl: "assets/posters/legacy.jpg" },
    { id: "explicit-shanghai", title: "Explicit Shanghai", city: "Shanghai", sortDate: "2026-06-17", status: "upcoming", posterUrl: "assets/posters/explicit.jpg" },
    { id: "hangzhou-upload", title: "Hangzhou Upload", city: "Hangzhou", sortDate: "2026-06-18", status: "upcoming", posterUrl: "assets/posters/hangzhou.jpg" },
  ]);

  assert.deepEqual(
    filters.filteredEvents().map(event => event.id),
    ["legacy-shanghai", "explicit-shanghai", "hangzhou-upload"],
  );

  filters.setCity("Shanghai");
  assert.deepEqual(
    filters.filteredEvents().map(event => event.id),
    ["legacy-shanghai", "explicit-shanghai"],
  );
});

test("poster wall default sort keeps nearby events first and promotes posters within the same date", () => {
  const filters = posterWallFiltersForTest();
  filters.setPoster("all");
  filters.setEvents([
    { id: "tomorrow-poster", title: "Tomorrow Poster", sortDate: "2026-06-16", time: "20:00", status: "upcoming", posterUrl: "assets/posters/tomorrow.jpg" },
    { id: "today-no-poster", title: "Today No Poster", sortDate: "2026-06-15", time: "20:00", status: "upcoming" },
    { id: "today-poster", title: "Today Poster", sortDate: "2026-06-15", time: "21:00", status: "upcoming", posterUrl: "assets/posters/today.jpg" },
  ]);

  assert.deepEqual(
    filters.filteredEvents().map(event => event.id),
    ["today-poster", "today-no-poster", "tomorrow-poster"],
  );

  filters.setSort("poster-first");
  assert.deepEqual(
    filters.filteredEvents().map(event => event.id),
    ["today-poster", "tomorrow-poster", "today-no-poster"],
  );
});

test("poster wall uses dense grid card layout across desktop tablet and mobile", () => {
  const html = readSiteFile("poster-wall.html");
  assert.match(html, /\.poster-waterfall\s*{\s*display: grid;/);
  assert.match(html, /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(html, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(html, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(html, /\.wall-card\s*{[\s\S]*grid-template-rows: auto 76px/);
  assert.match(html, /\.wall-card-body\s*{[\s\S]*height: 76px/);
  assert.match(html, /\.wall-column\s*{[\s\S]*flex-direction: column/);
  assert.match(html, /function posterWallColumnCount/);
  assert.match(html, /\.wall-card-poster img\s*{[\s\S]*object-fit: cover/);
  assert.match(html, /\.wall-column:nth-child\(2\)/);
  assert.doesNotMatch(html, /\.wall-card:nth-child\(10n/);
  assert.doesNotMatch(html, /wall-stamp-row/);
  assert.doesNotMatch(html, /status-pin/);
  assert.doesNotMatch(html, /wall-date-stamp/);
});

test("poster wall keeps the page chrome compact around the visual wall", () => {
  const html = readSiteFile("poster-wall.html");
  assert.match(html, /class="control-icon-link"/);
  assert.match(html, /Soon \+ art/);
  assert.match(html, /href="poster-wall\.html">Poster<\/a>/);
  assert.match(html, /<h1>Events<\/h1>/);
  assert.doesNotMatch(html, /Scan Shanghai club posters in a dense wall/);
  assert.doesNotMatch(html, /id="posterCount"/);
  assert.doesNotMatch(html, /id="posterScope"/);
  assert.doesNotMatch(html, /class="wall-meta"/);
  assert.doesNotMatch(html, /event cards<\/span>/);
});

test("poster wall cards keep ticket price and lineup details out of wall mode", () => {
  const html = readSiteFile("poster-wall.html");
  const cardSource = extractFunction(html, "eventCardHtml");
  assert.doesNotMatch(cardSource, /ticketActionHtml/);
  assert.doesNotMatch(cardSource, /lineupPreviewHtml/);
  assert.doesNotMatch(cardSource, /event\.price/);
  assert.doesNotMatch(cardSource, /wall-card-actions/);
  assert.match(extractFunction(html, "eventEssentialFacts"), /\["Price"/);
  assert.match(extractFunction(html, "modalInsightsHtml"), /\["Lineup"/);
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
