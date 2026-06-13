const fs = require("fs");
const path = require("path");
const postgres = require("postgres");

const rootDir = path.resolve(__dirname, "..");
const migrationDir = path.join(rootDir, "supabase", "migrations");

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

function getDatabaseUrl() {
  return process.env.SUPABASE_DB_URL
    || process.env.DATABASE_URL
    || process.env.POSTGRES_URL
    || process.env.POSTGRES_PRISMA_URL
    || process.env.POSTGRES_URL_NON_POOLING;
}

function withSsl(url) {
  if (!url || url.includes("sslmode=")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}sslmode=require`;
}

function migrationFiles() {
  return fs
    .readdirSync(migrationDir)
    .filter(file => file.endsWith(".sql"))
    .sort()
    .map(file => path.join(migrationDir, file));
}

async function main() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");
  loadEnvFile(".env.production");
  loadEnvFile(".env.preview");

  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(
      "Missing Supabase Postgres connection string. Set SUPABASE_DB_URL or DATABASE_URL in .env.local."
    );
  }

  const files = migrationFiles();
  if (!files.length) {
    throw new Error(`No migration files found in ${migrationDir}`);
  }

  const sql = postgres(withSsl(databaseUrl), {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 20,
    prepare: false
  });

  try {
    for (const file of files) {
      const label = path.relative(rootDir, file);
      process.stdout.write(`Applying ${label}... `);
      await sql.unsafe(fs.readFileSync(file, "utf8"));
      process.stdout.write("done\n");
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch(error => {
  console.error(`Supabase migration failed: ${error.message}`);
  process.exitCode = 1;
});
