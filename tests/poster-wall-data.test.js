const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

function loadModule(extraWindow = {}) {
  const source = fs.readFileSync(path.join(root, "assets", "poster-wall-data.js"), "utf8");
  const sandbox = {
    console,
    window: {
      ...extraWindow,
    },
  };
  sandbox.window.window = sandbox.window;
  vm.runInNewContext(source, sandbox, { filename: "assets/poster-wall-data.js" });
  return sandbox.window.PosterWallData;
}

test("normalizes static events, keeps accepted cities, and prefers poster archive display assets", () => {
  const module = loadModule();
  const eventsPayload = {
    events: [
      {
        id: "shanghai-row",
        title: "Shanghai Row",
        city: "Shanghai",
        date: "Jun 20",
        sortDate: "2026-06-20",
        time: "22:00",
        venue: "Abyss",
        district: "Huangpu",
        genre: "techno",
        status: "upcoming",
        confidence: "High",
        posterUrl: "assets/posters/raw.jpg",
        ticketUrl: "https://tickets.example.com/shanghai-row",
        ticketStatus: "on_sale",
        vibe: ["hard-techno"],
      },
      {
        id: "other-city",
        title: "Other City",
        city: "Berlin",
        sortDate: "2026-06-20",
        venue: "Elsewhere",
      },
    ],
  };
  const posterArchive = {
    posters: [
      {
        eventId: "shanghai-row",
        image: {
          display: "assets/posters/raw-optimized.jpg",
          thumbnail: "assets/posters/raw-thumb.jpg",
          sourceAsset: "assets/posters/raw.jpg",
        },
      },
    ],
  };

  const rows = module.normalizeStaticPayload(eventsPayload, posterArchive);

  assert.equal(rows.length, 2);
  const shanghaiRow = rows.find(row => row.id === "shanghai-row");
  const otherCityRow = rows.find(row => row.id === "other-city");
  assert.equal(shanghaiRow.posterUrl, "assets/posters/raw-optimized.jpg");
  assert.equal(shanghaiRow.posterImageUrl, "assets/posters/raw-thumb.jpg");
  assert.equal(shanghaiRow.ticketUrl, "https://tickets.example.com/shanghai-row");
  assert.equal(shanghaiRow.ticketStatus, "on_sale");
  assert.deepEqual(shanghaiRow.vibe, ["hard-techno"]);
  assert.equal(otherCityRow.city, "Berlin");
});

test("normalizes poster events that use name instead of title", () => {
  const module = loadModule();
  const rows = module.normalizeStaticPayload({
    events: [
      {
        id: "name-only-poster",
        name: "Name Only Poster",
        city: "Shanghai",
        sortDate: "2026-06-21",
        venue: "Shy People",
        posterUrl: "https://cdn.example.com/name-only.jpg",
      },
    ],
  }, { posters: [] });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, "Name Only Poster");
  assert.equal(rows[0].posterUrl, "https://cdn.example.com/name-only.jpg");
});

test("deduplicates same-date same-venue poster rows with compact title variants", () => {
  const module = loadModule();
  const rows = module.normalizeStaticPayload({
    events: [
      {
        id: "2026-06-21-friendsstandout",
        title: "FRIENDSSTAND out",
        city: "Shanghai",
        sortDate: "2026-06-21",
        venue: "Wigwam",
        posterUrl: "https://cdn.example.com/workbuddy.jpg",
        source: "https://shypeople.cn/FRIENDSSTAND-out",
        sourceLabel: "poster-archive",
      },
      {
        id: "friendsstandout",
        title: "FRIENDSSTANDout",
        city: "Shanghai",
        sortDate: "2026-06-21",
        venue: "Wigwam",
        posterUrl: "https://cdn.example.com/ra.jpg",
        source: "https://ra.co/events/2455159",
        sourceLabel: "RA",
        lineup: [
          { name: "Tsing" },
          { name: "YKK" },
        ],
      },
      {
        id: "same-room-different-party",
        title: "Different Party",
        city: "Shanghai",
        sortDate: "2026-06-21",
        venue: "Wigwam",
      },
    ],
  }, { posters: [] });

  assert.deepEqual(JSON.parse(JSON.stringify(rows.map(row => row.id))), ["friendsstandout", "same-room-different-party"]);
  assert.equal(rows[0].source, "https://ra.co/events/2455159");
  assert.deepEqual(rows[0].lineup, [{ name: "Tsing" }, { name: "YKK" }]);
});

