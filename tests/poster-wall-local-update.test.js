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

test("local poster updater removes compact-title duplicate poster rows", () => {
  const payload = {
    events: [
      {
        id: "2026-06-21-friendsstandout",
        name: "FRIENDSSTAND out",
        venue: "Wigwam",
        posterUrl: "https://cdn.example.com/workbuddy.jpg",
        sourceLabel: "poster-archive",
      },
      {
        id: "friendsstandout",
        title: "FRIENDSSTANDout",
        sortDate: "2026-06-21",
        venue: "Wigwam",
        posterUrl: "https://cdn.example.com/ra.jpg",
        source: "https://ra.co/events/2455159",
        sourceLabel: "RA",
        lineup: [{ name: "Tsing" }, { name: "YKK" }],
      },
      {
        id: "same-room-different-party",
        title: "Different Party",
        sortDate: "2026-06-21",
        venue: "Wigwam",
        posterUrl: "https://cdn.example.com/different.jpg",
      },
    ],
  };

  const { repairs } = repairPosterEventsForWall(payload);

  assert.deepEqual(payload.events.map(event => event.id), ["friendsstandout", "same-room-different-party"]);
  assert.equal(repairs.some(repair => repair.field === "duplicate" && repair.id === "2026-06-21-friendsstandout"), true);
});

test("local poster updater keeps and tags non-Shanghai city-tour variants", () => {
  const payload = {
    events: [
      {
        id: "2024-pog-kasra-beijing",
        title: "POG with Kasra (Beijing)",
        city: "Beijing",
        venue: "Zhao Dai",
        posterUrl: "https://cdn.example.com/beijing.jpg",
        sourceUrl: "https://shypeople.cn/",
      },
      {
        id: "2024-pog-kasra-shanghai",
        title: "POG with Kasra (Shanghai)",
        city: "Shanghai",
        venue: "Shy People",
        posterUrl: "https://cdn.example.com/shanghai.jpg",
        sourceUrl: "https://shypeople.cn/",
      },
    ],
  };

  const { repairs } = repairPosterEventsForWall(payload);

  assert.deepEqual(payload.events.map(event => event.id), ["2024-pog-kasra-beijing", "2024-pog-kasra-shanghai"]);
  assert.deepEqual(payload.events[0].tags, ["other city", "beijing"]);
  assert.deepEqual(payload.events[0].decisionTags, ["other city", "beijing"]);
  assert.equal(repairs.some(repair => repair.field === "tags" && repair.id === "2024-pog-kasra-beijing"), true);
  assert.equal(repairs.some(repair => repair.field === "duplicate" && repair.id === "2024-pog-kasra-beijing"), false);
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
