const fs = require("fs");
const path = require("path");
const { MusicBrainz, Discogs, CACHE_DIR } = require("./dj-api-clients.js");

const ROOT = path.resolve(__dirname, "..");

const CORE_DJS = [
  { name: "Charlotte de Witte", slug: "charlotte-de-witte", genres: ["Techno", "Acid Techno"] },
  { name: "Amelie Lens", slug: "amelie-lens", genres: ["Techno", "Acid Techno"] },
  { name: "Carl Cox", slug: "carl-cox", genres: ["Techno", "House"] },
  { name: "Adam Beyer", slug: "adam-beyer", genres: ["Techno"] },
  { name: "Nina Kraviz", slug: "nina-kraviz", genres: ["Techno", "Acid"] },
  { name: "Richie Hawtin", slug: "richie-hawtin", genres: ["Techno", "Minimal"] },
  { name: "Peggy Gou", slug: "peggy-gou", genres: ["House", "Techno", "Acid"] },
  { name: "Honey Dijon", slug: "honey-dijon", genres: ["House", "Techno"] },
  { name: "I Hate Models", slug: "i-hate-models", genres: ["Techno", "Industrial Techno"] },
  { name: "Boris Brejcha", slug: "boris-brejcha", genres: ["Techno", "Minimal"] },
  { name: "Reinier Zonneveld", slug: "reinier-zonneveld", genres: ["Techno"] },
  { name: "Anyma", slug: "anyma", genres: ["Melodic Techno", "Electronic"] },
  { name: "Marlon Hoffstadt", slug: "marlon-hoffstadt", genres: ["Techno", "Trance"] },
  { name: "Lilly Palmer", slug: "lilly-palmer", genres: ["Techno"] },
  { name: "Miss Monique", slug: "miss-monique", genres: ["Melodic Techno", "Progressive"] },
  { name: "Indira Paganotto", slug: "indira-paganotto", genres: ["Techno", "Psytech"] },
  { name: "Klangkuenstler", slug: "klangkuenstler", genres: ["Techno", "Industrial"] },
  { name: "Nico Moreno", slug: "nico-moreno", genres: ["Techno", "Hard Techno"] },
  { name: "Sara Landry", slug: "sara-landry", genres: ["Techno", "Hard Techno"] },
  { name: "Fantasm", slug: "fantasm", genres: ["Techno", "Industrial"] },
  { name: "33EMYBW", slug: "33emybw", genres: ["Electronic", "Experimental"] },
  { name: "Gooooose", slug: "gooooose", genres: ["Electronic", "Experimental"] },
  { name: "Anti-General", slug: "anti-general", genres: ["EDM", "Electronic"] },
  { name: "Knopha", slug: "knopha", genres: ["House", "Techno"] },
  { name: "Anika Kunst", slug: "anika-kunst", genres: ["Techno"] },
  { name: "Nosaj Thing", slug: "nosaj-thing", genres: ["Electronic", "Experimental"] },
  { name: "BADBADNOTGOOD", slug: "badbadnotgood", genres: ["Electronic", "Jazz"] },
  { name: "Lucrecia Dalt", slug: "lucrecia-dalt", genres: ["Electronic", "Experimental"] },
  { name: "CLTX", slug: "cltx", genres: ["Techno", "Hard Techno"] },
  { name: "Velvet Robot", slug: "velvet-robot", genres: ["Electronic", "Techno"] },
  { name: "Cosmjn", slug: "cosmjn", genres: ["House", "Techno", "Minimal"] },
  { name: "Milo Raad", slug: "milo-raad", genres: ["Techno"] },
  { name: "Matisa", slug: "matisa", genres: ["House", "Techno"] },
  { name: "Sciahri", slug: "sciahri", genres: ["Techno"] },
  { name: "Oscar L", slug: "oscar-l", genres: ["Techno", "House"] },
  { name: "Erik Hagleton", slug: "erik-hagleton", genres: ["House", "Techno"] },
  { name: "Nikita Zabelin", slug: "nikita-zabelin", genres: ["Techno"] },
  { name: "Tom Kynd", slug: "tom-kynd", genres: ["Techno", "House"] },
  { name: "Psyche", slug: "psyche", genres: ["Techno", "House"] },
  { name: "Mala", slug: "mala", genres: ["Dubstep", "Electronic"] },
  { name: "Mungk", slug: "mungk", genres: ["Dubstep", "Bass"] },
  { name: "D8", slug: "d8", genres: ["Dubstep", "Bass"] },
  { name: "Le Youth", slug: "le-youth", genres: ["Trance", "Progressive"] },
  { name: "Steal Tapes", slug: "steal-tapes", genres: ["House", "Techno"] },
  { name: "MRD", slug: "mrd", genres: ["Techno", "Trance"] },
  { name: "Mico", slug: "mico", genres: ["Electronic"] },
  { name: "Simbi", slug: "simbi", genres: ["Electronic", "Bass"] },
  { name: "Sanli", slug: "sanli", genres: ["Dubstep", "Bass"] },

  // ---- Germany / Berlin Techno ----
  { name: "Ben Klock", slug: "ben-klock", genres: ["Techno", "Dub Techno"] },
  { name: "Marcel Dettmann", slug: "marcel-dettmann", genres: ["Techno"] },
  { name: "Rødhåd", slug: "rodhad", genres: ["Techno", "Industrial"] },
  { name: "Chris Liebing", slug: "chris-liebing", genres: ["Techno"] },
  { name: "Len Faki", slug: "len-faki", genres: ["Techno"] },
  { name: "Marcel Fengler", slug: "marcel-fengler", genres: ["Techno"] },
  { name: "Monolake", slug: "monolake", genres: ["Techno", "Dub Techno", "Minimal"] },
  { name: "Sven Väth", slug: "sven-vath", genres: ["Techno", "Trance"] },
  { name: "Paul Kalkbrenner", slug: "paul-kalkbrenner", genres: ["Techno", "Electronic"] },

  // ---- UK / British Techno ----
  { name: "Surgeon", slug: "surgeon", genres: ["Techno", "Industrial"] },
  { name: "Blawan", slug: "blawan", genres: ["Techno", "Industrial"] },
  { name: "Perc", slug: "perc", genres: ["Techno", "Industrial"] },
  { name: "Ben UFO", slug: "ben-ufo", genres: ["Techno", "Dubstep"] },
  { name: "Regis", slug: "regis", genres: ["Techno"] },
  { name: "James Ruskin", slug: "james-ruskin", genres: ["Techno"] },
  { name: "Luke Slater", slug: "luke-slater", genres: ["Techno"] },
  { name: "Slam", slug: "slam", genres: ["Techno"] },

  // ---- Detroit / US Techno ----
  { name: "Jeff Mills", slug: "jeff-mills", genres: ["Techno"] },
  { name: "Robert Hood", slug: "robert-hood", genres: ["Techno", "Minimal"] },
  { name: "Juan Atkins", slug: "juan-atkins", genres: ["Techno"] },
  { name: "Derrick May", slug: "derrick-may", genres: ["Techno"] },
  { name: "Kevin Saunderson", slug: "kevin-saunderson", genres: ["Techno"] },
  { name: "DVS1", slug: "dvs1", genres: ["Techno"] },

  // ---- Japan ----
  { name: "Ken Ishii", slug: "ken-ishii", genres: ["Techno"] },
  { name: "DJ Nobu", slug: "dj-nobu", genres: ["Techno"] },
  { name: "Fumiya Tanaka", slug: "fumiya-tanaka", genres: ["Techno", "Minimal"] },
  { name: "Takkyu Ishino", slug: "takkyu-ishino", genres: ["Techno"] },

  // ---- France ----
  { name: "Laurent Garnier", slug: "laurent-garnier", genres: ["Techno", "House"] },
  { name: "Agoria", slug: "agoria", genres: ["Techno", "House"] },
  { name: "David August", slug: "david-august", genres: ["Techno", "Electronic"] },

  // ---- Italy ----
  { name: "Donato Dozzy", slug: "donato-dozzy", genres: ["Techno", "Dub Techno"] },
  { name: "Luigi Tozzi", slug: "luigi-tozzi", genres: ["Techno", "Dub Techno"] },
  { name: "Claudio PRC", slug: "claudio-prc", genres: ["Techno"] },

  // ---- Spain ----
  { name: "Oscar Mulero", slug: "oscar-mulero", genres: ["Techno"] },
  { name: "Christian Wunsch", slug: "christian-wunsch", genres: ["Techno"] },

  // ---- Netherlands ----
  { name: "Speedy J", slug: "speedy-j", genres: ["Techno"] },
  { name: "Job Jobse", slug: "job-jobse", genres: ["Techno", "House"] },

  // ---- Poland ----
  { name: "Jacek Sienkiewicz", slug: "jacek-sienkiewicz", genres: ["Techno", "Minimal"] },

  // ---- Argentina ----
  { name: "Jonas Kopp", slug: "jonas-kopp", genres: ["Techno"] },

  // ---- Belgium ----
  { name: "The Hacker", slug: "the-hacker", genres: ["Techno", "Electro"] },

  // ---- Ireland ----
  { name: "Sunil Sharpe", slug: "sunil-sharpe", genres: ["Techno"] },

  // ---- Finland ----
  { name: "Samuli Kemppi", slug: "samuli-kemppi", genres: ["Techno"] },

  // ---- Australia ----
  { name: "Deepchild", slug: "deepchild", genres: ["Techno", "Dub Techno"] }
];

