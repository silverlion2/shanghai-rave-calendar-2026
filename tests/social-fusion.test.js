const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");
const fusion = require("../assets/social-fusion.js");

function readWindowAssignment(relativePath, key) {
  const sandbox = { window: {} };
  const filePath = path.join(rootDir, relativePath);
  vm.runInNewContext(fs.readFileSync(filePath, "utf8"), sandbox, { filename: relativePath });
  return sandbox.window[key];
}

test("normalizes Instagram handles and post/profile URLs", () => {
  assert.equal(fusion.instagramUrl("@potent_club"), "https://www.instagram.com/potent_club/");
  assert.equal(fusion.instagramUrl("https://www.instagram.com/reactor_shanghai/"), "https://www.instagram.com/reactor_shanghai/");
  assert.equal(fusion.instagramUrl("https://www.instagram.com/p/DZCeoIiEpXW/"), "https://www.instagram.com/p/DZCeoIiEpXW/");
  assert.equal(fusion.instagramUrl("https://www.instagram.com/"), "");
});

test("matches organizer and DJ social profiles by names, aliases, and handles", () => {
  const socialData = readWindowAssignment("data/social-profiles.js", "SOCIAL_PROFILE_DATA");
  const registry = fusion.createSocialRegistry(socialData);

  assert.equal(fusion.socialLinksForEntity("POTENT", registry)[0].url, "https://www.instagram.com/potent_club/");
  assert.equal(fusion.socialLinksForEntity("REACTOR Shanghai", registry)[0].handle, "reactor_shanghai");
  assert.equal(fusion.socialLinksForEntity("Tiya Manson", registry)[0].url, "https://www.instagram.com/tiyamanson/");
  assert.equal(fusion.socialLinksForEntity("ALTER. / byyb", registry)[0].handle, "byyb.radio");
});

test("builds event social links without treating Instagram as confirmation", () => {
  const socialData = readWindowAssignment("data/social-profiles.js", "SOCIAL_PROFILE_DATA");
  const registry = fusion.createSocialRegistry(socialData);
  const event = {
    organizer: "TURBO",
    lineup: [
      { name: "PASHRAWBOI" },
      { name: "Unknown Artist" },
    ],
    promotionalLinks: [
      { label: "Duplicate TURBO IG", url: "https://www.instagram.com/turbo__ww/" },
      { label: "Root IG", url: "https://www.instagram.com/" },
    ],
  };

  const links = fusion.eventSocialLinks(event, registry);

  assert.deepEqual(links.map(link => link.handle), ["turbo__ww", "pashrawboi"]);
  assert.deepEqual(links.map(link => link.relationship), ["organizer", "artist"]);
  assert.ok(links.every(link => link.sourceStatus === "social-lead"));
  assert.ok(links.every(link => link.status === "social-profile"));
});
