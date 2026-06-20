# Shanghai-First Poster Wall Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the existing poster wall so Shanghai is the default and primary scope, while the wall can accept and filter poster uploads from other cities, read paginated poster-card metadata from Supabase, and safely fall back to the current static JSON workflow.

**Architecture:** Keep `poster-wall.html` as the existing visual surface and avoid a full UI rewrite. Add a small browser data adapter that normalizes either Supabase view rows or the existing `data/events.json` + `data/poster-archive.json` payload into the same event-card shape the wall already renders. Add a Supabase read-only view over existing `events` and `poster_archive` tables for all accepted poster-card cities, then default the browser UI to Shanghai with a simple city filter.

**Tech Stack:** Static HTML/CSS/vanilla JS, Supabase Postgres view + RLS/grants, `@supabase/supabase-js` CDN client, Node built-in test runner, existing poster optimization and SEO scripts.

---

## Scope

Build a Shanghai-first poster wall architecture.

In scope:

- Shanghai remains the default and primary wall view.
- Other cities can exist in poster-card data and appear behind a simple city filter.
- Current poster wall UI remains the public entry point.
- Static JSON remains a working fallback.
- Supabase `poster_wall_cards` view supplies normalized poster-card rows.
- Browser data adapter supports pagination range calls, even if the first implementation renders the first page only.
- Poster wall UI does not display source labels, source links, source facts, or source confidence. Source metadata stays in data for moderation, generated event detail pages, and Trust Ledger surfaces.
- Source and ticket links are separate concepts: source means evidence, while ticket means a user action. If the same URL clearly serves both roles, the wall may expose it only as a current/future `Tickets` action, never as `Source`.
- Current and future poster cards/modals can include an outbound `Tickets` action when a real ticket URL exists, or when the existing source/details URL is clearly ticketing/actionable.
- Past poster cards use archive behavior: essential poster/date/title/venue/city/sound/status information only, with no ticketing, age, price, source, or "verify before going" display.
- Tests cover static fallback, Supabase row normalization, and HTML integration.

Out of scope:

- Full multi-city discovery product.
- Global scraping.
- Public auto-publishing from community submissions.
- Moving existing local poster images into object storage during this pass.
- Ticketing checkout or payment flow. Simple outbound ticket/action links for current and future events are in scope.

## Current Baseline

- `poster-wall.html` currently fetches `data/events.json` and `data/poster-archive.json` directly at the bottom of the inline script.
- `poster-wall.html` already has filtering, status logic, poster archive preference, modal rendering, and venue guide linking.
- Supabase already has `events`, `poster_archive`, and `community_contributions`.
- `poster_archive` stores metadata and optimized display paths, but image files are still deployed as static assets.
- Current live database has poster metadata rows, so a read-only view can be layered on top without changing import flow.

## File Structure

Create:

- `assets/poster-wall-data.js`  
  Browser data adapter. Owns Supabase config resolution, Supabase row fetching, static JSON fallback loading, and normalization into the existing wall event shape.

- `tests/poster-wall-data.test.js`  
  Unit tests for `assets/poster-wall-data.js` using a VM sandbox and fake `fetch` / fake Supabase client.

- `supabase/migrations/202606200001_poster_wall_cards_view.sql`  
  Read-only public view joining `events` and `poster_archive` for poster-card data. The browser defaults to Shanghai; the view does not discard other accepted cities.

Modify:

- `poster-wall.html`  
  Load Supabase config/client and `assets/poster-wall-data.js`; replace the direct `Promise.all(fetch(...))` loader with `PosterWallData.loadPosterWallData(...)`; add a compact city filter defaulting to Shanghai; hide ticketing details for past/archive posters; remove source display from cards, modal, and footer; add a current/future-only `Tickets` action when a ticket/actionable URL exists.

- `assets/love-wall-supabase-config.js`  
  Add poster wall config keys to the existing public Supabase config.

- `scripts/write-love-wall-config.js`  
  Generate the same poster wall config keys from env.

- `scripts/check.js`  
  Add static requirements for the poster wall data adapter, config keys, and Supabase view migration.

- `package.json`  
  Add `tests/poster-wall-data.test.js` to the main `test` script and optionally add `test:poster-wall-data`.

- `contribute.html`  
  Update copy so contributors understand the queue is Shanghai-first but can accept poster leads from other cities.

- `tests/community-contributions.test.js`  
  Confirm non-Shanghai city values are preserved in pending contribution rows.

- `supabase/README.md`  
  Document the Shanghai poster wall read path and the fact that static JSON remains fallback.

- `docs/WEBSITE_STRUCTURE.md`  
  Document that `poster-wall.html` is still the single public poster/event browsing surface, now backed by a dual-source data adapter.

## Task 1: Add Data Adapter Tests

**Files:**

- Create: `tests/poster-wall-data.test.js`
- Read: `assets/poster-wall-data.js`

- [ ] **Step 1: Write the failing test file**

Create `tests/poster-wall-data.test.js` with this content:

```js
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

test("normalizes static events, keeps accepted cities, and prefers poster archive display assets", async () => {
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
  assert.deepEqual(shanghaiRow.vibe, ["hard-techno"]);
  assert.equal(otherCityRow.city, "Berlin");
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
    eq(column, value) {
      queryCalls.push(["eq", column, value]);
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
  assert.deepEqual(queryCalls, [
    ["select", "*"],
    ["order", "sort_date", { ascending: true, nullsFirst: false }],
    ["range", 0, 119],
  ]);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
node --test tests/poster-wall-data.test.js
```

