const test = require("node:test");
const assert = require("node:assert/strict");

const {
  adminClosedEventRooms,
  createLiveRoomTopic,
  eventLiveRoomFromEvent,
  eventRoomSignalOptions,
  liveRoomAccessState,
  loveWallSignalForNote,
  presenceCountFromState,
  reactionCountsAfterBroadcast,
  roomClosesAt,
  roomFeedAfterSignal,
  roomIsClosed,
  roomMessageModerationState,
  roomMessagesAfterBroadcast,
  roomMessagesAfterReport,
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

test("todayEventRooms carries previous-night rooms until next-day noon", () => {
  const events = [
    { id: "santa-k", sortDate: "2026-06-13", title: "Santa K", venue: "Abyss", time: "22:30", status: "past", confidence: "High" },
    { id: "day-party", sortDate: "2026-06-14", title: "Day Party", venue: "Dome", time: "15:00", status: "upcoming", confidence: "Medium" },
  ];

  const beforeNoon = todayEventRooms(events, "2026-06-14", "2026-06-14T11:30:00+08:00");
  assert.deepEqual(beforeNoon.map(room => room.eventId), ["santa-k", "day-party"]);

  const atNoon = todayEventRooms(events, "2026-06-14", "2026-06-14T12:00:00+08:00");
  assert.deepEqual(atNoon.map(room => room.eventId), ["day-party"]);
});

test("eventLiveRoomFromEvent keeps closed room links renderable as archives", () => {
  const room = eventLiveRoomFromEvent({
    id: "santa-k",
    sortDate: "2026-06-13",
    title: "Santa K",
    venue: "Abyss",
    time: "22:30-04:00",
    status: "past",
    confidence: "High",
  }, "2026-06-14");

  assert.equal(room.eventId, "santa-k");
  assert.equal(room.title, "Santa K");
  assert.equal(room.closesAt, "2026-06-14T12:00:00+08:00");
  assert.equal(roomIsClosed(room, "2026-06-14T12:01:00+08:00"), true);
});

test("adminClosedEventRooms exposes sealed rooms only to admins", () => {
  const events = [
    { id: "closed", sortDate: "2026-06-12", title: "Closed Room", venue: "Abyss", time: "22:00", status: "past" },
    { id: "still-open", sortDate: "2026-06-13", title: "Still Open", venue: "Dome", time: "22:00", status: "past" },
    { id: "future", sortDate: "2026-06-14", title: "Future Room", venue: "Dome", time: "15:00", status: "upcoming" },
  ];

  assert.deepEqual(
    adminClosedEventRooms(events, "2026-06-14", "2026-06-14T11:30:00+08:00", { isAdmin: false }),
    [],
  );

  const adminRooms = adminClosedEventRooms(events, "2026-06-14", "2026-06-14T11:30:00+08:00", { isAdmin: true });
  assert.deepEqual(adminRooms.map(room => room.eventId), ["closed"]);
  assert.equal(adminRooms[0].title, "Closed Room");
  assert.equal(adminRooms[0].closesAt, "2026-06-13T12:00:00+08:00");
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

test("roomMessagesAfterBroadcast prepends sanitized anonymous room talk", () => {
  const current = [{ id: "old", targetId: "santa-k", text: "old", at: "old", reports: 0 }];
  const next = roomMessagesAfterBroadcast(current, {
    targetId: "santa-k",
    text: "   Meet by the left stack <b>now</b>   ",
    sentAt: "2026-06-13T23:59:00+08:00",
    visitorId: "must-not-leak",
  }, { now: "2026-06-13T23:59:00+08:00" });

  assert.equal(next.length, 2);
  assert.equal(next[0].targetId, "santa-k");
  assert.equal(next[0].text, "Meet by the left stack <b>now</b>");
  assert.equal(next[0].at, "2026-06-13T23:59:00+08:00");
  assert.equal(Object.prototype.hasOwnProperty.call(next[0], "visitorId"), false);
  assert.equal(current.length, 1);
  assert.deepEqual(roomMessagesAfterBroadcast(next, { targetId: "santa-k", text: " " }), next);
});

test("roomMessagesAfterReport increments matching message reports without mutating input", () => {
  const current = [
    { id: "message-1", targetId: "santa-k", text: "unsafe", at: "now", reports: 0 },
    { id: "message-2", targetId: "santa-k", text: "ok", at: "now", reports: 0 },
  ];
  const next = roomMessagesAfterReport(current, { targetId: "santa-k", messageId: "message-1" });

  assert.equal(next[0].reports, 1);
  assert.equal(next[1].reports, 0);
  assert.equal(current[0].reports, 0);
  assert.deepEqual(roomMessagesAfterReport(next, { targetId: "other", messageId: "message-1" }), next);
});

test("roomMessageModerationState allows social contact, tickets, afters, and ride plans", () => {
  const allowed = [
    "after 有人去吗 加我微信 bassfloor88",
    "出一张票 原价转 手机号 13800138000",
    "I am outside, add my IG @night_signal",
    "拼车回静安 有人一起吗",
    "开个小群同步 after 地址，想来的加我",
  ];

  allowed.forEach(message => {
    assert.deepEqual(roomMessageModerationState(message), {
      allowed: true,
      action: "allow",
      message: "",
    });
  });
});

test("roomMessageModerationState soft-blocks obvious unsafe or unrelated spam without exposing terms", () => {
  const blocked = [
    "稳赚返利项目，先转押金进群",
    "博彩下注贷款刷单加我",
    "卖药 找货 k粉 可送到场",
    "带刀来门口约架报复他",
    "曝光这个人的住址和身份证",
    "今晚有人想聊政治和选举吗",
    "political rally protest slogan tonight",
  ];

  blocked.forEach(message => {
    assert.deepEqual(roomMessageModerationState(message), {
      allowed: false,
      action: "soft-block",
      message: "Message not posted. Keep this room social, event-related, and safe.",
    });
  });
});

test("roomMessagesAfterBroadcast refuses soft-blocked room talk", () => {
  const current = [{ id: "old", targetId: "santa-k", text: "old", at: "old", reports: 0 }];
  assert.deepEqual(roomMessagesAfterBroadcast(current, {
    targetId: "santa-k",
    text: "博彩下注贷款刷单加我",
  }), current);
});

test("roomClosesAt and roomIsClosed keep rooms open until next-day noon", () => {
  const room = { eventId: "santa-k", sortDate: "2026-06-13", time: "22:30-04:00" };
  assert.equal(roomClosesAt(room), "2026-06-14T12:00:00+08:00");
  assert.equal(roomIsClosed(room, "2026-06-14T11:59:00+08:00"), false);
  assert.equal(roomIsClosed(room, "2026-06-14T12:00:00+08:00"), true);
  assert.equal(roomIsClosed({ ...room, status: "past" }, "2026-06-14T11:59:00+08:00"), false);

  assert.equal(roomClosesAt({ sortDate: "2026-06-14", time: "16:00-17:00" }), "2026-06-15T12:00:00+08:00");
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
