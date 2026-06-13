(function attachPreviewRoomRealtime(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.PREVIEW_ROOM_REALTIME = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function previewRoomRealtimeFactory() {
  const VALID_REACTIONS = new Set(["locked", "heat", "again"]);

  function slugify(value) {
    const slug = String(value || "draft")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");
    return slug || "draft";
  }

  function createRoomTopic(event) {
    return `preview-room:${slugify(event && (event.id || event.title))}`;
  }

  function presenceCountFromState(state) {
    return Object.values(state || {}).reduce((total, presences) => (
      total + (Array.isArray(presences) ? presences.length : 0)
    ), 0);
  }

  function normalizedReactions(current) {
    return {
      locked: Number(current && current.locked) || 0,
      heat: Number(current && current.heat) || 0,
      again: Number(current && current.again) || 0,
    };
  }

  function reactionsAfterRemote(current, payload) {
    const next = normalizedReactions(current);
    const reaction = String(payload && (payload.reaction || payload.kind || payload.name) || "");
    if (!VALID_REACTIONS.has(reaction)) return next;
    next[reaction] += 1;
    return next;
  }

  function realtimeAccessState({ config, supabaseGlobal, client } = {}) {
    if (client && typeof client.channel === "function") {
      return { mode: "ready", canConnect: true, label: "Realtime ready" };
    }
    if (!config || config.enabled === false) {
      return { mode: "local", canConnect: false, label: "Local room" };
    }
    if (!String(config.url || "").trim() || !String(config.anonKey || "").trim()) {
      return { mode: "local", canConnect: false, label: "Local room" };
    }
    if (!supabaseGlobal || typeof supabaseGlobal.createClient !== "function") {
      return { mode: "local", canConnect: false, label: "Realtime unavailable" };
    }
    return { mode: "ready", canConnect: true, label: "Realtime ready" };
  }

  function createSupabaseRoomClient({ config, supabaseGlobal } = {}) {
    const access = realtimeAccessState({ config, supabaseGlobal });
    if (!access.canConnect) return null;
    return supabaseGlobal.createClient(String(config.url).replace(/\/+$/, ""), config.anonKey);
  }

  function randomVisitorId() {
    const cryptoApi = typeof crypto !== "undefined" ? crypto : null;
    if (cryptoApi && typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();
    return `visitor-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function storedVisitorId(storage) {
    const key = "rave-everywhere-preview-visitor";
    if (!storage) return randomVisitorId();
    try {
      const existing = storage.getItem(key);
      if (existing) return existing;
      const created = randomVisitorId();
      storage.setItem(key, created);
      return created;
    } catch (_) {
      return randomVisitorId();
    }
  }

  function broadcastPayload(message) {
    if (message && typeof message === "object" && Object.prototype.hasOwnProperty.call(message, "payload")) {
      return message.payload;
    }
    return message;
  }

  function createPreviewRoomRealtime(options = {}) {
    const win = options.window || (typeof window !== "undefined" ? window : null);
    const config = options.config || (win && win.LOVE_WALL_SUPABASE);
    const supabaseGlobal = options.supabaseGlobal || (win && win.supabase);
    const storage = options.storage || (win && win.localStorage);
    const state = {
      channel: null,
      client: options.client || createSupabaseRoomClient({ config, supabaseGlobal }),
      event: null,
      joinToken: 0,
      presenceCount: 0,
      status: "local",
      topic: "",
      visitorId: options.visitorId || storedVisitorId(storage),
    };

    function notifyStatus(status, count, label) {
      state.status = status;
      if (Number.isFinite(count)) state.presenceCount = count;
      if (typeof options.onStatus === "function") {
        options.onStatus(status, state.presenceCount, label || "");
      }
    }

    function notifyPresence() {
      if (!state.channel || typeof state.channel.presenceState !== "function") return;
      state.presenceCount = presenceCountFromState(state.channel.presenceState());
      if (typeof options.onPresence === "function") options.onPresence(state.presenceCount);
      if (state.status === "live") notifyStatus("live", state.presenceCount, "Realtime live");
    }

    async function leave() {
      state.joinToken += 1;
      const previous = state.channel;
      state.channel = null;
      state.event = null;
      state.topic = "";
      state.presenceCount = 0;
      if (previous && state.client && typeof state.client.removeChannel === "function") {
        try {
          await state.client.removeChannel(previous);
        } catch (_) {}
      }
    }

    async function join(event, metadata = {}) {
      await leave();
      state.event = event || null;
      state.topic = createRoomTopic(event);
      const access = realtimeAccessState({ client: state.client, config, supabaseGlobal });
      if (!access.canConnect) {
        notifyStatus("local", 0, access.label);
        return false;
      }

      const token = state.joinToken;
      notifyStatus("connecting", 0, "Connecting");
      const channel = state.client.channel(state.topic, {
        config: {
          broadcast: { self: false },
          presence: { key: state.visitorId },
        },
      });
      state.channel = channel;

      channel
        .on("broadcast", { event: "room-reaction" }, message => {
          if (token !== state.joinToken) return;
          const payload = broadcastPayload(message);
          if (payload && payload.visitorId === state.visitorId && options.ignoreSelf === true) return;
          if (typeof options.onReaction === "function") options.onReaction(payload || {});
        })
        .on("presence", { event: "sync" }, () => {
          if (token !== state.joinToken) return;
          notifyPresence();
        });

      channel.subscribe(async (status) => {
        if (token !== state.joinToken) return;
        if (status === "SUBSCRIBED") {
          notifyStatus("live", state.presenceCount, "Realtime live");
          if (typeof channel.track === "function") {
            try {
              await channel.track({
                visitorId: state.visitorId,
                roomId: event && event.id,
                roomTitle: event && event.title,
                mood: metadata.mood || "",
                onlineAt: new Date().toISOString(),
              });
            } catch (_) {}
          }
          notifyPresence();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          notifyStatus("local", state.presenceCount, status);
        } else {
          notifyStatus("connecting", state.presenceCount, status);
        }
      });

      return true;
    }

    async function sendReaction(reaction) {
      if (!VALID_REACTIONS.has(String(reaction))) return false;
      if (!state.channel || state.status !== "live" || typeof state.channel.send !== "function") return false;
      try {
        await state.channel.send({
          type: "broadcast",
          event: "room-reaction",
          payload: {
            reaction,
            visitorId: state.visitorId,
            roomId: state.event && state.event.id,
            sentAt: new Date().toISOString(),
          },
        });
        return true;
      } catch (_) {
        notifyStatus("local", state.presenceCount, "Send failed");
        return false;
      }
    }

    return {
      join,
      leave,
      sendReaction,
      getState() {
        return {
          eventId: state.event && state.event.id,
          presenceCount: state.presenceCount,
          status: state.status,
          topic: state.topic,
          visitorId: state.visitorId,
        };
      },
    };
  }

  return {
    createPreviewRoomRealtime,
    createRoomTopic,
    createSupabaseRoomClient,
    presenceCountFromState,
    reactionsAfterRemote,
    realtimeAccessState,
  };
});