test("deduplicates same-date series rows with descriptive title and venue drift", () => {
  const module = loadModule();
  const rows = module.normalizeSupabaseRows([
    {
      id: "house-of-zup-2026-06-21",
      title: "House of Zup (House, Disco, Hip Hop)",
      city: "Shanghai",
      sort_date: "2026-06-21",
      venue_name: "Star@ Culture Center",
      source_url: "https://www.smartshanghai.com/event/house-of-zup-house-disco-hip-hop-2026-06-21",
      source_label: "SmartShanghai",
      poster_url: "https://cdn.example.com/smartshanghai.jpg",
    },
    {
      id: "2026-06-21-house-of-zup-house-disco-hip-hop",
      title: "HOUSE OF ZUP",
      city: "Shanghai",
      sort_date: "2026-06-21",
      venue_name: "ZUP Pizza Bar",
      source_url: "https://ra.co/events/2470695",
      source_label: "Resident Advisor + SmartShanghai",
      poster_url: "https://cdn.example.com/ra.jpg",
      lineup: [{ name: "F-Mark" }, { name: "Skinny Brown" }],
    },
  ]);

  assert.deepEqual(JSON.parse(JSON.stringify(rows.map(row => row.id))), ["2026-06-21-house-of-zup-house-disco-hip-hop"]);
  assert.equal(rows[0].venue, "ZUP Pizza Bar");
  assert.equal(rows[0].source, "https://ra.co/events/2470695");
});

test("keeps undated city-tour variants and tags non-Shanghai rows", () => {
  const module = loadModule();
  const rows = module.normalizeStaticPayload({
    events: [
      {
        id: "2024-pog-kasra-beijing",
        title: "POG with Kasra (Beijing)",
        city: "Beijing",
        venue: "Zhao Dai",
        posterUrl: "https://cdn.example.com/beijing.jpg",
        source: "https://shypeople.cn/",
      },
      {
        id: "2024-pog-kasra-shanghai",
        title: "POG with Kasra (Shanghai)",
        city: "Shanghai",
        venue: "Shy People",
        posterUrl: "https://cdn.example.com/shanghai.jpg",
        source: "https://shypeople.cn/",
      },
    ],
  }, { posters: [] });

  assert.deepEqual(JSON.parse(JSON.stringify(rows.map(row => row.id))), ["2024-pog-kasra-beijing", "2024-pog-kasra-shanghai"]);
  assert.deepEqual(JSON.parse(JSON.stringify(rows[0].tags)), ["other city", "beijing"]);
  assert.deepEqual(JSON.parse(JSON.stringify(rows[0].decisionTags)), ["other city", "beijing"]);
  assert.deepEqual(JSON.parse(JSON.stringify(rows[1].tags)), []);
});

test("filters normalized events by city with Shanghai default and all-city option", () => {
  const module = loadModule();
  const rows = [
    { id: "shanghai-row", city: "Shanghai" },
    { id: "missing-city-defaults-shanghai", city: "" },
    { id: "berlin-row", city: "Berlin" },
  ];

  assert.deepEqual(
    module.filterEventsByCity(rows, "Shanghai").map(row => row.id),
    ["shanghai-row", "missing-city-defaults-shanghai"],
  );
  assert.deepEqual(
    module.filterEventsByCity(rows, "all").map(row => row.id),
    ["shanghai-row", "missing-city-defaults-shanghai", "berlin-row"],
  );
});