const COUNTRY_MAP = {
  "BE": "Belgium", "NL": "Netherlands", "DE": "Germany", "FR": "France",
  "GB": "United Kingdom", "UK": "United Kingdom", "US": "United States",
  "UA": "Ukraine", "IT": "Italy", "ES": "Spain", "CA": "Canada",
  "RU": "Russia", "CN": "China", "CH": "Sweden", "SE": "Sweden",
  "NO": "Norway", "RS": "Serbia", "RO": "Romania", "DK": "Denmark",
  "JP": "Japan", "IE": "Ireland", "PL": "Poland", "AR": "Argentina",
  "FI": "Finland", "AU": "Australia",
  "Berlin": "Germany (based in Berlin)", "Lyon": "France (based in Lyon)",
  "Antwerp": "Belgium (based in Antwerp)",
  "Xiamen": "China (based in Xiamen)", "Shanghai": "China (based in Shanghai)",
  "Firenze": "Italy (based in Florence)", "Leeds": "UK (based in Leeds)",
  "Moscow": "Russia (based in Moscow)", "Gothenburg": "Sweden (based in Gothenburg)",
  "Los Angeles": "US (based in Los Angeles)", "Banff": "Canada (based in Banff)",
  "Kitchener": "Canada (based in Kitchener)",
  "Frankfurt am Main": "Germany (based in Frankfurt)",
  "Amsterdam": "Netherlands (based in Amsterdam)",
  "Dublin": "Ireland (based in Dublin)",
  "Roma": "Italy (based in Rome)",
  "London": "UK (based in London)"
};

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function unique(arr) {
  return Array.from(new Set((arr || []).filter(v => v && String(v).trim())));
}

