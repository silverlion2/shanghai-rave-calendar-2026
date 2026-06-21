const test = require("node:test");
const assert = require("node:assert/strict");

const {
  deriveSortDate,
  repairPosterEventsForWall,
  summarizePosterEvents,
} = require("../scripts/update-local-posters.js");

test("local poster updater repairs Workbuddy-style name-only poster rows", () => {
  const payload = {
    events: [
      {
        id: "2026-06-21-friendsstandout",
        name: "FRIENDSSTAND out",
        venue: "wigwam",
        posterUrl: "https://cdn.example.com/events/2026-06-21-friendsstandout.jpg",
      },
    ],
  };

  const { repairs } = repairPosterEventsForWall(payload);

  assert.equal(payload.events[0].title, "FRIENDSSTAND out");
  assert.equal(payload.events[0].city, undefined);
  assert.equal(payload.events[0].sortDate, "2026-06-21");
  assert.equal(payload.events[0].date, undefined);
  assert.deepEqual(repairs.map(repair => repair.field), ["title", "sortDate"]);
});

test("local poster updater summarizes wall-ready poster counts", () => {
  const payload = {
    events: [
      {
        id: "with-title",
        title: "With Title",
        city: "Shanghai",
        sortDate: "2026-06-21",
        posterUrl: "https://cdn.example.com/with-title.jpg",
      },
      {
        id: "missing-title",
        name: "Missing Title",
        city: "Beijing",
        posterUrl: "https://cdn.example.com/missing-title.jpg",
      },
      {
        id: "no-poster",
        title: "No Poster",
      },
    ],
  };

  assert.equal(deriveSortDate({ id: "2026-06-22-test" }), "2026-06-22");
  assert.deepEqual(summarizePosterEvents(payload), {
    totalEvents: 3,
    posterEvents: 2,
    wallReadyPosterEvents: 1,
    shanghaiPosterEvents: 1,
    cityCounts: { Shanghai: 1, Beijing: 1 },
    missingTitle: 1,
    missingSortDate: 1,
  });
});