test("normalizes Supabase poster wall rows into existing wall event shape", () => {
  const module = loadModule();
  const rows = module.normalizeSupabaseRows([
    {
      id: "heim-dina",
      title: "Heim Invites DINA",
      city: "Shanghai",
      date_label: "Jun 26",
      sort_date: "2026-06-26",
      time_label: "22:00",
      venue_name: "Heim",
      district: "Xuhui",
      genre: "techno",
      sound: "hard techno",
      status: "watch",
      confidence: "Watch",
      price: "66 RMB+",
      age: "18+",
      description: "Source-backed Shanghai club night.",
      ticket_url: "https://tickets.example.com/heim-dina",
      ticket_status: "on_sale",
      source_url: "https://example.com/event",
      source_label: "Yuyuan",
      source_status: "ticketing",
      poster_display_url: "https://cdn.example.com/posters/heim-dina-display.jpg",
      poster_thumbnail_url: "https://cdn.example.com/posters/heim-dina-thumb.jpg",
      poster_source_url: "assets/posters/heim-dina.jpg",
      image_theme: "cyan",
      vibe: ["hard-techno"],
      tags: ["warehouse"],
      lineup: [{ name: "DINA" }],
      set_times: [],
    },
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "heim-dina");
  assert.equal(rows[0].date, "Jun 26");
  assert.equal(rows[0].sortDate, "2026-06-26");
  assert.equal(rows[0].time, "22:00");
  assert.equal(rows[0].venue, "Heim");
  assert.equal(rows[0].ticketUrl, "https://tickets.example.com/heim-dina");
  assert.equal(rows[0].ticketStatus, "on_sale");
  assert.equal(rows[0].source, "https://example.com/event");
  assert.equal(rows[0].posterUrl, "https://cdn.example.com/posters/heim-dina-display.jpg");
  assert.equal(rows[0].posterImageUrl, "https://cdn.example.com/posters/heim-dina-thumb.jpg");
  assert.deepEqual(rows[0].lineup, [{ name: "DINA" }]);
});

test("loads static fallback when Supabase client is unavailable", async () => {
  const requests = [];
  const fakeFetch = async url => {
    requests.push(url);
    if (url === "data/events.json") {
      return {
        ok: true,
        json: async () => ({
          events: [
            {
              id: "static-only",
              title: "Static Only",
              sortDate: "2026-06-22",
              venue: "EXIT",
              vibe: [],
            },
          ],
        }),
      };
    }
    if (url === "data/poster-archive.json") {
      return {
        ok: true,
        json: async () => ({ posters: [] }),
      };
    }
    throw new Error(`unexpected fetch ${url}`);
  };

  const module = loadModule({
    LOVE_WALL_SUPABASE: {
      enabled: true,
      url: "https://example.supabase.co",
      anonKey: "anon-key-with-enough-length",
      posterWallView: "poster_wall_cards",
      posterWallDefaultCity: "Shanghai",
    },
    fetch: fakeFetch,
  });

  const result = await module.loadPosterWallData({
    win: module._testWindow,
    fetcher: fakeFetch,
  });

  assert.equal(result.source, "static");
  assert.deepEqual(requests, ["data/events.json", "data/poster-archive.json"]);
  assert.equal(result.events[0].id, "static-only");
});

test("loads Supabase rows when client and config are available", async () => {
  const queryCalls = [];
  const fakeQuery = {
    select(columns) {
      queryCalls.push(["select", columns]);
      return this;
    },
    order(column, options) {
      queryCalls.push(["order", column, options]);
      return this;
    },
    range(from, to) {
      queryCalls.push(["range", from, to]);
      return Promise.resolve({
        data: [
          {
            id: "supabase-row",
            title: "Supabase Row",
            city: "Shanghai",
            sort_date: "2026-06-23",
            date_label: "Jun 23",
            venue_name: "Abyss",
            poster_display_url: "https://cdn.example.com/poster.jpg",
          },
        ],
        error: null,
      });
    },
  };
  const fakeWindow = {
    LOVE_WALL_SUPABASE: {
      enabled: true,
      url: "https://example.supabase.co",
      anonKey: "anon-key-with-enough-length",
      posterWallView: "poster_wall_cards",
      posterWallDefaultCity: "Shanghai",
      posterWallPageSize: 120,
    },
    supabase: {
      createClient(url, anonKey) {
        assert.equal(url, "https://example.supabase.co");
        assert.equal(anonKey, "anon-key-with-enough-length");
        return {
          from(table) {
            assert.equal(table, "poster_wall_cards");
            return fakeQuery;
          },
        };
      },
    },
  };
  const module = loadModule(fakeWindow);

  const result = await module.loadPosterWallData({
    win: module._testWindow,
    fetcher: async () => {
      throw new Error("static fallback should not be used");
    },
  });

  assert.equal(result.source, "supabase");
  assert.equal(result.events[0].id, "supabase-row");
  assert.deepEqual(JSON.parse(JSON.stringify(queryCalls)), [
    ["select", "*"],
    ["order", "sort_date", { ascending: true, nullsFirst: false }],
    ["range", 0, 119],
  ]);
});

test("loads every Supabase page when poster rows exceed one configured page", async () => {
  const ranges = [];
  const fakeWindow = {
    LOVE_WALL_SUPABASE: {
      enabled: true,
      url: "https://example.supabase.co",
      anonKey: "anon-key-with-enough-length",
      posterWallView: "poster_wall_cards",
      posterWallPageSize: 2,
    },
    supabase: {
      createClient() {
        return {
          from() {
            return {
              select() { return this; },
              order() { return this; },
              range(from, to) {
                ranges.push([from, to]);
                const rows = [
                  { id: "row-1", title: "Row 1", sort_date: "2026-06-21", poster_url: "poster-1.jpg" },
                  { id: "row-2", title: "Row 2", sort_date: "2026-06-22", poster_url: "poster-2.jpg" },
                  { id: "row-3", title: "Row 3", sort_date: "2026-06-23", poster_url: "poster-3.jpg" },
                ].slice(from, to + 1);
                return Promise.resolve({ data: rows, error: null });
              },
            };
          },
        };
      },
    },
  };
  const module = loadModule(fakeWindow);

  const result = await module.loadPosterWallData({
    win: module._testWindow,
    fetcher: async () => {
      throw new Error("static fallback should not be used");
    },
  });

  assert.equal(result.source, "supabase");
  assert.deepEqual(JSON.parse(JSON.stringify(result.events.map(event => event.id))), ["row-1", "row-2", "row-3"]);
  assert.deepEqual(ranges, [[0, 1], [2, 3]]);
});

test("falls back to public Supabase events table when poster wall view is missing", async () => {
  const queryCalls = [];
  const fakeWindow = {
    LOVE_WALL_SUPABASE: {
      enabled: true,
      url: "https://example.supabase.co",
      anonKey: "anon-key-with-enough-length",
      posterWallView: "poster_wall_cards",
      posterWallDefaultCity: "Shanghai",
      posterWallPageSize: 120,
    },
    supabase: {
      createClient() {
        return {
          from(table) {
            queryCalls.push(["from", table]);
            return {
              select(columns) {
                queryCalls.push(["select", table, columns]);
                return this;
              },
              order(column, options) {
                queryCalls.push(["order", table, column, options]);
                return this;
              },
              range(from, to) {
                queryCalls.push(["range", table, from, to]);
                if (table === "poster_wall_cards") {
                  return Promise.resolve({
                    data: null,
                    error: { message: "Could not find the table 'public.poster_wall_cards' in the schema cache" },
                  });
                }
                return Promise.resolve({
                  data: [
                    {
                      id: "events-table-row",
                      name: "Events Table Row",
                      city: "Shanghai",
                      sort_date: "2026-06-23",
                      venue_name: "Abyss",
                      poster_url: "https://cdn.example.com/events-table-row.jpg",
                    },
                  ],
                  error: null,
                });
              },
            };
          },
        };
      },
    },
  };
  const module = loadModule(fakeWindow);

  const result = await module.loadPosterWallData({
    win: module._testWindow,
    fetcher: async () => {
      throw new Error("static fallback should not be used");
    },
  });

  assert.equal(result.source, "supabase-events-fallback");
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].title, "Events Table Row");
  assert.equal(result.events[0].posterUrl, "https://cdn.example.com/events-table-row.jpg");
  assert.deepEqual(queryCalls.filter(call => call[0] === "from").map(call => call[1]), [
    "poster_wall_cards",
    "events",
  ]);
});

