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

function renderMonthGridForTest(html, code, events) {
  const parseIsoDate = extractFunction(html, "parseIsoDate");
  const addDays = extractFunction(html, "addDays");
  const sameDay = extractFunction(html, "sameDay");
  const isoDateKey = extractFunction(html, "isoDateKey");
  const weekStartDate = extractFunction(html, "weekStartDate");
  const weekStartKey = extractFunction(html, "weekStartKey");
  const eventDate = extractFunction(html, "eventDate");
  const dateRangeEndFromText = extractFunction(html, "dateRangeEndFromText");
  const eventExplicitEndDate = extractFunction(html, "eventExplicitEndDate");
  const clockToMinutes = extractFunction(html, "clockToMinutes");
  const parseEventTimeWindow = extractFunction(html, "parseEventTimeWindow");
  const parseEventDateTime = extractFunction(html, "parseEventDateTime");
  const eventDisplayEndDate = extractFunction(html, "eventDisplayEndDate");
  const eventActiveDateKeys = extractFunction(html, "eventActiveDateKeys");
  const eventHasExplicitDateRange = extractFunction(html, "eventHasExplicitDateRange");
  const eventCalendarDateKeysWithinWeek = extractFunction(html, "eventCalendarDateKeysWithinWeek");
  const renderMonthGrid = extractFunction(html, "renderMonthGrid");
  return Function(`
    const verified = "2026-06-11";
    const months = [["Jan"], ["Feb"], ["Mar"], ["Apr"], ["May"], ["Jun"], ["Jul"], ["Aug"], ["Sep"], ["Oct"], ["Nov"], ["Dec"]];
    function pad2(value) {
      return String(value).padStart(2, "0");
    }
    function monthIndex(code) {
      return months.findIndex(([monthCode]) => monthCode === code);
    }
    function eventDay(event) {
      return eventDate(event).getDate();
    }
    function knownOrganizerFor() {
      return "";
    }
    function presenterFor() {
      return "";
    }
    function isFestival() {
      return false;
    }
    function lineupFor() {
      return [];
    }
    function eventEffectiveStatus() {
      return "confirmed";
    }
    function eventPageUrl(event) {
      return "events/" + event.id + ".html";
    }
    function calendarGroupFor(event) {
      return { key: event.venue, label: event.venue || "Venue TBA", meta: "" };
    }
    function groupLogoMark(label) {
      const words = String(label || "")
        .trim()
        .split(/\\s+/)
        .filter(Boolean);
      if (!words.length) return "BD";
      if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
      return words.slice(0, 2).map(word => word[0]).join("").toUpperCase();
    }
    function escapeHtml(value) {
      return String(value || "");
    }
    ${parseIsoDate}
    ${addDays}
    ${sameDay}
    ${isoDateKey}
    ${weekStartDate}
    ${weekStartKey}
    ${eventDate}
    ${dateRangeEndFromText}
    ${eventExplicitEndDate}
    ${clockToMinutes}
    ${parseEventTimeWindow}
    ${parseEventDateTime}
    ${eventDisplayEndDate}
    ${eventActiveDateKeys}
    ${eventHasExplicitDateRange}
    ${eventCalendarDateKeysWithinWeek}
    ${renderMonthGrid}
    return renderMonthGrid;
  `)()(code, events);
}

