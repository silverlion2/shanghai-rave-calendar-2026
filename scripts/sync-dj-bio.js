const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const JSON_FILE = path.join(ROOT, "config", "tracked-dj-profiles.json");
const JS_FILE = path.join(ROOT, "data", "tracked-dj-itineraries.js");

// Read curated DJ profiles (the JSON I edited)
const jsonPayload = JSON.parse(fs.readFileSync(JSON_FILE, "utf8"));
const jsonProfiles = Array.isArray(jsonPayload) ? jsonPayload : jsonPayload.profiles;
const bySlug = {};
for (const p of jsonProfiles) {
  if (!p?.slug && !p?.name) continue;
  const slug = p.slug || p.name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
  bySlug[slug] = p;
}

// Read existing JS file
const fakeWindow = {};
const code = fs.readFileSync(JS_FILE, "utf8");
new Function("window", code)(fakeWindow);
const existing = fakeWindow.DJ_ITINERARY_DATA || {};

// Overwrite curated fields from JSON for each matching slug
for (const [slug, jsonProfile] of Object.entries(bySlug)) {
  const key = slug;
  const base = existing[key] || { slug: key, name: jsonProfile.name };
  existing[key] = {
    ...base,
    ...jsonProfile,
    slug: key,
    name: jsonProfile.name || base.name,
    sources: jsonProfile.sources || base.sources || [],
    itinerary: base.itinerary || [],
  };
}

// Ensure source objects don't have keys that break JSON
for (const p of Object.values(existing)) {
  if (p?.sources) {
    p.sources = p.sources.map(s => ({
      label: s.label || "",
      url: s.url || "",
      ...(s.status ? { status: s.status } : {}),
      ...(s.checked ? { checked: s.checked } : {}),
    }));
  }
}

// Write the JS file
const header = `window.DJ_ITINERARY_DATA = `;
const footer = `;\n`;

const sorted = {};
Object.keys(existing).sort().forEach(k => { sorted[k] = existing[k]; });
const body = JSON.stringify(sorted, null, 2);

fs.writeFileSync(JS_FILE, header + body + footer, "utf8");
console.log(`Written ${Object.keys(sorted).length} profiles to ${JS_FILE}`);
