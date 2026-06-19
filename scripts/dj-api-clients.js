const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(ROOT, "data", "dj-api-cache");

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function loadEnvFile(fileName) {
  const filePath = path.join(ROOT, fileName);
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function cacheKey(source, query) {
  return `${source}-${slugify(query)}.json`;
}

function readCache(source, query) {
  const file = path.join(CACHE_DIR, cacheKey(source, query));
  if (!fs.existsSync(file)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const age = Date.now() - (data._cachedAt || 0);
    const MAX_AGE = 14 * 24 * 60 * 60 * 1000;
    if (age < MAX_AGE) return data;
    return null;
  } catch {
    return null;
  }
}

function writeCache(source, query, data) {
  const file = path.join(CACHE_DIR, cacheKey(source, query));
  const payload = { ...data, _cachedAt: Date.now() };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Accept": "application/json", ...options.headers },
    ...options
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
  }
  return res.json();
}

async function fetchJSONWithRetry(url, options = {}, maxRetries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchJSON(url, options);
    } catch (e) {
      lastError = e;
      if (attempt < maxRetries) {
        await delay(2000 * attempt);
      }
    }
  }
  throw lastError;
}

function ensureArray(v) {
  if (v === null || v === undefined) return [];
  return Array.isArray(v) ? v : [String(v)];
}

const MusicBrainz = {
  async searchArtist(name) {
    const cached = readCache("mb", name);
    if (cached) return cached;

    await delay(1100);
    const url = `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(name)}&fmt=json&limit=5`;
    let data;
    try {
      data = await fetchJSONWithRetry(url, {
        headers: { "User-Agent": "RaveCalendar/1.0 ( offlinedata@local.test )" }
      }, 2);
    } catch (e) {
      writeCache("mb", name, { found: false, error: e.message });
      return { found: false, error: e.message };
    }

    if (!data.artists || data.artists.length === 0) {
      writeCache("mb", name, { found: false });
      return { found: false };
    }

    const artist = data.artists[0];
    const result = {
      found: true,
      id: artist.id,
      name: artist.name,
      sortName: artist["sort-name"],
      type: artist.type || null,
      gender: artist.gender || null,
      country: artist.country || (artist.area ? artist.area.name : null),
      disambiguation: artist.disambiguation || "",
      lifeSpan: artist["life-span"] || {},
      aliases: (artist.aliases || []).map(a => a.name),
      tags: (artist.tags || []).map(t => t.name),
      genres: (artist.genres || []).map(g => g.name),
      raw: { score: artist.score, count: data.count }
    };

    writeCache("mb", name, result);
    return result;
  }
};

const Discogs = {
  async searchArtist(name) {
    const cached = readCache("discogs", name);
    if (cached) return cached;

    const token = process.env.DISCOGS_TOKEN || process.env.DISCOGS_API_KEY;
    const headers = { "User-Agent": "RaveCalendar/1.0" };
    if (token) headers["Authorization"] = `Discogs token=${token}`;

    await delay(2000);
    const url = `https://api.discogs.com/database/search?q=${encodeURIComponent(name)}&type=artist&per_page=5`;
    let data;
    try {
      data = await fetchJSON(url, { headers });
    } catch (e) {
      writeCache("discogs", name, { found: false, error: e.message });
      return { found: false, error: e.message };
    }

    if (!data.results || data.results.length === 0) {
      writeCache("discogs", name, { found: false });
      return { found: false };
    }

    const match = data.results[0];
    const artistId = match.id;

    await delay(2000);
    const detailUrl = `https://api.discogs.com/artists/${artistId}`;
    const detail = await fetchJSON(detailUrl, { headers }).catch(() => null);

    await delay(2000);
    const releasesUrl = `https://api.discogs.com/artists/${artistId}/releases?per_page=50&sort=year&sort_order=desc`;
    const releases = await fetchJSON(releasesUrl, { headers }).catch(() => null);

    const labelsSet = new Set();
    const genresSet = new Set();
    const stylesSet = new Set();
    const releaseList = [];

    if (releases && releases.releases) {
      for (const r of releases.releases) {
        if (r.label) {
          ensureArray(r.label).forEach(l => labelsSet.add(String(l)));
        }
        if (r.genre) {
          ensureArray(r.genre).forEach(g => genresSet.add(String(g)));
        }
        if (r.style) {
          ensureArray(r.style).forEach(s => stylesSet.add(String(s)));
        }
        releaseList.push({
          title: r.title,
          year: r.year,
          label: typeof r.label === "string" ? r.label : (Array.isArray(r.label) ? r.label[0] : null),
          role: r.role,
          format: r.format,
          genre: r.genre,
          style: r.style
        });
      }
    }

    const result = {
      found: true,
      id: artistId,
      name: detail ? detail.name : match.title,
      profile: detail ? (detail.profile || "") : "",
      nameVariations: detail ? (detail.namevariations || []) : [],
      members: detail ? (detail.members || []).map(m => m.name) : [],
      groups: detail ? (detail.groups || []).map(g => g.name) : [],
      urls: detail ? (detail.urls || []) : [],
      images: detail ? (detail.images || []).map(i => ({ type: i.type, uri: i.uri, width: i.width, height: i.height })) : [],
      genres: Array.from(genresSet),
      styles: Array.from(stylesSet),
      labels: Array.from(labelsSet),
      releases: releaseList.slice(0, 30),
      releaseCount: releaseList.length,
      dataQuality: detail ? detail.data_quality : null,
      thumb: match.thumb || null,
      raw: { discogs_url: match.resource_url }
    };

    writeCache("discogs", name, result);
    return result;
  }
};

