const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createRoomTopic,
  presenceCountFromState,
  reactionsAfterRemote,
  realtimeAccessState,
} = require("../assets/preview-room-realtime.js");

test("createRoomTopic builds stable Supabase channel topics", () => {
  assert.equal(
    createRoomTopic({ id: "rave-everywhere-Heavy Current!" }),
    "preview-room:rave-everywhere-heavy-current",
  );
  assert.equal(createRoomTopic({ title: "Late Basement Signal" }), "preview-room:late-basement-signal");
  assert.equal(createRoomTopic(null), "preview-room:draft");
});

test("presenceCountFromState sums every presence entry", () => {
  assert.equal(presenceCountFromState({
    alpha: [{ visitorId: "a" }],
    beta: [{ visitorId: "b" }, { visitorId: "c" }],
    ignored: null,
  }), 3);
  assert.equal(presenceCountFromState(null), 0);
});

test("reactionsAfterRemote increments valid reactions without mutating input", () => {
  const current = { locked: 1, heat: 2, again: 0 };
  const next = reactionsAfterRemote(current, { reaction: "heat" });

  assert.deepEqual(next, { locked: 1, heat: 3, again: 0 });
  assert.deepEqual(current, { locked: 1, heat: 2, again: 0 });
  assert.deepEqual(reactionsAfterRemote(next, { reaction: "noise" }), next);
});

test("realtimeAccessState keeps Preview Room local unless Supabase is usable", () => {
  assert.deepEqual(realtimeAccessState({ config: null, supabaseGlobal: null }), {
    mode: "local",
    canConnect: false,
    label: "Local room",
  });

  assert.deepEqual(realtimeAccessState({
    config: { enabled: true, url: "https://demo.supabase.co", anonKey: "anon" },
    supabaseGlobal: { createClient() {} },
  }), {
    mode: "ready",
    canConnect: true,
    label: "Realtime ready",
  });

  assert.equal(realtimeAccessState({
    config: { enabled: false, url: "https://demo.supabase.co", anonKey: "anon" },
    supabaseGlobal: { createClient() {} },
  }).canConnect, false);
});
