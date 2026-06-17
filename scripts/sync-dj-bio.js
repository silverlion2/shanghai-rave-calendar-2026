const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const JSON_FILE = path.join(ROOT, "config", "tracked-dj-profiles.json");
const JS_FILE = path.join(ROOT, "data", "tracked-dj-itineraries.js");

// --- 1. Read curated DJ profiles (the JSON the human edits) ---------
if (!fs.existsSync(JSON_FILE)) {
  console.error(`ERROR: ${JSON_FILE} not found.`);
  process.exit(1);
}

let jsonPayload;
try {
  jsonPayload = JSON.parse(fs.readFileSync(JSON_FILE, "utf8"));
} catch (err) {
  console.error(`ERROR: ${JSON_FILE} is not valid JSON: ${err.message}`);
  console.error("Fix any nested double quotes, trailing commas, or stray characters and retry.");
  process.exit(1);
}

const jsonProfiles = Array.isArray(jsonPayload) ? jsonPayload : jsonPayload.profiles;
if (!Array.isArray(jsonProfiles) || jsonProfiles.length === 0) {
  console.error(`ERROR: ${JSON_FILE} has no profiles array.`);
  process.exit(1);
}

const bySlug = {};
for (const p of jsonProfiles) {
  if (!p?.slug && !p?.name) continue;
  const slug = p.slug || p.name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
  bySlug[slug] = p;
}

// --- 2. Read the existing JS file the website actually reads ----------
if (!fs.existsSync(JS_FILE)) {
  console.error(`ERROR: ${JS_FILE} not found.`);
  process.exit(1);
}

const fakeWindow = {};
let existing;
try {
  const code = fs.readFileSync(JS_FILE, "utf8");
  new Function("window", code)(fakeWindow);
  existing = fakeWindow.DJ_ITINERARY_DATA || {};
} catch (err) {
  console.error(`ERROR: failed to load ${JS_FILE}: ${err.message}`);
  process.exit(1);
}

// --- 3. Merge JSON over the JS data, preserving itinerary rows --------
let updatedCount = 0;
for (const [slug, jsonProfile] of Object.entries(bySlug)) {
  const key = slug;
  const base = existing[key] || { slug: key, name: jsonProfile.name };
  const wasNew = !existing[key];

  existing[key] = {
    ...base,
    ...jsonProfile,
    slug: key,
    name: jsonProfile.name || base.name,
    sources: jsonProfile.sources || base.sources || [],
    itinerary: base.itinerary || [],
  };

  // If jsonProfile explicitly cleared a field (empty string), keep the clear
  // for the curated overlay fields only; never clear itinerary.
  const curatedFields = ["scope", "imageTheme", "summary", "sourceNote", "genres", "aliases"];
  for (const field of curatedFields) {
    if (jsonProfile[field] === "") existing[key][field] = jsonProfile[field];
  }

  updatedCount++;
  if (wasNew) {
    console.log(`  new profile: ${key} (${jsonProfile.name})`);
  }
}

// --- 4. Normalize source entries ---------------------------------------
for (const p of Object.values(existing)) {
  if (p?.sources) {
    p.sources = p.sources
      .map(s => {
        if (!s || typeof s !== "object") return null;
        const out = {
          label: s.label || "",
          url: s.url || "",
        };
        if (s.status) out.status = s.status;
        if (s.checked) out.checked = s.checked;
        return out;
      })
      .filter(Boolean);
  }
  if (p?.genres && !Array.isArray(p.genres)) p.genres = [p.genres];
}

// --- 5. Write the JS file ----------------------------------------------
const header = `window.DJ_ITINERARY_DATA = `;
const footer = `;\n`;

const sorted = {};
Object.keys(existing).sort().forEach(k => { sorted[k] = existing[k]; });
const body = JSON.stringify(sorted, null, 2);

fs.writeFileSync(JS_FILE, header + body + footer, "utf8");

console.log(`Sync complete: ${Object.keys(sorted).length} total profiles in ${JS_FILE}`);
console.log(`Updated from JSON: ${updatedCount} profiles`);
console.log(`Next: git add config/tracked-dj-profiles.json data/tracked-dj-itineraries.js`);
console.log(`Then: git commit && git push`);