Expected result:

```text
not ok
Error: ENOENT: no such file or directory, open '...\assets\poster-wall-data.js'
```

## Task 2: Implement Poster Wall Data Adapter

**Files:**

- Create: `assets/poster-wall-data.js`
- Test: `tests/poster-wall-data.test.js`

- [ ] **Step 1: Create the browser data adapter**

Create `assets/poster-wall-data.js` with this content:

```js
(function attachPosterWallData(root) {
  const DEFAULT_CITY = "Shanghai";
  const ALL_CITIES = "all";
  const DEFAULT_VIEW = "poster_wall_cards";
  const DEFAULT_PAGE_SIZE = 120;

  function asArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      return value.split(",").map(item => item.trim()).filter(Boolean);
    }
    return [];
  }

  function cleanText(value) {
    return String(value ?? "").trim();
  }

  function normalizedConfig(win = root) {
    const source = (win && (win.POSTER_WALL_SUPABASE || win.LOVE_WALL_SUPABASE)) || {};
    const pageSize = Number.parseInt(source.posterWallPageSize, 10);
    return {
      enabled: source.posterWallEnabled !== false && source.enabled !== false,
      url: cleanText(source.url).replace(/\/+$/, ""),
      anonKey: cleanText(source.anonKey),
      view: cleanText(source.posterWallView) || DEFAULT_VIEW,
      city: cleanText(source.posterWallDefaultCity || source.posterWallCity) || DEFAULT_CITY,
      pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE,
    };
  }

  function eventCity(event) {
    return cleanText(event && event.city) || DEFAULT_CITY;
  }

  function filterEventsByCity(events, city = DEFAULT_CITY) {
    const selected = cleanText(city) || DEFAULT_CITY;
    if (selected.toLowerCase() === ALL_CITIES) return events || [];
    return (events || []).filter(event => eventCity(event) === selected);
  }

  function canUseSupabase(win = root, config = normalizedConfig(win)) {
    return Boolean(
      win
      && win.supabase
      && typeof win.supabase.createClient === "function"
      && config.enabled
      && /^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(config.url)
      && config.anonKey.length > 20
      && config.view
    );
  }

  function posterArchiveMap(posters) {
    const map = new Map();
    (posters || []).forEach(poster => {
      const eventId = cleanText(poster && poster.eventId);
      if (!eventId) return;
      const image = poster.image || {};
      map.set(eventId, {
        display: cleanText(image.display || image.thumbnail),
        thumbnail: cleanText(image.thumbnail || image.display),
        sourceAsset: cleanText(image.sourceAsset),
      });
    });
    return map;
  }

  function normalizeEvent(row, archiveImage) {
    const posterDisplay = cleanText(
      row.poster_display_url
      || archiveImage?.display
      || row.posterUrl
      || row.poster_url
      || row.posterImageUrl
      || row.imageUrl
    );
    const posterThumbnail = cleanText(
      row.poster_thumbnail_url
      || row.posterImageUrl
      || archiveImage?.thumbnail
      || posterDisplay
    );

    return {
      id: cleanText(row.id),
      slug: cleanText(row.slug || row.id),
      title: cleanText(row.title),
      city: cleanText(row.city) || DEFAULT_CITY,
      country: cleanText(row.country) || "CN",
      date: cleanText(row.date || row.date_label || row.sort_date || row.sortDate),
      sortDate: cleanText(row.sortDate || row.sort_date),
      time: cleanText(row.time || row.time_label),
      venue: cleanText(row.venue || row.venue_name),
      district: cleanText(row.district),
      genre: cleanText(row.genre || row.sound),
      sound: cleanText(row.sound || row.genre),
      status: cleanText(row.status || "watch"),
      confidence: cleanText(row.confidence || "Watch"),
      price: cleanText(row.price),
      age: cleanText(row.age),
      description: cleanText(row.description || row.notes),
      notes: cleanText(row.notes),
      ticketUrl: cleanText(row.ticketUrl || row.ticket_url),
      ticketStatus: cleanText(row.ticketStatus || row.ticket_status),
      source: cleanText(row.source || row.source_url),
      sourceLabel: cleanText(row.sourceLabel || row.source_label),
      sourceStatus: cleanText(row.sourceStatus || row.source_status),
      lastChecked: cleanText(row.lastChecked || row.last_checked),
      eventUrl: cleanText(row.eventUrl || row.event_url),
      posterUrl: posterDisplay,
      posterImageUrl: posterThumbnail,
      posterSourceUrl: cleanText(row.poster_source_url || archiveImage?.sourceAsset || row.posterUrl || row.poster_url),
      imageTheme: cleanText(row.imageTheme || row.image_theme),
      vibe: asArray(row.vibe),
      tags: asArray(row.tags),
      sources: asArray(row.sources),
      lineup: asArray(row.lineup),
      setTimes: asArray(row.setTimes || row.set_times),
      soundTags: asArray(row.soundTags || row.sound_tags),
      decisionTags: asArray(row.decisionTags || row.decision_tags),
      recommendationReason: cleanText(row.recommendationReason || row.recommendation_reason),
      bestFor: cleanText(row.bestFor || row.best_for),
      verifyBeforeGoing: cleanText(row.verifyBeforeGoing || row.verify_before_going),
      sourceConfidence: cleanText(row.sourceConfidence || row.source_confidence),
      address: cleanText(row.address),
      raw: row.raw || row,
    };
  }

  function normalizeStaticPayload(eventsPayload, archivePayload, options = {}) {
    const events = Array.isArray(eventsPayload) ? eventsPayload : eventsPayload?.events || [];
    const archiveByEvent = posterArchiveMap(archivePayload?.posters || []);
    return events
      .map(event => normalizeEvent(event, archiveByEvent.get(cleanText(event.id))))
      .filter(event => event.id && event.title);
  }

  function normalizeSupabaseRows(rows) {
    return (rows || [])
      .map(row => normalizeEvent(row))
      .filter(event => event.id && event.title);
  }

  async function fetchJson(fetcher, url, fallback) {
    const response = await fetcher(url);
    if (!response || response.ok === false) return fallback;
    return response.json();
  }

  async function loadStaticData({ fetcher, city }) {
    const [eventsPayload, posterArchive] = await Promise.all([
      fetchJson(fetcher, "data/events.json", { events: [] }),
      fetchJson(fetcher, "data/poster-archive.json", { posters: [] }).catch(() => ({ posters: [] })),
    ]);
    return {
      source: "static",
      posterArchive,
      events: normalizeStaticPayload(eventsPayload, posterArchive, { city }),
    };
  }

  async function loadSupabaseData(win, config, rangeStart = 0) {
    const client = win.supabase.createClient(config.url, config.anonKey);
    const rangeEnd = rangeStart + config.pageSize - 1;
    const result = await client
      .from(config.view)
      .select("*")
      .order("sort_date", { ascending: true, nullsFirst: false })
      .range(rangeStart, rangeEnd);

    if (result.error) throw new Error(result.error.message || "Supabase poster wall query failed");
    return {
      source: "supabase",
      posterArchive: { posters: [] },
      events: normalizeSupabaseRows(result.data || []),
      range: { from: rangeStart, to: rangeEnd },
    };
  }

  async function loadPosterWallData(options = {}) {
    const win = options.win || root;
    const config = options.config || normalizedConfig(win);
    const fetcher = options.fetcher || (win && win.fetch ? win.fetch.bind(win) : null);
    if (!fetcher) throw new Error("Poster wall data loader requires fetch");

    if (options.preferSupabase !== false && canUseSupabase(win, config)) {
      try {
        const supabaseResult = await loadSupabaseData(win, config, Number(options.rangeStart || 0));
        if (supabaseResult.events.length) return supabaseResult;
      } catch (error) {
        const fallback = await loadStaticData({ fetcher, city: config.city });
        return {
          ...fallback,
          source: "static-fallback",
          error: error.message,
        };
      }
    }

    return loadStaticData({ fetcher, city: config.city });
  }

  root.PosterWallData = {
    DEFAULT_CITY,
    ALL_CITIES,
    DEFAULT_VIEW,
    DEFAULT_PAGE_SIZE,
    normalizedConfig,
    canUseSupabase,
    eventCity,
    filterEventsByCity,
    normalizeStaticPayload,
    normalizeSupabaseRows,
    loadPosterWallData,
    _testWindow: root,
  };
})(typeof window !== "undefined" ? window : globalThis);
```

