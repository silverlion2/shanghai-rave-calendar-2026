(function attachRaveEverywhere(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.RAVE_EVERYWHERE = api;
  }
})(typeof window !== "undefined" ? window : globalThis, function createRaveEverywhere() {
  const moodPalettes = {
    hard: ["#080806", "#c6ff3b", "#ff3131", "#d8d8d2", "#24241f"],
    underground: ["#080806", "#41d7ff", "#f2f0e8", "#ff6a2a", "#1a1a16"],
    experimental: ["#080806", "#ff4f8b", "#41d7ff", "#f2f0e8", "#202018"],
    bass: ["#080806", "#ffd166", "#41d7ff", "#ff6a2a", "#171713"],
    warehouse: ["#080806", "#c6ff3b", "#a7a39a", "#ff6a2a", "#1f1f19"],
    date: ["#080806", "#ffd166", "#ff4f8b", "#f2f0e8", "#171713"],
    electronic: ["#080806", "#c6ff3b", "#41d7ff", "#ff6a2a", "#f2f0e8"],
  };

  const locationBlueprints = [
    {
      name: "Signal Stairwell",
      district: "Huangpu",
      scene: "low-ceiling concrete transit echo",
      address: "Fictional Huangpu waypoint, no real door address",
    },
    {
      name: "Freight Lift Room",
      district: "Changning",
      scene: "service-corridor pressure and sheet-metal reflections",
      address: "Fictional Changning freight node, no real door address",
    },
    {
      name: "Rooftop Relay",
      district: "Jing'an",
      scene: "open-air skyline delay and warm concrete",
      address: "Fictional Jing'an roof marker, no real door address",
    },
    {
      name: "Container Bay",
      district: "Pudong",
      scene: "industrial grid, sodium light, long reverb",
      address: "Fictional Pudong container marker, no real door address",
    },
    {
      name: "Canal Substation",
      district: "Suzhou Creek",
      scene: "waterline haze, cable hum, narrow-room bass",
      address: "Fictional creek-side substation, no real door address",
    },
  ];

  const titleWords = {
    hard: ["Pressure", "Overdrive", "Redline", "Threshold"],
    underground: ["Below Grade", "Signal Room", "Sublevel", "No Front"],
    experimental: ["Fault Bloom", "Sideband", "Machine Drift", "Soft Error"],
    bass: ["Sub Relay", "Low Orbit", "Pressure Map", "Heavy Current"],
    warehouse: ["Grid Shift", "Bay Sequence", "Concrete Loop", "Afterframe"],
    date: ["Late Glow", "Gold Hour", "Soft Voltage", "Night Signal"],
    electronic: ["Open Circuit", "Night Router", "Everywhere Node", "Signal Fold"],
  };

  const sourceStatusRank = {
    official: 5,
    "artist-profile": 4,
    secondary: 3,
    "venue-context": 2,
    watchlist: 1,
  };

  function hashString(value) {
    let hash = 2166136261;
    const input = String(value || "");
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededRandom(seed) {
    let state = hashString(seed) || 1;
    return function nextRandom() {
      state += 0x6D2B79F5;
      let result = state;
      result = Math.imul(result ^ result >>> 15, result | 1);
      result ^= result + Math.imul(result ^ result >>> 7, result | 61);
      return ((result ^ result >>> 14) >>> 0) / 4294967296;
    };
  }

  function pick(list, random) {
    const rows = Array.isArray(list) ? list.filter(Boolean) : [];
    if (!rows.length) return null;
    return rows[Math.floor(random() * rows.length) % rows.length];
  }

  function unique(list) {
    const seen = new Set();
    return (Array.isArray(list) ? list : [])
      .map(item => String(item || "").trim())
      .filter(item => {
        const key = item.toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function slugify(value) {
    return String(value || "dj")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "dj";
  }

  function splitGenres(value) {
    if (Array.isArray(value)) return unique(value);
    return unique(String(value || "")
      .split(/[,;/|]+/)
      .map(item => item.trim()));
  }

  function familyFromText(value) {
    const text = String(value || "").toLowerCase();
    if (/\b(hard|hardcore|industrial|fast|trance|warehouse)\b/.test(text)) return "hard";
    if (/\b(bass|club|gqom|amapiano|breaks|juke|jersey)\b/.test(text)) return "bass";
    if (/\b(experimental|ambient|idm|live|electro|machine|noise|leftfield)\b/.test(text)) return "experimental";
    if (/\b(house|melodic|rooftop|disco|date|sunset)\b/.test(text)) return "date";
    if (/\b(warehouse|industrial|secret|sublevel|concrete)\b/.test(text)) return "warehouse";
    if (/\b(underground|techno|rave)\b/.test(text)) return "underground";
    return "electronic";
  }

  function dominantFamily(profiles) {
    const counts = new Map();
    (profiles || []).forEach(profile => {
      const families = unique([]
        .concat(profile.soundFamilies || [])
        .concat((profile.genres || []).map(familyFromText))
        .concat(familyFromText(profile.name)));
      families.forEach(family => counts.set(family, (counts.get(family) || 0) + 1));
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "electronic";
  }

  function lineupItemName(item) {
    if (typeof item === "string") return item;
    return item && (item.name || item.dj || item.artist) || "";
  }

  function normalizeProfile(profile) {
    const name = String(profile && (profile.name || profile.artist || profile.slug) || "DJ").trim();
    const genres = unique([]
      .concat(splitGenres(profile && profile.genre))
      .concat(splitGenres(profile && profile.genres))
      .concat(splitGenres(profile && profile.sound))
      .concat(splitGenres(profile && profile.soundFamilies)));
    const soundFamilies = unique([]
      .concat(profile && profile.soundFamilies || [])
      .concat(genres.map(familyFromText)));
    return {
      ...profile,
      name,
      slug: profile && profile.slug || slugify(name),
      genres: genres.length ? genres : ["electronic"],
      soundFamilies: soundFamilies.length ? soundFamilies : ["electronic"],
      sourceStatus: profile && (profile.sourceStatus || profile.status) || "source",
    };
  }

  function addProfile(profileMap, rawProfile, appearance) {
    const normalized = normalizeProfile(rawProfile);
    const key = normalized.slug;
    const existing = profileMap.get(key) || {
      slug: normalized.slug,
      name: normalized.name,
      genres: [],
      soundFamilies: [],
      appearances: [],
      sources: [],
      sourceStatus: normalized.sourceStatus,
      appearanceCount: 0,
    };
    existing.name = existing.name || normalized.name;
    existing.genres = unique(existing.genres.concat(normalized.genres));
    existing.soundFamilies = unique(existing.soundFamilies.concat(normalized.soundFamilies));
    existing.sourceStatus = sourceStatusRank[normalized.sourceStatus] > sourceStatusRank[existing.sourceStatus]
      ? normalized.sourceStatus
      : existing.sourceStatus;
    if (Array.isArray(normalized.sources)) existing.sources = existing.sources.concat(normalized.sources);
    if (appearance) {
      existing.appearances.push(appearance);
      existing.appearanceCount = existing.appearances.length;
    }
    profileMap.set(key, existing);
  }

  function profileSeedsFromSourceData(sourceData = {}, trackedProfiles = {}) {
    const profileMap = new Map();
    const events = Array.isArray(sourceData.events) ? sourceData.events : [];
    const lineups = sourceData.lineups && typeof sourceData.lineups === "object" ? sourceData.lineups : {};

    events.forEach(event => {
      const lineupRows = []
        .concat(Array.isArray(event.lineup) ? event.lineup : [])
        .concat(Array.isArray(lineups[event.id]) ? lineups[event.id] : []);
      unique(lineupRows.map(lineupItemName)).forEach(name => {
        addProfile(profileMap, {
          name,
          genres: splitGenres(event.genre),
          soundFamilies: Array.isArray(event.vibe) ? event.vibe : [],
          sourceStatus: event.sourceStatus || event.confidence,
        }, {
          eventId: event.id,
          title: event.title,
          date: event.sortDate || event.date,
          venue: event.venue,
          district: event.district,
          source: event.source,
          sourceLabel: event.sourceLabel,
        });
      });
    });

    Object.values(trackedProfiles || {}).forEach(profile => {
      addProfile(profileMap, {
        ...profile,
        sourceStatus: profile.sources?.some(source => source.status === "official") ? "official" : profile.sources?.[0]?.status,
      }, null);
    });

    return Array.from(profileMap.values())
      .map(profile => ({
        ...profile,
        sources: unique(profile.sources.map(source => source && source.url)).map(url => profile.sources.find(source => source && source.url === url)),
      }))
      .sort((a, b) => {
        const rankDelta = (sourceStatusRank[b.sourceStatus] || 0) - (sourceStatusRank[a.sourceStatus] || 0);
        if (rankDelta) return rankDelta;
        return (b.appearanceCount || 0) - (a.appearanceCount || 0) || a.name.localeCompare(b.name);
      });
  }

  function lineupNamesForEvent(event) {
    return []
      .concat(Array.isArray(event && event.lineup) ? event.lineup : [])
      .map(lineupItemName)
      .map(name => name.toLowerCase());
  }

  function eventHintsFor(sourceEvents, profiles) {
    const selectedNames = new Set((profiles || []).map(profile => profile.name.toLowerCase()));
    const events = Array.isArray(sourceEvents) ? sourceEvents : [];
    const direct = events.filter(event => lineupNamesForEvent(event).some(name => selectedNames.has(name)));
    return direct.length ? direct : events;
  }

  function nextVirtualDate(nowValue, random) {
    const base = nowValue ? new Date(nowValue) : new Date();
    if (Number.isNaN(base.getTime())) base.setTime(Date.now());
    const targetDay = random() > 0.42 ? 6 : 5;
    let days = (targetDay - base.getDay() + 7) % 7;
    if (days === 0 && base.getHours() >= 18) days = 7;
    days += Math.floor(random() * 3) * 7;
    const date = new Date(base);
    date.setDate(base.getDate() + days);
    date.setHours(random() > 0.55 ? 23 : 22, random() > 0.7 ? 30 : 0, 0, 0);
    return date;
  }

  function formatDateLabel(date) {
    try {
      return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(date);
    } catch (_) {
      return date.toISOString().slice(0, 10);
    }
  }

  function genreSummary(profiles) {
    const genres = unique((profiles || []).flatMap(profile => profile.genres || []));
    return genres.slice(0, 4).join(", ") || "electronic";
  }

  function chooseLocation(profiles, sourceEvents, random) {
    const hints = eventHintsFor(sourceEvents, profiles);
    const hint = pick(hints, random) || {};
    const blueprint = pick(locationBlueprints, random) || locationBlueprints[0];
    const district = hint.district || blueprint.district;
    const code = `${String(district || "SH").slice(0, 2).toUpperCase()}-${Math.floor(100 + random() * 899)}`;
    return {
      name: `${blueprint.name} ${code}`,
      district,
      scene: blueprint.scene,
      address: blueprint.address.replace(blueprint.district, district),
      access: "Virtual beta location. Use it as a concept pin, not as a real venue or meet-up instruction.",
      inspiredBy: hint.venue ? `${hint.venue} source context` : "calendar source context",
    };
  }

  function generateVirtualEvent(options = {}) {
    const selected = (Array.isArray(options.selectedDjs) ? options.selectedDjs : [])
      .map(normalizeProfile)
      .filter(profile => profile.name);
    const fallback = selected.length ? [] : [normalizeProfile({ name: "Basement Dispatch Residents", genres: ["techno", "electronic"] })];
    const lineup = selected.concat(fallback).slice(0, 6);
    const seed = options.seed || lineup.map(profile => profile.name).join("|") || "rave-everywhere";
    const random = seededRandom(`${seed}|${lineup.map(profile => profile.slug).join("|")}`);
    const family = dominantFamily(lineup);
    const titleWord = pick(titleWords[family] || titleWords.electronic, random);
    const location = chooseLocation(lineup, options.sourceEvents, random);
    const date = nextVirtualDate(options.now, random);
    const startHour = date.getHours();
    const endHour = startHour >= 23 ? "05:00" : "04:00";
    const palette = moodPalettes[family] || moodPalettes.electronic;
    const eventTitle = `Rave Everywhere: ${titleWord}`;
    const id = `rave-everywhere-${slugify(titleWord)}-${hashString(`${seed}|${location.name}`).toString(16).slice(0, 6)}`;

    return {
      id,
      kind: "virtual",
      beta: true,
      sourceStatus: "virtual",
      confidence: "Beta",
      status: "virtual",
      title: eventTitle,
      date: formatDateLabel(date),
      sortDate: date.toISOString().slice(0, 10),
      time: `${String(startHour).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}-${endHour}`,
      venue: location.name,
      district: location.district,
      location,
      lineup: lineup.map((profile, index) => ({
        name: profile.name,
        slug: profile.slug,
        genres: profile.genres,
        note: index === 0 ? "Lead signal from your selected DJ set." : "Paired from your collected DJ list.",
      })),
      genre: genreSummary(lineup),
      vibe: unique([family].concat(lineup.flatMap(profile => profile.soundFamilies || []))).slice(0, 5),
      poster: {
        headline: eventTitle.toUpperCase(),
        subhead: `${location.district} / ${genreSummary(lineup)}`,
        palette,
        motif: pick(["signal grid", "photocopied stamp", "frequency bars", "route fragments", "poster tear"], random),
        code: id.toUpperCase(),
        seed: hashString(`${seed}|poster|${eventTitle}`).toString(16).toUpperCase(),
      },
      sourceLabel: "Rave Everywhere beta generator",
      source: "rave-everywhere.html",
      disclaimer: "Virtual event, not a verified listing. Confirm real venues, tickets, permissions, and safety before going anywhere.",
    };
  }

  function eventCopy(event) {
    const lineup = (event.lineup || []).map(item => item.name).join(" / ");
    return [
      event.title,
      `${event.date} ${event.time}`,
      `${event.location?.name || event.venue}, ${event.location?.district || event.district}`,
      lineup ? `Lineup: ${lineup}` : "",
      event.disclaimer,
    ].filter(Boolean).join("\n");
  }

  return {
    eventCopy,
    generateVirtualEvent,
    hashString,
    profileSeedsFromSourceData,
    seededRandom,
    slugify,
  };
});
