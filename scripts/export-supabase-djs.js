const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.resolve(__dirname, "..");
const JSON_OUTPUT = path.join(ROOT, "data", "supabase-dj-data.json");
const JS_OUTPUT = path.join(ROOT, "data", "supabase-dj-data.js");

function loadEnvFile(fileName) {
  const filePath = path.join(ROOT, fileName);
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
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
  return String(value || "dj")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "dj";
}

function compactText(value) {
  return String(value || "")
    .replace(/\[a=([^\]]+)\]/g, "$1")
    .replace(/\[l\d+\]/g, "the label")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values) {
  const seen = new Set();
  const result = [];
  for (const value of values || []) {
    const text = compactText(value);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }
  return result;
}

function safeUrl(value) {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url) ? url : "";
}

function cleanSources(sources) {
  return (Array.isArray(sources) ? sources : [])
    .map(source => ({
      label: compactText(source && source.label || "Source"),
      url: safeUrl(source && source.url),
      status: compactText(source && source.status || "")
    }))
    .filter(source => source.label || source.url);
}

function cleanReleases(releases) {
  return (Array.isArray(releases) ? releases : [])
    .map(release => ({
      title: compactText(release && release.title),
      year: release && release.year || null,
      label: compactText(release && release.label),
      role: compactText(release && release.role),
      format: compactText(release && release.format)
    }))
    .filter(release => release.title)
    .slice(0, 10);
}

function cleanImages(images) {
  return (Array.isArray(images) ? images : [])
    .map(image => ({
      source: compactText(image && image.source || "source"),
      uri: safeUrl(image && image.uri),
      width: Number(image && image.width) || null,
      height: Number(image && image.height) || null
    }))
    .filter(image => image.uri)
    .slice(0, 3);
}

function hasSuspiciousText(value) {
  const text = String(value || "");
  return /\[[al]=[^\]]+\]/.test(text) || /[\uFFFD\u8305\u9176\u6C13\u76F2\u7709\u5E3D]/.test(text);
}

function normalizeArtist(row) {
  const raw = row.raw && typeof row.raw === "object" ? row.raw : {};
  const genres = unique(row.genres || []);
  const sources = cleanSources(row.sources);
  const images = cleanImages(raw.images);
  const releases = cleanReleases(raw.releases);
  const labels = unique(raw.labels || []).slice(0, 30);
  const aliases = unique(row.aliases || []).slice(0, 20);
  const externalUrls = unique(raw.externalUrls || []).map(safeUrl).filter(Boolean).slice(0, 12);
  const summary = compactText(row.summary);
  const sourceNote = compactText(row.source_note);
  const issues = [];

  if (!summary || summary.length < 80) issues.push("short_summary");
  if (!genres.length) issues.push("no_genres");
  if (!sources.length) issues.push("no_sources");
  if (!images.length) issues.push("no_image");
  if (hasSuspiciousText([row.name, row.summary, row.source_note, JSON.stringify(raw.releases || [])].join(" "))) {
    issues.push("encoded_or_discogs_markup_text");
  }

  const hasProfileText = summary.length >= 80 || genres.length || sources.length;
  const dataDepth = summary.length >= 80 && genres.length && sources.length && images.length
    ? "rich"
    : (hasProfileText ? "sourced" : "lineup");

  return {
    slug: row.slug || slugify(row.name),
    name: compactText(row.name) || row.slug || "Unknown artist",
    summary,
    sourceNote,
    imageTheme: row.image_theme || "techno",
    genres,
    aliases,
    sources,
    images,
    labels,
    releases,
    externalUrls,
    country: compactText(raw.country),
    stats: raw.stats && typeof raw.stats === "object" ? raw.stats : {},
    ids: {
      musicBrainz: raw.mbid || null,
      discogs: raw.discogsId || null
    },
    dataDepth,
    issues,
    updatedAt: row.updated_at || row.created_at || null
  };
}

function increment(map, key) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + 1);
}

function topEntries(map, limit = 12) {
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

async function fetchArtists(supabase) {
  const rows = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("artists")
      .select("slug,name,summary,source_note,image_theme,genres,aliases,sources,raw,created_at,updated_at")
      .order("name", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

function summarize(artists, generatedAt) {
  const sourceLabels = new Map();
  const genres = new Map();
  const issueCounts = {};

  for (const artist of artists) {
    for (const source of artist.sources) increment(sourceLabels, source.label);
    for (const genre of artist.genres) increment(genres, genre.toLowerCase());
    for (const issue of artist.issues) issueCounts[issue] = (issueCounts[issue] || 0) + 1;
  }

  return {
    generatedAt,
    total: artists.length,
    richProfiles: artists.filter(artist => artist.dataDepth === "rich").length,
    sourcedProfiles: artists.filter(artist => artist.dataDepth === "sourced").length,
    lineupContextOnly: artists.filter(artist => artist.dataDepth === "lineup").length,
    withImages: artists.filter(artist => artist.images.length).length,
    withSources: artists.filter(artist => artist.sources.length).length,
    withReleases: artists.filter(artist => artist.releases.length).length,
    withLabels: artists.filter(artist => artist.labels.length).length,
    withExternalUrls: artists.filter(artist => artist.externalUrls.length).length,
    issueCounts,
    topSourceLabels: topEntries(sourceLabels),
    topGenres: topEntries(genres)
  };
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY are required.");
  }

  const supabase = createClient(url, key);
  const rows = await fetchArtists(supabase);
  const generatedAt = new Date().toISOString();
  const artists = rows.map(normalizeArtist);
  const payload = {
    generatedAt,
    summary: summarize(artists, generatedAt),
    artists
  };

  fs.writeFileSync(JSON_OUTPUT, JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(JS_OUTPUT, `window.SUPABASE_DJ_DATA = ${JSON.stringify(payload, null, 2)};\n`, "utf8");

  console.log(`Exported ${artists.length} Supabase artists.`);
  console.log(`JSON: ${JSON_OUTPUT}`);
  console.log(`JS:   ${JS_OUTPUT}`);
}

main().catch(error => {
  console.error("FATAL:", error.message);
  process.exit(1);
});