- [ ] **Step 2: Run the focused tests**

Run:

```powershell
node --test tests/poster-wall-data.test.js
```

Expected result:

```text
# pass 5
# fail 0
```

- [ ] **Step 3: Commit the data adapter and tests**

Run:

```powershell
git add assets/poster-wall-data.js tests/poster-wall-data.test.js
git commit -m "feat: add poster wall data adapter"
```

Expected result: commit succeeds with the two files staged.

## Task 3: Add Supabase Shanghai Poster Wall View

**Files:**

- Create: `supabase/migrations/202606200001_poster_wall_cards_view.sql`
- Read: `supabase/migrations/202606130001_full_backend_schema.sql`

- [ ] **Step 1: Create the migration**

Create `supabase/migrations/202606200001_poster_wall_cards_view.sql` with this content:

```sql
create or replace view public.poster_wall_cards
with (security_invoker = true)
as
select
  e.id,
  e.slug,
  e.title,
  coalesce(e.city, 'Shanghai') as city,
  e.country,
  e.date_label,
  e.sort_date,
  e.time_label,
  e.venue_name,
  e.district,
  e.sound,
  e.genre,
  e.status,
  e.confidence,
  e.price,
  e.age,
  e.description,
  e.notes,
  e.source_url,
  e.source_label,
  e.source_status,
  e.last_checked,
  e.event_url,
  coalesce(e.raw->>'ticketUrl', e.raw->>'ticket_url') as ticket_url,
  coalesce(e.raw->>'ticketStatus', e.raw->>'ticket_status') as ticket_status,
  coalesce(p.image->>'display', p.image->>'thumbnail', e.poster_url) as poster_display_url,
  coalesce(p.image->>'thumbnail', p.image->>'display', e.poster_url) as poster_thumbnail_url,
  coalesce(p.image->>'sourceAsset', e.poster_url) as poster_source_url,
  e.image_theme,
  e.vibe,
  e.tags,
  e.sources,
  e.lineup,
  e.set_times,
  e.raw,
  p.id as poster_archive_id,
  p.collection as poster_collection
from public.events e
left join public.poster_archive p
  on p.event_id = e.id
where e.published = true;

grant select on public.poster_wall_cards to anon, authenticated;
```

- [ ] **Step 2: Run syntax check for the migration**

Run:

```powershell
node --check scripts/apply-supabase-migrations.js
```

Expected result: command exits with code 0.

- [ ] **Step 3: Apply migrations locally/remote with existing project command**

Run:

```powershell
npm run supabase:migrate
```

Expected result: all migrations apply and the new view exists.

