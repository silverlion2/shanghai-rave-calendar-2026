const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const calendarFiles = ["index.html", "shanghai-rave-calendar-2026.html"];

function readSiteFile(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function extractFunction(source, name) {
  const marker = `function ${name}`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${name} should be defined`);

  const bodyStart = source.indexOf("{", start);
  assert.notEqual(bodyStart, -1, `${name} should have a body`);

  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }

  assert.fail(`${name} body should close`);
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

test("homepage calendar entries link to local event detail pages", () => {
  for (const file of calendarFiles) {
    const html = readSiteFile(file);
    const renderMonthGrid = extractFunction(html, "renderMonthGrid");

    assert.match(renderMonthGrid, /<a class="calendar-event/);
    assert.match(renderMonthGrid, /href="\$\{escapeHtml\(eventPageUrl\(event\)\)\}"/);
    assert.doesNotMatch(renderMonthGrid, /djProfileLinksHtml/);
    assert.doesNotMatch(renderMonthGrid, /venueGuideLinkHtml/);
  }
});

test("desktop calendar keeps readable event cards instead of dot markers", () => {
  const css = readSiteFile("assets/basement-dispatch.css");

  assert.doesNotMatch(css, /\.calendar-shell\s+\.calendar-event\s*\{[^}]*width:\s*8px/i);
  assert.doesNotMatch(css, /\.calendar-shell\s+\.calendar-event\s*\{[^}]*font-size:\s*0/i);
  assert.match(css, /\.calendar-shell\s+\.calendar-event\s*\{[^}]*display:\s*grid/i);
  assert.match(css, /\.calendar-shell\s+\.calendar-event\s*\{[^}]*min-height:\s*54px/i);
});

test("homepage desktop layout groups planning panels in the left rail", () => {
  const css = readSiteFile("assets/basement-dispatch.css");

  assert.match(css, /\.calendar-shell\s*\{[^}]*grid-template-columns:\s*320px minmax\(0,\s*1fr\)/i);
  assert.match(css, /\.calendar-shell\s+\.calendar-workbench\s*\{[^}]*grid-template-columns:\s*320px minmax\(0,\s*1fr\)/i);
  assert.match(css, /\.calendar-shell\s+\.calendar-main-column\s*\{[^}]*display:\s*grid/i);

  for (const file of calendarFiles) {
    const html = readSiteFile(file);
    const railStart = html.indexOf('class="side dispatch-panels calendar-left-rail"');
    const mainStart = html.indexOf('class="calendar-main-column"');

    assert.notEqual(railStart, -1, `${file} should define a left planning rail`);
    assert.notEqual(mainStart, -1, `${file} should define a right calendar main column`);
    assert.ok(railStart < mainStart, `${file} should put the planning rail before the calendar main column`);

    const rail = html.slice(railStart, mainStart);
    const tonight = rail.indexOf('aria-label="Tonight dispatch"');
    const week = rail.indexOf("<h2>This weekend</h2>");
    const plan = rail.indexOf('aria-label="Night planning route"');
    const save = rail.indexOf('class="account-public-guide-shell"');

    assert.ok(tonight !== -1 && week !== -1 && plan !== -1 && save !== -1, `${file} should include all left rail modules`);
    assert.ok(tonight < week && week < plan && plan < save, `${file} should order left rail modules before save picks`);
    assert.equal(html.indexOf('id="personalizedDispatch"'), -1, `${file} should not render the old personalized dispatch panel`);

    const main = html.slice(mainStart);
    assert.ok(main.indexOf('class="controls"') < main.indexOf('id="monthRail"'), `${file} should place filters before month rail`);
    assert.ok(main.indexOf('id="monthRail"') < main.indexOf('id="calendar"'), `${file} should place month rail before the calendar`);
  }
});

test("narrow desktop homepage layout avoids crushed highlight and rail columns", () => {
  const css = readSiteFile("assets/basement-dispatch.css");

  assert.match(
    css,
    /@media\s*\(min-width:\s*1100px\)\s*\{[\s\S]*?\.calendar-shell\s+\.calendar-left-rail\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/i,
  );
  assert.match(
    css,
    /@media\s*\(min-width:\s*1100px\)\s*and\s*\(max-width:\s*1399px\)\s*\{[\s\S]*?\.calendar-shell\s+\.highlight-list\s*\{[^}]*grid-auto-flow:\s*column/i,
  );
  assert.match(
    css,
    /@media\s*\(min-width:\s*1100px\)\s*and\s*\(max-width:\s*1399px\)\s*\{[\s\S]*?\.calendar-shell\s+\.highlight-list\s*\{[^}]*grid-auto-columns:\s*minmax\(168px,\s*24vw\)/i,
  );
  assert.match(
    css,
    /@media\s*\(min-width:\s*1100px\)\s*and\s*\(max-width:\s*1399px\)\s*\{[\s\S]*?\.calendar-shell\s+\.highlight-list\s*\{[^}]*overflow-x:\s*auto/i,
  );
});
