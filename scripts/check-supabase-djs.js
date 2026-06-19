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

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
if (!url || !key) { console.log("ERROR: No Supabase credentials"); process.exit(1); }

(async () => {
  const sb = createClient(url, key);

  const { count } = await sb.from("artists").select("*", { count: "exact", head: true });
  console.log("Total artists in Supabase:", count);

  const { data: all } = await sb.from("artists").select("slug, name, summary, genres, sources, raw");

  let withImages = 0, withBio = 0, withGenres = 0, withSources = 0;
  let totalReleases = 0, totalLabels = 0;
  const imageSamples = [];
  const noImageList = [];

  for (const row of all || []) {
    const raw = row.raw || {};
    if (raw.images && Array.isArray(raw.images) && raw.images.length > 0) {
      withImages++;
      if (imageSamples.length < 5) {
        imageSamples.push({ slug: row.slug, uri: raw.images[0].uri });
      }
    } else {
      noImageList.push(row.slug);
    }
    if (row.summary && row.summary.length > 20) withBio++;
    if (row.genres && row.genres.length > 0) withGenres++;
    if (row.sources && row.sources.length > 0) withSources++;
    if (raw.releases) totalReleases += raw.releases.length;
    if (raw.labels) totalLabels += raw.labels.length;
  }

  console.log("");
  console.log("=== Supabase 数据同步状态 ===");
  console.log("总 DJ 数:           ", count);
  console.log("有简介 (summary>20):", withBio);
  console.log("有风格标签 (genres):", withGenres);
  console.log("有来源链接 (sources):", withSources);
  console.log("有图片 (raw.images):", withImages, "/", count);
  console.log("总发行记录数:       ", totalReleases);
  console.log("总厂牌数:           ", totalLabels);

  if (imageSamples.length > 0) {
    console.log("");
    console.log("=== 图片 URL 示例 ===");
    for (const s of imageSamples) {
      console.log("  " + s.slug + " -> " + s.uri);
    }
  }

  if (noImageList.length > 0) {
    console.log("");
    console.log("=== 没有图片的 DJ (" + noImageList.length + ") ===");
    console.log("  " + noImageList.join(", "));
  }

  // Check one specific entry for completeness
  const { data: charlotte } = await sb
    .from("artists")
    .select("slug, name, summary, genres, sources, raw")
    .eq("slug", "charlotte-de-witte")
    .maybeSingle();

  if (charlotte) {
    console.log("");
    console.log("=== Sample: charlotte-de-witte ===");
    console.log("  name:", charlotte.name);
    console.log("  summary length:", charlotte.summary ? charlotte.summary.length : 0);
    console.log("  genres:", charlotte.genres.slice(0, 5).join(", "), charlotte.genres.length > 5 ? "..." : "");
    console.log("  raw.images:", charlotte.raw && charlotte.raw.images ? charlotte.raw.images.length : 0);
    console.log("  raw.labels:", charlotte.raw && charlotte.raw.labels ? charlotte.raw.labels.length : 0);
    console.log("  raw.releases:", charlotte.raw && charlotte.raw.releases ? charlotte.raw.releases.length : 0);
    console.log("  sources:", charlotte.sources.map(s => s.label).join(", "));
  }
})();