- [ ] **Step 4: Verify the view returns poster rows and includes Shanghai by default**

Run this one-off read with local Supabase env already configured:

```powershell
@'
(async () => {
  const fs = require("fs");
  const path = require("path");
  const { createClient } = require("@supabase/supabase-js");
  for (const file of [".env", ".env.local", ".env.production", ".env.preview"]) {
    const full = path.join(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      let value = trimmed.slice(index + 1).trim();
      if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (!process.env[key]) process.env[key] = value;
    }
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error, count } = await client
    .from("poster_wall_cards")
    .select("id,title,city,sort_date,poster_display_url", { count: "exact" })
    .range(0, 4);
  if (error) throw error;
  const { count: shanghaiCount, error: shanghaiError } = await client
    .from("poster_wall_cards")
    .select("id", { count: "exact", head: true })
    .eq("city", "Shanghai");
  if (shanghaiError) throw shanghaiError;
  console.log(JSON.stringify({ count, shanghaiCount, sample: data }, null, 2));
})().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
'@ | node -
```

Expected result: JSON prints `count` greater than 0, `shanghaiCount` greater than 0, and sample rows may include Shanghai or other accepted cities.

- [ ] **Step 5: Commit the migration**

Run:

```powershell
git add supabase/migrations/202606200001_poster_wall_cards_view.sql
git commit -m "feat: add poster wall cards view"
```

Expected result: commit succeeds with the migration staged.

## Task 4: Wire Poster Wall To The Data Adapter

**Files:**

- Modify: `poster-wall.html`
- Test: `tests/poster-wall-filters.test.js`

- [ ] **Step 1: Add a failing HTML integration test**

Append this test to `tests/poster-wall-filters.test.js`:

```js
test("poster wall loads through shared data adapter instead of direct JSON Promise.all", () => {
  const html = readSiteFile("poster-wall.html");
  assert.match(html, /assets\/poster-wall-data\.js/);
  assert.match(html, /PosterWallData\.loadPosterWallData/);
  assert.doesNotMatch(html, /Promise\.all\(\s*\[\s*fetch\("data\/events\.json"\)/);
});
```

- [ ] **Step 2: Extend filter tests for city default and past archive essentials**

In `tests/poster-wall-filters.test.js`, update `posterWallFiltersForTest()` so:

- The `helperSource` list also extracts `eventCity` and `eventMatchesCity`.
- The sandbox defines `const cityFilter = { value: "Shanghai" };`.
- The returned object includes:

```js
      setCity(next) {
        cityFilter.value = next;
      },
```

Then append these tests:

```js
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

test("poster wall past archive omits ticketing fields", () => {
  const html = readSiteFile("poster-wall.html");
  assert.match(html, /function eventEssentialFacts/);
  assert.match(html, /eventTemporalStatus\(event\) === "past"/);
  assert.match(html, /if \(eventTemporalStatus\(event\) !== "past"\)/);
});

test("poster wall does not expose source labels or source links in the wall UI", () => {
  const html = readSiteFile("poster-wall.html");
  assert.doesNotMatch(html, /id="modalSource"/);
  assert.doesNotMatch(html, />Source<\/a>/);
  assert.doesNotMatch(html, /Open the source link/);
  assert.doesNotMatch(html, /Source first/);
  assert.doesNotMatch(html, /Source confidence/);
  assert.doesNotMatch(html, /\["Source",/);
  assert.doesNotMatch(html, /event\.sourceLabel \|\| "Source"/);
});

test("poster wall exposes ticket actions separately from source UI", () => {
  const html = readSiteFile("poster-wall.html");
  assert.match(html, /id="modalTicket"/);
  assert.match(html, /function ticketActionHref/);
  assert.match(html, /function showTicketAction/);
  assert.match(html, /Tickets/);
  assert.doesNotMatch(html, /id="modalSource"/);
});
```

- [ ] **Step 3: Run the focused test and verify it fails**

Run:

```powershell
node --test tests/poster-wall-filters.test.js
```

Expected result:

```text
not ok ... poster wall loads through shared data adapter instead of direct JSON Promise.all
```

- [ ] **Step 4: Add the compact city filter control**

In `poster-wall.html`, inside `<section class="wall-controls" aria-label="Event filters">`, after the `statusFilter` select and before the `vibeFilter` select, insert:

```html
      <select class="select" id="cityFilter" aria-label="City filter">
        <option value="Shanghai" selected>Shanghai</option>
        <option value="all">All cities</option>
      </select>
```

- [ ] **Step 5: Load config/client/data adapter before the inline wall script**

In `poster-wall.html`, immediately before the existing inline script that starts with:

```html
  <script>
    const archiveCutoffHour = 6;
```

insert:

```html
  <script src="assets/love-wall-supabase-config.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="assets/poster-wall-data.js?v=poster-wall-data-20260620"></script>
```

- [ ] **Step 6: Add city filter state and options**

In the inline script, after:

```js
    const statusFilter = document.getElementById("statusFilter");
```

insert:

```js
    const cityFilter = document.getElementById("cityFilter");
```

After `function eventDate(event) { ... }`, add:

