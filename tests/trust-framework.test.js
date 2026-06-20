const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

function readSiteFile(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function trustHrefFor(file) {
  return file.startsWith("events/") ? "../trust.html" : "trust.html";
}

function navHrefsFor(file) {
  const html = readSiteFile(file);
  const nav = html.match(/<nav\b[^>]*class="[^"]*(?:primary-nav|site-nav)[^"]*"[\s\S]*?<\/nav>/);
  assert.ok(nav, `${file} should expose primary navigation`);
  return [...nav[0].matchAll(/<a\b[^>]*class="[^"]*\bnav-link\b[^"]*"[^>]*href="([^"]+)"/g)].map(match => match[1]);
}

test("trust policy is a tracked page without adding another weekly-picks surface", () => {
  const structure = JSON.parse(readSiteFile("config/website-structure.json"));
  const trustPage = structure.pages.find(page => page.id === "trust");

  assert.equal(trustPage.file, "trust.html");
  assert.equal(trustPage.includeInSitemap, true);
  assert.equal(structure.primaryNav.includes("trust"), false);

  const index = readSiteFile("index.html");
  const highlights = index.match(/<section class="highlight-wall"/g) || [];
  assert.equal(highlights.length, 1);
});

test("primary navigation prioritizes events and planning routes", () => {
  const expectedIds = [
    "poster-wall",
    "calendar",
    "planner",
    "live-room",
    "rave-everywhere",
    "love-wall",
    "venues",
    "djs",
    "new-to-techno",
    "contribute",
    "account",
  ];
  const expectedHrefs = [
    "poster-wall.html",
    "index.html",
    "planner.html",
    "live-room.html",
    "rave-everywhere.html",
    "love-wall.html",
    "venues.html",
    "djs.html",
    "new-to-techno.html",
    "contribute.html",
    "account.html",
  ];
  const structure = JSON.parse(readSiteFile("config/website-structure.json"));
  assert.deepEqual(structure.primaryNav, expectedIds);

  for (const file of ["index.html", "poster-wall.html", "djs.html", "planner.html", "live-room.html", "rave-everywhere.html"]) {
    assert.deepEqual(navHrefsFor(file), expectedHrefs, `${file} should keep the configured primary nav order`);
  }
});

test("public pages link to the recommendation and correction policy", () => {
  const publicPages = [
    "index.html",
    "shanghai-rave-calendar-2026.html",
    "poster-wall.html",
    "love-wall.html",
    "venues.html",
    "contribute.html",
    "live-room.html",
    "planner.html",
    "rave-everywhere.html",
    "account.html",
    "subscribe.html",
    "events/fengyun-5.html",
  ];

  for (const file of publicPages) {
    const html = readSiteFile(file);
    const href = trustHrefFor(file);
    assert.match(html, new RegExp(`href="${href}(?:#corrections)?"`), `${file} should link to the trust policy`);
  }
});

test("event detail pages expose a trust ledger", () => {
  const eventDetail = readSiteFile("events/fengyun-5.html");
  const generator = readSiteFile("scripts/generate-seo-pages.js");

  assert.match(generator, /function renderTrustLedger/);
  assert.match(eventDetail, /Trust Ledger/);
  assert.match(eventDetail, /Last checked/);
  assert.match(eventDetail, /Commercial relationship/);
  assert.match(eventDetail, /Correction route/);
});

test("source trails expose browser verification notes when available", () => {
  const eventDetail = readSiteFile("events/jasmin-knopha.html");
  const generator = readSiteFile("scripts/generate-seo-pages.js");

  assert.match(generator, /sourceVerificationNote/);
  assert.match(eventDetail, /Browser check/);
  assert.match(eventDetail, /Keep as social-lead/);
});

test("events carry structured recommendation fields and event details render them", () => {
  const payload = JSON.parse(readSiteFile("data/events.json"));
  const requiredFields = [
    "recommendationReason",
    "bestFor",
    "verifyBeforeGoing",
    "sourceConfidence",
  ];

  for (const event of payload.events) {
    for (const field of requiredFields) {
      assert.equal(typeof event[field], "string", `${event.id} should define ${field}`);
      assert.ok(event[field].trim().length >= 8, `${event.id} ${field} should be editorially useful`);
    }
  }

  const generator = readSiteFile("scripts/generate-seo-pages.js");
  const eventDetail = readSiteFile("events/fengyun-5.html");

  assert.match(generator, /function renderRecommendationLedger/);
  assert.match(eventDetail, /How We Recommend This/);
  assert.match(eventDetail, /Best for/);
  assert.match(eventDetail, /Verify before going/);
});

test("event recommendation reasons explain taste fit rather than source discovery", () => {
  const payload = JSON.parse(readSiteFile("data/events.json"));
  const sourceFirstPattern = /\b(?:Resident Advisor|SmartShanghai|RA-backed|RA coverage|RA publishes|RA\b|sources?\b|public .*preview|visual confirmation|event-level|source trail|source-backed|supports the event basics|gives a useful lead|current event-level source|fully readable event-level source)\b/i;

  for (const event of payload.events) {
    assert.doesNotMatch(
      event.recommendationReason,
      sourceFirstPattern,
      `${event.id} recommendationReason should explain why to go, not where the event was found`,
    );
  }
});

test("event descriptions expose an item-level recommendation policy link", () => {
  const index = readSiteFile("index.html");
  const wall = readSiteFile("poster-wall.html");

  assert.match(index, /function eventTrustLinkHtml/);
  assert.match(index, /<p class="description">\$\{escapeHtml\(publicText\(event\.description\)\)\}<\/p>\s*\$\{eventTrustLinkHtml\(\)\}/);
  assert.match(index, /id="modalTrustPolicy"/);

  assert.match(wall, /function eventTrustLinkHtml/);
  assert.match(wall, /document\.getElementById\("modalTrustPolicy"\)\.innerHTML = eventTrustLinkHtml\(\);/);
  assert.doesNotMatch(wall, /class="wall-description"/);
  assert.match(wall, /id="modalTrustPolicy"/);
});

test("DJ descriptions keep recommendation policy links internal", () => {
  const djs = readSiteFile("djs.html");

  assert.doesNotMatch(djs, /function djTrustLinkHtml/);
  assert.doesNotMatch(djs, /How we recommend/i);
  assert.doesNotMatch(djs, /trust-inline/);
});

test("trust page explains standards, corrections, and commercial labels", () => {
  const trust = readSiteFile("trust.html");

  assert.match(trust, /How We Recommend/);
  assert.match(trust, /Selection Standards/);
  assert.match(trust, /Source Layers/);
  assert.match(trust, /Verification Methods/);
  assert.match(trust, /platform search/);
  assert.match(trust, /Xiaohongshu \/ XHS/);
  assert.match(trust, /logged-in Chrome/);
  assert.match(trust, /Corrections/);
  assert.match(trust, /Commercial Relationships/);
  assert.match(trust, /Last updated: June 14, 2026/);
});
