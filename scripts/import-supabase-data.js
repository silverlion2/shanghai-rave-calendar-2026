const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const rootDir = path.resolve(__dirname, "..");

function loadEnvFile(fileName) {
  const filePath = path.join(rootDir, fileName);
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

function readWindowAssignment(relativePath, key) {
  const sandbox = { window: {} };
  const filePath = path.join(rootDir, relativePath);
  vm.runInNewContext(fs.readFileSync(filePath, "utf8"), sandbox, { filename: relativePath });
  return sandbox.window[key];
}

function slugify(value, fallback = "item") {
  const slug = String(value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || fallback;
}

function stableId(...parts) {
  const readable = slugify(parts.filter(Boolean).join("-"), "row").slice(0, 68);
  const hash = crypto
    .createHash("sha1")
    .update(parts.map(part => String(part ?? "")).join("\n"))
    .digest("hex")
    .slice(0, 10);
  return `${readable}-${hash}`;
}

function asDate(value) {
  if (!value) return null;
  const match = String(value).match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

function asInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function clean(value) {
  if (Array.isArray(value)) {
    return value.map(clean).filter(item => item !== undefined);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, clean(item)])
        .filter(([, item]) => item !== undefined)
    );
  }
  if (value === undefined) return undefined;
  if (typeof value === "number" && Number.isNaN(value)) return undefined;
  return value;
}

function uniqBy(items, keyFn) {
  const seen = new Set();
  return items.filter(item => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function byId(items) {
  return new Map((items || []).filter(item => item && item.id).map(item => [item.id, item]));
}

function normalizedSource(event) {
  if (!event.source && !event.sourceLabel) return [];
  return [{
    label: event.sourceLabel || "Source",
    url: event.source || null,
    status: event.sourceStatus || null,
    lastChecked: event.lastChecked || null
  }];
}

function mergeSources(...sourceGroups) {
  return uniqBy(
    sourceGroups.flat().filter(Boolean),
    source => `${source.label || ""}::${source.url || ""}`
  );
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL
    || process.env.NEXT_PUBLIC_SUPABASE_URL
    || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in local env."
    );
  }
  return { url, serviceRoleKey };
}

async function upsertRows(client, table, rows, onConflict, batchSize = 100) {
  const cleanedRows = rows.map(clean).filter(Boolean);
  if (!cleanedRows.length) {
    console.log(`${table}: 0 rows`);
    return;
  }

  for (let index = 0; index < cleanedRows.length; index += batchSize) {
    const batch = cleanedRows.slice(index, index + batchSize);
    const { error } = await client
      .from(table)
      .upsert(batch, { onConflict, ignoreDuplicates: false });
    if (error) {
      throw new Error(`${table} import failed: ${error.message}`);
    }
  }

  console.log(`${table}: ${cleanedRows.length} rows`);
}

