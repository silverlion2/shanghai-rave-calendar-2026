const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

function readSiteFile(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("DJ profile appearances link to local event detail pages", () => {
  const djs = readSiteFile("djs.html");

  assert.match(djs, /function eventDetailUrl\(event\)/);
  assert.match(djs, /`events\/\$\{encodeURIComponent\(event\.id\)\}\.html`/);
  assert.match(djs, /details: eventDetailUrl\(event\)/);
  assert.match(djs, /href="\$\{escapeHtml\(app\.details\)\}">Event page<\/a>/);
  assert.match(djs, /href="\$\{escapeHtml\(app\.source\)\}" target="_blank" rel="noopener noreferrer">Source<\/a>/);
});

test("venue and crew cards derive internal event links from system data", () => {
  const venues = readSiteFile("venues.html");

  assert.match(venues, /<script src="data\/dj-data\.js"><\/script>/);
  assert.match(venues, /const sourceData = window\.DJ_SOURCE_DATA/);
  assert.match(venues, /function systemEventsForEntry\(item\)/);
  assert.match(venues, /function renderSystemEventLinks\(item\)/);
  assert.match(venues, /href="\$\{escapeHtml\(eventDetailUrl\(event\)\)\}"/);
  assert.match(venues, /\$\{renderSystemEventLinks\(item\)\}/);
});
