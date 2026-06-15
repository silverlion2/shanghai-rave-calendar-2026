(function initRaveAccountSystem(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.RaveAccountSystem = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function accountSystemFactory() {
  const STORAGE_PREFERENCES = "rave-account-preferences-v1";
  const STORAGE_SAVED_EVENTS = "rave-account-saved-events-v1";
  const DEFAULT_ACCOUNT_AUTH_REDIRECT_URL = "https://raveindexsh.top/account.html";
  const supportedVibes = ["hard-techno", "industrial", "groovy", "hypnotic", "minimal", "melodic", "acid", "trance-adjacent", "bass-hybrid", "live-av", "warehouse", "rooftop", "hard", "underground", "date", "experimental", "bass"];
  const supportedBudgets = ["any", "free", "low"];
  const supportedTimings = ["any", "early", "late"];
  const supportedDiscoveryModes = ["balanced", "trusted", "open"];
  const accountFeatures = [
    {
      id: "auth-profile",
      title: "Account login",
      status: "live",
      storage: "Supabase Auth + profiles",
      hook: "One identity for saved events and preferences.",
      payoff: "Come back without rebuilding your setup.",
      description: "Email/password and magic-link identity with a display name tied to the existing profile row.",
    },
    {
      id: "preference-sync",
      title: "Saved preferences",
      status: "live",
      storage: "user_event_preferences",
      hook: "Your account remembers hard, bass, date, warehouse, and the rooms you trust.",
      payoff: "No more rebuilding filters every weekend.",
      description: "Favorite sounds, rooms, source mode, timing, and budget rules follow the signed-in account.",
    },
    {
      id: "saved-events",
      title: "Saved events",
      status: "live",
      storage: "saved_events",
      hook: "Keep the nights you want to revisit.",
      payoff: "Your shortlist moves with your account.",
      description: "Shortlist event IDs across devices without treating saves as attendance records.",
    },
    {
      id: "for-you-ranking",
      title: "For You ranking",
      status: "live",
      storage: "local events + account preferences",
      hook: "Your homepage starts with better matches.",
      payoff: "The homepage starts with your strongest matches.",
      description: "The homepage For You panel ranks upcoming events against the signed-in preference profile.",
    },
    {
      id: "itinerary-sync",
      title: "Saved routes",
      status: "next",
      storage: "future account_itinerary_slots",
      hook: "Save the night route before the door time panic.",
      payoff: "Turn set times into an account-owned route.",
      description: "Move selected set-time routes from browser-only storage into an account-owned itinerary table.",
    },
    {
      id: "love-wall-identity",
      title: "Public display name",
      status: "next",
      storage: "love_wall_posts + profiles",
      hook: "Keep a stable name when you leave notes on the wall.",
      payoff: "Show up as yourself without losing moderation.",
      description: "Let signed-in users post under a stable display name while keeping moderation in place.",
    },
    {
      id: "source-alerts",
      title: "Event alerts",
      status: "next",
      storage: "future user_alert_rules",
      hook: "Watch venues, refined sounds, and saved nights without doom-scrolling.",
      payoff: "Get alerts when tickets, sources, or details move.",
      description: "Notify users when watched venues, sound tags, saved events, or newsletter topics get ticket/source changes.",
    },
    {
      id: "privacy-export",
      title: "Data export",
      status: "live",
      storage: "browser export + Supabase-owned rows",
      hook: "Your preferences should never feel trapped.",
      payoff: "Export the account map as JSON whenever needed.",
      description: "Export local account preferences and saved event IDs as a portable JSON file.",
    },
    {
      id: "moderation-role",
      title: "Trusted contributor",
      status: "admin",
      storage: "profiles.role",
      hook: "Trusted accounts can graduate from listener to source operator.",
      payoff: "Role-gated review and contribution workflows.",
      description: "Reuse profile roles for Love Wall review and future trusted-source contribution workflows.",
    },
  ];

  const publicGuideBase = {
    eyebrow: "Account",
    title: "Save your picks",
    description: "Save events, rooms, sound preferences, and exportable account data so the next visit starts with better matches.",
    benefits: [
      "Save sounds, rooms, and source mode once",
      "Carry your shortlist across devices",
      "Open the calendar with your strongest matches first",
    ],
    href: "account.html",
    cta: "Create account",
    secondaryHref: "subscribe.html",
    secondaryCta: "Get alerts",
  };

  const publicGuideByContext = {
    calendar: {
      eyebrow: "Saved picks",
      title: "Save your picks",
      description: "Create an account so the event list starts with your sounds, rooms, budget, timing, and trusted-source mode.",
      benefits: [
        "Rank events by your saved profile",
        "Keep shortlist saves attached to your account",
        "Export your preference map any time",
      ],
    },
    wall: {
      eyebrow: "Event browsing upgrade",
      title: "Save events from this list",
      description: "Use an account while browsing events, then bring those saves back into the calendar and For You panel.",
      benefits: [
        "Keep poster finds from getting lost",
        "Move saved events into your For You queue",
        "Remember rooms that keep pulling you back",
      ],
    },
    archive: {
      eyebrow: "Archive memory",
      title: "Build your pattern",
      description: "Use account preferences to turn the archive into a memory layer for sounds, rooms, and recurring source habits.",
      benefits: [
        "Track the rooms you keep choosing",
        "Export saved-event context with your account",
        "Use old patterns to improve future recommendations",
      ],
    },
    planner: {
      eyebrow: "Planner upgrade",
      title: "Save future routes",
      description: "The planner is local today; your account connects route intent with saved events, rooms, and future route sync.",
      benefits: [
        "Keep saved nights and route intent together",
        "Prepare for account-owned itinerary slots",
        "Carry trusted timing preferences into the calendar",
      ],
    },
    love: {
      eyebrow: "Love Wall identity",
      title: "Choose a display name",
      description: "Claim an account before the wall grows public: one display name, moderation-ready identity, and portable account data.",
      benefits: [
        "Carry one display name across public notes",
        "Keep the wall ready for role-based moderation",
        "Export your account profile when needed",
      ],
    },
    everywhere: {
      eyebrow: "Travel preferences",
      title: "Keep your preferences",
      description: "When you jump between cities, the account keeps your sound profile and trusted-source habits from resetting.",
      benefits: [
        "Keep hard, bass, warehouse, and date-friendly defaults",
        "Compare travel ideas against your Shanghai preferences",
        "Bring saved nights back to one account map",
      ],
    },
    venues: {
      eyebrow: "Room memory",
      title: "Remember your rooms",
      description: "Use an account to turn venue browsing into a room memory system for saved places, preferred sounds, and future alerts.",
      benefits: [
        "Keep favorite rooms attached to your profile",
        "Tune event ranking around venues you trust",
        "Prepare for venue and source-change alerts",
      ],
    },
    djs: {
      eyebrow: "Artist preferences",
      title: "Follow the sound",
      description: "Use account preferences to connect artist discovery with the sounds and rooms that should surface first.",
      benefits: [
        "Keep sound preferences from DJ research",
        "Push matching events higher in For You",
        "Prepare for future source and lineup alerts",
      ],
    },
    ops: {
      eyebrow: "Operator layer",
      title: "Earn the operator pass",
      description: "Accounts let trusted contributors move from listener to source operator without exposing public tools to everyone.",
      benefits: [
        "Separate public browsing from review workflows",
        "Reuse profile roles for moderation",
        "Keep source work behind authenticated accounts",
      ],
    },
  };

  function normalizePreferences(input = {}) {
    const source = input && typeof input === "object" ? input : {};
    const displayName = String(source.displayName || "").trim().slice(0, 42);
    const vibes = uniqueValues(source.vibes).filter(value => supportedVibes.includes(value));
    const venues = uniqueValues(source.venues).map(value => value.slice(0, 48));
    const budget = supportedBudgets.includes(source.budget) ? source.budget : "any";
    const timing = supportedTimings.includes(source.timing) ? source.timing : "any";
    const discoveryMode = supportedDiscoveryModes.includes(source.discoveryMode) ? source.discoveryMode : "balanced";
    const hideWatchlist = source.hideWatchlist === true;
    const savedEventIds = uniqueValues(source.savedEventIds);

    return {
      displayName,
      vibes,
      venues,
      budget,
      timing,
      discoveryMode,
      hideWatchlist,
      savedEventIds,
    };
  }

  function uniqueValues(values) {
    const list = Array.isArray(values) ? values : [];
    const seen = new Set();
    const result = [];
    for (const value of list) {
      const clean = String(value || "").trim();
      if (!clean || seen.has(clean)) continue;
      seen.add(clean);
      result.push(clean);
    }
    return result;
  }

  const preferenceLabelMap = {
    "hard-techno": "hard techno",
    industrial: "industrial",
    groovy: "groovy",
    hypnotic: "hypnotic",
    minimal: "minimal",
    melodic: "melodic",
    acid: "acid",
    "trance-adjacent": "trance-adjacent",
    "bass-hybrid": "bass hybrid",
    "live-av": "live / A/V",
    rooftop: "rooftop",
  };

  function preferenceLabel(value) {
    return preferenceLabelMap[value] || String(value || "").replace(/-/g, " ");
  }

  function savedEventIdsAfterToggle(savedIds, eventId) {
    const current = uniqueValues(savedIds);
    const id = String(eventId || "").trim();
    if (!id) return current;
    return current.includes(id) ? current.filter(item => item !== id) : [...current, id];
  }

  function rankEvents(events, preferences, options = {}) {
    const prefs = normalizePreferences(preferences);
    const today = parseDate(options.today) || startOfDay(new Date());
    const limit = Number.isFinite(options.limit) ? Math.max(0, options.limit) : Infinity;
    const saved = new Set(prefs.savedEventIds);

    return (Array.isArray(events) ? events : [])
      .filter(event => event && event.id)
      .filter(event => !isPastEvent(event, today))
      .filter(event => !(prefs.hideWatchlist && isWatchEvent(event)))
      .map(event => scoreEvent(event, prefs, saved, today))
      .filter(item => Number.isFinite(item.score))
      .sort((first, second) => {
        if (second.score !== first.score) return second.score - first.score;
        return String(first.event.sortDate || "").localeCompare(String(second.event.sortDate || ""));
      })
      .slice(0, limit);
  }

  function scoreEvent(event, prefs, saved, today) {
    let score = 0;
    const reasons = [];
    const eventVibes = Array.isArray(event.vibe) ? event.vibe.map(String) : [];
    const eventSoundTags = Array.isArray(event.soundTags) ? event.soundTags.map(String) : [];
    const normalizedVenue = normalizeToken(event.venue);
    const normalizedOrganizer = normalizeToken(event.organizer || event.promoter || event.crew);
    const date = parseDate(event.sortDate);

    if (saved.has(String(event.id))) {
      score += 28;
      reasons.push("saved");
    }

    for (const vibe of prefs.vibes) {
      if (eventVibes.includes(vibe) || eventSoundTags.includes(vibe) || normalizeToken(event.genre).includes(normalizeToken(vibe))) {
        score += 18;
        reasons.push(`sound match: ${vibe}`);
      }
    }

    for (const venue of prefs.venues) {
      const token = normalizeToken(venue);
      if (token && (normalizedVenue.includes(token) || normalizedOrganizer.includes(token))) {
        score += 16;
        reasons.push(`room match: ${venue}`);
      }
    }

    if (prefs.budget !== "any") {
      const price = priceSignal(event.price);
      if (prefs.budget === "free" && price === "free") {
        score += 10;
        reasons.push("free entry");
      } else if (prefs.budget === "low" && (price === "free" || price === "low")) {
        score += 8;
        reasons.push("budget fit");
      } else if (price === "unknown") {
        score -= 2;
      } else {
        score -= 8;
      }
    }

    if (prefs.timing !== "any" && timingMatches(event.time, prefs.timing)) {
      score += 8;
      reasons.push(prefs.timing === "late" ? "late slot" : "early slot");
    }

    const sourceStatus = String(event.sourceStatus || "").toLowerCase();
    if (prefs.discoveryMode === "trusted") {
      if (sourceStatus === "official" || event.confidence === "High") {
        score += 10;
        reasons.push("trusted source");
      }
      if (isWatchEvent(event)) score -= 24;
    } else if (prefs.discoveryMode === "open" && isWatchEvent(event)) {
      score += 6;
      reasons.push("watchlist lead");
    }

    if (event.confidence === "High") score += 7;
    if (event.status === "upcoming") score += 5;
    if (event.posterUrl || event.posterEvidence) score += 4;
    if (date) {
      const daysAway = Math.max(0, Math.round((date.getTime() - today.getTime()) / 86400000));
      score += Math.max(0, 10 - Math.min(daysAway, 30) * 0.25);
    }

    if (!reasons.length) reasons.push("near-term listing");
    return {
      event,
      score: Math.round(score * 10) / 10,
      reasons: reasons.slice(0, 5),
    };
  }

  function personalizedSummary(preferences) {
    const prefs = normalizePreferences(preferences);
    const title = prefs.displayName ? `${prefs.displayName}'s picks` : "Saved picks";
    const sound = prefs.vibes.length ? prefs.vibes.join(" / ") : "all sounds";
    const rooms = prefs.venues.length ? prefs.venues.join(" / ") : "all rooms";
    const timing = prefs.timing === "any" ? "any set time" : `${prefs.timing} starts`;
    return {
      title,
      savedCount: prefs.savedEventIds.length,
      description: `Set for ${sound}, ${rooms}, ${timing}.`,
    };
  }

  function accountAccessState({ loading = false, hasSupabase = false, session = null } = {}) {
    if (loading) {
      return {
        mode: "loading",
        label: "Checking account",
        action: "loading",
      };
    }
    if (!hasSupabase) {
      return {
        mode: "unavailable",
        label: "Supabase required",
        action: "configure",
      };
    }
    if (!session || !session.user) {
      return {
        mode: "gated",
        label: "Sign in required",
        action: "authenticate",
      };
    }
    return {
      mode: "dashboard",
      label: "Account connected",
      action: "manage",
    };
  }

  function adminAccessState({ loading = false, hasSupabase = false, session = null, role = "" } = {}) {
    if (loading) {
      return {
        mode: "loading",
        label: "Checking admin",
        action: "loading",
      };
    }
    if (!hasSupabase) {
      return {
        mode: "unavailable",
        label: "Supabase required",
        action: "configure",
      };
    }
    if (!session || !session.user) {
      return {
        mode: "gated",
        label: "Admin sign in required",
        action: "authenticate",
      };
    }
    if (String(role || "").toLowerCase() !== "admin") {
      return {
        mode: "denied",
        label: "Admin role required",
        action: "sign-out",
      };
    }
    return {
      mode: "unlocked",
      label: "Admin verified",
      action: "enter",
    };
  }

  function accountAuthFeedback(action = "", outcome = "ready", context = {}) {
    const email = String(context.email || "").trim();
    const address = email || "your email";
    if (outcome === "pending") {
      if (action === "sign-up") {
        return {
          tone: "info",
          title: "Creating account",
          body: `Sending ${address} to Supabase Auth. The next screen will say whether you can enter now or need to confirm email first.`,
          steps: ["Keep this tab open", "Do not click Create account again while this is running"],
        };
      }
      if (action === "sign-in") {
        return {
          tone: "info",
          title: "Signing in",
          body: `Checking the password for ${address}.`,
          steps: ["If this fails, use Email link or confirm the account first"],
        };
      }
      if (action === "magic-link") {
        return {
          tone: "info",
          title: "Sending email link",
          body: `Sending a one-time login link to ${address}.`,
          steps: ["Open the link from the same browser", "Return here after the email opens"],
        };
      }
    }
    if (outcome === "success") {
      if (action === "sign-up" && context.hasSession) {
        return {
          tone: "success",
          title: "Account created",
          body: "You are signed in now. Set preferences, then save them to the account.",
          steps: ["Pick sounds and rooms", "Save preferences", "Open the calendar with your For You panel"],
        };
      }
      if (action === "sign-up") {
        return {
          tone: "success",
          title: "Check your email",
          body: `Supabase accepted ${address}. The confirmation email may show Supabase as the sender and can land in Junk or Spam.`,
          steps: ["Check Inbox, Junk, and Spam", "Open the Supabase confirmation email", "Return here and use Sign in with the password you just set"],
        };
      }
      if (action === "sign-in") {
        return {
          tone: "success",
          title: "Signed in",
          body: "Your account is connected and preferences are syncing.",
          steps: ["Review saved preferences", "Open the calendar when ready"],
        };
      }
      if (action === "magic-link") {
        return {
          tone: "success",
          title: "Email link sent",
          body: `Check ${address} for the Supabase login link. It may show Supabase as the sender or land in Junk/Spam.`,
          steps: ["Check Inbox, Junk, and Spam", "Open the email link from this device", "Return here after the browser signs you in"],
        };
      }
    }
    if (outcome === "error") {
      return accountAuthErrorFeedback(action, context.error);
    }
    return {
      tone: "idle",
      title: "Create account or sign in",
      body: "New users set an 8+ character password with Create account. Returning users use Sign in, or Email link for passwordless login.",
      steps: ["Use the same email every time", "Confirm the email if Supabase asks", "Then save preferences to the account"],
    };
  }

  function accountAuthErrorFeedback(action = "", error = "") {
    const message = String(error || "Account action failed").trim();
    const lower = message.toLowerCase();
    if (lower.includes("already registered") || lower.includes("already exists") || lower.includes("user already")) {
      return {
        tone: "warning",
        title: "Account already exists",
        body: "That email is already registered. Use Sign in with the existing password, or Email link if you do not want to type the password.",
        steps: ["Leave the email in place", "Enter the existing password", "Click Sign in"],
      };
    }
    if (lower.includes("email not confirmed") || lower.includes("confirm")) {
      return {
        tone: "warning",
        title: "Confirm email first",
        body: "Supabase has the account, but the email still needs confirmation before password login works. Check Junk/Spam if the message is missing.",
        steps: ["Search Inbox, Junk, and Spam for Supabase", "Open the confirmation email", "Click Sign in after confirmation"],
      };
    }
    if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
      return {
        tone: "error",
        title: "Sign in did not match",
        body: "The email and password did not match a confirmed account.",
        steps: ["Check the email spelling", "Re-enter the password", "Use Email link if you are not sure about the password"],
      };
    }
    if (lower.includes("password")) {
      return {
        tone: "error",
        title: "Password needs attention",
        body: message,
        steps: ["Use at least 8 characters", "Try a password you have not used elsewhere"],
      };
    }
    if (lower.includes("email")) {
      return {
        tone: "error",
        title: "Email needs attention",
        body: message,
        steps: ["Use the full email address", "Then choose Create account, Sign in, or Email link"],
      };
    }
    return {
      tone: "error",
      title: action === "magic-link" ? "Email link failed" : "Account action failed",
      body: message,
      steps: ["Try again once", "If it repeats, check Supabase Auth settings"],
    };
  }

  function accountAuthRedirectUrl(win = typeof window !== "undefined" ? window : undefined) {
    const override = String(win?.RAVE_ACCOUNT_AUTH_REDIRECT_URL || "").trim();
    if (override) return override;
    const location = win?.location;
    if (!location) return DEFAULT_ACCOUNT_AUTH_REDIRECT_URL;
    const hostname = String(location.hostname || "").toLowerCase();
    const protocol = String(location.protocol || "").toLowerCase();
    const isLocal = protocol === "file:"
      || hostname === "localhost"
      || hostname === "127.0.0.1"
      || hostname === "::1"
      || hostname.endsWith(".local");
    if (isLocal) return DEFAULT_ACCOUNT_AUTH_REDIRECT_URL;
    try {
      return new URL("account.html", `${location.origin}/`).href;
    } catch (_error) {
      return DEFAULT_ACCOUNT_AUTH_REDIRECT_URL;
    }
  }

  function accountFeatureCatalog() {
    return accountFeatures.map(feature => ({ ...feature }));
  }

  function publicAccountGuide(context = "default") {
    const key = String(context || "default").toLowerCase();
    const guide = publicGuideByContext[key] || {};
    return {
      ...publicGuideBase,
      ...guide,
      benefits: Array.isArray(guide.benefits) ? [...guide.benefits] : [...publicGuideBase.benefits],
    };
  }

  function renderPublicAccountGuide(context) {
    const guide = publicAccountGuide(context);
    return `
      <div class="account-public-guide-card">
        <div class="account-public-guide-main">
          <span>${escapeHtml(guide.eyebrow)}</span>
          <h2>${escapeHtml(guide.title)}</h2>
          <p>${escapeHtml(guide.description)}</p>
        </div>
        <div class="account-public-guide-benefits" aria-label="Account benefits">
          ${guide.benefits.slice(0, 3).map(benefit => `<span>${escapeHtml(benefit)}</span>`).join("")}
        </div>
        <div class="account-public-guide-actions">
          <a class="account-public-guide-link" href="${escapeHtml(guide.href)}">${escapeHtml(guide.cta)}</a>
          <a class="account-public-guide-link secondary" href="${escapeHtml(guide.secondaryHref || "subscribe.html")}">${escapeHtml(guide.secondaryCta || "Get alerts")}</a>
        </div>
      </div>
    `;
  }

  function enhancePublicAccountGuides(win = typeof window !== "undefined" ? window : undefined) {
    const doc = win && win.document;
    if (!win || !doc) return;
    doc.querySelectorAll("[data-account-guide]").forEach(mount => {
      const context = mount.getAttribute("data-account-guide") || doc.body.dataset.accountGuide || "default";
      mount.classList.add("account-public-guide");
      mount.innerHTML = renderPublicAccountGuide(context);
    });
  }

  function isPastEvent(event, today) {
    const date = parseDate(event && event.sortDate);
    return Boolean(date && date < today && event.status === "past");
  }

  function isWatchEvent(event) {
    return event.status === "watch" || event.confidence === "Watch" || String(event.sourceStatus || "").toLowerCase() === "watchlist";
  }

  function timingMatches(value, timing) {
    const text = String(value || "").toLowerCase();
    if (!text) return false;
    if (timing === "late") {
      if (text.includes("late")) return true;
      const hour = firstHour(text);
      return hour !== null && (hour >= 22 || hour <= 5);
    }
    if (timing === "early") {
      const hour = firstHour(text);
      return hour !== null && hour >= 15 && hour < 22;
    }
    return false;
  }

  function firstHour(value) {
    const match = String(value || "").match(/\b([01]?\d|2[0-3])(?::\d{2})?\b/);
    return match ? Number(match[1]) : null;
  }

  function priceSignal(value) {
    const text = String(value || "").toLowerCase();
    if (!text || /\btba|unknown|check\b/.test(text)) return "unknown";
    if (/\bfree|no cover|0\s*rmb\b/.test(text)) return "free";
    const prices = Array.from(text.matchAll(/(\d{1,4})\s*(?:rmb|¥|cny)?/g), match => Number(match[1]))
      .filter(Number.isFinite);
    if (prices.length && Math.min(...prices) <= 100) return "low";
    return "paid";
  }

  function parseDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function normalizeToken(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[char]));
  }

  function loadLocalPreferences(win = typeof window !== "undefined" ? window : undefined) {
    if (!win || !win.localStorage) return normalizePreferences();
    try {
      const stored = JSON.parse(win.localStorage.getItem(STORAGE_PREFERENCES) || "{}");
      const savedEventIds = JSON.parse(win.localStorage.getItem(STORAGE_SAVED_EVENTS) || "[]");
      return normalizePreferences({ ...stored, savedEventIds });
    } catch (_) {
      return normalizePreferences();
    }
  }

  function saveLocalPreferences(preferences, win = typeof window !== "undefined" ? window : undefined) {
    const prefs = normalizePreferences(preferences);
    if (!win || !win.localStorage) return prefs;
    win.localStorage.setItem(STORAGE_PREFERENCES, JSON.stringify({
      displayName: prefs.displayName,
      vibes: prefs.vibes,
      venues: prefs.venues,
      budget: prefs.budget,
      timing: prefs.timing,
      discoveryMode: prefs.discoveryMode,
      hideWatchlist: prefs.hideWatchlist,
    }));
    win.localStorage.setItem(STORAGE_SAVED_EVENTS, JSON.stringify(prefs.savedEventIds));
    return prefs;
  }

  function supabaseConfig(win = typeof window !== "undefined" ? window : undefined) {
    const config = win && (win.ACCOUNT_SUPABASE || win.LOVE_WALL_SUPABASE) || {};
    return {
      enabled: config.enabled !== false,
      url: String(config.url || "").replace(/\/+$/, ""),
      anonKey: String(config.anonKey || ""),
    };
  }

  function hasSupabaseConfig(config) {
    return Boolean(
      config
      && config.enabled
      && /^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(config.url || "")
      && String(config.anonKey || "").length > 20
    );
  }

  function createSupabaseClient(win = typeof window !== "undefined" ? window : undefined) {
    const config = supabaseConfig(win);
    if (!win || !hasSupabaseConfig(config) || !win.supabase || typeof win.supabase.createClient !== "function") {
      return null;
    }
    return win.supabase.createClient(config.url, config.anonKey);
  }

  function mergePreferences(localPrefs, remotePrefs) {
    const local = normalizePreferences(localPrefs);
    const remote = normalizePreferences(remotePrefs);
    return normalizePreferences({
      ...local,
      ...remote,
      displayName: remote.displayName || local.displayName,
      vibes: remote.vibes.length ? remote.vibes : local.vibes,
      venues: remote.venues.length ? remote.venues : local.venues,
      savedEventIds: uniqueValues([...local.savedEventIds, ...remote.savedEventIds]),
    });
  }

  function remotePreferencesFromRows(preferenceRow, savedRows) {
    const row = preferenceRow || {};
    const savedEventIds = Array.isArray(savedRows)
      ? savedRows.map(item => item.event_id)
      : [];
    return normalizePreferences({
      displayName: row.display_name || "",
      vibes: row.preferred_vibes || [],
      venues: row.preferred_venues || [],
      budget: row.budget || "any",
      timing: row.timing || "any",
      discoveryMode: row.discovery_mode || "balanced",
      hideWatchlist: row.hide_watchlist === true,
      savedEventIds,
    });
  }

  function remotePreferenceRow(userId, preferences) {
    const prefs = normalizePreferences(preferences);
    return {
      user_id: userId,
      display_name: prefs.displayName || null,
      preferred_vibes: prefs.vibes,
      preferred_venues: prefs.venues,
      budget: prefs.budget,
      timing: prefs.timing,
      discovery_mode: prefs.discoveryMode,
      hide_watchlist: prefs.hideWatchlist,
      profile: {
        savedCount: prefs.savedEventIds.length,
        updatedFrom: "account-system",
      },
    };
  }

  async function loadRemotePreferences(client, userId) {
    if (!client || !userId) return normalizePreferences();
    const [preferenceResult, savedResult] = await Promise.all([
      client.from("user_event_preferences").select("*").eq("user_id", userId).maybeSingle(),
      client.from("saved_events").select("event_id,created_at").eq("user_id", userId),
    ]);
    if (preferenceResult.error && preferenceResult.error.code !== "PGRST116") throw preferenceResult.error;
    if (savedResult.error) throw savedResult.error;
    return remotePreferencesFromRows(preferenceResult.data, savedResult.data);
  }

  async function saveRemotePreferences(client, userId, preferences) {
    if (!client || !userId) return normalizePreferences(preferences);
    const prefs = normalizePreferences(preferences);
    const { error } = await client
      .from("user_event_preferences")
      .upsert(remotePreferenceRow(userId, prefs), { onConflict: "user_id" });
    if (error) throw error;
    if (prefs.displayName) {
      await client.from("profiles").update({ display_name: prefs.displayName }).eq("id", userId);
    }
    return prefs;
  }

  async function setRemoteSavedEvent(client, userId, eventId, shouldSave) {
    if (!client || !userId || !eventId) return;
    if (shouldSave) {
      const { error } = await client
        .from("saved_events")
        .upsert({ user_id: userId, event_id: eventId }, { onConflict: "user_id,event_id" });
      if (error) throw error;
      return;
    }
    const { error } = await client
      .from("saved_events")
      .delete()
      .eq("user_id", userId)
      .eq("event_id", eventId);
    if (error) throw error;
  }

  async function fetchEvents(win = typeof window !== "undefined" ? window : undefined) {
    if (win && Array.isArray(win.SHANGHAI_RAVE_EVENTS)) return win.SHANGHAI_RAVE_EVENTS;
    if (!win || typeof win.fetch !== "function") return [];
    const response = await win.fetch("data/events.json");
    if (!response.ok) throw new Error(`events ${response.status}`);
    const payload = await response.json();
    return Array.isArray(payload) ? payload : (Array.isArray(payload.events) ? payload.events : []);
  }

  function topVenues(events) {
    const counts = new Map();
    for (const event of Array.isArray(events) ? events : []) {
      const venue = String(event.venue || "").trim();
      if (!venue || venue.toLowerCase() === "tba") continue;
      counts.set(venue, (counts.get(venue) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 12)
      .map(([venue]) => venue);
  }

  function eventLine(event, rankedItem) {
    const reasons = rankedItem ? rankedItem.reasons : [];
    return `
      <article class="account-event-card">
        <div class="account-event-date">${escapeHtml(compactDate(event))}</div>
        <div class="account-event-main">
          <h3>${escapeHtml(event.title || "Untitled event")}</h3>
          <p>${escapeHtml([event.venue, event.district, event.time].filter(Boolean).join(" / "))}</p>
          <div class="account-reasons">
            ${reasons.slice(0, 4).map(reason => `<span>${escapeHtml(reason)}</span>`).join("")}
          </div>
        </div>
        <div class="account-event-actions">
          <button class="mini-link" type="button" data-save-event="${escapeHtml(event.id)}">${rankedItem && rankedItem.saved ? "Saved" : "Save"}</button>
          <a class="mini-link" href="index.html?event=${encodeURIComponent(event.id)}">Open</a>
        </div>
      </article>
    `;
  }

  function compactDate(event) {
    const date = parseDate(event.sortDate);
    if (!date) return event.date || "TBA";
    return date.toLocaleDateString("en", { month: "short", day: "numeric" }).toUpperCase();
  }

  function bootstrapAccountPage(win = typeof window !== "undefined" ? window : undefined) {
    const doc = win && win.document;
    const mount = doc && doc.querySelector("[data-account-app]");
    if (!win || !doc || !mount) return;

    const state = {
      events: [],
      preferences: loadLocalPreferences(win),
      client: null,
      session: null,
      remoteStatus: "Local mode",
      busy: false,
      busyAction: "",
      authDraft: { displayName: "", email: "" },
      authFeedback: accountAuthFeedback(),
      badgeData: null,
      error: "",
    };

    function render() {
      const prefs = normalizePreferences(state.preferences);
      const access = accountAccessState({
        loading: state.busy === true,
        hasSupabase: Boolean(state.client),
        session: state.session,
      });

      if (access.mode !== "dashboard") {
        mount.innerHTML = renderAccountGate(access, prefs);
        bindAccountPage();
        return;
      }

      const summary = personalizedSummary(prefs);
      const ranked = rankEvents(state.events, prefs, {
        today: doc.body.dataset.currentDate || new Date().toISOString().slice(0, 10),
        limit: 8,
      }).map(item => ({
        ...item,
        saved: prefs.savedEventIds.includes(item.event.id),
      }));
      const savedEvents = prefs.savedEventIds
        .map(id => state.events.find(event => event.id === id))
        .filter(Boolean)
        .slice(0, 8);
      const venues = uniqueValues([...prefs.venues, ...topVenues(state.events)]).slice(0, 16);

      mount.innerHTML = renderAccountDashboard({ prefs, summary, ranked, savedEvents, venues });
      bindAccountPage();
    }

    function renderAccountGate(access, prefs) {
      const canAuthenticate = access.mode === "gated";
      return `
        <section class="account-login-wall" data-account-mode="${escapeHtml(access.mode)}">
          <aside class="account-panel account-auth-wall">
            <div class="account-panel-head">
              <span>${escapeHtml(access.label)}</span>
              <h2>Save your picks</h2>
              <p>The public calendar shows every sourced listing. Your account saves the events and preferences you care about.</p>
            </div>
            <div class="account-lock-readout">
              <b>UNLOCK</b>
              <span>Save your sounds, remember your rooms, and show better matches first.</span>
            </div>
            <div class="account-why-stack" aria-label="Account benefits">
              <span>Stop rebuilding filters every weekend</span>
              <span>Carry saved nights across devices</span>
              <span>Show better matches on the homepage</span>
              <span>Export your account map any time</span>
            </div>
            ${renderAuthFeedback(state.authFeedback)}
            ${canAuthenticate ? renderAuthForm(prefs) : renderSupabaseUnavailable()}
          </aside>
          ${renderFeatureCatalogPanel("What your account saves", "Use the account to keep events, preferences, and exports in one place.")}
        </section>
      `;
    }

    function renderAuthFeedback(feedback) {
      const item = feedback || accountAuthFeedback();
      return `
        <div class="account-auth-feedback" data-account-auth-status="${escapeHtml(item.tone || "idle")}" role="status" aria-live="polite">
          <div>
            <span>${escapeHtml((item.tone || "idle").replace(/-/g, " "))}</span>
            <strong>${escapeHtml(item.title || "Account status")}</strong>
          </div>
          <p>${escapeHtml(item.body || "")}</p>
          ${Array.isArray(item.steps) && item.steps.length ? `
            <ol>
              ${item.steps.slice(0, 3).map(step => `<li>${escapeHtml(step)}</li>`).join("")}
            </ol>
          ` : ""}
        </div>
      `;
    }

    function renderAuthForm(prefs) {
      const draft = state.authDraft || {};
      const isBusy = Boolean(state.busyAction);
      const displayName = draft.displayName || prefs.displayName;
      const email = draft.email || "";
      const buttonLabel = (action, idleLabel, busyLabel) => state.busyAction === action ? busyLabel : idleLabel;
      const disabled = isBusy ? "disabled aria-disabled=\"true\"" : "";
      return `
        <form class="account-auth-form" data-auth-form aria-busy="${isBusy ? "true" : "false"}">
          <label class="account-field">
            <span>Display name</span>
            <input class="input" name="displayName" value="${escapeHtml(displayName)}" maxlength="42" autocomplete="name" placeholder="front left" ${disabled}>
          </label>
          <label class="account-field">
            <span>Email</span>
            <input class="input" name="email" type="email" autocomplete="email" placeholder="Email address" value="${escapeHtml(email)}" ${disabled}>
          </label>
          <label class="account-field">
            <span>Password</span>
            <input class="input" name="password" type="password" minlength="8" autocomplete="current-password" placeholder="8+ characters" ${disabled}>
          </label>
          <div class="account-action-row">
            <button class="button primary" type="button" data-account-action="sign-up" ${disabled}>${escapeHtml(buttonLabel("sign-up", "Create account", "Creating..."))}</button>
            <button class="button" type="button" data-account-action="sign-in" ${disabled}>${escapeHtml(buttonLabel("sign-in", "Sign in", "Signing in..."))}</button>
            <button class="button" type="button" data-account-action="magic-link" ${disabled}>${escapeHtml(buttonLabel("magic-link", "Email link", "Sending..."))}</button>
          </div>
          <div class="account-auth-path" aria-label="Account flow">
            <span><b>1</b>Create or sign in</span>
            <span><b>2</b>Confirm email if asked</span>
            <span><b>3</b>Save preferences</span>
          </div>
          <span class="account-form-note">Password is set only during Create account and stays in Supabase Auth. This site stores saved preferences, not passwords.</span>
        </form>
      `;
    }

    function renderSupabaseUnavailable() {
      return `
        <div class="account-empty">
          Supabase Auth is not available in this browser session. Confirm the public URL/key config and the Supabase client script before enabling account-only tools.
        </div>
        <a class="button" href="index.html">Open public calendar</a>
      `;
    }

    function renderAccountDashboard({ prefs, summary, ranked, savedEvents, venues }) {
      const email = state.session?.user?.email || "";
      return `
        <section class="account-grid">
          <aside class="account-panel account-auth-panel">
            <div class="account-panel-head">
              <span>Account connected</span>
              <h2>${escapeHtml(summary.title)}</h2>
              <p>${escapeHtml(summary.description)}</p>
            </div>
            <div class="account-signed-in">
              <span>Email</span>
              <b>${escapeHtml(email)}</b>
              <div class="account-action-row">
                <button class="button" type="button" data-account-action="export-account">Export data</button>
                <button class="button" type="button" data-account-action="clear-local">Clear local mirror</button>
                <button class="button" type="button" data-account-action="sign-out">Sign out</button>
              </div>
            </div>
            <div class="account-status-line">
              <b>Sync</b>
              <span>${escapeHtml(state.remoteStatus)}</span>
            </div>
            ${state.authFeedback && state.authFeedback.tone === "success" ? renderAuthFeedback(state.authFeedback) : ""}
            ${state.error ? `<div class="account-error">${escapeHtml(state.error)}</div>` : ""}
          </aside>

          <section class="account-panel account-preferences-panel">
            <div class="account-panel-head">
              <span>Personalized display</span>
              <h2>Set your preferences</h2>
              <p>These controls decide which events the calendar promotes first.</p>
            </div>
            <div class="account-control-grid">
              <label class="account-field">
                <span>Display name</span>
                <input class="input" id="accountDisplayName" value="${escapeHtml(prefs.displayName)}" maxlength="42" placeholder="anonymous dancer">
              </label>
              <label class="account-field">
                <span>Budget</span>
                <select class="select" id="accountBudget">
                  ${optionHtml("any", "Any price", prefs.budget)}
                  ${optionHtml("free", "Free first", prefs.budget)}
                  ${optionHtml("low", "Low cover first", prefs.budget)}
                </select>
              </label>
              <label class="account-field">
                <span>Timing</span>
                <select class="select" id="accountTiming">
                  ${optionHtml("any", "Any time", prefs.timing)}
                  ${optionHtml("early", "Early / date route", prefs.timing)}
                  ${optionHtml("late", "Late room", prefs.timing)}
                </select>
              </label>
              <label class="account-field">
                <span>Source mode</span>
                <select class="select" id="accountDiscovery">
                  ${optionHtml("balanced", "Balanced", prefs.discoveryMode)}
                  ${optionHtml("trusted", "High-confidence first", prefs.discoveryMode)}
                  ${optionHtml("open", "Include watchlist leads", prefs.discoveryMode)}
                </select>
              </label>
            </div>
            <div class="account-choice-block">
              <span>Sound preference</span>
              <div class="account-chip-row" data-choice-group="vibes">
                ${supportedVibes.map(vibe => `<button class="route-button ${prefs.vibes.includes(vibe) ? "active" : ""}" type="button" data-pref-value="${escapeHtml(vibe)}">${escapeHtml(preferenceLabel(vibe))}</button>`).join("")}
              </div>
            </div>
            <div class="account-choice-block">
              <span>Rooms and crews</span>
              <div class="account-chip-row" data-choice-group="venues">
                ${venues.map(venue => `<button class="route-button ${prefs.venues.includes(venue) ? "active" : ""}" type="button" data-pref-value="${escapeHtml(venue)}">${escapeHtml(venue)}</button>`).join("")}
              </div>
            </div>
            <label class="account-checkline">
              <input type="checkbox" id="accountHideWatchlist" ${prefs.hideWatchlist ? "checked" : ""}>
              <span>Hide watchlist leads until a stronger source lands</span>
            </label>
            <div class="account-action-row">
              <button class="button primary" type="button" data-account-action="save-preferences">Save to account</button>
              <a class="button" href="index.html">Open calendar</a>
            </div>
          </section>
        </section>

        ${renderAccountBadgesPanel()}

        ${renderFeatureCatalogPanel("Your account tools", "Available tools are active now. Next tools show where this account can grow.")}

        <section class="account-results-grid">
          <section class="account-panel">
            <div class="account-panel-head inline">
              <div>
                <span>Best matches</span>
                <h2>For you now</h2>
              </div>
              <b>${ranked.length}</b>
            </div>
            <div class="account-event-list">
              ${ranked.length ? ranked.map(item => eventLine(item.event, item)).join("") : `<div class="account-empty">Pick sounds or rooms to build a personal queue.</div>`}
            </div>
          </section>
          <section class="account-panel">
            <div class="account-panel-head inline">
              <div>
                <span>Saved events</span>
                <h2>Your shortlist</h2>
              </div>
              <b>${prefs.savedEventIds.length}</b>
            </div>
            <div class="account-event-list">
              ${savedEvents.length ? savedEvents.map(event => eventLine(event, { reasons: ["saved"], saved: true })).join("") : `<div class="account-empty">Save events from this page or the personalized calendar panel.</div>`}
            </div>
          </section>
        </section>
      `;
    }

    function badgeSystem() {
      return win && win.RaveCommunityBadges;
    }

    function renderAccountBadgesPanel() {
      const badges = badgeSystem();
      if (!badges || typeof badges.renderBadgeBoard !== "function") return "";
      const data = state.badgeData || badges.emptyProfileBadgeData({
        error: "Badge data loads after the community badge migration is applied.",
      });
      return badges.renderBadgeBoard(data, { context: "account" });
    }

    function renderFeatureCatalogPanel(title, description) {
      return `
        <section class="account-panel account-feature-panel">
          <div class="account-panel-head">
            <span>Account capabilities</span>
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(description)}</p>
          </div>
          <div class="account-feature-grid">
            ${accountFeatureCatalog().map(feature => `
              <article class="account-feature-card" data-feature-status="${escapeHtml(feature.status)}">
                <div>
                  <span>${escapeHtml(feature.status)}</span>
                  <h3>${escapeHtml(feature.title)}</h3>
                </div>
                <strong>${escapeHtml(feature.hook)}</strong>
                <p>${escapeHtml(feature.description)}</p>
                <em>${escapeHtml(feature.payoff)}</em>
                <b>${escapeHtml(feature.storage)}</b>
              </article>
            `).join("")}
          </div>
        </section>
      `;
    }

    function optionHtml(value, label, current) {
      return `<option value="${escapeHtml(value)}" ${value === current ? "selected" : ""}>${escapeHtml(label)}</option>`;
    }

    function bindAccountPage() {
      mount.querySelectorAll("[data-choice-group] .route-button").forEach(button => {
        button.addEventListener("click", () => button.classList.toggle("active"));
      });
      mount.querySelectorAll("[data-account-action]").forEach(button => {
        button.addEventListener("click", () => handleAction(button.dataset.accountAction));
      });
      mount.querySelectorAll("[data-save-event]").forEach(button => {
        button.addEventListener("click", () => toggleSavedEvent(button.dataset.saveEvent));
      });
    }

    function readPreferencesFromDom() {
      return normalizePreferences({
        displayName: mount.querySelector("#accountDisplayName")?.value || "",
        budget: mount.querySelector("#accountBudget")?.value || "any",
        timing: mount.querySelector("#accountTiming")?.value || "any",
        discoveryMode: mount.querySelector("#accountDiscovery")?.value || "balanced",
        hideWatchlist: mount.querySelector("#accountHideWatchlist")?.checked === true,
        vibes: Array.from(mount.querySelectorAll('[data-choice-group="vibes"] .active')).map(button => button.dataset.prefValue),
        venues: Array.from(mount.querySelectorAll('[data-choice-group="venues"] .active')).map(button => button.dataset.prefValue),
        savedEventIds: state.preferences.savedEventIds,
      });
    }

    async function handleAction(action) {
      state.error = "";
      try {
        if (action === "save-preferences") {
          state.preferences = readPreferencesFromDom();
          saveLocalPreferences(state.preferences, win);
          if (state.client && state.session?.user) {
            await saveRemotePreferences(state.client, state.session.user.id, state.preferences);
            state.remoteStatus = "Saved to Supabase profile";
          } else {
            state.remoteStatus = "Saved in this browser";
          }
          render();
          return;
        }
        if (action === "toggle-public-badges") {
          await togglePublicBadges();
          return;
        }
        if (action === "sign-out") {
          await state.client?.auth.signOut();
          state.session = null;
          state.badgeData = null;
          state.remoteStatus = "Signed out; local preferences remain";
          render();
          return;
        }
        if (action === "export-account") {
          exportAccountData();
          return;
        }
        if (action === "clear-local") {
          clearLocalMirror();
          return;
        }
        await authAction(action);
      } catch (error) {
        state.error = error.message || "Account action failed";
        if (["sign-up", "sign-in", "magic-link"].includes(action)) {
          state.authFeedback = accountAuthFeedback(action, "error", { error: state.error });
          state.busyAction = "";
        }
        render();
      }
    }

    async function authAction(action) {
      if (!state.client) throw new Error("Supabase Auth client is unavailable");
      const form = mount.querySelector("[data-auth-form]");
      const formData = new FormData(form);
      const email = String(formData.get("email") || "").trim();
      const password = String(formData.get("password") || "");
      const displayName = String(formData.get("displayName") || "").trim();
      state.authDraft = { displayName, email };
      if (!email) throw new Error("Email is required");
      if (action !== "magic-link" && password.length < 8) throw new Error("Password must be at least 8 characters");

      state.busyAction = action;
      state.authFeedback = accountAuthFeedback(action, "pending", { email });
      render();
      const emailRedirectTo = accountAuthRedirectUrl(win);

      if (action === "sign-up") {
        const { data, error } = await state.client.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: displayName || undefined },
            emailRedirectTo,
          },
        });
        if (error) throw error;
        state.session = data.session || state.session;
        state.preferences = normalizePreferences({ ...state.preferences, displayName: displayName || state.preferences.displayName });
        if (data.session?.user?.id) {
          await saveRemotePreferences(state.client, data.session.user.id, state.preferences);
          await refreshBadgeState();
          state.remoteStatus = "Account created; preferences synced";
        } else {
          state.remoteStatus = "Check email to confirm account";
        }
        state.authFeedback = accountAuthFeedback(action, "success", { email, hasSession: Boolean(data.session) });
      } else if (action === "sign-in") {
        const { data, error } = await state.client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        state.session = data.session;
        await refreshRemoteState();
        state.authFeedback = accountAuthFeedback(action, "success", { email, hasSession: Boolean(data.session) });
      } else if (action === "magic-link") {
        const { error } = await state.client.auth.signInWithOtp({
          email,
          options: { emailRedirectTo },
        });
        if (error) throw error;
        state.remoteStatus = "Magic link sent";
        state.authFeedback = accountAuthFeedback(action, "success", { email });
      }
      saveLocalPreferences(state.preferences, win);
      state.busyAction = "";
      render();
    }

    function exportAccountData() {
      const prefs = normalizePreferences(state.preferences);
      const payload = {
        exportedAt: new Date().toISOString(),
        account: {
          userId: state.session?.user?.id || "",
          email: state.session?.user?.email || "",
        },
        preferences: prefs,
        savedEvents: prefs.savedEventIds
          .map(id => state.events.find(event => event.id === id))
          .filter(Boolean)
          .map(event => ({
            id: event.id,
            title: event.title,
            sortDate: event.sortDate,
            venue: event.venue,
            source: event.source,
          })),
        features: accountFeatureCatalog(),
        badges: state.badgeData || null,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = doc.createElement("a");
      link.href = url;
      link.download = "shanghai-rave-account-export.json";
      link.click();
      URL.revokeObjectURL(url);
    }

    function clearLocalMirror() {
      if (!win.confirm("Clear the browser copy of account preferences? Supabase rows remain untouched.")) return;
      win.localStorage.removeItem(STORAGE_PREFERENCES);
      win.localStorage.removeItem(STORAGE_SAVED_EVENTS);
      state.preferences = normalizePreferences();
      state.remoteStatus = "Local mirror cleared";
      if (state.session?.user) {
        refreshRemoteState().catch(error => {
          state.error = error.message || "Could not reload Supabase account";
          render();
        });
      }
      render();
    }

    async function toggleSavedEvent(eventId) {
      const before = new Set(state.preferences.savedEventIds);
      const nextIds = savedEventIdsAfterToggle(state.preferences.savedEventIds, eventId);
      const shouldSave = !before.has(eventId);
      state.preferences = normalizePreferences({ ...state.preferences, savedEventIds: nextIds });
      saveLocalPreferences(state.preferences, win);
      render();
      if (state.client && state.session?.user) {
        try {
          await setRemoteSavedEvent(state.client, state.session.user.id, eventId, shouldSave);
          state.remoteStatus = shouldSave ? "Saved to account" : "Removed from account";
        } catch (error) {
          state.error = error.message || "Could not sync saved event";
        }
        render();
      }
    }

    async function refreshBadgeState() {
      const badges = badgeSystem();
      if (!badges || !state.client || !state.session?.user?.id) {
        state.badgeData = null;
        return;
      }
      try {
        state.badgeData = await badges.loadProfileBadgeData(state.client, state.session.user.id);
      } catch (error) {
        state.badgeData = badges.emptyProfileBadgeData({
          error: `Badge data unavailable: ${error.message || "run badge migration"}`,
        });
      }
    }

    async function togglePublicBadges() {
      const badges = badgeSystem();
      if (!badges || !state.client || !state.session?.user?.id) {
        throw new Error("Sign in before changing badge visibility.");
      }
      const nextPublicState = !(state.badgeData && state.badgeData.publicBadges === true);
      await badges.setProfilePublicBadgeVisibility(state.client, state.session.user.id, nextPublicState);
      await refreshBadgeState();
      state.remoteStatus = nextPublicState ? "Public badge display enabled" : "Public badge display disabled";
      render();
    }

    async function refreshRemoteState() {
      if (!state.client) return;
      const { data } = await state.client.auth.getSession();
      state.session = data.session;
      if (!state.session?.user) {
        state.remoteStatus = hasSupabaseConfig(supabaseConfig(win)) ? "Supabase ready" : "Local mode";
        return;
      }
      const remotePrefs = await loadRemotePreferences(state.client, state.session.user.id);
      state.preferences = mergePreferences(state.preferences, remotePrefs);
      saveLocalPreferences(state.preferences, win);
      await refreshBadgeState();
      state.remoteStatus = "Synced with Supabase account";
    }

    async function boot() {
      mount.innerHTML = `<section class="account-panel account-loading">Loading account display.</section>`;
      state.client = createSupabaseClient(win);
      try {
        state.events = await fetchEvents(win);
      } catch (error) {
        state.error = `Could not load event data: ${error.message || "unknown error"}`;
      }
      try {
        await refreshRemoteState();
      } catch (error) {
        state.remoteStatus = "Local mode; run migrations for account sync";
        state.error = error.message || "";
      }
      if (state.client?.auth?.onAuthStateChange) {
        state.client.auth.onAuthStateChange((_event, session) => {
          state.session = session;
          if (session?.user) {
            refreshRemoteState().catch(error => {
              state.error = error.message || "Could not refresh account";
              render();
            });
          } else {
            render();
          }
        });
      }
      render();
    }

    boot();
  }

  function enhanceCalendarPage(options = {}) {
    const win = typeof window !== "undefined" ? window : undefined;
    const doc = win && win.document;
    const mount = doc && doc.getElementById("personalizedDispatch");
    if (!win || !doc || !mount) return;
    const events = Array.isArray(options.events) ? options.events : [];
    const prefs = loadLocalPreferences(win);
    const summary = personalizedSummary(prefs);
    const ranked = rankEvents(events, prefs, {
      today: doc.body.dataset.currentDate || new Date().toISOString().slice(0, 10),
      limit: 4,
    });
    const hasPrefs = prefs.vibes.length || prefs.venues.length || prefs.savedEventIds.length;

    mount.innerHTML = `
      <div class="dispatch-panel-head">
        <h2>For you</h2>
        <span>${escapeHtml(hasPrefs ? summary.savedCount ? `${summary.savedCount} saved` : "set" : "not set")}</span>
        <a href="account.html">Save picks -></a>
      </div>
      <div class="dispatch-list account-calendar-list">
        ${hasPrefs && ranked.length ? ranked.map(item => `
          <button class="dispatch-row" type="button" data-id="${escapeHtml(item.event.id)}">
            <span>${escapeHtml(compactDate(item.event))}</span>
            <b>${escapeHtml(item.event.title)}</b>
            <em>${escapeHtml(item.reasons.slice(0, 2).join(" / "))}</em>
            <i>${escapeHtml(String(item.score))}</i>
          </button>
        `).join("") : `
          <a class="account-empty-link" href="account.html">
            <b>Set preferences</b>
            <span>Save sounds, rooms, source mode, and budget preferences.</span>
          </a>
        `}
      </div>
    `;
    mount.querySelectorAll(".dispatch-row").forEach(row => {
      row.addEventListener("click", () => {
        const event = events.find(item => item.id === row.dataset.id);
        if (event && typeof options.openEvent === "function") {
          options.openEvent(event);
        } else if (event) {
          win.location.href = `index.html?event=${encodeURIComponent(event.id)}`;
        }
      });
    });
  }

  function bootBrowser() {
    if (typeof window === "undefined" || !window.document) return;
    bootstrapAccountPage(window);
    enhancePublicAccountGuides(window);
    window.addEventListener("rave:events-loaded", event => {
      enhanceCalendarPage({
        events: event.detail && event.detail.events,
        openEvent: event.detail && event.detail.openEvent,
      });
    });
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bootBrowser);
    } else {
      bootBrowser();
    }
  }

  return {
    normalizePreferences,
    rankEvents,
    savedEventIdsAfterToggle,
    personalizedSummary,
    accountAccessState,
    adminAccessState,
    accountAuthFeedback,
    accountAuthErrorFeedback,
    accountAuthRedirectUrl,
    accountFeatureCatalog,
    publicAccountGuide,
    enhancePublicAccountGuides,
    loadLocalPreferences,
    saveLocalPreferences,
    createSupabaseClient,
    loadRemotePreferences,
    saveRemotePreferences,
    setRemoteSavedEvent,
    enhanceCalendarPage,
  };
});