function pickFirst(...values) {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return "";
}

function stripHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/\[[lrlm]=[^\]]*\]/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#\d+;/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCountry(raw) {
  if (!raw) return "";
  return COUNTRY_MAP[raw] || raw;
}

function buildBio(coreInfo, mb, discogs) {
  if (discogs && discogs.profile && discogs.profile.trim()) {
    return stripHtml(discogs.profile);
  }

  const displayName = coreInfo.name;
  const country = normalizeCountry(mb && mb.country);
  const genres = unique([
    ...(coreInfo.genres || []),
    ...(discogs && discogs.genres ? discogs.genres : []),
    ...(discogs && discogs.styles ? discogs.styles : []),
    ...(mb && mb.tags ? mb.tags : [])
  ]).slice(0, 5).join(", ");

  const disambig = mb && mb.disambiguation ? ` ${mb.disambiguation}.` : "";
  const labels = discogs && discogs.labels && discogs.labels.length > 0
    ? ` Releases on labels including ${discogs.labels.slice(0, 3).join(", ")}.`
    : "";
  const releaseCount = discogs && discogs.releaseCount
    ? ` ${discogs.releaseCount} releases on Discogs.`
    : "";

  let bio = `${displayName} is`;
  if (country) bio += ` a ${country}-based`;
  bio += ` electronic music DJ and producer${disambig}`;
  if (genres) bio += `, known for ${genres} styles`;
  bio += ".";
  if (labels) bio += labels;
  if (releaseCount) bio += releaseCount;

  return bio;
}

