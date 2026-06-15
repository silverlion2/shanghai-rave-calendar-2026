const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizePreferences,
  rankEvents,
  savedEventIdsAfterToggle,
  personalizedSummary,
  accountAccessState,
  adminAccessState,
  accountAuthFeedback,
  accountAuthErrorFeedback,
  accountAuthRedirectUrl,
  accountFeatureCatalog,
  publicAccountGuide,
} = require("../assets/account-system.js");

const sampleEvents = [
  {
    id: "hard-basement",
    title: "Abyss Hard Room",
    sortDate: "2026-06-14",
    date: "Jun 14",
    time: "23:00-late",
    venue: "Abyss",
    district: "Huangpu",
    vibe: ["hard", "underground"],
    genre: "hard techno, rave",
    price: "120 RMB",
    confidence: "High",
    status: "upcoming",
    sourceStatus: "official",
    posterUrl: "assets/posters/santa-k-optimized.jpg",
  },
  {
    id: "soft-rooftop",
    title: "Bund Sunset House",
    sortDate: "2026-06-15",
    date: "Jun 15",
    time: "18:00-23:00",
    venue: "The Dome",
    district: "Bund",
    vibe: ["date"],
    genre: "house, rooftop",
    price: "Free entry",
    confidence: "Medium",
    status: "upcoming",
    sourceStatus: "secondary",
  },
  {
    id: "saved-bass",
    title: "Bass Tunnel",
    sortDate: "2026-06-16",
    date: "Jun 16",
    time: "22:00-late",
    venue: "System",
    district: "Jing'an",
    vibe: ["bass", "underground"],
    genre: "bass, club",
    price: "80 RMB",
    confidence: "Medium",
    status: "upcoming",
    sourceStatus: "secondary",
  },
  {
    id: "watch-lead",
    title: "Secret Warehouse Lead",
    sortDate: "2026-06-17",
    date: "Jun 17",
    time: "TBA",
    venue: "TBA",
    district: "TBA",
    vibe: ["warehouse", "hard"],
    genre: "warehouse techno",
    price: "TBA",
    confidence: "Watch",
    status: "watch",
    sourceStatus: "watchlist",
  },
];

test("normalizePreferences keeps only supported values and sensible defaults", () => {
  const preferences = normalizePreferences({
    displayName: "  Front Left  ",
    vibes: ["hard", "noise", "bass", "hard"],
    venues: ["Abyss", "", "System", "Abyss"],
    budget: "free",
    timing: "late",
    discoveryMode: "trusted",
    hideWatchlist: true,
    savedEventIds: ["saved-bass", "", "saved-bass"],
  });

  assert.deepEqual(preferences, {
    displayName: "Front Left",
    vibes: ["hard", "bass"],
    venues: ["Abyss", "System"],
    budget: "free",
    timing: "late",
    discoveryMode: "trusted",
    hideWatchlist: true,
    savedEventIds: ["saved-bass"],
  });
});

test("rankEvents prioritizes matching sound, venue, saved events, and trusted sources", () => {
  const preferences = normalizePreferences({
    vibes: ["hard", "underground"],
    venues: ["Abyss"],
    timing: "late",
    discoveryMode: "trusted",
    hideWatchlist: true,
    savedEventIds: ["saved-bass"],
  });

  const ranked = rankEvents(sampleEvents, preferences, {
    today: "2026-06-13",
    limit: 3,
  });

  assert.deepEqual(ranked.map(item => item.event.id), [
    "hard-basement",
    "saved-bass",
    "soft-rooftop",
  ]);
  assert.ok(ranked[0].score > ranked[1].score);
  assert.ok(ranked[0].reasons.includes("sound match: hard"));
  assert.ok(ranked[0].reasons.includes("room match: Abyss"));
  assert.ok(!ranked.some(item => item.event.id === "watch-lead"));
});

test("savedEventIdsAfterToggle returns stable saved ids without mutation", () => {
  const original = ["hard-basement"];
  const added = savedEventIdsAfterToggle(original, "saved-bass");
  const removed = savedEventIdsAfterToggle(added, "hard-basement");

  assert.deepEqual(original, ["hard-basement"]);
  assert.deepEqual(added, ["hard-basement", "saved-bass"]);
  assert.deepEqual(removed, ["saved-bass"]);
});

test("personalizedSummary describes the active account display", () => {
  const summary = personalizedSummary(normalizePreferences({
    displayName: "front left",
    vibes: ["bass", "underground"],
    venues: ["System"],
    budget: "any",
    timing: "late",
    savedEventIds: ["saved-bass"],
  }));

  assert.equal(summary.title, "front left's picks");
  assert.equal(summary.savedCount, 1);
  assert.match(summary.description, /bass \/ underground/);
  assert.match(summary.description, /System/);
});

test("accountAccessState gates account tools behind Supabase Auth", () => {
  assert.deepEqual(accountAccessState({ loading: true }), {
    mode: "loading",
    label: "Checking account",
    action: "loading",
  });
  assert.deepEqual(accountAccessState({ hasSupabase: false, session: null }), {
    mode: "unavailable",
    label: "Supabase required",
    action: "configure",
  });
  assert.deepEqual(accountAccessState({ hasSupabase: true, session: null }), {
    mode: "gated",
    label: "Sign in required",
    action: "authenticate",
  });
  assert.deepEqual(accountAccessState({
    hasSupabase: true,
    session: { user: { id: "user-1", email: "" } },
  }), {
    mode: "dashboard",
    label: "Account connected",
    action: "manage",
  });
});

