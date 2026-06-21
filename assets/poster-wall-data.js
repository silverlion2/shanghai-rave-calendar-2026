(function attachPosterWallData(root) {
  const DEFAULT_CITY = "Shanghai";
  const ALL_CITIES = "all";
  const DEFAULT_VIEW = "poster_wall_cards";
  const EVENTS_TABLE = "events";
  const EVENTS_TABLE_COLUMNS = [
    "id",
    "slug",
    "title",
    "city",
    "country",
    "date_label",
    "sort_date",
    "time_label",
    "venue_name",
    "district",
    "sound",
    "genre",
    "status",
    "confidence",
    "price",
    "age",
    "description",
    "notes",
    "source_url",
    "source_label",
    "source_status",
    "last_checked",
    "event_url",
    "poster_url",
    "image_theme",
    "vibe",
    "tags",
    "sources",
    "lineup",
    "set_times",
    "raw",
  ].join(",");
  const DEFAULT_PAGE_SIZE = 120;
  const DEFAULT_TIMEOUT_MS = 3500;
  const MAX_SUPABASE_PAGES = 8;

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

  function duplicateKeys(event) {
    const date = cleanText(event.sortDate || event.date);
    const venue = comparableText(event.venue);
    const title = compactTitle(event.title);
    const baseTitle = compactBaseTitle(event.title);
    const keys = [];
    if (date && venue && title) keys.push(["exact", date, venue, title].join("|"));
    if (date && baseTitle && baseTitle.length >= 8) keys.push(["date-title", date, baseTitle].join("|"));
    return keys;
  }

  function uniqueValues(values) {
    return Array.from(new Set((values || []).map(value => cleanText(value)).filter(Boolean)));
  }

  function withOtherCityTags(values, city) {
    const cityName = cleanText(city);
    if (!cityName || cityName.toLowerCase() === DEFAULT_CITY.toLowerCase()) return asArray(values);
    return uniqueValues([
      ...asArray(values),
      "other city",
      cityName.toLowerCase(),
    ]);
  }

  function eventQualityScore(event) {
    const sourceLabel = comparableText(event.sourceLabel);
    const hasStrongSource = cleanText(event.source) && sourceLabel !== "poster archive";
    const cityScore = comparableText(event.city) === "shanghai" ? 20 : 0;
    return [
      cityScore,
      hasStrongSource ? 50 : 0,
      Array.isArray(event.lineup) ? event.lineup.length * 5 : 0,
      cleanText(event.description) ? 6 : 0,
      cleanText(event.sourceStatus) ? 4 : 0,
      cleanText(event.lastChecked) ? 3 : 0,
      cleanText(event.recommendationReason) ? 2 : 0,
      cleanText(event.posterUrl) ? 1 : 0,
    ].reduce((sum, value) => sum + value, 0);
  }

  function dedupeEvents(events) {
    const byKey = new Map();
    const result = [];
    for (const event of events || []) {
      const keys = duplicateKeys(event);
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
        result[existingIndex] = event;
        keys.forEach(key => byKey.set(key, existingIndex));
      }
    }
    return result;
  }

  function normalizedConfig(win = root) {
    const source = (win && (win.POSTER_WALL_SUPABASE || win.LOVE_WALL_SUPABASE)) || {};
    const pageSize = Number.parseInt(source.posterWallPageSize, 10);
    const timeoutMs = Number.parseInt(source.posterWallTimeoutMs, 10);
    return {
      enabled: source.posterWallEnabled !== false && source.enabled !== false,
      url: cleanText(source.url).replace(/\/+$/, ""),
      anonKey: cleanText(source.anonKey),
      view: cleanText(source.posterWallView) || DEFAULT_VIEW,
      city: cleanText(source.posterWallDefaultCity || source.posterWallCity) || DEFAULT_CITY,
      pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE,
      timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS,
    };
  }

  function eventCity(event) {
    return cleanText(event && event.city) || DEFAULT_CITY;
  }

  function filterEventsByCity(events, city = DEFAULT_CITY) {
    const selected = cleanText(city) || DEFAULT_CITY;
    if (selected.toLowerCase() === ALL_CITIES) return events || [];
    return (events || []).filter(event => eventCity(event).toLowerCase() === selected.toLowerCase());
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
      title: cleanText(row.title || row.name),
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
      tags: withOtherCityTags(row.tags, row.city),
      sources: asArray(row.sources),
      lineup: asArray(row.lineup),
      setTimes: asArray(row.setTimes || row.set_times),
      soundTags: asArray(row.soundTags || row.sound_tags),
      decisionTags: withOtherCityTags(row.decisionTags || row.decision_tags, row.city),
      recommendationReason: cleanText(row.recommendationReason || row.recommendation_reason),
      bestFor: cleanText(row.bestFor || row.best_for),
      verifyBeforeGoing: cleanText(row.verifyBeforeGoing || row.verify_before_going),
      sourceConfidence: cleanText(row.sourceConfidence || row.source_confidence),
      address: cleanText(row.address),
      raw: row.raw || row,
    };
  }

  function normalizeStaticPayload(eventsPayload, archivePayload) {
    const events = Array.isArray(eventsPayload) ? eventsPayload : eventsPayload?.events || [];
    const archiveByEvent = posterArchiveMap(archivePayload?.posters || []);
    return dedupeEvents(events
      .map(event => normalizeEvent(event, archiveByEvent.get(cleanText(event.id))))
      .filter(event => event.id && event.title));
  }

  function normalizeSupabaseRows(rows) {
    return dedupeEvents((rows || [])
      .map(row => normalizeEvent(row))
      .filter(event => event.id && event.title));
  }

  async function fetchJson(fetcher, url, fallback) {
    const response = await fetcher(url);
    if (!response || response.ok === false) return fallback;
    return response.json();
  }

  async function loadStaticData({ fetcher }) {
    const [eventsPayload, posterArchive] = await Promise.all([
      fetchJson(fetcher, "data/events.json", { events: [] }),
      fetchJson(fetcher, "data/poster-archive.json", { posters: [] }).catch(() => ({ posters: [] })),
    ]);
    return {
      source: "static",
      posterArchive,
      events: normalizeStaticPayload(eventsPayload, posterArchive),
    };
  }

  async function loadSupabaseRange(win, client, table, config, rangeStart = 0) {
    const rangeEnd = rangeStart + config.pageSize - 1;
    let query = client
      .from(table)
      .select(table === EVENTS_TABLE ? EVENTS_TABLE_COLUMNS : "*");
    if (table === EVENTS_TABLE && typeof query.not === "function") {
      query = query.not("poster_url", "is", null);
    }
    query = query
      .order("sort_date", { ascending: true, nullsFirst: false })
      .range(rangeStart, rangeEnd);
    const timer = win.setTimeout || root.setTimeout;
    const result = typeof timer === "function"
      ? await Promise.race([
        query,
        new Promise((resolve) => {
          timer(() => resolve({ data: null, error: { message: `Supabase poster wall query timed out after ${config.timeoutMs}ms` } }), config.timeoutMs);
        }),
      ])
      : await query;

    if (result.error) throw new Error(result.error.message || "Supabase poster wall query failed");
    return result.data || [];
  }

  async function loadSupabaseTableData(win, config, table, source) {
    const client = win.supabase.createClient(config.url, config.anonKey);
    const rows = [];
    for (let page = 0; page < MAX_SUPABASE_PAGES; page += 1) {
      const rangeStart = page * config.pageSize;
      const pageRows = await loadSupabaseRange(win, client, table, config, rangeStart);
      rows.push(...pageRows);
      if (pageRows.length < config.pageSize) break;
    }
    return {
      source,
      posterArchive: { posters: [] },
      events: normalizeSupabaseRows(rows),
    };
  }

  function shouldTryEventsFallback(error) {
    return Boolean(error);
  }

  async function loadSupabaseData(win, config) {
    try {
      return await loadSupabaseTableData(win, config, config.view, "supabase");
    } catch (error) {
      if (config.view !== EVENTS_TABLE && shouldTryEventsFallback(error)) {
        const fallback = await loadSupabaseTableData(win, config, EVENTS_TABLE, "supabase-events-fallback");
        return {
          ...fallback,
          error: error.message || String(error),
        };
      }
      throw error;
    }
  }

  async function loadPosterWallData(options = {}) {
    const win = options.win || root;
    const fetcher = options.fetcher || win.fetch?.bind(win);
    if (typeof fetcher !== "function") {
      throw new Error("Poster wall data loader requires fetch");
    }

    const config = normalizedConfig(win);
    if (canUseSupabase(win, config)) {
      try {
        return await loadSupabaseData(win, config);
      } catch (error) {
        const fallback = await loadStaticData({ fetcher });
        return {
          ...fallback,
          source: "static-fallback",
          error: error.message || String(error),
        };
      }
    }

    return loadStaticData({ fetcher });
  }

  root.PosterWallData = {
    ALL_CITIES,
    DEFAULT_CITY,
    canUseSupabase,
    filterEventsByCity,
    loadPosterWallData,
    dedupeEvents,
    normalizeStaticPayload,
    normalizeSupabaseRows,
    normalizedConfig,
    _testWindow: root,
  };
})(typeof window !== "undefined" ? window : globalThis);