function dateWindowMatchesForTest(html, windowName, event) {
  const parseIsoDate = extractFunction(html, "parseIsoDate");
  const addDays = extractFunction(html, "addDays");
  const sameDay = extractFunction(html, "sameDay");
  const isoDateKey = extractFunction(html, "isoDateKey");
  const weekStartDate = extractFunction(html, "weekStartDate");
  const weekStartKey = extractFunction(html, "weekStartKey");
  const eventDate = extractFunction(html, "eventDate");
  const dateRangeEndFromText = extractFunction(html, "dateRangeEndFromText");
  const eventExplicitEndDate = extractFunction(html, "eventExplicitEndDate");
  const clockToMinutes = extractFunction(html, "clockToMinutes");
  const parseEventTimeWindow = extractFunction(html, "parseEventTimeWindow");
  const parseEventDateTime = extractFunction(html, "parseEventDateTime");
  const eventDisplayEndDate = extractFunction(html, "eventDisplayEndDate");
  const eventActiveDateKeys = extractFunction(html, "eventActiveDateKeys");
  const eventActiveWeekKeys = extractFunction(html, "eventActiveWeekKeys");
  const eventCoversDate = extractFunction(html, "eventCoversDate");
  const eventIntersectsDateRange = extractFunction(html, "eventIntersectsDateRange");
  const eventCoversCurrentWeek = extractFunction(html, "eventCoversCurrentWeek");
  const eventArchiveCutoff = extractFunction(html, "eventArchiveCutoff");
  const eventIsPastByCutoff = extractFunction(html, "eventIsPastByCutoff");
  const thisWeekendRange = extractFunction(html, "thisWeekendRange");
  const dateWindowMatches = extractFunction(html, "dateWindowMatches");

  return Function(`
    const verified = "2026-06-11";
    const dayMs = 24 * 60 * 60 * 1000;
    const archiveCutoffHour = 6;
    const statusNow = new Date("2026-06-21T22:30:00+08:00");
    const today = new Date(2026, 5, 21);
    let dateWindow = ${JSON.stringify(windowName)};
    function pad2(value) {
      return String(value).padStart(2, "0");
    }
    function isNewlyAdded() {
      return false;
    }
    ${parseIsoDate}
    ${addDays}
    ${sameDay}
    ${isoDateKey}
    ${weekStartDate}
    ${weekStartKey}
    ${eventDate}
    ${dateRangeEndFromText}
    ${eventExplicitEndDate}
    ${clockToMinutes}
    ${parseEventTimeWindow}
    ${parseEventDateTime}
    ${eventDisplayEndDate}
    ${eventActiveDateKeys}
    ${eventActiveWeekKeys}
    ${eventCoversDate}
    ${eventIntersectsDateRange}
    ${eventCoversCurrentWeek}
    ${eventArchiveCutoff}
    ${eventIsPastByCutoff}
    ${thisWeekendRange}
    ${dateWindowMatches}
    return dateWindowMatches;
  `)()(event);
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

test("homepage calendar grid renders a complete selected week grouped by venue rows", () => {
  const weeklyEvents = [
    { id: "may-sunday-overnight", sortDate: "2026-05-31", date: "May 31", time: "23:00-02:00", title: "Sunday into Monday", venue: "Room C" },
    { id: "june-tuesday", sortDate: "2026-06-02", title: "Tuesday room", venue: "Room A" },
    { id: "june-thursday", sortDate: "2026-06-04", title: "Thursday room", venue: "Room A" },
    { id: "june-thursday-overnight", sortDate: "2026-06-04", date: "Jun 4", time: "23:00-02:00", title: "Thursday overnight", venue: "Room A" },
    { id: "june-saturday", sortDate: "2026-06-06", title: "Saturday room", venue: "Room B" },
    { id: "june-outside-week", sortDate: "2026-06-27", title: "Outside week", venue: "Room C" },
  ];

  for (const file of calendarFiles) {
    const html = readSiteFile(file);
    const grid = renderMonthGridForTest(html, "2026-06-01", weeklyEvents);

    assert.match(grid, /--calendar-columns:\s*7/);
    assert.match(grid, /mobile-week-overview/);
    assert.match(grid, /Venue \/ presenter/);
    assert.match(grid, /<span>Mon<\/span>/);
    assert.match(grid, /<span>Tue<\/span>/);
    assert.match(grid, /<span>Wed<\/span>/);
    assert.match(grid, /<span>Thu<\/span>/);
    assert.match(grid, /<span>Fri<\/span>/);
    assert.match(grid, /<span>Sat<\/span>/);
    assert.match(grid, /<span>Sun<\/span>/);
    assert.match(grid, /<i>0<\/i>/);
    assert.match(grid, /<i>1<\/i>/);
    assert.match(grid, /class="calendar-venue-logo"/);
    assert.match(grid, /<span class="calendar-venue-logo" data-group-key="Room A" aria-hidden="true">RA<\/span>/);
    assert.match(grid, /<span class="calendar-venue-logo" data-group-key="Room B" aria-hidden="true">RB<\/span>/);
    assert.match(grid, /class="calendar-venue-copy"/);
    assert.equal((grid.match(/<b>Room A<\/b>/g) || []).length, 1);
    assert.equal((grid.match(/<b>Room B<\/b>/g) || []).length, 1);
    assert.match(grid, /Sunday into Monday/);
    assert.equal((grid.match(/<span class="calendar-event-title">Thursday overnight<\/span>/g) || []).length, 1);
    assert.doesNotMatch(grid, /Outside week/);
  }
});

test("homepage date windows keep this week complete and include tonight events", () => {
  for (const file of calendarFiles) {
    const html = readSiteFile(file);

    assert.equal(
      dateWindowMatchesForTest(html, "future", {
        id: "current-week-past",
        sortDate: "2026-06-17",
        date: "Jun 17",
        time: "22:00-05:00",
        status: "past"
      }),
      true,
      `${file} should keep current-week archive rows in the default week view`,
    );
    assert.equal(
      dateWindowMatchesForTest(html, "future", {
        id: "previous-week-past",
        sortDate: "2026-06-10",
        date: "Jun 10",
        time: "22:00-05:00",
        status: "past"
      }),
      false,
      `${file} should not re-open older archive weeks in the default week view`,
    );
    assert.equal(
      dateWindowMatchesForTest(html, "tonight", {
        id: "friendsstandout",
        sortDate: "2026-06-21",
        date: "Jun 21",
        time: "21:00-03:00",
        status: "upcoming"
      }),
      true,
      `${file} should include Jun 21 cross-midnight events in Tonight`,
    );
  }
});

test("calendar presenter labels remove duplicated venue names", () => {
  for (const file of calendarFiles) {
    const html = readSiteFile(file);
    const normalizeFilterKey = extractFunction(html, "normalizeFilterKey");
    const splitFilterEntityParts = extractFunction(html, "splitFilterEntityParts");
    const knownOrganizerFor = extractFunction(html, "knownOrganizerFor");
    const labelKeysForMatch = extractFunction(html, "labelKeysForMatch");
    const commonGroupAliasSet = extractFunction(html, "commonGroupAliasSet");
    const presenterFor = extractFunction(html, "presenterFor");
    const presenter = Function(`
      const organizerOverrides = {};
      const commonVenuePromoterGroups = [
        { key: "reactor", label: "Reactor", aliases: ["reactor", "reactor-shanghai", "reactorsh"] }
      ];
      ${normalizeFilterKey}
      ${splitFilterEntityParts}
      ${knownOrganizerFor}
      ${labelKeysForMatch}
      ${commonGroupAliasSet}
      ${presenterFor}
      return presenterFor;
    `)();

    assert.equal(presenter({ venue: "Abyss Shanghai", organizer: "FaQ / Abyss Shanghai" }), "FaQ");
    assert.equal(presenter({ venue: "POTENT", organizer: "POTENT" }), "");
    assert.equal(presenter({ venue: "Beaufort Terrace", organizer: "ALTER. / byyb" }), "ALTER. / byyb");
    assert.equal(presenter({ venue: "Reactor Shanghai", organizer: "A.T.M / REACTORSH" }), "A.T.M");
  }
});

test("venue presenter grouping does not match artist or description text", () => {
  for (const file of calendarFiles) {
    const html = readSiteFile(file);
    const normalizeFilterKey = extractFunction(html, "normalizeFilterKey");
    const splitFilterEntityParts = extractFunction(html, "splitFilterEntityParts");
    const addFilterEntity = extractFunction(html, "addFilterEntity");
    const knownOrganizerFor = extractFunction(html, "knownOrganizerFor");
    const labelKeysForMatch = extractFunction(html, "labelKeysForMatch");
    const presenterFor = extractFunction(html, "presenterFor");
    const eventFilterEntities = extractFunction(html, "eventFilterEntities");
    const commonGroupAliasSet = extractFunction(html, "commonGroupAliasSet");
    const commonGroupMatchesEvent = extractFunction(html, "commonGroupMatchesEvent");
    const matches = Function(`
      const organizerOverrides = {};
      ${normalizeFilterKey}
      ${splitFilterEntityParts}
      ${addFilterEntity}
      ${knownOrganizerFor}
      ${labelKeysForMatch}
      ${presenterFor}
      ${eventFilterEntities}
      ${commonGroupAliasSet}
      ${commonGroupMatchesEvent}
      return commonGroupMatchesEvent;
    `)();
    const abyss = { key: "abyss", label: "Abyss", aliases: ["abyss", "abyss-shanghai"] };

    assert.equal(matches({ venue: "C's", title: "Abyss DJ tribute", description: "Abyss appears only in copy" }, abyss), false);
    assert.equal(matches({ venue: "Abyss Shanghai", title: "Room night" }, abyss, "venue"), true);
    assert.equal(matches({ venue: "C's", organizer: "Abyss" }, abyss, "promoter"), true);
  }
});

test("homepage inline CSS reserves the venue column before shared CSS loads", () => {
  for (const file of calendarFiles) {
    const html = readSiteFile(file);
    const styleBlock = html.slice(html.indexOf("<style>"), html.indexOf("</style>"));

    assert.match(
      styleBlock,
      /\.calendar-week-grid\s*{\s*grid-template-columns:\s*minmax\(150px,\s*220px\)\s*repeat\(var\(--calendar-columns,\s*7\),\s*minmax\(116px,\s*1fr\)\);/s,
      `${file} should include the leading venue/presenter column in fallback calendar CSS`,
    );
    assert.match(
      styleBlock,
      /@media \(max-width:\s*860px\)[\s\S]*?\.calendar-week-grid\s*{\s*grid-template-columns:\s*minmax\(150px,\s*220px\)\s*repeat\(var\(--calendar-columns,\s*7\),\s*minmax\(116px,\s*1fr\)\);/s,
      `${file} should preserve the venue/presenter column in the narrow fallback CSS`,
    );
  }
});

test("homepage exposes week, month dropdown, and common venue presenter filters", () => {
  for (const file of calendarFiles) {
    const html = readSiteFile(file);

    assert.match(html, /id="weekFilter"/);
    assert.match(html, /<select class="select month-select" id="monthRail"/);
    assert.match(html, /id="venueFilterToggle"/);
    assert.match(html, /commonVenuePromoterGroups/);
    assert.match(html, /otherVenuePromoterGroup/);
    assert.match(html, /mark: "AB"/);
    assert.match(html, /mark: "PT"/);
    assert.match(html, /logo: "assets\/venue-logos\/abyss\.webp"/);
    assert.match(html, /logo: "assets\/venue-logos\/potent\.webp"/);
    assert.match(html, /key: "void", label: "VOID"/);
    assert.match(html, /key: "vacuum", label: "VACUUM"/);
    assert.doesNotMatch(html, /label: "VOID \/ VACUUM"/);
    assert.match(html, /groupLogoMark/);
    assert.match(html, /All venues \+ presenters/);
    assert.doesNotMatch(html, /<button class="month-button"/);
  }
});

test("calendar venue presenter badges have stable styling hooks", () => {
  const css = readSiteFile("assets/basement-dispatch.css");

  assert.match(css, /\.calendar-venue-logo/);
  assert.match(css, /\.calendar-venue-copy/);
  assert.match(css, /\.calendar-venue-logo\.has-image/);
  assert.match(css, /\.calendar-venue-logo img/);
  assert.match(css, /\.calendar-venue-logo\[data-group-key="potent"\]/);
  assert.match(css, /\.calendar-venue-logo\[data-group-key="other"\]/);
  assert.match(css, /\.calendar-shell\s+\.calendar-venue-logo\s*\{[^}]*width:\s*20px/i);
  assert.match(css, /\.calendar-shell\s+\.calendar-venue-copy\s+b\s*\{[^}]*font-size:\s*9px/i);
  assert.match(css, /\.calendar-shell\s+\.calendar-venue-copy\s+small:not\(:last-child\)\s*\{[^}]*display:\s*none/i);
  assert.match(css, /grid-template-columns:\s*minmax\(74px,\s*86px\)\s*repeat\(var\(--calendar-columns,\s*7\),\s*minmax\(108px,\s*31vw\)\)\s*!important/i);
});

test("verified venue presenter logo assets are source mapped", () => {
  const manifest = JSON.parse(readSiteFile("assets/venue-logos/sources.json"));

  assert.ok(Array.isArray(manifest.logos));
  assert.ok(manifest.logos.length >= 6);
  for (const logo of manifest.logos) {
    assert.match(logo.localFile, /^assets\/venue-logos\/.+\.webp$/);
    assert.match(logo.sourcePage, /^https:\/\/ra\.co\//);
    assert.ok(fs.existsSync(path.join(root, logo.localFile)), `${logo.localFile} should exist`);
  }
  assert.match(JSON.stringify(manifest.unresolved), /EXIT/);
  assert.match(JSON.stringify(manifest.unresolved), /VACUUM/);
});

test("homepage public event surfaces do not expose raw confidence levels", () => {
  for (const file of calendarFiles) {
    const html = readSiteFile(file);
    const publicRenderers = [
      "posterSvg",
      "renderCard",
      "renderHighlights",
      "openModal",
      "dispatchRowHtml",
      "renderBestPicks",
    ].map(name => extractFunction(html, name)).join("\n");

    assert.doesNotMatch(publicRenderers, /CONFIDENCE:/);
    assert.doesNotMatch(publicRenderers, /escapeHtml\(event\.confidence\)/);
    assert.doesNotMatch(publicRenderers, /\$\{eventEffectiveStatus\(event\)\}\s*\/\s*\$\{event\.confidence\}\s*confidence/);
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
    const controlsStart = main.indexOf('class="controls"');
    const controlsEnd = main.indexOf("</section>", controlsStart);
    const controls = main.slice(controlsStart, controlsEnd);
    assert.ok(controls.indexOf('id="weekFilter"') < controls.indexOf('id="monthRail"'), `${file} should place month beside week in the filter controls`);
    assert.ok(main.indexOf('id="monthRail"') < main.indexOf('id="calendar"'), `${file} should place month selection before the calendar`);
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

test("ultrawide homepage layout uses the available desktop width", () => {
  const css = readSiteFile("assets/basement-dispatch.css");

  assert.match(
    css,
    /@media\s*\(min-width:\s*1680px\)\s*\{[\s\S]*?\.calendar-shell\s*\{[^}]*width:\s*min\(2160px,\s*calc\(100%\s*-\s*64px\)\)/i,
  );
  assert.match(
    css,
    /@media\s*\(min-width:\s*1680px\)\s*\{[\s\S]*?\.calendar-shell\s*\{[^}]*grid-template-columns:\s*360px minmax\(0,\s*1fr\)/i,
  );
  assert.match(
    css,
    /@media\s*\(min-width:\s*1680px\)\s*\{[\s\S]*?\.calendar-shell\s+\.calendar-workbench\s*\{[^}]*grid-template-columns:\s*360px minmax\(0,\s*1fr\)/i,
  );
});
