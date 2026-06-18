const test = require("node:test");
const assert = require("node:assert/strict");

const community = require("../assets/community-contributions.js");

function memoryWindow(config = {}) {
  const store = new Map();
  return {
    LOVE_WALL_SUPABASE: config,
    localStorage: {
      getItem(key) {
        return store.has(key) ? store.get(key) : null;
      },
      setItem(key, value) {
        store.set(key, String(value));
      },
    },
  };
}

test("recordFromPayload normalizes a source-backed contribution", () => {
  const record = community.recordFromPayload({
    contributionType: "source-fix",
    contributorRole: "promoter",
    affiliation: "POTENT",
    title: "POTENT ticket route",
    sourceUrl: "https://ra.co/events/123",
    details: "Resident Advisor now carries a stronger public ticket source for this event.",
    consent: true,
  });

  assert.equal(record.contributionType, "source-fix");
  assert.equal(record.contributorRole, "promoter");
  assert.equal(record.affiliation, "POTENT");
  assert.equal(record.targetKind, "new");
  assert.equal(record.title, "POTENT ticket route");
  assert.equal(record.city, "Shanghai");
  assert.equal(record.sourceUrl, "https://ra.co/events/123");
  assert.equal(record.status, "pending");
});

test("recordFromPayload can target an existing entry for enrichment", () => {
  const record = community.recordFromPayload({
    contributionMode: "existing",
    targetKind: "event",
    targetId: "dark-room",
    targetLabel: "Dark Room / Jun 21 / Abyss Shanghai",
    contributionType: "source-fix",
    contributorRole: "artist",
    sourceNote: "RA running order",
    details: "The existing Dark Room entry should include the posted running order and stronger ticket evidence.",
    consent: true,
  });

  assert.equal(record.contributionMode, "existing");
  assert.equal(record.targetKind, "event");
  assert.equal(record.targetId, "dark-room");
  assert.equal(record.title, "Dark Room / Jun 21 / Abyss Shanghai");
  assert.equal(record.contributorRole, "artist");

  const row = community.remoteRowFromRecord(record, "user-123");
  assert.equal(row.target_kind, "event");
  assert.equal(row.target_id, "dark-room");
  assert.equal(row.target_label, "Dark Room / Jun 21 / Abyss Shanghai");
  assert.equal(row.contributor_role, "artist");
  assert.equal(row.submitted_by, "user-123");
  assert.deepEqual(row.metadata.target, {
    kind: "event",
    id: "dark-room",
    label: "Dark Room / Jun 21 / Abyss Shanghai",
  });
});

test("recordFromPayload requires a target for existing-entry additions", () => {
  assert.throws(
    () => community.recordFromPayload({
      contributionMode: "existing",
      contributionType: "source-fix",
      sourceNote: "official poster",
      details: "This has enough detail but no existing target selected.",
      consent: true,
    }),
    /existing event, DJ, or venue/
  );
});

test("entryOptionsFromData derives event, DJ, and venue targets", () => {
  const options = community.entryOptionsFromData({
    events: [
      {
        id: "dark-room",
        sortDate: "2026-06-21",
        title: "Dark Room",
        venue: "Abyss Shanghai",
        district: "Huangpu",
        genre: "hard techno",
      },
      {
        id: "woods",
        sortDate: "2026-06-22",
        title: "The Woods",
        venue: "C's Bar",
        district: "Changning",
      },
    ],
    lineups: {
      "dark-room": [
        { name: "NAKIN" },
        { name: "D_z" },
      ],
      woods: [
        { name: "NAKIN" },
      ],
    },
  });

  assert.equal(options.event[0].kind, "event");
  assert.ok(options.event.some(option => option.id === "dark-room" && option.label.includes("Abyss Shanghai")));
  assert.ok(options.dj.some(option => option.id === "nakin" && option.label.includes("2 listings")));
  assert.ok(options.venue.some(option => option.id === "abyss-shanghai" && option.label.includes("Huangpu")));
});

test("recordFromPayload requires evidence, detail, and consent", () => {
  assert.throws(
    () => community.recordFromPayload({
      contributionType: "event",
      title: "Abyss Friday",
      details: "Lineup only",
      consent: true,
    }),
    /source URL, source note, or upload a poster/
  );

  assert.throws(
    () => community.recordFromPayload({
      contributionType: "event",
      title: "Abyss Friday",
      sourceNote: "official poster",
      details: "Too short",
      consent: true,
    }),
    /20 characters/
  );

  assert.throws(
    () => community.recordFromPayload({
      contributionType: "event",
      title: "Abyss Friday",
      sourceNote: "official poster",
      details: "Lineup, time, and ticket status from the official poster.",
      consent: false,
    }),
    /Confirm/
  );
});

test("local queue keeps newest community contribution first", () => {
  const win = memoryWindow();
  const first = community.recordFromPayload({
    title: "First source",
    sourceNote: "official poster",
    details: "First source has enough detail for the contribution queue.",
    consent: true,
  });
  const second = community.recordFromPayload({
    title: "Second source",
    sourceNote: "venue account",
    details: "Second source has enough detail for the contribution queue.",
    consent: true,
  });

  community.writeContribution(win, first);
  community.writeContribution(win, second);

  const rows = community.readContributions(win);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].title, "Second source");
  assert.equal(rows[1].title, "First source");
});

test("Supabase config reuses the public config with a contribution table", () => {
  const win = memoryWindow({
    enabled: true,
    url: "https://demo.supabase.co/",
    anonKey: "x".repeat(32),
    contributionTable: "community_contributions",
  });

  const config = community.contributionConfig(win);
  assert.equal(config.url, "https://demo.supabase.co");
  assert.equal(config.table, "community_contributions");
  assert.equal(community.canUseSupabase(win, config), false);

  assert.deepEqual(community.contributionAccessState({
    config,
    supabaseGlobal: { createClient() {} },
  }), {
    mode: "remote",
    label: "Review queue ready",
  });
});