function mergeDJData(coreInfo, mb, discogs) {
  const slug = coreInfo.slug || slugify(coreInfo.name);

  const name = pickFirst(
    mb && mb.name,
    discogs && discogs.name,
    coreInfo.name
  );

  const countryRaw = pickFirst(mb && mb.country);
  const country = normalizeCountry(countryRaw);

  const aliases = unique([
    ...(mb && mb.aliases ? mb.aliases : []),
    ...(discogs && discogs.nameVariations ? discogs.nameVariations : []),
    ...(coreInfo.name !== name ? [coreInfo.name] : [])
  ]);

  const genres = unique([
    ...(discogs && discogs.genres ? discogs.genres : []),
    ...(discogs && discogs.styles ? discogs.styles : []),
    ...(mb && mb.tags ? mb.tags : []),
    ...(mb && mb.genres ? mb.genres : []),
    ...(coreInfo.genres || [])
  ]);

  const labels = unique(discogs && discogs.labels ? discogs.labels : []);
  const releases = (discogs && discogs.releases ? discogs.releases : []).slice(0, 10);

  const bio = buildBio(coreInfo, mb, discogs);

  const mbid = mb && mb.id ? mb.id : null;
  const discogsId = discogs && discogs.id ? discogs.id : null;

  const stats = {
    releaseCount: discogs && discogs.releaseCount ? discogs.releaseCount : null
  };

  const sources = [];
  if (mb && mb.found && mbid) {
    sources.push({ label: "MusicBrainz", url: `https://musicbrainz.org/artist/${mbid}`, status: "found" });
  }
  if (discogs && discogs.found && discogsId) {
    sources.push({ label: "Discogs", url: `https://www.discogs.com/artist/${discogsId}`, status: "found" });
  }

  const images = [];
  if (discogs && discogs.images && discogs.images.length > 0) {
    const primary = discogs.images.find(i => i.type === "primary") || discogs.images[0];
    images.push({ source: "discogs", uri: primary.uri, width: primary.width, height: primary.height });
  }

  const externalUrls = unique([
    ...(discogs && discogs.urls ? discogs.urls : [])
  ]);

  const imageTheme = coreInfo.genres && coreInfo.genres.length > 0
    ? (coreInfo.genres[0].toLowerCase().replace(/[^a-z0-9]+/g, "-") || "techno")
    : "techno";

  const dataSources = {
    musicbrainz: mb && mb.found
      ? { found: true, id: mb.id, type: mb.type, gender: mb.gender, country: mb.country, disambiguation: mb.disambiguation, lifeSpan: mb.lifeSpan }
      : { found: false },
    discogs: discogs && discogs.found
      ? { found: true, id: discogs.id, urls: discogs.urls || [], dataQuality: discogs.dataQuality }
      : { found: false }
  };

  return {
    slug,
    name,
    displayName: coreInfo.name,
    country,
    aliases: aliases.slice(0, 20),
    genres: genres.slice(0, 30),
    labels: labels.slice(0, 30),
    bio,
    stats,
    releases,
    images,
    externalUrls: externalUrls.slice(0, 10),
    imageTheme,
    mbid,
    discogsId,
    sources,
    rawSources: dataSources,
    generatedAt: new Date().toISOString(),
    _sourceCount: sources.length
  };
}