test("adminAccessState only unlocks ops for Supabase admin profiles", () => {
  assert.deepEqual(adminAccessState({ loading: true }), {
    mode: "loading",
    label: "Checking admin",
    action: "loading",
  });
  assert.deepEqual(adminAccessState({ hasSupabase: false }), {
    mode: "unavailable",
    label: "Supabase required",
    action: "configure",
  });
  assert.deepEqual(adminAccessState({ hasSupabase: true, session: null }), {
    mode: "gated",
    label: "Admin sign in required",
    action: "authenticate",
  });
  assert.deepEqual(adminAccessState({
    hasSupabase: true,
    session: { user: { id: "user-1" } },
    role: "contributor",
  }), {
    mode: "denied",
    label: "Admin role required",
    action: "sign-out",
  });
  assert.deepEqual(adminAccessState({
    hasSupabase: true,
    session: { user: { id: "admin-1" } },
    role: "admin",
  }), {
    mode: "unlocked",
    label: "Admin verified",
    action: "enter",
  });
});

test("accountAuthFeedback gives explicit next steps for account flows", () => {
  const ready = accountAuthFeedback();
  assert.equal(ready.title, "Create account or sign in");
  assert.ok(ready.steps.includes("Create account enters immediately"));

  const pending = accountAuthFeedback("sign-up", "pending", { email: "user@example.com" });
  assert.equal(pending.title, "Creating account");
  assert.match(pending.body, /user@example\.com/);

  const confirm = accountAuthFeedback("sign-up", "success", { email: "user@example.com", hasSession: false });
  assert.equal(confirm.title, "Auth toggle still on");
  assert.equal(confirm.tone, "warning");
  assert.ok(confirm.steps.includes("Run npm run supabase:auth:no-confirm"));

  const signedIn = accountAuthFeedback("sign-in", "success", { email: "user@example.com", hasSession: true });
  assert.equal(signedIn.title, "Signed in");
  assert.equal(signedIn.tone, "success");

  const reset = accountAuthFeedback("reset-password", "success", { email: "user@example.com" });
  assert.equal(reset.title, "Password reset sent");
  assert.ok(reset.steps.includes("Choose a new 8+ character password"));
});

test("accountAuthErrorFeedback translates common Supabase failures into guidance", () => {
  const existing = accountAuthErrorFeedback("sign-up", "User already registered");
  assert.equal(existing.title, "Account already exists");
  assert.ok(existing.steps.includes("Click Sign in"));

  const unconfirmed = accountAuthErrorFeedback("sign-in", "Email not confirmed");
  assert.equal(unconfirmed.title, "Email confirmation is still on");
  assert.ok(unconfirmed.steps.includes("Run npm run supabase:auth:no-confirm"));

  const badPassword = accountAuthErrorFeedback("sign-up", "Password must be at least 8 characters");
  assert.equal(badPassword.title, "Password needs attention");
  assert.ok(badPassword.steps.includes("Use at least 8 characters"));

  const resetFailed = accountAuthErrorFeedback("reset-password", "Network request failed");
  assert.equal(resetFailed.title, "Password reset failed");
});

test("accountAuthRedirectUrl avoids localhost confirmation links", () => {
  assert.equal(accountAuthRedirectUrl({
    location: {
      protocol: "http:",
      hostname: "localhost",
      origin: "http://localhost:4173",
    },
  }), "https://raveindexsh.top/account.html");

  assert.equal(accountAuthRedirectUrl({
    location: {
      protocol: "https:",
      hostname: "raveindexsh.top",
      origin: "https://raveindexsh.top",
    },
  }), "https://raveindexsh.top/account.html");

  assert.equal(accountAuthRedirectUrl({
    RAVE_ACCOUNT_AUTH_REDIRECT_URL: "https://preview.example.com/account.html",
    location: {
      protocol: "http:",
      hostname: "localhost",
      origin: "http://localhost:4173",
    },
  }), "https://preview.example.com/account.html");
});

test("accountFeatureCatalog lists live Supabase features and account expansion paths", () => {
  const features = accountFeatureCatalog();
  const ids = features.map(feature => feature.id);

  assert.deepEqual(ids, [
    "auth-profile",
    "preference-sync",
    "saved-events",
    "for-you-ranking",
    "itinerary-sync",
    "love-wall-identity",
    "source-alerts",
    "privacy-export",
    "moderation-role",
  ]);
  assert.ok(features.filter(feature => feature.status === "live").length >= 4);
  assert.ok(features.every(feature => feature.title && feature.hook && feature.payoff && feature.description && feature.storage));
  assert.ok(features.find(feature => feature.id === "for-you-ranking").hook.includes("better matches"));
  assert.ok(features.find(feature => feature.id === "source-alerts").payoff.includes("Get alerts"));
  assert.ok(features.find(feature => feature.id === "saved-events").storage.includes("saved_events"));
});

test("publicAccountGuide tailors account prompts for non-login pages", () => {
  const plannerGuide = publicAccountGuide("planner");
  const loveGuide = publicAccountGuide("love");
  const defaultGuide = publicAccountGuide("unknown-page");

  assert.equal(plannerGuide.title, "Save future routes");
  assert.ok(plannerGuide.description.includes("route intent"));
  assert.ok(plannerGuide.benefits.includes("Keep saved nights and route intent together"));
  assert.equal(loveGuide.title, "Choose a display name");
  assert.ok(loveGuide.benefits.includes("Carry one display name across public notes"));
  assert.equal(defaultGuide.title, "Save your picks");
  assert.equal(defaultGuide.href, "account.html");
});
