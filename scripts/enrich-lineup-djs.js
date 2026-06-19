const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { MusicBrainz, Discogs, CACHE_DIR } = require("./dj-api-clients.js");

const ROOT = path.resolve(__dirname, "..");

function loadEnv(fileName) {
  const p = path.join(ROOT, fileName);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv(".env");
loadEnv(".env.local");

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function stripHtml(text) {
  return String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]{1,8};/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCountry(raw) {
  const map = {
    "BE": "Belgium", "NL": "Netherlands", "DE": "Germany", "FR": "France",
    "GB": "United Kingdom", "UK": "United Kingdom", "US": "United States",
    "UA": "Ukraine", "IT": "Italy", "ES": "Spain", "CA": "Canada",
    "RU": "Russia", "CN": "China", "CH": "Sweden", "SE": "Sweden",
    "NO": "Norway", "RS": "Serbia", "RO": "Romania", "DK": "Denmark",
    "JP": "Japan", "IE": "Ireland", "PL": "Poland", "AR": "Argentina",
    "FI": "Finland", "AU": "Australia", "BR": "Brazil", "IN": "India",
    "MX": "Mexico", "CZ": "Czechia", "KR": "South Korea", "SG": "Singapore",
    "TH": "Thailand", "VN": "Vietnam", "HK": "Hong Kong", "TW": "Taiwan"
  };
  return map[raw] || raw;
}

function mergeDJData(name, mb, discogs) {
  const slug = slugify(name);

  const preferredName = mb && mb.found ? mb.name : (discogs && discogs.found ? discogs.name : name);

  const aliases = [];
  if (mb && mb.aliases) aliases.push(...mb.aliases);
  if (discogs && discogs.nameVariations) aliases.push(...discogs.nameVariations);
  if (preferredName !== name) aliases.push(name);
  const uniqueAliases = [...new Set(aliases)].slice(0, 20);

  const genres = [];
  if (discogs && discogs.genres) genres.push(...discogs.genres);
  if (discogs && discogs.styles) genres.push(...discogs.styles);
  if (mb && mb.tags) genres.push(...mb.tags);
  if (mb && mb.genres) genres.push(...mb.genres);
  const uniqueGenres = [...new Set(genres)].slice(0, 30);

  const labels = discogs && discogs.labels ? [...new Set(discogs.labels)].slice(0, 30) : [];
  const releases = discogs && discogs.releases ? discogs.releases.slice(0, 10) : [];

  let bio = "";
  if (discogs && discogs.profile && discogs.profile.trim()) {
    bio = stripHtml(discogs.profile);
  } else if (mb && mb.disambiguation && mb.disambiguation.trim()) {
    bio = mb.disambiguation;
  } else {
    const country = mb && mb.country ? normalizeCountry(mb.country) : "";
    if (country && uniqueGenres.length > 0) {
      bio = preferredName + " is a " + uniqueGenres.slice(0, 2).join("/") + " artist based in " + country + ".";
    } else {
      bio = preferredName + " is an electronic music artist.";
    }
  }

  const mbid = mb && mb.found && mb.id ? mb.id : null;
  const discogsId = discogs && discogs.found && discogs.id ? discogs.id : null;

  const stats = {
    releaseCount: discogs && discogs.releaseCount ? discogs.releaseCount : 0
  };

  const sources = [];
  if (mbid) sources.push({ label: "MusicBrainz", url: "https://musicbrainz.org/artist/" + mbid, status: "found" });
  if (discogsId) sources.push({ label: "Discogs", url: "https://www.discogs.com/artist/" + discogsId, status: "found" });

  const images = [];
  if (discogs && discogs.images && discogs.images.length > 0) {
    const primary = discogs.images.find(i => i.type === "primary") || discogs.images[0];
    images.push({ source: "discogs", uri: primary.uri, width: primary.width, height: primary.height });
  }

  const externalUrls = [...new Set(discogs && discogs.urls ? discogs.urls : [])].slice(0, 10);

  const imageTheme = uniqueGenres.length > 0 ? uniqueGenres[0].toLowerCase() : "techno";

  const dataSources = {
    musicbrainz: mb && mb.found ? { found: true, id: mb.id, type: mb.type, gender: mb.gender, country: mb.country, disambiguation: mb.disambiguation, lifeSpan: mb.lifeSpan } : { found: false },
    discogs: discogs && discogs.found ? { found: true, id: discogs.id, urls: discogs.urls || [], dataQuality: discogs.dataQuality } : { found: false }
  };

  const country = mb && mb.country ? normalizeCountry(mb.country) : "";

  return {
    slug,
    name: preferredName,
    displayName: name,
    country,
    aliases: uniqueAliases,
    genres: uniqueGenres,
    labels,
    bio,
    stats,
    releases,
    images,
    externalUrls,
    imageTheme,
    mbid,
    discogsId,
    sources,
    rawSources: dataSources,
    generatedAt: new Date().toISOString(),
    _sourceCount: sources.length
  };
}

// Quality filter: discard results that are clearly noise
function isQualityResult(merged, mb, discogs) {
  const foundCount = (mb && mb.found ? 1 : 0) + (discogs && discogs.found ? 1 : 0);
  if (foundCount === 0) return false;

  // If Discogs has releases, it's reliable enough
  if (discogs && discogs.releaseCount && discogs.releaseCount >= 1) return true;

  // If MusicBrainz has genres/tags and a non-ambiguous match, accept
  if (mb && mb.found && (mb.tags && mb.tags.length > 0)) return true;

  // If we got good genre data from either source, accept
  if (merged.genres.length >= 2) return true;

  return false;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) { console.log("ERROR: No Supabase credentials"); process.exit(1); }

  // Load pending DJ list
  const pendingFile = path.join(ROOT, "data", "pending-dj-enrichment.json");
  if (!fs.existsSync(pendingFile)) {
    console.log("ERROR: pending-dj-enrichment.json not found. Run analyze-lineup-djs.js first.");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(pendingFile, "utf8"));
  const djList = data.pendingForAPI || [];
  console.log("Total DJs to process:", djList.length);
  console.log("Cache directory:", CACHE_DIR);
  console.log("");

  const sb = createClient(url, key);

  let updated = 0;
  let inserted = 0;
  let skipped = 0;
  let failed = 0;
  const results = [];

  // Process in batches with rate limiting
  for (let i = 0; i < djList.length; i++) {
    const dj = djList[i];
    const progress = String(i + 1).padStart(3) + "/" + djList.length;

    try {
      const [mb, dc] = await Promise.all([
        MusicBrainz.searchArtist(dj.name),
        Discogs.searchArtist(dj.name)
      ]);

      const merged = mergeDJData(dj.name, mb, dc);

      // Quality check - skip low-quality matches
      if (!isQualityResult(merged, mb, dc)) {
        console.log(progress + " SKIP: " + dj.slug.padEnd(35) + " '" + dj.name + "' - no reliable match");
        skipped++;
        results.push({ slug: dj.slug, name: dj.name, status: "skipped", reason: "no-quality-match" });
        continue;
      }

      const row = {
        slug: merged.slug,
        name: merged.name,
        summary: merged.bio,
        source_note: "Aggregated from " + merged._sourceCount + " sources: " + merged.sources.map(s => s.label).join(", "),
        image_theme: merged.imageTheme,
        genres: merged.genres,
        aliases: merged.aliases,
        sources: merged.sources,
        raw: {
          country: merged.country,
          labels: merged.labels,
          stats: merged.stats,
          releases: merged.releases,
          images: merged.images,
          externalUrls: merged.externalUrls,
          mbid: merged.mbid,
          discogsId: merged.discogsId,
          rawSources: merged.rawSources
        }
      };

      // Check if record exists
      const { data: existing } = await sb
        .from("artists")
        .select("slug")
        .eq("slug", merged.slug)
        .maybeSingle();

      if (existing) {
        const { error } = await sb
          .from("artists")
          .update({
            name: row.name,
            summary: row.summary,
            source_note: row.source_note,
            image_theme: row.image_theme,
            genres: row.genres,
            aliases: row.aliases,
            sources: row.sources,
            raw: row.raw,
            updated_at: new Date().toISOString()
          })
          .eq("slug", merged.slug);

        if (error) {
          console.log(progress + " FAIL: " + dj.slug + " - " + error.message);
          failed++;
          results.push({ slug: dj.slug, name: dj.name, status: "error", error: error.message });
        } else {
          const info = [];
          if (merged.images.length > 0) info.push("img:1");
          info.push("genres:" + merged.genres.length);
          info.push("rel:" + merged.stats.releaseCount);
          if (merged.country) info.push(merged.country.substring(0, 10));
          console.log(progress + " UPDATE: " + dj.slug.padEnd(35) + " " + info.join(", "));
          updated++;
          results.push({ slug: dj.slug, name: merged.name, status: "updated", genres: merged.genres.length, images: merged.images.length, releases: merged.stats.releaseCount });
        }
      } else {
        const { error } = await sb.from("artists").insert(row);
        if (error) {
          console.log(progress + " FAIL: " + dj.slug + " - " + error.message);
          failed++;
          results.push({ slug: dj.slug, name: dj.name, status: "error", error: error.message });
        } else {
          console.log(progress + " INSERT: " + dj.slug.padEnd(35) + " genres:" + merged.genres.length + " images:" + merged.images.length);
          inserted++;
          results.push({ slug: dj.slug, name: merged.name, status: "inserted", genres: merged.genres.length, images: merged.images.length, releases: merged.stats.releaseCount });
        }
      }
    } catch (e) {
      console.log(progress + " ERR: " + dj.slug + " - " + e.message);
      failed++;
      results.push({ slug: dj.slug, name: dj.name, status: "error", error: e.message });
    }
  }

  // Save results
  const outFile = path.join(ROOT, "data", "lineup-enrichment-results.json");
  fs.writeFileSync(outFile, JSON.stringify({
    generatedAt: new Date().toISOString(),
    total: djList.length,
    updated,
    inserted,
    skipped,
    failed,
    results
  }, null, 2));

  console.log("");
  console.log("=== 汇总 ===");
  console.log("Updated:  ", updated);
  console.log("Inserted: ", inserted);
  console.log("Skipped:  ", skipped);
  console.log("Failed:   ", failed);
  console.log("");
  console.log("Results saved to:", outFile);
}

main().catch(err => {
  console.error("FATAL:", err.message);
  console.error(err.stack);
  process.exit(1);
});
