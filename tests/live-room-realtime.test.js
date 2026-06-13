const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createLiveRoomTopic,
  eventRoomSignalOptions,
  liveRoomAccessState,
  loveWallSignalForNote,
  presenceCountFromState,
  reactionCountsAfterBroadcast,
  roomFeedAfterSignal,
  roomShareUrl,
  todayEventRooms,
} = require("../assets/live-room-realtime.js");

test("createLiveRoomTopic builds stable topics for global and event rooms", () => {
  assert.equal(createLiveRoomTopic("love-wall", { id: "main" }), "live-room:love-wall:main");
  assert.equal(createLiveRoomTopic("event", { id: "Santa K / TURBO!" }), "live-room:event:santa-k-turbo");
  assert.equal(createLiveRoomTopic("event", null), "live-room:event:main");
});

test("todayEventRooms opens a room for every non-past event on the selected day", () => {
  const rooms = todayEventRooms([
    { id: "santa-k", sortDate: "2026-06-13", title: "Santa K", venue: "Abyss", time: "22:30", status: "upcoming", confidence: "High" },
    { id: "system-popup", sortDate: "2026-06-13", title: "System pop-up", venue: "Arcane", time: "Saturday", status: "watch", confidence: "Low" },
    { id: "old", sortDate: "2026-06-13", title: "Past night", venue: "Past", time: "22:00", status: "past", confidence: "High" },
    { id: "tomorrow", sortDate: "2026-06-14", title: "Tomorrow", venue: "Dome", time: "15:00", status: "upcoming", confidence: "Medium" },
  ], "2026-06-13");

  assert.deepEqual(rooms.map(room => room.eventId), ["santa-k", "system-popup"]);
  assert.equal(rooms[0].topic, "live-room:event:santa-k");
  assert.equal(rooms[1].status, "watch");
});

test("loveWallSignalForNote broadcasts only moderation-safe metadata", () => {
  const signal = loveWallSignalForNote({
    author: "front left",
    pulse: "care",
    message: "this unapproved message must not be broadcast",
  });

  assert.equal(signal.type, "love-wall-note");
  assert.equal(signal.pulse, "care");
  assert.equal(Object.prototype.hasOwnProperty.call(signal, "message"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(signal, "author"), false);
});

test("reactionCountsAfterBroadcast merges valid remote reactions without mutating input", () => {
  const current = { "post-1": { heat: 1 } };
  const next = reactionCountsAfterBroadcast(current, { targetId: "post-1", reaction: "heat" }, ["heat", "love"]);

  assert.deepEqual(next, { "post-1": { heat: 2 } });
  assert.deepEqual(current, { "post-1": { heat: 1 } });
  assert.deepEqual(
    reactionCountsAfterBroadcast(next, { targetId: "post-1", reaction: "noise" }, ["heat", "love"]),
    next,
  );
});

test("eventRoomSignalOptions exposes canned room actions for live safety", () => {
  assert.deepEqual(
    eventRoomSignalOptions().map(option => option.key),
    ["inside", "heat", "queue", "set-now", "water", "leaving", "after"],
  );
});

test("roomFeedAfterSignal prepends sanitized valid signals and caps length", () => {
  const feed = Array.from({ length: 6 }, (_, index) => ({
    id: `old-${index}`,
    label: "Old",
    action: "inside",
    targetId: "santa-k",
    at: "old",
  }));
  const next = roomFeedAfterSignal(feed, {
    targetId: "santa-k",
    action: "water",
    sentAt: "2026-06-13T23:59:00+08:00",
  }, eventRoomSignalOptions());

  assert.equal(next.length, 6);
  assert.equal(next[0].label, "Water");
  assert.equal(next[0].action, "water");
  assert.equal(next[0].targetId, "santa-k");
  assert.equal(feed[0].id, "old-0");
  assert.deepEqual(roomFeedAfterSignal(next, { targetId: "santa-k", action: "spam" }, eventRoomSignalOptions()), next);
});

test("roomShareUrl builds a stable hash link without leaking query noise", () => {
  assert.equal(
    roomShareUrl("https://example.com/index.html?utm=x#old", "santa-k"),
    "https://example.com/index.html?utm=x#live-room=santa-k",
  );
  assert.equal(roomShareUrl("", "FENGYUN Vol. 5"), "#live-room=FENGYUN%20Vol.%205");
});

test("liveRoomAccessState and presenceCountFromState keep local fallback explicit", () => {
  assert.deepEqual(liveRoomAccessState({ config: null, supabaseGlobal: null }), {
    mode: "local",
    canConnect: false,
    label: "Local room",
  });
  assert.deepEqual(liveRoomAccessState({
    config: { enabled: true, url: "https://demo.supabase.co", anonKey: "anon" },
    supabaseGlobal: { createClient() {} },
  }), {
    mode: "ready",
    canConnect: true,
    label: "Realtime ready",
  });
  assert.equal(presenceCountFromState({ a: [{ id: 1 }], b: [{ id: 2 }, { id: 3 }] }), 3);
});