```js
    function eventCity(event) {
      return String(event?.city || "Shanghai").trim() || "Shanghai";
    }

    function eventMatchesCity(event, city) {
      if (!city || city === "all") return true;
      return eventCity(event) === city;
    }

    function refreshCityFilterOptions() {
      const selected = cityFilter.value || "Shanghai";
      const cities = Array.from(new Set(events.map(eventCity))).sort((a, b) => {
        if (a === "Shanghai") return -1;
        if (b === "Shanghai") return 1;
        return a.localeCompare(b);
      });
      cityFilter.innerHTML = [
        '<option value="Shanghai">Shanghai</option>',
        '<option value="all">All cities</option>',
        ...cities.filter(city => city !== "Shanghai").map(city => `<option value="${escapeHtml(city)}">${escapeHtml(city)}</option>`)
      ].join("");
      cityFilter.value = cities.includes(selected) || selected === "all" ? selected : "Shanghai";
    }
```

Then update `filteredEvents()` so the filter block contains this city check immediately after `eventMatchesStatus`:

```js
          if (!eventMatchesCity(event, cityFilter.value)) return false;
```

Update the controls listener list from:

```js
    [searchInput, statusFilter, vibeFilter].forEach(control => {
```

to:

```js
    [searchInput, statusFilter, cityFilter, vibeFilter].forEach(control => {
```

- [ ] **Step 7: Add past archive essential facts behavior**

In `poster-wall.html`, replace `modalInsightsHtml(event)` with this version. It keeps lineup and editorial fit, but does not display `Source confidence`:

```js
    function modalInsightsHtml(event) {
      const names = lineupNames(event);
      const isPast = eventTemporalStatus(event) === "past";
      const rows = [
        ["Lineup", names.length ? names.join(" / ") : ""],
        ["Recommendation", event.recommendationReason || ""],
        ["Best for", event.bestFor || ""],
        isPast ? null : ["Verify before going", event.verifyBeforeGoing || ""]
      ].filter(Boolean).filter(([, value]) => String(value || "").trim());

      return rows.map(([label, value]) => `
        <div class="modal-insight">
          <span>${escapeHtml(label)}</span>
          <b>${escapeHtml(publicText(value))}</b>
        </div>
      `).join("");
    }
```

Add this helper before `openModal(event)`:

```js
    function eventEssentialFacts(event) {
      const rows = [
        ["Date", escapeHtml(`${event.date} / ${event.time}`)],
        ["City", escapeHtml(eventCity(event))],
        ["Venue", `${venueGuideLinkHtml(event.venue)} / ${escapeHtml(event.district)}`],
        ["Sound", escapeHtml(event.genre)],
        ["Status", escapeHtml(`${eventStatusLabel(event)} / ${event.confidence}`)]
      ];
      if (eventTemporalStatus(event) !== "past") {
        rows.splice(3, 0, ["Address", escapeHtml(cleanAddress(event.address) || "Check details")]);
        rows.splice(4, 0, ["Price", escapeHtml(event.price || "Check details")]);
        rows.splice(5, 0, ["Age", escapeHtml(event.age || "Check details")]);
      }
      return rows;
    }
```

Add these ticket helpers before `openModal(event)`. They keep source and ticket semantics separate: explicit ticket fields win; source/details fallback is allowed only when the URL or labels are clearly ticket/action oriented.

```js
    function ticketActionHref(event) {
      const explicit = String(event?.ticketUrl || event?.ticket_url || "").trim();
      if (explicit) return explicit;

      const candidate = String(event?.eventUrl || event?.event_url || event?.source || "").trim();
      const label = `${event?.ticketStatus || ""} ${event?.sourceLabel || ""} ${event?.sourceStatus || ""} ${candidate}`.toLowerCase();
      if (!candidate) return "";

      return /(ticket|showstart|damai|piaoplanet|smartshanghai|ra\.co|resident advisor|yuyuan|mini-program|247tickets)/i.test(label)
        ? candidate
        : "";
    }

    function showTicketAction(event) {
      return eventTemporalStatus(event) !== "past" && Boolean(ticketActionHref(event));
    }
```

Then replace the hard-coded `document.getElementById("modalFacts").innerHTML = [...]` array inside `openModal(event)` with:

```js
      document.getElementById("modalFacts").innerHTML = eventEssentialFacts(event)
        .map(([label, value]) => `<div class="fact"><span>${escapeHtml(label)}</span><b>${value}</b></div>`)
        .join("");
```

Finally, update the card footer source line from:

```js
              <div class="wall-source"><span>${escapeHtml(publicText(event.sourceLabel || "Source"))}</span><span>${escapeHtml(event.price || "Check source")}</span></div>
```

to:

```js
              <div class="wall-source"><span>${escapeHtml(eventCity(event))}</span><span>${escapeHtml(eventTemporalStatus(event) === "past" ? eventStatusLabel(event) : (event.price || eventStatusLabel(event)))}</span></div>
```

- [ ] **Step 8: Replace source button with current/future ticket action and footer source copy**

In `poster-wall.html`, replace this modal action:

```html
          <a class="button primary" id="modalSource" href="#" target="_blank" rel="noreferrer">Source</a>
```

with:

```html
          <a class="button primary" id="modalTicket" href="#" target="_blank" rel="noreferrer">Tickets</a>
```

Inside `openModal(event)`, replace this block:

```js
      const source = document.getElementById("modalSource");
      source.href = event.source || "#";
      source.style.display = event.source ? "inline-flex" : "none";
```

with:

```js
      const ticket = document.getElementById("modalTicket");
      const ticketHref = ticketActionHref(event);
      ticket.href = ticketHref || "#";
      ticket.style.display = showTicketAction(event) ? "inline-flex" : "none";
```

In the footer, replace:

```html
      <div class="bar-cell">
        <span>Information is aggregated from public sources and may change.</span>
        <span>Open the source link before buying or travelling.</span>
      </div>
      <div class="bar-cell source-cell">
        <span>Source first</span>
        <span>Rave second</span>
        <a href="trust.html">How we recommend</a>
        <a href="trust.html#corrections">Corrections</a>
      </div>
```