function buildRows() {
  const eventsData = readJson("data/events.json");
  const postersData = readJson("data/poster-archive.json");
  const curatedData = readJson("config/curated-events.json");
  const siteStructure = readJson("config/website-structure.json");
  const djData = readWindowAssignment("data/dj-data.js", "DJ_SOURCE_DATA");
  const itineraryData = readWindowAssignment("data/tracked-dj-itineraries.js", "DJ_ITINERARY_DATA");

  const curatedEvents = byId(curatedData.events);
  const posterEvents = byId((postersData.posters || []).map(poster => ({
    id: poster.eventId,
    poster
  })));
  const eventRows = [];
  const eventIds = new Set();
  const venueMap = new Map();
  const sourceRows = [];
  const artistMap = new Map();
  const lineupRows = [];

  for (const baseEvent of eventsData.events || []) {
    const curatedEvent = curatedEvents.get(baseEvent.id) || {};
    const poster = posterEvents.get(baseEvent.id)?.poster;
    const event = {
      ...baseEvent,
      ...curatedEvent,
      sources: mergeSources(baseEvent.sources || [], curatedEvent.sources || [], normalizedSource(baseEvent)),
      lineup: curatedEvent.lineup || (djData.lineups || {})[baseEvent.id] || [],
      setTimes: curatedEvent.setTimes || []
    };
    const venueSlug = event.venue ? slugify(event.venue, "venue") : null;
    eventIds.add(event.id);

    if (venueSlug) {
      const existingVenue = venueMap.get(venueSlug) || {};
      venueMap.set(venueSlug, {
        slug: venueSlug,
        name: event.venue,
        district: existingVenue.district || event.district || null,
        city: "Shanghai",
        country: "CN",
        address: existingVenue.address || event.address || null,
        organizer: existingVenue.organizer || event.organizer || null,
        tags: uniqBy([
          ...(existingVenue.tags || []),
          event.district,
          ...(event.vibe || [])
        ].filter(Boolean), item => item),
        sources: mergeSources(existingVenue.sources || [], event.sources || []),
        raw: {
          firstSeenEventId: existingVenue.raw?.firstSeenEventId || event.id
        }
      });
    }

    eventRows.push({
      id: event.id,
      slug: slugify(event.id, "event"),
      title: event.title,
      month: event.month || null,
      date_label: event.date || null,
      sort_date: asDate(event.sortDate),
      time_label: event.time || null,
      venue_slug: venueSlug,
      venue_name: event.venue || null,
      district: event.district || null,
      city: "Shanghai",
      country: "CN",
      sound: event.sound || event.genre || null,
      genre: event.genre || event.sound || null,
      status: event.status || "watch",
      confidence: event.confidence || null,
      price: event.price || null,
      age: event.age || null,
      description: event.description || null,
      notes: event.notes || null,
      source_url: event.source || event.detailsUrl || null,
      source_label: event.sourceLabel || null,
      source_status: event.sourceStatus || null,
      last_checked: asDate(event.lastChecked),
      event_url: event.eventUrl || `events/${event.id}.html`,
      poster_url: poster?.image?.display || event.posterUrl || null,
      image_theme: event.imageTheme || null,
      vibe: event.vibe || [],
      tags: Array.from(new Set([...(event.tags || []), ...(event.soundTags || []), ...(event.decisionTags || [])].filter(Boolean))),
      sources: event.sources || [],
      lineup: event.lineup || [],
      set_times: event.setTimes || [],
      raw: event,
      published: true
    });

    for (const [index, source] of (event.sources || []).entries()) {
      sourceRows.push({
        id: stableId(event.id, source.label, source.url, index),
        event_id: event.id,
        label: source.label || event.sourceLabel || null,
        url: source.url || null,
        status: source.status || null,
        kind: source.kind || null,
        source_status: source.sourceStatus || source.status || null,
        last_checked: asDate(source.lastChecked || event.lastChecked),
        raw: source
      });
    }

    const setTimesByName = new Map(
      (event.setTimes || []).map(setTime => [String(setTime.name || "").toLowerCase(), setTime])
    );
    for (const [index, lineupItem] of (event.lineup || []).entries()) {
      if (!lineupItem || !lineupItem.name) continue;
      const artistSlug = slugify(lineupItem.name, "artist");
      const setTime = setTimesByName.get(String(lineupItem.name).toLowerCase()) || {};

      if (!artistMap.has(artistSlug)) {
        artistMap.set(artistSlug, {
          slug: artistSlug,
          name: lineupItem.name,
          summary: null,
          source_note: null,
          image_theme: null,
          genres: [],
          aliases: [],
          sources: [],
          raw: {
            firstSeenEventId: event.id
          }
        });
      }

      lineupRows.push({
        id: stableId(event.id, artistSlug, index),
        event_id: event.id,
        artist_slug: artistSlug,
        artist_name: lineupItem.name,
        note: lineupItem.note || null,
        start_time: setTime.start || lineupItem.start || null,
        end_time: setTime.end || lineupItem.end || null,
        status: setTime.status || lineupItem.status || null,
        room: setTime.room || lineupItem.room || null,
        source_label: setTime.sourceLabel || lineupItem.sourceLabel || null,
        source_url: setTime.source || lineupItem.source || null,
        position: index,
        raw: {
          lineup: lineupItem,
          setTime
        }
      });
    }
  }

  const itineraryRows = [];
  const itineraryStopRows = [];
  for (const [artistKey, itinerary] of Object.entries(itineraryData || {})) {
    if (!itinerary || !itinerary.name) continue;
    const artistSlug = itinerary.slug || slugify(artistKey, "artist");
    const artist = artistMap.get(artistSlug) || {
      slug: artistSlug,
      name: itinerary.name,
      raw: {}
    };
    artistMap.set(artistSlug, {
      ...artist,
      name: artist.name || itinerary.name,
      summary: artist.summary || itinerary.summary || null,
      source_note: artist.source_note || itinerary.sourceNote || null,
      image_theme: artist.image_theme || itinerary.imageTheme || null,
      genres: artist.genres?.length ? artist.genres : itinerary.genres || [],
      aliases: artist.aliases?.length ? artist.aliases : itinerary.aliases || [],
      sources: artist.sources?.length ? artist.sources : itinerary.sources || [],
      raw: {
        ...artist.raw,
        itineraryProfile: itinerary
      }
    });

    itineraryRows.push({
      artist_slug: artistSlug,
      name: itinerary.name,
      tracked_at: asDate(itinerary.trackedAt),
      checked_by_timezone: itinerary.checkedByTimezone || null,
      scope: itinerary.scope || null,
      summary: itinerary.summary || null,
      source_note: itinerary.sourceNote || null,
      image_theme: itinerary.imageTheme || null,
      genres: itinerary.genres || [],
      aliases: itinerary.aliases || [],
      sources: itinerary.sources || [],
      raw: itinerary
    });

    for (const [index, stop] of (itinerary.itinerary || []).entries()) {
      itineraryStopRows.push({
        id: stableId(artistSlug, stop.date, stop.title, stop.city, index),
        artist_slug: artistSlug,
        date: asDate(stop.date),
        end_date: asDate(stop.endDate),
        display_date: stop.displayDate || null,
        title: stop.title || null,
        city: stop.city || null,
        country: stop.country || null,
        venue: stop.venue || null,
        source_label: stop.sourceLabel || null,
        source_url: stop.source || null,
        source_status: stop.sourceStatus || null,
        status: stop.status || null,
        note: stop.note || null,
        raw: stop
      });
    }
  }

  const posterRows = (postersData.posters || []).map(poster => ({
    id: poster.id,
    event_id: eventIds.has(poster.eventId) ? poster.eventId : null,
    title: poster.title,
    year: asInteger(poster.year),
    city: poster.city || null,
    country: poster.country || null,
    date_label: poster.date || null,
    sort_date: asDate(poster.sortDate),
    time_label: poster.time || null,
    venue_name: poster.venue || null,
    district: poster.district || null,
    sound: poster.sound || null,
    status: poster.status || null,
    confidence: poster.confidence || null,
    collection: poster.collection || null,
    source: poster.source || {},
    image: poster.image || {},
    tags: poster.tags || [],
    notes: poster.notes || null,
    event_url: poster.eventUrl || null,
    raw: poster
  }));

  const sourceCheckRows = (eventsData.sources || []).map((source, index) => ({
    id: stableId(source.label, source.url, source.kind, index),
    label: source.label || "Source",
    url: source.url || null,
    kind: source.kind || null,
    source_status: source.sourceStatus || null,
    access: source.access || null,
    checked_at: asDate(source.checkedAt),
    ok: typeof source.ok === "boolean" ? source.ok : null,
    status: source.status == null ? null : String(source.status),
    event_links: asInteger(source.eventLinks),
    links: asInteger(source.links),
    priority: asInteger(source.priority),
    cadence: source.cadence || null,
    trigger: source.trigger || null,
    error: source.error || null,
    raw: source
  }));

  const sitePageRows = [
    ...(siteStructure.pages || []),
    ...(siteStructure.mirrors || [])
  ].map(page => ({
    id: page.id,
    label: page.label,
    file: page.file,
    route: page.route || null,
    shell: page.shell || null,
    include_in_sitemap: page.includeInSitemap === true,
    changefreq: page.changefreq || null,
    priority: page.priority ? Number(page.priority) : null,
    utility: Boolean(page.utility),
    homepage_stats: Boolean(page.homepageStats),
    raw: page
  }));

  return {
    venues: Array.from(venueMap.values()),
    artists: Array.from(artistMap.values()),
    events: eventRows,
    event_sources: sourceRows,
    event_lineups: lineupRows,
    poster_archive: posterRows,
    dj_itineraries: itineraryRows,
    dj_itinerary_stops: itineraryStopRows,
    source_checks: sourceCheckRows,
    site_pages: sitePageRows
  };
}

