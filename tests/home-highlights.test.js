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

function calendarHighlightHelpers(html) {
  const helperSource = [
    extractFunction(html, "highlightStartMinutes"),
    extractFunction(html, "highlightChronologyKey"),
    extractFunction(html, "orderedHighlightEvents"),
  ].join("\n");

  return Function(`${helperSource}; return { highlightStartMinutes, highlightChronologyKey, orderedHighlightEvents };`)();
}

test("homepage highlights are ordered left-to-right from soonest to latest", () => {
  for (const file of calendarFiles) {
    const html = readSiteFile(file);
    const { orderedHighlightEvents } = calendarHighlightHelpers(html);

    const events = [
      { id: "later-with-poster", sortDate: "2026-06-20", time: "20:00", posterUrl: "assets/posters/later.jpg" },
      { id: "same-day-unknown-time", sortDate: "2026-06-18", time: "Check venue" },
      { id: "same-day-later", sortDate: "2026-06-18", time: "23:00" },
      { id: "same-day-earlier", sortDate: "2026-06-18", time: "21:00" },
      { id: "filtered-watch", sortDate: "2026-06-17", time: "19:00" },
    ];

    const ordered = orderedHighlightEvents(events, event => event.id !== "filtered-watch", 4)
      .map(event => event.id);

    assert.deepEqual(
      ordered,
      ["same-day-earlier", "same-day-later", "same-day-unknown-time", "later-with-poster"],
      `${file} should sort highlights by date and start time instead of poster availability`,
    );
  }
});

test("highlight rendering uses the chronological helper without poster-first reordering", () => {
  for (const file of calendarFiles) {
    const html = readSiteFile(file);
    const renderHighlights = extractFunction(html, "renderHighlights");

    assert.match(renderHighlights, /orderedHighlightEvents\(events,\s*eventIsUpcomingPick,\s*6\)/);
    assert.doesNotMatch(renderHighlights, /posterBacked/);
  }
});
