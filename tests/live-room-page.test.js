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
  assert.match(liveRoom, /id="adminClosedRooms"/);
  assert.match(liveRoom, /data-admin-closed-room-panel hidden/);
  assert.match(liveRoom, /assets\/account-system\.js/);
  assert.match(liveRoom, /assets\/live-room-realtime\.js/);
  assert.match(liveRoom, /event-room-signal/);
  assert.doesNotMatch(liveRoom, /event-room-message/);
  assert.doesNotMatch(liveRoom, /event-room-report/);
  assert.match(liveRoom, /Copy link/);
  assert.match(liveRoom, /Join room/);
  assert.match(liveRoom, /Enter discussion/);
  assert.match(liveRoom, /Closed room admin access/);
  assert.match(liveRoom, /adminClosedEventRooms/);
  assert.match(liveRoom, /RaveAccountSystem/);
  assert.match(liveRoom, /profiles/);
  assert.match(liveRoom, /live-room-discussion\.html\?room=/);
  assert.match(liveRoom, /Event page/);
  assert.match(liveRoom, /data-live-room-help/);
  assert.doesNotMatch(liveRoom, /data-live-room-talk-form/);
  assert.doesNotMatch(liveRoom, /data-live-room-message-input/);
  assert.match(liveRoom, /What happens in this room stays in this room\./);
  assert.match(liveRoom, /This room closes automatically at 12:00 noon the next day\./);
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
  assert.match(discussion, /rows="2" maxlength="220"/);
  assert.match(discussion, /height: 72px/);
  assert.match(discussion, /max-height: clamp\(220px, 36vh, 360px\)/);
  assert.match(discussion, /overflow-y: auto/);
  assert.match(discussion, /data-live-room-report/);
  assert.match(discussion, /Anonymous room talk/);
  assert.match(discussion, /room-discussion-nav-actions/);
  assert.match(discussion, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(discussion, /Share this room/);
  assert.match(discussion, /id="discussionSharePopup"/);
  assert.match(discussion, /aria-modal="true"/);
  assert.match(discussion, /id="openDiscussionShare"/);
  assert.match(discussion, /room-discussion-share-actions/);
  assert.match(discussion, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(discussion, />System share</);
  assert.match(discussion, />Copy</);
  assert.match(discussion, />Text link</);
  assert.match(discussion, />Save card</);
  assert.match(discussion, /data-room-discussion-share/);
  assert.match(discussion, /data-room-discussion-share-close/);
  assert.match(discussion, /data-room-discussion-copy/);
  assert.match(discussion, /id="discussionSmsLink"/);
  assert.match(discussion, /sms:\?&body=/);
  assert.match(discussion, /id="roomDiscussionShareCard"/);
  assert.match(discussion, /drawDiscussionShareCard/);
  assert.match(discussion, /assets\/qrcode-generator\.js/);
  assert.match(discussion, /window\.qrcode\(0, "M"\)/);
  assert.match(discussion, /navigator\.share/);
  assert.match(discussion, /toBlob/);
  assert.match(discussion, /aria-label="\$\{isReported \? "Message reported" : "Report anonymous message"\}"/);
  assert.match(discussion, /&#9873;/);
  assert.match(discussion, /Message not posted\. Keep this room social, event-related, and safe\./);
  assert.match(discussion, /roomMessageModerationState/);
  assert.match(discussion, /room-discussion-policy/);
  assert.match(discussion, /Room intro/);
  assert.match(discussion, /What happens in this room stays in this room\./);
  assert.match(discussion, /This room closes automatically at 12:00 noon the next day\./);
  assert.match(discussion, /Contact info and social links are welcome\./);
  assert.match(discussion, /Politics, obvious ads, and harmful content are soft-blocked\./);
  assert.match(discussion, /eventLiveRoomFromEvent/);
  assert.match(discussion, /This room link stays available as a closed archive\./);
  assert.match(discussion, /Return to the homepage for future events/);
  assert.match(discussion, /Browse other content/);
  assert.match(discussion, /Cherish the moment\./);
  assert.match(discussion, /href="live-room\.html"/);
  assert.ok(
    discussion.indexOf('<div class="room-discussion-messages" aria-live="polite">${messageRows}</div>') <
      discussion.indexOf('<form class="room-discussion-talk-form"'),
    "message feed should render above the message composer"
  );
});

test("event detail pages keep a clear path back to their live room", () => {
  const eventDetail = readSiteFile("events/fengyun-5.html");
  const generator = readSiteFile("scripts/generate-seo-pages.js");

  assert.match(eventDetail, /href="\.\.\/live-room\.html\?room=fengyun-5#live-room"/);
  assert.match(eventDetail, />Tonight room</);
  assert.match(generator, /liveRoomHref/);
});