async function fetchAllForDJ(coreDJ) {
  console.log(`  → ${coreDJ.name}`);
  const results = {};

  try {
    results.mb = await MusicBrainz.searchArtist(coreDJ.name);
    console.log(`    MusicBrainz: ${results.mb && results.mb.found ? "OK" : "not found"}`);
  } catch (e) {
    console.log(`    MusicBrainz: ERROR - ${e.message}`);
    results.mb = { found: false, error: e.message };
  }

  try {
    results.discogs = await Discogs.searchArtist(coreDJ.name);
    console.log(`    Discogs: ${results.discogs && results.discogs.found ? "OK" : "not found"}`);
  } catch (e) {
    console.log(`    Discogs: ERROR - ${e.message}`);
    results.discogs = { found: false, error: e.message };
  }

  return results;
}

async function main() {
  console.log("=");
  console.log("DJ Database Aggregator (MusicBrainz + Discogs)");
  console.log("=");
  console.log(`Core DJs: ${CORE_DJS.length}`);
  console.log(`Cache dir: ${CACHE_DIR}`);
  console.log();

  const aggregated = [];
  let done = 0;

  for (const coreDJ of CORE_DJS) {
    done++;
    console.log(`[${done}/${CORE_DJS.length}] Fetching data for ${coreDJ.name}...`);

    const raw = await fetchAllForDJ(coreDJ);
    const merged = mergeDJData(coreDJ, raw.mb, raw.discogs);
    aggregated.push(merged);

    console.log(`    ← genres:${merged.genres.length} labels:${merged.labels.length} releases:${merged.releases.length} bio:${merged.bio.length} sources:${merged._sourceCount}/2`);
    console.log();
  }

  console.log("=");
  console.log(`Aggregated ${aggregated.length} DJs`);
  console.log();

  const summary = {
    total: aggregated.length,
    withMusicBrainz: aggregated.filter(a => a.rawSources.musicbrainz.found).length,
    withDiscogs: aggregated.filter(a => a.rawSources.discogs.found).length,
    withBio: aggregated.filter(a => a.bio && a.bio.length > 0).length,
    withReleases: aggregated.filter(a => a.releases && a.releases.length > 0).length,
    generatedAt: new Date().toISOString()
  };

  console.log("Coverage summary:");
  console.log(summary);
  console.log();

  console.log("DJs and bio length:");
  for (const d of aggregated) {
    console.log(`  ${d.displayName.padEnd(22)} ${String(d.bio.length).padStart(5)} chars  |  ${d.bio.substring(0, 60).replace(/\n/g, ' ')}...`);
  }
  console.log();

  const jsonOutput = path.join(ROOT, "data", "aggregated-dj-database.json");
  const jsOutput = path.join(ROOT, "data", "aggregated-dj-database.js");

  const payload = {
    generatedAt: new Date().toISOString(),
    summary,
    djs: aggregated
  };

  fs.writeFileSync(jsonOutput, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Wrote JSON: ${jsonOutput}`);

  const jsPayload = `window.DJ_AGGREGATED_DATABASE = ${JSON.stringify(payload, null, 2)};`;
  fs.writeFileSync(jsOutput, jsPayload, "utf8");
  console.log(`Wrote JS:   ${jsOutput}`);

  console.log();
  console.log("Done! Run 'node scripts/import-aggregated-djs.js' to sync to Supabase.");
}

main().catch(err => {
  console.error("FATAL:", err.message);
  console.error(err.stack);
  process.exit(1);
});