const LastFM = {
  async getArtist(name) {
    const cached = readCache("lastfm", name);
    if (cached) return cached;

    const apiKey = process.env.LASTFM_API_KEY;
    if (!apiKey) {
      writeCache("lastfm", name, { found: false, note: "LASTFM_API_KEY not configured" });
      return { found: false, note: "LASTFM_API_KEY not configured" };
    }

    await delay(600);
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(name)}&api_key=${apiKey}&format=json`;
    const data = await fetchJSON(url).catch(() => null);

    if (!data || !data.artist) {
      writeCache("lastfm", name, { found: false });
      return { found: false };
    }

    const a = data.artist;

    await delay(600);
    const eventsUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.getevents&artist=${encodeURIComponent(name)}&api_key=${apiKey}&format=json&limit=10`;
    const eventsData = await fetchJSON(eventsUrl).catch(() => null);

    const tourDates = [];
    if (eventsData && eventsData.events && Array.isArray(eventsData.events.event)) {
      for (const evt of eventsData.events.event) {
        tourDates.push({
          title: evt.title,
          date: evt.startDate,
          venue: evt.venue ? evt.venue.name : null,
          city: evt.venue && evt.venue.location ? evt.venue.location.city : null,
          country: evt.venue && evt.venue.location ? evt.venue.location.country : null,
          url: evt.url
        });
      }
    }

    const tags = [];
    if (a.tags && a.tags.tag) {
      const rawTags = Array.isArray(a.tags.tag) ? a.tags.tag : [a.tags.tag];
      for (const t of rawTags) {
        if (t && t.name) tags.push(t.name);
      }
    }

    const similar = [];
    if (a.similar && a.similar.artist) {
      const rawSimilar = Array.isArray(a.similar.artist) ? a.similar.artist : [a.similar.artist];
      for (const sa of rawSimilar) {
        if (sa && sa.name) similar.push({ name: sa.name, url: sa.url });
      }
    }

    const result = {
      found: true,
      name: a.name,
      mbid: a.mbid,
      url: a.url,
      listeners: a.stats ? a.stats.listeners : null,
      playcount: a.stats ? a.stats.playcount : null,
      onTour: a.ontour === "1",
      streamable: a.streamable === "1",
      bio: a.bio ? {
        summary: a.bio.summary,
        content: a.bio.content,
        published: a.bio.published
      } : null,
      tags,
      similar,
      images: a.image || [],
      tourDates,
      raw: {}
    };

    writeCache("lastfm", name, result);
    return result;
  }
};

const Bandsintown = {
  async getArtist(name) {
    const cached = readCache("bit", name);
    if (cached) return cached;

    const appId = process.env.BANDSINTOWN_APP_ID;
    if (!appId) {
      writeCache("bit", name, { found: false, note: "BANDSINTOWN_APP_ID not configured" });
      return { found: false, note: "BANDSINTOWN_APP_ID not configured" };
    }

    await delay(1000);
    const url = `https://rest.bandsintown.com/artists/${encodeURIComponent(name)}?app_id=${appId}`;
    const artistData = await fetchJSON(url).catch(() => null);

    if (!artistData || !artistData.id) {
      writeCache("bit", name, { found: false });
      return { found: false };
    }

    await delay(1000);
    const eventsUrl = `https://rest.bandsintown.com/artists/${encodeURIComponent(name)}/events?app_id=${appId}&date=upcoming`;
    const events = await fetchJSON(eventsUrl).catch(() => []);

    const tourDates = (events || []).map(e => ({
      title: e.title,
      date: e.datetime,
      venue: e.venue ? e.venue.name : null,
      city: e.venue ? e.venue.city : null,
      country: e.venue ? e.venue.country : null,
      url: e.url,
      offers: (e.offers || []).map(o => ({ type: o.type, url: o.url, status: o.status }))
    }));

    const result = {
      found: true,
      id: artistData.id,
      name: artistData.name,
      url: artistData.url,
      thumb: artistData.thumb_url,
      image: artistData.image_url,
      facebook: artistData.facebook_page_url,
      mbid: artistData.mbid,
      trackerCount: artistData.tracker_count,
      upcomingEventCount: artistData.upcoming_event_count,
      onTour: artistData.on_tour === true,
      tourDates,
      raw: {}
    };

    writeCache("bit", name, result);
    return result;
  }
};

module.exports = {
  MusicBrainz,
  Discogs,
  LastFM,
  Bandsintown,
  CACHE_DIR
};
