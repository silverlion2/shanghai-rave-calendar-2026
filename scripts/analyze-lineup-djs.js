const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

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

// Step 1: Load events and extract unique DJ names
const eventsData = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "events.json"), "utf8"));
const events = Array.isArray(eventsData) ? eventsData : (eventsData.events || []);

const nameToEvents = new Map();
const slugToName = new Map();

for (const ev of events) {
  if (!ev.lineup || !Array.isArray(ev.lineup)) continue;
  for (const entry of ev.lineup) {
    if (!entry || !entry.name) continue;
    const rawName = String(entry.name).trim();
    if (!rawName || rawName === "DJ TBA") continue;
    const slug = slugify(rawName);
    if (!slugToName.has(slug)) {
      slugToName.set(slug, rawName);
      nameToEvents.set(slug, []);
    }
    nameToEvents.get(slug).push({
      eventId: ev.id,
      date: ev.date || ev.start_date || "",
      note: entry.note || ""
    });
  }
}

const totalUniqueDJs = slugToName.size;
console.log("=== Step 1: events.json lineup 分析 ===");
console.log("events 总数:", events.length);
console.log("unique DJ (按 slug 去重):", totalUniqueDJs);

// Step 2: Check which have data in Supabase
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
if (!url || !key) { console.log("ERROR: No Supabase credentials"); process.exit(1); }

(async () => {
  const sb = createClient(url, key);

  // Get all artists with their key fields
  const { data: allArtists, error: err } = await sb
    .from("artists")
    .select("slug, name, summary, genres, sources, raw, image_theme");

  if (err) { console.log("Supabase error:", err.message); process.exit(1); }

  // Build lookup: slug -> data
  const artistMap = new Map();
  for (const row of allArtists || []) {
    artistMap.set(row.slug, row);
  }

  console.log("");
  console.log("=== Step 2: Supabase 数据对比 ===");
  console.log("Supabase artists 表记录数:", allArtists.length);

  // Categorize each lineup DJ
  const categories = {
    hasFullData: [],      // 有 genres + sources + raw 数据完整
    hasBasicData: [],     // 有 slug/name 但没 genres/sources
    missingInDb: [],       // Supabase 中不存在
    imageOnly: []         // 有 image_url 但没其他数据（老数据）
  };

  const pendingForAPI = [];

  for (const [slug, name] of slugToName.entries()) {
    const row = artistMap.get(slug);
    const eventCount = (nameToEvents.get(slug) || []).length;

    if (!row) {
      categories.missingInDb.push({ slug, name, eventCount });
      pendingForAPI.push({ slug, name });
      continue;
    }

    const hasGenres = row.genres && row.genres.length > 0;
    const hasSources = row.sources && row.sources.length > 0;
    const hasRawImages = row.raw && row.raw.images && row.raw.images.length > 0;
    const hasSummary = row.summary && row.summary.length > 20;

    const completeScore = (hasGenres ? 1 : 0) + (hasSources ? 1 : 0) + (hasRawImages ? 1 : 0) + (hasSummary ? 1 : 0);

    if (completeScore >= 3) {
      categories.hasFullData.push({ slug, name: row.name, eventCount, score: completeScore });
    } else if (completeScore === 0 && !hasGenres) {
      categories.imageOnly.push({ slug, name: row.name, eventCount });
      pendingForAPI.push({ slug, name: row.name });
    } else {
      categories.hasBasicData.push({ slug, name: row.name, eventCount, score: completeScore });
      // If missing genres/sources, still need API enrichment
      if (!hasGenres || !hasSources || !hasSummary) {
        pendingForAPI.push({ slug, name: row.name });
      }
    }
  }

  console.log("");
  console.log("=== 分类结果 ===");
  console.log("完整数据 (score>=3):       ", categories.hasFullData.length);
  console.log("有基础数据但不完整:        ", categories.hasBasicData.length);
  console.log("有图片 URL 但无 API 数据:  ", categories.imageOnly.length);
  console.log("Supabase 中完全没有记录:    ", categories.missingInDb.length);
  console.log("");
  console.log("需要通过 API 补充数据的:    ", pendingForAPI.length);

  // Show top missing DJs by event frequency
  const sortedByFrequency = pendingForAPI
    .map(dj => ({ ...dj, eventCount: (nameToEvents.get(dj.slug) || []).length }))
    .sort((a, b) => b.eventCount - a.eventCount);

  console.log("");
  console.log("=== 高频 DJ 缺失数据列表 (前 100) ===");
  for (let i = 0; i < Math.min(100, sortedByFrequency.length); i++) {
    const dj = sortedByFrequency[i];
    console.log(String(i + 1).padStart(3), dj.slug.padEnd(35), dj.name.padEnd(30), "events:", dj.eventCount);
  }

  // Save pending list for next step
  const pendingFile = path.join(ROOT, "data", "pending-dj-enrichment.json");
  fs.writeFileSync(pendingFile, JSON.stringify({
    totalEvents: events.length,
    totalUniqueDJs,
    categories: {
      hasFullData: categories.hasFullData.length,
      hasBasicData: categories.hasBasicData.length,
      imageOnly: categories.imageOnly.length,
      missingInDb: categories.missingInDb.length
    },
    pendingForAPI: sortedByFrequency,
    fullCategories: {
      hasFullData: categories.hasFullData,
      hasBasicData: categories.hasBasicData,
      imageOnly: categories.imageOnly,
      missingInDb: categories.missingInDb
    }
  }, null, 2));

  console.log("");
  console.log("详细列表已保存到:", pendingFile);
  console.log("");
  console.log("下一步: 运行 'node scripts/enrich-lineup-djs.js' 来批量补充数据");
})();