with:

```html
      <div class="bar-cell">
        <span>Event details may change after a poster is saved.</span>
        <span>Current events stay practical; past posters stay archival.</span>
      </div>
      <div class="bar-cell source-cell">
        <span>Shanghai first</span>
        <span>Archive ready</span>
        <a href="trust.html">How we recommend</a>
        <a href="trust.html#corrections">Corrections</a>
      </div>
```

- [ ] **Step 9: Replace the direct JSON loader**

In `poster-wall.html`, replace the block:

```js
    Promise.all([
      fetch("data/events.json").then(response => response.json()),
      fetch("data/poster-archive.json")
        .then(response => response.ok ? response.json() : { posters: [] })
        .catch(() => ({ posters: [] }))
    ])
      .then(([data, posterArchive]) => {
        loadPosterArchive(posterArchive.posters);
        events = data.events || [];
        render();
      })
      .catch(() => {
        wall.innerHTML = `<div class="empty">Could not load poster data.</div>`;
      });
```

with:

```js
    window.PosterWallData.loadPosterWallData({ win: window })
      .then(result => {
        loadPosterArchive(result.posterArchive?.posters || []);
        events = result.events || [];
        refreshCityFilterOptions();
        if (result.error) {
          console.warn(`Poster wall used ${result.source}: ${result.error}`);
        }
        render();
      })
      .catch(() => {
        wall.innerHTML = `<div class="empty">Could not load poster data.</div>`;
      });
```

- [ ] **Step 10: Run focused tests**

Run:

```powershell
node --test tests/poster-wall-data.test.js tests/poster-wall-filters.test.js
```

Expected result:

```text
# fail 0
```

- [ ] **Step 11: Commit the wall integration**

Run:

```powershell
git add poster-wall.html tests/poster-wall-filters.test.js
git commit -m "feat: load poster wall through data adapter"
```

Expected result: commit succeeds with the HTML and test file staged.

## Task 5: Add Poster Wall Config Keys

**Files:**

- Modify: `assets/love-wall-supabase-config.js`
- Modify: `scripts/write-love-wall-config.js`
- Test: `scripts/check.js`

- [ ] **Step 1: Update generated config output**

In `scripts/write-love-wall-config.js`, replace:

```js
  contributionTable: "community_contributions"
```

with:

```js
  contributionTable: "community_contributions",
  posterWallEnabled: true,
  posterWallView: "poster_wall_cards",
  posterWallDefaultCity: "Shanghai",
  posterWallPageSize: 120
```

- [ ] **Step 2: Update checked-in public config**

In `assets/love-wall-supabase-config.js`, replace:

```js
  contributionTable: "community_contributions"
```

with:

```js
  contributionTable: "community_contributions",
  posterWallEnabled: true,
  posterWallView: "poster_wall_cards",
  posterWallDefaultCity: "Shanghai",
  posterWallPageSize: 120
```

- [ ] **Step 3: Run syntax check**

Run:

```powershell
node --check scripts/write-love-wall-config.js
node --check assets/poster-wall-data.js
```

Expected result: both commands exit with code 0.

- [ ] **Step 4: Commit config updates**

Run:

```powershell
git add assets/love-wall-supabase-config.js scripts/write-love-wall-config.js
git commit -m "feat: add poster wall supabase config"
```

Expected result: commit succeeds with both files staged.

## Task 6: Extend Project Checks And Package Scripts

**Files:**

- Modify: `scripts/check.js`
- Modify: `package.json`
- Test: `tests/poster-wall-data.test.js`
- Test: `tests/poster-wall-filters.test.js`

- [ ] **Step 1: Add poster wall architecture requirements to `scripts/check.js`**

In `scripts/check.js`, add this block after `posterArchiveRequirements`:

```js
const posterWallArchitectureRequirements = [
  { file: "poster-wall.html", text: "assets/poster-wall-data.js", label: "poster wall data adapter script" },
  { file: "poster-wall.html", text: "PosterWallData.loadPosterWallData", label: "poster wall shared data loader" },
  { file: "poster-wall.html", text: 'id="cityFilter"', label: "poster wall city filter" },
  { file: "poster-wall.html", text: "function eventEssentialFacts", label: "poster wall past archive essential facts helper" },
  { file: "poster-wall.html", text: 'id="modalTicket"', label: "poster wall current/future ticket action" },
  { file: "poster-wall.html", text: "function ticketActionHref", label: "poster wall ticket action helper" },
  { file: "poster-wall.html", text: "function showTicketAction", label: "poster wall ticket visibility helper" },
  { file: "assets/poster-wall-data.js", text: "poster_wall_cards", label: "poster wall default Supabase view" },
  { file: "assets/poster-wall-data.js", text: "filterEventsByCity", label: "poster wall city filter helper" },
  { file: "assets/poster-wall-data.js", text: "normalizeStaticPayload", label: "poster wall static fallback normalizer" },
  { file: "assets/poster-wall-data.js", text: "normalizeSupabaseRows", label: "poster wall Supabase normalizer" },
  { file: "assets/love-wall-supabase-config.js", text: 'posterWallDefaultCity: "Shanghai"', label: "poster wall Shanghai-default config" },
  { file: "scripts/write-love-wall-config.js", text: 'posterWallView: "poster_wall_cards"', label: "poster wall generated view config" },
  { file: "supabase/migrations/202606200001_poster_wall_cards_view.sql", text: "create or replace view public.poster_wall_cards", label: "poster wall cards view migration" },
  { file: "supabase/migrations/202606200001_poster_wall_cards_view.sql", text: "where e.published = true", label: "poster wall published-row view filter" },
];
```

