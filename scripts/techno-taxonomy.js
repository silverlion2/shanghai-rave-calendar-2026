const SOUND_TAXONOMY = [
  { id: "hard-techno", label: "Hard techno", zh: "硬核 Techno", cues: ["hard techno", "hardtechno", "hard groove", "hardgroove", "turbo", "cltx", "tham", "abyss", "lethal distortion"] },
  { id: "industrial", label: "Industrial", zh: "工业", cues: ["industrial", "ebm", "darkwave", "cold wave", "post-punk", "black metal", "machine"] },
  { id: "groovy", label: "Groovy", zh: "律动", cues: ["groovy", "groove", "rolling", "funk", "detroit", "machine funk", "tech house"] },
  { id: "hypnotic", label: "Hypnotic", zh: "催眠", cues: ["hypnotic", "deep techno", "dark hypnotic", "void", "vacuum", "deep room"] },
  { id: "minimal", label: "Minimal", zh: "Minimal", cues: ["minimal", "microhouse", "nu-disco", "downtempo"] },
  { id: "melodic", label: "Melodic", zh: "旋律", cues: ["melodic", "melodic techno", "audiovisual", "ben bohmer", "sunset"] },
  { id: "acid", label: "Acid", zh: "Acid", cues: ["acid", "acid techno", "303"] },
  { id: "trance-adjacent", label: "Trance-adjacent", zh: "Trance 边缘", cues: ["trance", "new trance", "hard trance", "eurodance"] },
  { id: "bass-hybrid", label: "Bass hybrid", zh: "Bass 混合", cues: ["bass", "ukg", "dubstep", "ghettotech", "club music", "breaks", "jungle", "garage", "baile funk"] },
  { id: "live-av", label: "Live / A/V", zh: "Live / 影像", cues: ["live", "a/v", "visual", "av ", "radio session", "hardware", "synth"] },
  { id: "warehouse", label: "Warehouse", zh: "仓库", cues: ["warehouse", "secret location", "pop-up", "multi-room", "industrial grid", "system"] },
  { id: "rooftop", label: "Rooftop / open-air", zh: "露台", cues: ["rooftop", "open-air", "open air", "bund", "garden", "pavillon", "sunset", "skyline"] },
];

const BROAD_VIBE_TO_SOUND = {
  hard: ["hard-techno"],
  warehouse: ["warehouse"],
  bass: ["bass-hybrid"],
  date: ["rooftop"],
  experimental: ["industrial", "live-av"],
};

function unique(values) {
  const seen = new Set();
  const result = [];
  for (const value of values || []) {
    const clean = String(value || "").trim();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    result.push(clean);
  }
  return result;
}

function array(value) {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
  if (!value) return [];
  return String(value).split(/[,/]/).map(item => item.trim()).filter(Boolean);
}

function textForEvent(event = {}) {
  const lineup = Array.isArray(event.lineup)
    ? event.lineup.map(item => {
      if (typeof item === "string") return item;
      return [item.name, item.artist, item.dj, item.note, item.role, item.genre, item.bio].filter(Boolean).join(" ");
    }).join(" ")
    : "";
  return [
    event.title,
    event.venue,
    event.district,
    event.genre,
    event.description,
    event.ticketStatus,
    event.sourceLabel,
    event.organizer,
    event.promoter,
    event.crew,
    array(event.vibe).join(" "),
    lineup,
  ].filter(Boolean).join(" ").toLowerCase();
}

function soundTagsForEvent(event = {}) {
  const text = textForEvent(event);
  const tags = [];
  for (const item of SOUND_TAXONOMY) {
    if (item.cues.some(cue => text.includes(cue))) tags.push(item.id);
  }
  for (const vibe of array(event.vibe)) {
    tags.push(...(BROAD_VIBE_TO_SOUND[vibe] || []));
  }
  if (/\btechno\b/.test(text) && !tags.includes("hard-techno")) tags.push("groovy");
  return unique(tags).slice(0, 8);
}

