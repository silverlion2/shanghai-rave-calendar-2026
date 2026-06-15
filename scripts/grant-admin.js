const fs = require("fs");
const path = require("path");
const postgres = require("postgres");

const rootDir = path.resolve(__dirname, "..");
const validRoles = new Set(["contributor", "moderator", "admin"]);

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

function getSupabaseAdminConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
}

function withSsl(url) {
  if (!url || url.includes("sslmode=")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}sslmode=require`;
}

function parseArgs(argv) {
  const [email, role = "admin"] = argv;
  if (!email || email === "--help" || email === "-h") {
    throw new Error("Usage: npm run admin:grant -- user@example.com [admin|moderator|contributor]");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`Invalid email: ${email}`);
  }
  if (!validRoles.has(role)) {
    throw new Error(`Invalid role: ${role}. Use contributor, moderator, or admin.`);
  }
  return { email, role };
}

async function grantWithPostgres(databaseUrl, email, role) {
  const sql = postgres(withSsl(databaseUrl), {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 20,
    prepare: false,
  });

  try {
    const rows = await sql`
      update public.profiles
         set role = ${role},
             updated_at = now()
       where lower(email) = lower(${email})
       returning id, email, display_name, role, updated_at
    `;

    if (!rows.length) {
      throw new Error(
        `No public.profiles row exists for ${email}. Sign up or sign in once on account.html/ops.html, then rerun this command.`
      );
    }

    const profile = rows[0];
    return {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      mode: "postgres",
    };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function grantWithServiceRole(config, email, role) {
  const { createClient } = require("@supabase/supabase-js");
  const client = createClient(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await client
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .ilike("email", email)
    .select("id,email,display_name,role,updated_at");

  if (error) throw error;
  if (!data || !data.length) {
    throw new Error(
      `No public.profiles row exists for ${email}. Sign up or sign in once on account.html/ops.html, then rerun this command.`
    );
  }

  return {
    id: data[0].id,
    email: data[0].email,
    role: data[0].role,
    mode: "service-role",
  };
}

async function main() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");
  loadEnvFile(".env.production");
  loadEnvFile(".env.preview");

  const { email, role } = parseArgs(process.argv.slice(2));
  const databaseUrl = getDatabaseUrl();
  const adminConfig = getSupabaseAdminConfig();

  if (!databaseUrl && !adminConfig) {
    throw new Error(
      "Missing admin credentials. Set SUPABASE_DB_URL, or set NEXT_PUBLIC_SUPABASE_URL plus SUPABASE_SERVICE_ROLE_KEY in .env.local."
    );
  }

  const profile = databaseUrl
    ? await grantWithPostgres(databaseUrl, email, role)
    : await grantWithServiceRole(adminConfig, email, role);

  process.stdout.write(`Updated ${profile.email} to role=${profile.role} (${profile.id}) via ${profile.mode}.\n`);
}

main().catch(error => {
  console.error(`Admin grant failed: ${error.message}`);
  process.exitCode = 1;
});