Then update the existing requirements loop near the lower half of `scripts/check.js`.

Replace:

```js
for (const requirement of [...itineraryRequirements, ...opsRequirements, ...adminCornerRequirements, ...scrapeRequirements, ...posterArchiveRequirements, ...everywhereRequirements, ...loveWallRequirements, ...liveRoomRequirements, ...listenCoachRequirements, ...accountRequirements, ...communityRequirements, ...accountGuideRequirements]) {
```

with:

```js
for (const requirement of [...itineraryRequirements, ...opsRequirements, ...adminCornerRequirements, ...scrapeRequirements, ...posterArchiveRequirements, ...posterWallArchitectureRequirements, ...everywhereRequirements, ...loveWallRequirements, ...liveRoomRequirements, ...listenCoachRequirements, ...accountRequirements, ...communityRequirements, ...accountGuideRequirements]) {
```

- [ ] **Step 2: Add poster wall data test to `package.json`**

In `package.json`, add this script near the existing test scripts:

```json
"test:poster-wall-data": "node --test tests/poster-wall-data.test.js",
```

Then update the main `test` script so it includes `tests/poster-wall-data.test.js` before `tests/poster-wall-filters.test.js`:

```json
"test": "node --test tests/account-system.test.js tests/preview-room-realtime.test.js tests/live-room-realtime.test.js tests/live-room-page.test.js tests/sound-buddy.test.js tests/social-fusion.test.js tests/trust-framework.test.js tests/community-contributions.test.js tests/community-badges.test.js tests/event-cross-links.test.js tests/dj-relevance-sort.test.js tests/home-highlights.test.js tests/poster-wall-data.test.js tests/poster-wall-filters.test.js",
```

- [ ] **Step 3: Run focused tests**

Run:

```powershell
npm run test:poster-wall-data
node --test tests/poster-wall-filters.test.js
node scripts/check.js
```

Expected result: all three commands exit with code 0.

- [ ] **Step 4: Commit test/check integration**

Run:

```powershell
git add scripts/check.js package.json tests/poster-wall-data.test.js tests/poster-wall-filters.test.js
git commit -m "test: cover poster wall data architecture"
```

Expected result: commit succeeds with checks and scripts staged.

## Task 7: Keep Contribution Intake Open To Other Cities

**Files:**

- Modify: `contribute.html`
- Modify: `tests/community-contributions.test.js`

- [ ] **Step 1: Add a failing non-Shanghai contribution test**

In `tests/community-contributions.test.js`, after the first `recordFromPayload normalizes a source-backed contribution` test, add:

```js
test("recordFromPayload preserves non-Shanghai poster lead cities", () => {
  const record = community.recordFromPayload({
    contributionType: "event",
    contributorRole: "fan",
    title: "Basement night in Hangzhou",
    city: "Hangzhou",
    venueName: "Loopy",
    sourceUrl: "https://example.com/hangzhou-poster",
    details: "Official venue poster names the date, room, and lineup for a Hangzhou electronic night.",
    posterUrl: "https://storage.example.com/contribution_posters/hangzhou.jpg",
    consent: true,
  });

  assert.equal(record.city, "Hangzhou");
  assert.equal(record.venueName, "Loopy");

  const row = community.remoteRowFromRecord(record, null);
  assert.equal(row.city, "Hangzhou");
  assert.equal(row.venue_name, "Loopy");
  assert.equal(row.poster_url, "https://storage.example.com/contribution_posters/hangzhou.jpg");
});
```

- [ ] **Step 2: Run the focused test**

Run:

```powershell
node --test tests/community-contributions.test.js
```

Expected result: the new test should pass with the existing validator because `city` is already a free-text field. If it fails, fix only the city normalization path in `assets/community-contributions.js`; do not add city allowlists.

- [ ] **Step 3: Update contribution page copy**

In `contribute.html`, replace:

```html
        <p>Send missing events or target an existing event, DJ, or venue with stronger source evidence before anything becomes calendar data.</p>
```

with:

```html
        <p>Send missing Shanghai events first, or submit poster-backed leads from other cities for review before anything becomes public data.</p>
```

Replace:

```html
        <span>Submissions are source leads, not automatic event listings.</span>
```

with:

```html
        <span>Submissions are source leads, not automatic event listings; Shanghai stays the default wall.</span>
```

- [ ] **Step 4: Run focused validation**

Run:

```powershell
node --test tests/community-contributions.test.js
node scripts/check.js
```

Expected result: both commands exit with code 0.

- [ ] **Step 5: Commit contribution intake update**

Run:

```powershell
git add contribute.html tests/community-contributions.test.js
git commit -m "feat: allow other-city poster leads"
```

Expected result: commit succeeds with page copy and test staged.

## Task 8: Document The Shanghai-First Architecture

**Files:**

- Modify: `supabase/README.md`
- Modify: `docs/WEBSITE_STRUCTURE.md`
- Modify: `docs/poster-wall-market-research.md`

- [ ] **Step 1: Update `supabase/README.md`**

Under the existing Poster Archive Upload section, add:

