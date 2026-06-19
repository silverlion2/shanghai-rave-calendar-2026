const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

function readSiteFile(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function inlineDjScript() {
  const html = readSiteFile("djs.html");
  const scripts = Array.from(
    html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g),
    match => match[1]
  );
  assert.ok(scripts.length, "djs.html should include an inline app script");
  return scripts[scripts.length - 1];
}

function fixedDateClass() {
  const fixedNow = new Date("2026-06-19T12:00:00+08:00").getTime();
  return class FixedDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [fixedNow]));
    }

    static now() {
      return fixedNow;
    }

    static parse(value) {
      return Date.parse(value);
    }

    static UTC(...args) {
      return Date.UTC(...args);
    }
  };
}

function elementFor(id) {
  return {
    id,
    value: ["soundFilter", "monthFilter", "statusFilter", "depthFilter"].includes(id) ? "all" : "",
    textContent: "",
    innerHTML: "",
    dataset: {},
    parentElement: null,
    addEventListener() {},
    scrollIntoView() {},
    closest() {
      return null;
    },
    getAttribute() {
      return "";
    },
  };
}

function loadProfilesFromDjPage() {
  const elements = new Map();
  const sandbox = {
    Date: fixedDateClass(),
    console,
    history: { replaceState() {} },
    navigator: {},
    window: {
      location: { protocol: "file:", hash: "", href: "file:///djs.html" },
      addEventListener() {},
      requestAnimationFrame(callback) {
        callback();
      },
    },
    document: {
      addEventListener() {},
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, elementFor(id));
        return elements.get(id);
      },
    },
  };

  vm.createContext(sandbox);
  [
    "data/dj-data.js",
    "data/supabase-dj-data.js",
    "data/tracked-dj-itineraries.js",
    "data/social-profiles.js",
    "assets/social-fusion.js",
    "assets/dj-trial-listen.js",
  ].forEach(file => {
    vm.runInContext(readSiteFile(file), sandbox, { filename: file });
  });
  vm.runInContext(inlineDjScript(), sandbox, { filename: "djs.inline.js" });

  return sandbox.window.__allProfiles || [];
}

test("DJ relevance sort promotes photo-backed famous public-footprint profiles", () => {
  const profiles = loadProfilesFromDjPage();
  assert.ok(profiles.length > 0, "profiles should be built from real DJ data");

  const first = profiles[0];
  assert.ok(first.imageUrl, "top profile should have a source image");
  assert.equal(typeof first.fameScore, "number");
  assert.equal(typeof first.relevanceScore, "number");

  const firstNoImageIndex = profiles.findIndex(profile => !profile.imageUrl);
  assert.ok(firstNoImageIndex > 0, "fixture should include image and no-image profiles");
  assert.ok(profiles.slice(0, firstNoImageIndex).every(profile => profile.imageUrl), "all photo-backed profiles should sort before no-image rows");

  const topTwenty = profiles.slice(0, 20);
  assert.ok(topTwenty.every(profile => profile.imageUrl), "top 20 should be photo-backed when enough images exist");
  assert.ok(topTwenty.every(profile => profile.fameScore > 0), "top profiles should carry public-footprint fame scores");

  const anyma = profiles.find(profile => profile.slug === "anyma");
  const nakin = profiles.find(profile => profile.slug === "nakin");
  assert.ok(anyma, "Anyma fixture should exist");
  assert.ok(nakin, "NAKIN fixture should exist");
  assert.ok(anyma.imageUrl, "Anyma fixture should have a source image");
  assert.ok(anyma.fameScore > nakin.fameScore, "public-footprint scoring should rank the more famous image-backed fixture higher");
  assert.ok(profiles.indexOf(anyma) < profiles.indexOf(nakin));
});