test("falls back to static data when Supabase query fails", async () => {
  const fakeWindow = {
    LOVE_WALL_SUPABASE: {
      enabled: true,
      url: "https://example.supabase.co",
      anonKey: "anon-key-with-enough-length",
      posterWallView: "poster_wall_cards",
      posterWallPageSize: 120,
    },
    supabase: {
      createClient() {
        return {
          from() {
            return {
              select() { return this; },
              order() { return this; },
              range() {
                return Promise.resolve({ data: null, error: { message: "view missing" } });
              },
            };
          },
        };
      },
    },
  };
  const requests = [];
  const fakeFetch = async url => {
    requests.push(url);
    return {
      ok: true,
      json: async () => url.endsWith("events.json")
        ? { events: [{ id: "fallback-row", title: "Fallback Row", sortDate: "2026-06-22", venue: "EXIT" }] }
        : { posters: [] },
    };
  };
  const module = loadModule(fakeWindow);

  const result = await module.loadPosterWallData({
    win: module._testWindow,
    fetcher: fakeFetch,
  });

  assert.equal(result.source, "static-fallback");
  assert.match(result.error, /view missing/);
  assert.deepEqual(requests, ["data/events.json", "data/poster-archive.json"]);
  assert.equal(result.events[0].id, "fallback-row");
});
