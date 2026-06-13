(function attachLiveRoomRealtime(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.LIVE_ROOM_REALTIME = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function liveRoomRealtimeFactory() {
  const VALID_PULSES = new Set(["bass", "sweat", "care", "freedom", "afterglow"]);
  const DEFAULT_BROADCAST_EVENTS = [
    "love-wall-signal",
    "love-wall-reaction",
    "event-room-signal",
    "event-room-reaction",
  ];
  const EVENT_ROOM_SIGNALS = [
    { key: "inside", label: "Inside" },
    { key: "heat", label: "Heat" },
    { key: "queue", label: "Queue" },
    { key: "set-now", label: "Set now" },
    { key: "water", label: "Water" },
    { key: "leaving", label: "Leaving" },
    { key: "after", label: "After?" },
  ];

  function slugify(value) {
    const slug = String(value || "main")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");
    return slug || "main";
  }

  function createLiveRoomTopic(scope, subject) {
    return `live-room:${slugify(scope)}:${slugify(subject && (subject.id || subject.title) || subject)}`;
  }

  function isoDateForDay(day) {
    if (typeof day === "string") return day.slice(0, 10);
    if (day instanceof Date && !Number.isNaN(day.getTime())) {
      const year = day.getFullYear();
      const month = String(day.getMonth() + 1).padStart(2, "0");
      const date = String(day.getDate()).padStart(2, "0");
      return `${year}-${month}-${date}`;
    }
    return "";
  }

  function todayEventRooms(events, today) {
    const todayIso = isoDateForDay(today);
    return (Array.isArray(events) ? events : [])
      .filter(event => {
        if (!event || !event.id || !event.sortDate) return false;
        if (String(event.status || "").toLowerCase() === "past") return false;
        return String(event.sortDate).slice(0, 10) === todayIso;
      })
      .map(event => ({
        id: `event:${event.id}`,
        eventId: String(event.id),
        topic: createLiveRoomTopic("event", event),
        title: String(event.title || "Untitled event"),
        venue: String(event.venue || "Venue TBA"),
        time: String(event.time || "Time TBA"),
        date: String(event.date || event.sortDate || todayIso),
        confidence: String(event.confidence || ""),
        status: String(event.status || "upcoming"),
      }));
  }

  function presenceCountFromState(state) {
    return Object.values(state || {}).reduce((total, presences) => (
      total + (Array.isArray(presences) ? presences.length : 0)
    ), 0);
  }

  function reactionCountsAfterBroadcast(current, payload, allowedReactions) {
    const targetId = String(payload && (payload.targetId || payload.noteId || payload.eventId || payload.roomId) || "");
    const reaction = String(payload && (payload.reaction || payload.emoji || payload.kind) || "");
    const allowed = Array.isArray(allowedReactions) && allowedReactions.length
      ? new Set(allowedReactions.map(String))
      : null;
    const next = Object.fromEntries(Object.entries(current || {}).map(([id, counts]) => [id, { ...(counts || {}) }]));
    if (!targetId || !reaction || (allowed && !allowed.has(reaction))) return next;
    if (!next[targetId]) next[targetId] = {};
    next[targetId][reaction] = Number(next[targetId][reaction] || 0) + 1;
    return next;
  }

  function eventRoomSignalOptions() {
    return EVENT_ROOM_SIGNALS.map(option => ({ ...option }));
  }

  function signalOptionFor(action, options = EVENT_ROOM_SIGNALS) {
    const normalized = String(action || "");
    return (Array.isArray(options) ? options : []).find(option => String(option.key) === normalized) || null;
  }

  function roomFeedAfterSignal(feed, payload, allowedSignals = EVENT_ROOM_SIGNALS, options = {}) {
    const action = String(payload && (payload.action || payload.reaction || payload.kind) || "");
    const targetId = String(payload && (payload.targetId || payload.eventId || payload.roomId) || "");
    const signal = signalOptionFor(action, allowedSignals);
    if (!signal || !targetId) return Array.isArray(feed) ? feed.slice(0, options.limit || 6) : [];
    const at = String(payload.sentAt || payload.at || options.now || new Date().toISOString());
    const nextItem = {
      id: `${targetId}:${action}:${at}`,
      action,
      at,
      label: signal.label,
      targetId,
    };
    return [nextItem, ...(Array.isArray(feed) ? feed : [])].slice(0, options.limit || 6);
  }

  function roomShareUrl(baseUrl, eventId) {
    const hash = `#live-room=${encodeURIComponent(String(eventId || ""))}`;
    if (!baseUrl) return hash;
    return `${String(baseUrl).replace(/#.*$/, "")}${hash}`;
  }

  function loveWallSignalForNote(note) {
    const pulse = VALID_PULSES.has(String(note && note.pulse)) ? String(note.pulse) : "bass";
    return {
      type: "love-wall-note",
      pulse,
      sentAt: new Date().toISOString(),
    };
  }

  function liveRoomAccessState({ config, supabaseGlobal, client } = {}) {
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

  function createSupabaseClient({ config, supabaseGlobal } = {}) {
    const access = liveRoomAccessState({ config, supabaseGlobal });
    if (!access.canConnect) return null;
    return supabaseGlobal.createClient(String(config.url).replace(/\/+$/, ""), config.anonKey);
  }

  function randomVisitorId() {
    const cryptoApi = typeof crypto !== "undefined" ? crypto : null;
    if (cryptoApi && typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();
    return `visitor-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function storedVisitorId(storage) {
    const key = "rave-live-room-visitor-v1";
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

  function createLiveRoomRealtime(options = {}) {
    const win = options.window || (typeof window !== "undefined" ? window : null);
    const config = options.config || (win && win.LOVE_WALL_SUPABASE);
    const supabaseGlobal = options.supabaseGlobal || (win && win.supabase);
    const storage = options.storage || (win && win.localStorage);
    const broadcastEvents = Array.isArray(options.broadcastEvents) && options.broadcastEvents.length
      ? options.broadcastEvents
      : DEFAULT_BROADCAST_EVENTS;
    const state = {
      channel: null,
      client: options.client || createSupabaseClient({ config, supabaseGlobal }),
      joinToken: 0,
      presenceCount: 0,
      status: "local",
      subject: null,
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
      state.presenceCount = 0;
      state.subject = null;
      state.topic = "";
      if (previous && state.client && typeof state.client.removeChannel === "function") {
        try {
          await state.client.removeChannel(previous);
        } catch (_) {}
      }
    }

    async function join(scope, subject, metadata = {}) {
      await leave();
      state.subject = subject || null;
      state.topic = createLiveRoomTopic(scope, subject);
      const access = liveRoomAccessState({ client: state.client, config, supabaseGlobal });
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

      broadcastEvents.forEach(eventName => {
        channel.on("broadcast", { event: eventName }, message => {
          if (token !== state.joinToken) return;
          const payload = broadcastPayload(message) || {};
          if (typeof options.onBroadcast === "function") {
            options.onBroadcast(eventName, payload);
          }
        });
      });

      channel.on("presence", { event: "sync" }, () => {
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
                scope,
                roomId: subject && (subject.id || subject.eventId),
                roomTitle: subject && subject.title,
                page: metadata.page || "",
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

    async function send(eventName, payload = {}) {
      if (!state.channel || state.status !== "live" || typeof state.channel.send !== "function") return false;
      try {
        await state.channel.send({
          type: "broadcast",
          event: eventName,
          payload: {
            ...payload,
            visitorId: state.visitorId,
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
      getState() {
        return {
          presenceCount: state.presenceCount,
          status: state.status,
          subject: state.subject,
          topic: state.topic,
          visitorId: state.visitorId,
        };
      },
      join,
      leave,
      send,
    };
  }

  return {
    createLiveRoomRealtime,
    createLiveRoomTopic,
    createSupabaseClient,
    eventRoomSignalOptions,
    liveRoomAccessState,
    loveWallSignalForNote,
    presenceCountFromState,
    reactionCountsAfterBroadcast,
    roomFeedAfterSignal,
    roomShareUrl,
    todayEventRooms,
  };
});
