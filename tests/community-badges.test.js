const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const badges = require("../assets/community-badges.js");

function readSiteFile(file) {
  return fs.readFileSync(path.join(__dirname, "..", file), "utf8");
}

test("badge definitions cover auto, identity, and governance badges", () => {
  const slugs = badges.BADGE_DEFINITIONS.map(badge => badge.slug);

  assert.ok(slugs.includes("event-scout"));
  assert.ok(slugs.includes("source-runner"));
  assert.ok(slugs.includes("lineup-mapper"));
  assert.ok(slugs.includes("verified-venue"));
  assert.ok(slugs.includes("founding-contributor"));
  assert.ok(badges.BADGE_DEFINITIONS.every(badge => badge.icon && badge.styleKey && badge.description));
});

test("contribution badge rules map reviewed work to badges and points", () => {
  assert.equal(badges.badgeSlugForContributionType("event"), "event-scout");
  assert.equal(badges.badgeSlugForContributionType("source-fix"), "source-runner");
  assert.equal(badges.badgeSlugForContributionType("dj"), "lineup-mapper");
  assert.equal(badges.badgeSlugForContributionType("venue"), "venue-signal");

  assert.equal(badges.pointsForContribution({ status: "accepted", contributionType: "event" }), 10);
  assert.equal(badges.pointsForContribution({ status: "merged", contributionType: "event" }), 25);
  assert.equal(badges.pointsForContribution({ status: "merged", contributionType: "source-fix" }), 15);
  assert.equal(badges.pointsForContribution({ status: "rejected", contributionType: "event" }), 0);

  assert.equal(badges.levelForCount(0), 0);
  assert.equal(badges.levelForCount(1), 1);
  assert.equal(badges.levelForCount(5), 2);
  assert.equal(badges.levelForCount(15), 3);
});

test("profileDataFromRows normalizes Supabase rows for rendering", () => {
  const data = badges.profileDataFromRows({
    summary: {
      display_name: "front left",
      public_badges: true,
      total_points: 35,
      accepted_contributions: 1,
      merged_contributions: 1,
      badge_count: 1,
    },
    badges: [
      {
        badge_slug: "event-scout",
        level: 2,
        status: "active",
        source_type: "community_contribution",
        awarded_at: "2026-06-16T00:00:00Z",
      },
    ],
    reputationEvents: [
      {
        event_type: "community_contribution_merged",
        target_type: "community_contribution",
        target_id: "row-1",
        points_delta: 25,
        badge_slug: "event-scout",
        reason: "Community contribution merged",
        created_at: "2026-06-16T00:00:00Z",
      },
    ],
  });

  assert.equal(data.displayName, "front left");
  assert.equal(data.publicBadges, true);
  assert.equal(data.totalPoints, 35);
  assert.equal(data.badges[0].name, "Event Scout");
  assert.equal(data.badges[0].level, 2);
  assert.equal(data.reputationEvents[0].pointsDelta, 25);
});

test("badge board renders polished badge cards and privacy control", () => {
  const html = badges.renderBadgeBoard({
    totalPoints: 35,
    acceptedContributions: 1,
    mergedContributions: 1,
    publicBadges: false,
    badges: [
      {
        badge_slug: "source-runner",
        level: 1,
        status: "active",
        source_type: "community_contribution",
      },
    ],
  }, { context: "account" });

  assert.match(html, /community-badge-board/);
  assert.match(html, /community-badge-pin/);
  assert.match(html, /Source Runner/);
  assert.match(html, /data-account-action="toggle-public-badges"/);
  assert.match(html, /Show public badges/);
});

test("contribution preview and admin options use badge-specific UI", () => {
  const preview = badges.renderContributionBadgePreview();
  const adminOptions = badges.adminBadgeOptions();

  assert.match(preview, /Badge rewards/);
  assert.match(preview, /Event Scout/);
  assert.match(preview, /Lineup Mapper/);
  assert.ok(adminOptions.some(option => option.slug === "verified-organizer"));
  assert.ok(adminOptions.some(option => option.slug === "poster-archivist"));
});

test("badge assets are wired into account, contribute, ops, and migrations", () => {
  const account = readSiteFile("account.html");
  const contribute = readSiteFile("contribute.html");
  const ops = readSiteFile("ops.html");
  const migration = readSiteFile("supabase/migrations/202606160001_community_badges.sql");

  assert.match(account, /assets\/community-badges\.css/);
  assert.match(account, /assets\/community-badges\.js/);
  assert.match(contribute, /data-community-badge-preview/);
  assert.match(ops, /data-community-badge-admin/);
  assert.match(migration, /create table if not exists public\.badge_definitions/);
  assert.match(migration, /create table if not exists public\.profile_badges/);
  assert.match(migration, /create table if not exists public\.reputation_events/);
  assert.match(migration, /record_community_contribution_reputation/);
  assert.match(migration, /grant_profile_badge/);
  assert.match(migration, /revoke_profile_badge/);
});
