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
  const ROOM_MESSAGE_SOFT_BLOCK = "Message not posted. Keep this room social, event-related, and safe.";

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

  function eventLiveRoomFromEvent(event, fallbackDate) {
    const fallbackIso = isoDateForDay(fallbackDate);
    const sortDate = String(event && (event.sortDate || fallbackIso) || "");
    if (!event || !event.id || !sortDate) return null;
    const room = {
      id: `event:${event.id}`,
      eventId: String(event.id),
      topic: createLiveRoomTopic("event", event),
      title: String(event.title || "Untitled event"),
      venue: String(event.venue || "Venue TBA"),
      time: String(event.time || "Time TBA"),
      date: String(event.date || sortDate),
      sortDate,
      confidence: String(event.confidence || ""),
      status: String(event.status || "upcoming"),
    };
    room.closesAt = roomClosesAt(room);
    return room;
  }

  function todayEventRooms(events, today, now) {
    const todayIso = isoDateForDay(today);
    const nowTime = now === undefined ? NaN : (now instanceof Date ? now.getTime() : new Date(now).getTime());
    return (Array.isArray(events) ? events : [])
      .filter(event => {
        if (!event || !event.id || !event.sortDate) return false;
        const eventIso = String(event.sortDate).slice(0, 10);
        const isPastStatus = String(event.status || "").toLowerCase() === "past";
        if (eventIso === todayIso) {
          return !isPastStatus || (Number.isFinite(nowTime) && !roomIsClosed(event, now));
        }
        return Number.isFinite(nowTime) && eventIso < todayIso && !roomIsClosed(event, now);
      })
      .map(event => eventLiveRoomFromEvent(event, todayIso))
      .filter(Boolean);
  }

  function adminClosedEventRooms(events, today, now, options = {}) {
    const settings = typeof options === "boolean" ? { isAdmin: options } : (options || {});
    if (!settings.isAdmin) return [];
    const limit = Math.max(1, Math.min(100, Number(settings.limit) || 24));
    const todayIso = isoDateForDay(today);
    return (Array.isArray(events) ? events : [])
      .map(event => eventLiveRoomFromEvent(event, todayIso))
      .filter(room => room && roomIsClosed(room, now))
      .sort((a, b) => (
        String(b.sortDate || "").localeCompare(String(a.sortDate || ""))
        || String(a.title || "").localeCompare(String(b.title || ""))
      ))
      .slice(0, limit);
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

  function normalizeRoomMessageText(value, limit = 220) {
    return String(value || "")
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, limit);
  }

  function normalizeModerationText(value) {
    const normalized = String(value || "")
      .normalize("NFKC")
      .replace(/[\u0000-\u001f\u007f\u200b-\u200f\ufeff]/g, " ")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    return {
      compact: normalized.replace(/[\s._+\-*/\\|，。,.!！?？:：;；'"`~()[\]{}<>《》【】]+/g, ""),
      normalized,
    };
  }

  function textIncludesAny(text, terms) {
    return terms.some(term => text.includes(term));
  }

  function textMatchesAny(text, patterns) {
    return patterns.some(pattern => pattern.test(text));
  }

  function roomMessageModerationState(value) {
    const message = normalizeRoomMessageText(value, 500);
    if (!message) return { allowed: true, action: "allow", message: "" };
    const { compact, normalized } = normalizeModerationText(message);
    const unsafe = (
      textIncludesAny(compact, [
        "博彩", "下注", "网赌", "赌场", "贷款", "刷单", "返利", "稳赚", "保证收益", "币圈拉盘", "卖课", "医美",
        "色情服务", "裸聊", "援交", "先转押金", "保真票源", "内部票源", "批量票", "大量出票", "黄牛批量",
        "卖药", "找货", "k粉", "氯胺酮", "摇头丸", "冰毒", "麻古", "大麻", "送到场", "带刀", "带枪", "约架",
        "报复他", "报复她", "弄死", "打死", "人肉", "曝光住址", "曝光身份证", "未成年约", "自杀方法", "自残方法",
        "政治", "政党", "选举", "政府", "抗议", "示威", "游行", "政治口号", "政治动员", "政党宣传", "敏感事件", "示威游行",
      ]) ||
      textMatchesAny(normalized, [
        /\b(gambling|casino|sportsbook|loan shark|payday loan|guaranteed profit|pump and dump)\b/,
        /\b(fake tickets?|ticket scam|deposit first|wire first|phishing)\b/,
        /\b(sell|buy|need|deliver)\s+(weed|coke|cocaine|ketamine|mdma|lsd|pills?|molly)\b/,
        /\b(knife|gun|weapon)\s+(at|to|for)\s+(the\s+)?(door|club|venue|room)\b/,
        /\b(kill you|beat him|beat her|revenge)\b/,
        /\b(doxx|dox|home address|id card)\b/,
        /\b(politics?|political|election|campaign|government|protest|rally|political slogan|protest slogan)\b/,
        /\b(suicide method|self-harm method)\b/,
      ]) ||
      (
        textIncludesAny(compact, ["曝光", "人肉"]) &&
        textIncludesAny(compact, ["住址", "身份证", "手机号", "电话", "照片", "真实姓名"])
      )
    );
    return unsafe
      ? { allowed: false, action: "soft-block", message: ROOM_MESSAGE_SOFT_BLOCK }
      : { allowed: true, action: "allow", message: "" };
  }

  function roomMessageId(targetId, text, at, providedId) {
    const existing = normalizeRoomMessageText(providedId, 96);
    if (existing) return existing;
    return `room-message:${slugify(targetId)}:${slugify(at)}:${slugify(text).slice(0, 32)}`;
  }

  function roomMessagesAfterBroadcast(messages, payload, options = {}) {
    const targetId = String(payload && (payload.targetId || payload.eventId || payload.roomId) || "");
    const text = normalizeRoomMessageText(payload && (payload.text || payload.message || payload.content), options.maxLength || 220);
    const current = Array.isArray(messages) ? messages : [];
    const limit = options.limit || 24;
    const moderation = roomMessageModerationState(text);
    if (!moderation.allowed) return current.slice(0, limit).map(message => ({ ...message }));
    if (!targetId || !text) return current.slice(0, limit).map(message => ({ ...message }));
    const at = String(payload.sentAt || payload.at || options.now || new Date().toISOString());
    const nextItem = {
      id: roomMessageId(targetId, text, at, payload && payload.id),
      targetId,
      text,
      at,
      reports: Math.max(0, Number(payload && payload.reports) || 0),
    };
    return [nextItem, ...current.map(message => ({ ...message }))].slice(0, limit);
  }

  function roomMessagesAfterReport(messages, payload) {
    const targetId = String(payload && (payload.targetId || payload.eventId || payload.roomId) || "");
    const messageId = String(payload && (payload.messageId || payload.id) || "");
    return (Array.isArray(messages) ? messages : []).map(message => {
      const next = { ...message };
      if (targetId && messageId && String(message.targetId) === targetId && String(message.id) === messageId) {
        next.reports = Math.max(0, Number(next.reports) || 0) + 1;
      }
      return next;
    });
  }

  function shanghaiOffsetIso(date) {
    const shifted = new Date(date.getTime() + (8 * 60 * 60 * 1000));
    return `${shifted.toISOString().slice(0, 19)}+08:00`;
  }

  function roomClosesAt(room) {
    const sortDate = isoDateForDay(room && (room.sortDate || room.date));
    if (!sortDate) return "";
    const closeDate = new Date(`${sortDate}T06:00:00+08:00`);
    closeDate.setUTCDate(closeDate.getUTCDate() + 1);
    return shanghaiOffsetIso(closeDate);
  }

  function roomIsClosed(room, now = new Date()) {
    const closesAt = roomClosesAt(room);
    if (!closesAt) return String(room && room.status || "").toLowerCase() === "past";
    const closeTime = new Date(closesAt).getTime();
    const nowTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
    return Number.isFinite(closeTime) && Number.isFinite(nowTime) && nowTime >= closeTime;
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
    adminClosedEventRooms,
    createLiveRoomRealtime,
    createLiveRoomTopic,
    createSupabaseClient,
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
  };
});
