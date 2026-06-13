const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

function readSiteFile(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("live room has a dedicated page outside the calendar layout", () => {
  const liveRoom = readSiteFile("live-room.html");
  const index = readSiteFile("index.html");
  const archive = readSiteFile("shanghai-rave-calendar-2026.html");

  assert.match(liveRoom, /id="todayLiveRooms"/);
  assert.match(liveRoom, /assets\/live-room-realtime\.js/);
  assert.match(liveRoom, /event-room-signal/);
  assert.match(liveRoom, /Copy link/);
  assert.match(liveRoom, /Join room/);
  assert.match(liveRoom, /Event page/);
  assert.match(liveRoom, /data-live-room-help/);

  assert.match(index, /href="live-room\.html"/);
  assert.match(archive, /href="live-room\.html"/);
  assert.doesNotMatch(index, /id="todayLiveRooms"/);
  assert.doesNotMatch(archive, /id="todayLiveRooms"/);
});

test("event detail pages keep a clear path back to their live room", () => {
  const eventDetail = readSiteFile("events/fengyun-5.html");
  const generator = readSiteFile("scripts/generate-seo-pages.js");

  assert.match(eventDetail, /href="\.\.\/live-room\.html\?room=fengyun-5#live-room"/);
  assert.match(eventDetail, />Tonight room</);
  assert.match(generator, /liveRoomHref/);
});
