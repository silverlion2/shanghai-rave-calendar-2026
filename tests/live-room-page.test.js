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
  assert.doesNotMatch(liveRoom, /event-room-message/);
  assert.doesNotMatch(liveRoom, /event-room-report/);
  assert.match(liveRoom, /Copy link/);
  assert.match(liveRoom, /Join room/);
  assert.match(liveRoom, /Enter discussion/);
  assert.match(liveRoom, /live-room-discussion\.html\?room=/);
  assert.match(liveRoom, /Event page/);
  assert.match(liveRoom, /data-live-room-help/);
  assert.doesNotMatch(liveRoom, /data-live-room-talk-form/);
  assert.doesNotMatch(liveRoom, /data-live-room-message-input/);
  assert.match(liveRoom, /What happens in this room stays in this room\./);
  assert.match(liveRoom, /This room closes automatically when the event ends\./);
  assert.match(liveRoom, /Cherish the moment\./);

  assert.match(index, /href="live-room\.html"/);
  assert.match(archive, /href="live-room\.html"/);
  assert.doesNotMatch(index, /id="todayLiveRooms"/);
  assert.doesNotMatch(archive, /id="todayLiveRooms"/);
});

test("room discussion lives on a separate anonymous page", () => {
  const discussionPath = path.join(root, "live-room-discussion.html");
  assert.equal(fs.existsSync(discussionPath), true);

  const discussion = readSiteFile("live-room-discussion.html");

  assert.match(discussion, /Room Discussion/);
  assert.match(discussion, /assets\/live-room-realtime\.js/);
  assert.match(discussion, /event-room-message/);
  assert.match(discussion, /event-room-report/);
  assert.match(discussion, /data-live-room-talk-form/);
  assert.match(discussion, /data-live-room-message-input/);
  assert.match(discussion, /data-live-room-report/);
  assert.match(discussion, /Anonymous room talk/);
  assert.match(discussion, /Share this room/);
  assert.match(discussion, /data-room-discussion-share/);
  assert.match(discussion, /data-room-discussion-copy/);
  assert.match(discussion, /id="discussionSmsLink"/);
  assert.match(discussion, /sms:\?&body=/);
  assert.match(discussion, /id="roomDiscussionShareCard"/);
  assert.match(discussion, /drawDiscussionShareCard/);
  assert.match(discussion, /navigator\.share/);
  assert.match(discussion, /toBlob/);
  assert.match(discussion, /Message not posted\. Keep this room social, event-related, and safe\./);
  assert.match(discussion, /roomMessageModerationState/);
  assert.match(discussion, /What happens in this room stays in this room\./);
  assert.match(discussion, /This room closes automatically when the event ends\./);
  assert.match(discussion, /Cherish the moment\./);
  assert.match(discussion, /href="live-room\.html"/);
});

test("event detail pages keep a clear path back to their live room", () => {
  const eventDetail = readSiteFile("events/fengyun-5.html");
  const generator = readSiteFile("scripts/generate-seo-pages.js");

  assert.match(eventDetail, /href="\.\.\/live-room\.html\?room=fengyun-5#live-room"/);
  assert.match(eventDetail, />Tonight room</);
  assert.match(generator, /liveRoomHref/);
});
