const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const configPath = path.join(rootDir, "assets", "love-wall-supabase-config.js");

function loadEnvFile(fileName) {
  const filePath = path.join(rootDir, fileName);
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function requiredEnv(...names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name];
  }
  throw new Error(`Missing one of: ${names.join(", ")}`);
}

function main() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");
  loadEnvFile(".env.production");
  loadEnvFile(".env.preview");

  const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL", "VITE_SUPABASE_URL");
  const anonKey = requiredEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY"
  );

  const body = `window.LOVE_WALL_SUPABASE = {
  enabled: true,
  url: ${JSON.stringify(url.replace(/\/+$/, ""))},
  anonKey: ${JSON.stringify(anonKey)},
  table: "love_wall_posts",
  reactionTable: "love_wall_reactions",
  contributionTable: "community_contributions",
  posterWallEnabled: true,
  posterWallView: "poster_wall_cards",
  posterWallDefaultCity: "Shanghai",
  posterWallPageSize: 120,
  posterWallTimeoutMs: 3500
};
`;

  fs.writeFileSync(configPath, body);
  console.log(`Updated ${path.relative(rootDir, configPath)}`);
}

try {
  main();
} catch (error) {
  console.error(`Love Wall config failed: ${error.message}`);
  process.exitCode = 1;
}
