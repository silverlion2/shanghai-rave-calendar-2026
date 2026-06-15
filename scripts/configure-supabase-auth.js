const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");

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

function loadEnvFiles() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");
  loadEnvFile(".env.production");
  loadEnvFile(".env.preview");
}

function supabaseProjectRef() {
  if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF.trim();
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  if (!rawUrl) throw new Error("Missing SUPABASE_PROJECT_REF or NEXT_PUBLIC_SUPABASE_URL.");
  const { hostname } = new URL(rawUrl);
  const match = hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i);
  if (!match) throw new Error(`Could not derive project ref from ${hostname}. Set SUPABASE_PROJECT_REF.`);
  return match[1];
}

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run"),
  };
}

async function patchAuthConfig({ ref, accessToken, dryRun }) {
  const payload = { mailer_autoconfirm: true };
  if (dryRun) {
    process.stdout.write(`Would PATCH Supabase Auth for ${ref} with ${JSON.stringify(payload)}.\n`);
    return;
  }
  if (!accessToken) {
    throw new Error("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_MANAGEMENT_ACCESS_TOKEN.");
  }

  const response = await fetch(`https://api.supabase.com/v1/projects/${encodeURIComponent(ref)}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase Auth config update failed (${response.status}): ${body.slice(0, 500)}`);
  }

  process.stdout.write(`Updated Supabase Auth for ${ref}: mailer_autoconfirm=true.\n`);
}

async function main() {
  loadEnvFiles();
  const args = parseArgs(process.argv.slice(2));
  const ref = supabaseProjectRef();
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_MANAGEMENT_ACCESS_TOKEN || "";
  await patchAuthConfig({ ref, accessToken, dryRun: args.dryRun });
}

main().catch(error => {
  console.error(`Supabase Auth config failed: ${error.message}`);
  process.exitCode = 1;
});