async function main() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");
  loadEnvFile(".env.production");
  loadEnvFile(".env.preview");

  if (process.argv.includes("--dry-run")) {
    const rows = buildRows();
    for (const [table, tableRows] of Object.entries(rows)) {
      console.log(`${table}: ${tableRows.length} rows`);
    }
    return;
  }

  const { url, serviceRoleKey } = getSupabaseConfig();
  const client = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  const rows = buildRows();

  await upsertRows(client, "venues", rows.venues, "slug");
  await upsertRows(client, "artists", rows.artists, "slug");
  await upsertRows(client, "events", rows.events, "id");
  await upsertRows(client, "event_sources", rows.event_sources, "id");
  await upsertRows(client, "event_lineups", rows.event_lineups, "id");
  await upsertRows(client, "poster_archive", rows.poster_archive, "id");
  await upsertRows(client, "dj_itineraries", rows.dj_itineraries, "artist_slug");
  await upsertRows(client, "dj_itinerary_stops", rows.dj_itinerary_stops, "id");
  await upsertRows(client, "source_checks", rows.source_checks, "id");
  await upsertRows(client, "site_pages", rows.site_pages, "id");
}

main().catch(error => {
  console.error(`Supabase import failed: ${error.message}`);
  process.exitCode = 1;
});