```markdown
## Poster Wall Read Path

`poster-wall.html` remains the single public event/poster browsing surface. The page loads `assets/poster-wall-data.js`, which first tries the read-only Supabase view `poster_wall_cards` and falls back to `data/events.json` plus `data/poster-archive.json` when Supabase is unavailable.

The product is Shanghai-first in this phase:

```js
posterWallDefaultCity: "Shanghai"
```

The view can expose other accepted poster cities for uploads and archive browsing, but the default wall filter remains Shanghai.

Images may still point to static `assets/posters/...` paths. Moving display and thumbnail assets to object storage can happen later without changing the wall renderer, as long as `poster_wall_cards.poster_display_url` and `poster_wall_cards.poster_thumbnail_url` return browser-readable URLs.
```

- [ ] **Step 2: Update `docs/WEBSITE_STRUCTURE.md`**

In the paragraph that states `poster-wall.html` is the single public poster/event browsing surface, add:

```markdown
The wall now uses a dual-source loader: Supabase `poster_wall_cards` for Shanghai poster-card metadata when available, and static `data/events.json` / `data/poster-archive.json` as the offline and deployment-safe fallback.
```

- [ ] **Step 3: Update `docs/poster-wall-market-research.md`**

In the MVP section, replace the earlier multi-city wording with a Shanghai-first note:

```markdown
Current decision: start Shanghai-first. Shanghai is the default wall and editorial focus, but poster-backed uploads from other cities can enter the review queue and appear behind the city filter after approval. A full multi-city discovery product stays a later direction after the Shanghai data model, poster evidence workflow, and wall UX are stable.
```

- [ ] **Step 4: Commit docs**

Run:

```powershell
git add supabase/README.md docs/WEBSITE_STRUCTURE.md docs/poster-wall-market-research.md
git commit -m "docs: document shanghai poster wall architecture"
```

Expected result: commit succeeds with docs staged.

## Task 9: Final Verification

**Files:**

- Verify: `poster-wall.html`
- Verify: `assets/poster-wall-data.js`
- Verify: `supabase/migrations/202606200001_poster_wall_cards_view.sql`
- Verify: `tests/poster-wall-data.test.js`
- Verify: `tests/poster-wall-filters.test.js`

- [ ] **Step 1: Run focused validation**

Run:

```powershell
node --test tests/poster-wall-data.test.js tests/poster-wall-filters.test.js
node --test tests/trust-framework.test.js
node scripts/check.js
```

Expected result: all commands exit with code 0.

- [ ] **Step 2: Run full code check if source freshness is not in scope**

Run:

```powershell
npm run check:code
```

Expected result: syntax, tests, site structure, and local link checks pass.

- [ ] **Step 3: Start local server**

Run:

```powershell
npx serve . -l 4173
```

Expected result:

```text
Local: http://localhost:4173
```

Keep the server running for the browser smoke test.

- [ ] **Step 4: Browser smoke test**

Open:

```text
http://localhost:4173/poster-wall.html
```

Verify:

- The wall renders event cards.
- Default status filter is still current/upcoming.
- City filter defaults to Shanghai.
- Selecting `All cities` does not break rendering.
- Search filters still work.
- A card opens the modal.
- `How we recommend` still renders.
- Modal source button/link is absent.
- Cards and modal facts do not show source label, source URL, source confidence, or source fact rows.
- Current/future modal shows a `Tickets` action when `ticketUrl` exists, or when the available details/source URL is clearly ticket/action oriented.
- Past archive modal facts do not show price, age, ticket route, source, or verify-before-going fields.
- Network panel shows either a Supabase request to `poster_wall_cards` or fallback requests to `data/events.json` and `data/poster-archive.json`.
- No horizontal overflow on mobile viewport around 390 px width.

- [ ] **Step 5: Stop the local server**

Stop the `npx serve` process with `Ctrl+C` in its terminal.

- [ ] **Step 6: Record verification result**

Append a short entry to `PROJECT_MEMORY.md` only if implementation is complete:

```markdown
## 2026-06-20 Shanghai Poster Wall Architecture

- Kept `poster-wall.html` as the single public poster/event surface.
- Added `assets/poster-wall-data.js` as a dual-source loader: Supabase `poster_wall_cards` first, static JSON fallback second.
- Added the Supabase view `public.poster_wall_cards`; the UI defaults to Shanghai while allowing other accepted cities through the city filter.
- Kept contribution intake Shanghai-first while preserving non-Shanghai city values for poster-backed review leads.
- Kept source links internal while exposing current/future ticket/action URLs as `Tickets` only when available.
- Simplified past poster archive display so expired events omit ticketing and entry-planning fields.
- Verified poster wall rendering, modal behavior, static fallback tests, and site checks.
```

- [ ] **Step 7: Final implementation commit**

Run:

```powershell
git add PROJECT_MEMORY.md
git commit -m "chore: record poster wall architecture update"
```

Expected result: commit succeeds if `PROJECT_MEMORY.md` was updated. If implementation policy for this session does not include commits, skip commit commands and leave a clear staged/unstaged summary instead.

## Execution Notes

- Do not hand-edit generated `events/*.html` for this work.
- Do not change event copy, source confidence, or poster evidence unless a test exposes a data-shape problem.
- Do not remove the static JSON fallback. It is the rollback path and the safest local-preview path.
- Do not introduce a full multi-city discovery product in this pass. Add only the compact city filter needed to show Shanghai by default and allow accepted uploads from other cities.
- Do not move existing local poster files to Supabase Storage or another object store in this pass.
- If `npm run check` fails only at `scripts/audit-events.js` because source checks are stale, report the stale source audit separately. The architecture validation should still use `npm run check:code` as the pass/fail command for this implementation.

## Approval Gate

Implementation should not start until the user approves this plan.