function technoFit(event = {}) {
  const text = textForEvent(event);
  let score = 0;
  if (/(hard techno|acid techno|industrial techno|warehouse rave|abyss|system|turbo|lethal distortion)/.test(text)) score += 3;
  else if (/\b(techno|acid|industrial|ebm|electro|trance|house|breaks?|jungle|ukg|garage|dubstep|ghettotech|hard dance)\b/.test(text)) score += 2;
  else if (/(club music|bass|experimental|ambient|a\/v|darkwave|minimal wave|cold wave|post-punk|minimal|nu-disco|baile funk)/.test(text)) score += 1;
  if (/\b(abyss|potent|exit|illum|heim|dirty house|reactor|fenrir|wigwam|specters)\b/.test(text)) score += 1;
  if (/(pool party|afrowave|afrobeats|amapiano|90s disco|rooftop lounge|soul|funk|jazz)/.test(text)) score -= 1;
  if (/(lower techno fit|more listening-session than rave|not a rave|not techno)/.test(text)) score -= 1;
  return Math.max(0, Math.min(4, score));
}

function truthyField(event, field) {
  const value = event[field];
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function decisionProfileForEvent(event = {}) {
  const text = textForEvent(event);
  const soundTags = soundTagsForEvent(event);
  const fit = technoFit(event);
  const highSource = event.confidence === "High" || event.sourceStatus === "official";
  const watch = event.status === "watch" || event.confidence === "Watch" || event.sourceStatus === "watchlist";
  const late = /(?:2[2-3]|0[0-6]):\d{2}|late|afterhours|afterparty/i.test(String(event.time || event.description || ""));
  const ticketReady = truthyField(event, "ticketUrl") || /ticket|presale|door|sold out|free|rmb|mini-program/i.test(String(event.price || event.ticketStatus || ""));
  const hasLineup = Array.isArray(event.lineup) && event.lineup.length > 0;
  const hasPoster = truthyField(event, "posterUrl") || truthyField(event, "posterEvidence");
  const tags = [];

  if (fit >= 3) tags.push("strong techno fit");
  else if (fit === 2) tags.push("techno-adjacent");
  else tags.push("low techno fit");

  if (soundTags.includes("hard-techno") || soundTags.includes("industrial")) tags.push("high intensity");
  if (soundTags.includes("rooftop") || array(event.vibe).includes("date")) tags.push("date route");
  if (soundTags.includes("warehouse")) tags.push("warehouse signal");
  if (soundTags.includes("live-av")) tags.push("listening/live angle");
  if (late) tags.push("late room");
  if (ticketReady) tags.push("ticket path");
  if (highSource) tags.push("trusted source");
  if (hasLineup) tags.push("lineup visible");
  if (watch) tags.push("verify first");
  if (/single-source|needs official|needs venue|check source|check promoter|lineup unclear|tba/i.test(text)) tags.push("details need check");

  const intensity = soundTags.includes("hard-techno") || soundTags.includes("industrial")
    ? "hard"
    : soundTags.includes("rooftop") || array(event.vibe).includes("date")
      ? "soft"
      : soundTags.includes("bass-hybrid") || soundTags.includes("trance-adjacent")
        ? "high"
        : "medium";

  const credibility = highSource && fit >= 3
    ? "strong"
    : watch
      ? "unconfirmed"
      : fit >= 2
        ? "solid"
        : "loose";

  const riskFlags = unique([
    watch ? "watchlist" : "",
    !ticketReady ? "ticket unclear" : "",
    !hasLineup ? "lineup limited" : "",
    !truthyField(event, "address") && event.sourceStatus !== "official" ? "address/source check" : "",
  ]);

  return {
    soundTags,
    decisionTags: unique(tags).slice(0, 8),
    intensity,
    credibility,
    lateRoom: late,
    ticketReady,
    hasLineup,
    hasPoster,
    riskFlags,
  };
}

function enrichEvent(event = {}) {
  const profile = decisionProfileForEvent(event);
  return {
    ...event,
    soundTags: profile.soundTags,
    decisionTags: profile.decisionTags,
    decisionProfile: {
      intensity: profile.intensity,
      credibility: profile.credibility,
      lateRoom: profile.lateRoom,
      ticketReady: profile.ticketReady,
      hasLineup: profile.hasLineup,
      hasPoster: profile.hasPoster,
      riskFlags: profile.riskFlags,
    },
  };
}

function soundTagLabels(tags = []) {
  const byId = new Map(SOUND_TAXONOMY.map(item => [item.id, item]));
  return unique(tags).map(tag => byId.get(tag)?.label || tag);
}

module.exports = {
  SOUND_TAXONOMY,
  soundTagsForEvent,
  decisionProfileForEvent,
  enrichEvent,
  soundTagLabels,
  technoFit,
};
