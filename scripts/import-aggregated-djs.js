const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.resolve(__dirname, "..");

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

const DATA_FILE = path.join(ROOT, "data", "aggregated-dj-database.json");

async function main() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const key = serviceRoleKey || anonKey;

  if (!url || !key) {
    console.error("ERROR: SUPABASE_URL and SUPABASE_KEY not configured.");
    console.error("Set them in .env or .env.local.");
    process.exit(1);
  }

  if (!fs.existsSync(DATA_FILE)) {
    console.error(`ERROR: ${DATA_FILE} not found.`);
    console.error("Run 'node scripts/aggregate-dj-database.js' first.");
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  const djs = payload.djs || [];

  console.log(`Loaded ${djs.length} DJs from aggregated data.`);
  console.log(`Supabase URL: ${url}`);
  console.log();

  const supabase = createClient(url, key);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const dj of djs) {
    const row = {
      slug: dj.slug,
      name: dj.name,
      summary: dj.bio ? String(dj.bio) : "",
      source_note: `Aggregated from ${dj._sourceCount} sources: ${dj.sources.map(s => s.label).join(", ")}`,
      image_theme: dj.imageTheme || "techno",
      genres: dj.genres.slice(0, 50),
      aliases: dj.aliases.slice(0, 20),
      sources: dj.sources,
      raw: {
        country: dj.country,
        labels: dj.labels,
        stats: dj.stats,
        releases: dj.releases.slice(0, 10),
        images: dj.images,
        externalUrls: dj.externalUrls,
        mbid: dj.mbid,
        discogsId: dj.discogsId,
        rawSources: dj.rawSources
      }
    };

    try {
      const { data: existing, error: checkErr } = await supabase
        .from("artists")
        .select("slug")
        .eq("slug", dj.slug)
        .maybeSingle();

      if (checkErr) {
        console.log(`  ERROR [${dj.slug}] check: ${checkErr.message}`);
        errors++;
        continue;
      }

      if (existing) {
        const { error: updateErr } = await supabase
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
          .eq("slug", dj.slug);

        if (updateErr) {
          console.log(`  ERROR [${dj.slug}] update: ${updateErr.message}`);
          errors++;
        } else {
          console.log(`  UPDATED: ${dj.slug} (${dj.name})`);
          updated++;
        }
      } else {
        const { error: insertErr } = await supabase
          .from("artists")
          .insert(row);

        if (insertErr) {
          console.log(`  ERROR [${dj.slug}] insert: ${insertErr.message}`);
          errors++;
        } else {
          console.log(`  INSERTED: ${dj.slug} (${dj.name})`);
          inserted++;
        }
      }
    } catch (e) {
      console.log(`  EXCEPTION [${dj.slug}]: ${e.message}`);
      errors++;
    }
  }

  console.log();
  console.log("=");
  console.log("Result:");
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Updated:  ${updated}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Errors:   ${errors}`);
  console.log("=");
}

main().catch(err => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
