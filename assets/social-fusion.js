(function attachSocialFusion(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SOCIAL_FUSION = api;
  }
})(typeof window !== "undefined" ? window : globalThis, function createSocialFusion() {
  const INSTAGRAM_BASE = "https://www.instagram.com/";
  const INSTAGRAM_POST_PATHS = new Set(["p", "reel", "tv"]);

  function clean(value) {
    return String(value || "").trim();
  }

  function slugify(value) {
    return clean(value)
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9._]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function normalizeUrl(value) {
    const input = clean(value);
    if (!input) return "";
    try {
      const url = new URL(input);
      url.hash = "";
      url.search = "";
      return url.toString().replace(/\/$/, "") + "/";
    } catch (_) {
      return "";
    }
  }

  function instagramUrl(value) {
    const input = clean(value);
    if (!input) return "";

    if (/^https?:\/\//i.test(input)) {
      let parsed;
      try {
        parsed = new URL(input);
      } catch (_) {
        return "";
      }
      const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
      if (host !== "instagram.com") return "";
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (!parts.length) return "";
      if (INSTAGRAM_POST_PATHS.has(parts[0].toLowerCase())) {
        return `${INSTAGRAM_BASE}${parts.slice(0, 2).join("/")}/`;
      }
      return `${INSTAGRAM_BASE}${parts[0]}/`;
    }

    const handle = input.replace(/^@+/, "").replace(/^instagram\.com\//i, "").split(/[/?#]/)[0].trim();
    if (!handle || INSTAGRAM_POST_PATHS.has(handle.toLowerCase())) return "";
    return `${INSTAGRAM_BASE}${handle}/`;
  }

  function instagramHandleFromUrl(value) {
    const url = instagramUrl(value);
    if (!url) return "";
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    if (!parts.length || INSTAGRAM_POST_PATHS.has(parts[0].toLowerCase())) return "";
    return parts[0];
  }

  function normalizeSocialLink(input, defaults = {}) {
    if (!input) return null;
    const source = typeof input === "string" ? { url: input } : input;
    const platform = clean(source.platform || defaults.platform || "instagram").toLowerCase();
    const url = platform === "instagram" ? instagramUrl(source.url || source.handle || source.value) : normalizeUrl(source.url);
    if (!url) return null;
    const handle = clean(source.handle || (platform === "instagram" ? instagramHandleFromUrl(url) : ""));
    return {
      platform,
      label: clean(source.label || defaults.label || (handle ? `IG @${handle}` : "Instagram")),
      handle,
      url,
      status: clean(source.status || defaults.status || "social-profile"),
      sourceStatus: clean(source.sourceStatus || defaults.sourceStatus || "social-lead"),
      checked: clean(source.checked || defaults.checked || ""),
      relationship: clean(source.relationship || defaults.relationship || ""),
      owner: clean(source.owner || defaults.owner || ""),
    };
  }

  function profileLinks(profile) {
    const rows = [];
    const socialLinks = profile && profile.socialLinks;
    if (Array.isArray(socialLinks)) {
      rows.push(...socialLinks);
    } else if (socialLinks && typeof socialLinks === "object") {
      for (const [platform, value] of Object.entries(socialLinks)) {
        rows.push(typeof value === "object" ? { platform, ...value } : { platform, value });
      }
    }
    if (Array.isArray(profile && profile.links)) rows.push(...profile.links);
    return rows;
  }

  function registerKey(map, key, profile) {
    const normalized = slugify(key);
    if (normalized && !map.has(normalized)) map.set(normalized, profile);
  }

  function createSocialRegistry(data = {}) {
    const profiles = Array.isArray(data) ? data : data.profiles || [];
    const byKey = new Map();
    const normalizedProfiles = profiles.map(profile => {
      const links = profileLinks(profile)
        .map(link => normalizeSocialLink(link, {
          checked: profile.checked || data.verified || data.generatedAt || "",
          owner: profile.name,
        }))
        .filter(Boolean);
      return {
        ...profile,
        slug: profile.slug || slugify(profile.name),
        aliases: Array.isArray(profile.aliases) ? profile.aliases : [],
        socialLinks: links,
      };
    });

    for (const profile of normalizedProfiles) {
      registerKey(byKey, profile.slug, profile);
      registerKey(byKey, profile.name, profile);
      for (const alias of profile.aliases) registerKey(byKey, alias, profile);
      for (const link of profile.socialLinks) {
        registerKey(byKey, link.handle, profile);
        registerKey(byKey, `@${link.handle}`, profile);
      }
    }

    return {
      profiles: normalizedProfiles,
      byKey,
      sourcePolicy: data.sourcePolicy || "",
      verified: data.verified || data.generatedAt || "",
    };
  }

  function splitEntityNames(value) {
    return clean(value)
      .split(/\s+(?:\/|x|\u00d7|\+|&)\s+|\s*\/\s*/i)
      .map(part => part.trim())
      .filter(Boolean);
  }

  function findProfile(value, registry) {
    if (!registry || !registry.byKey) return null;
    const direct = registry.byKey.get(slugify(value));
    if (direct) return direct;
    const withoutShanghai = clean(value).replace(/\bshanghai\b/ig, "").trim();
    return withoutShanghai ? registry.byKey.get(slugify(withoutShanghai)) || null : null;
  }

  function socialLinksForEntity(value, registry, defaults = {}) {
    const profiles = [];
    const seenProfiles = new Set();
    const addProfile = profile => {
      if (!profile || seenProfiles.has(profile.slug)) return;
      seenProfiles.add(profile.slug);
      profiles.push(profile);
    };

    addProfile(findProfile(value, registry));
    for (const part of splitEntityNames(value)) addProfile(findProfile(part, registry));

    const seenUrls = new Set();
    return profiles.flatMap(profile => profile.socialLinks.map(link => ({
      ...link,
      relationship: defaults.relationship || link.relationship,
      owner: profile.name || link.owner,
    }))).filter(link => {
      if (!link.url || seenUrls.has(link.url)) return false;
      seenUrls.add(link.url);
      return true;
    });
  }

  function eventSocialLinks(event = {}, registry, options = {}) {
    const rows = [];
    const seen = new Set();
    const limitArtists = Number.isFinite(options.limitArtists) ? options.limitArtists : 6;
    const add = link => {
      if (!link || !link.url || seen.has(link.url)) return;
      seen.add(link.url);
      rows.push(link);
    };

    const organizer = event.organizer || event.organiser || event.promoter || event.crew || event.collective || "";
    socialLinksForEntity(organizer, registry, { relationship: "organizer" }).forEach(add);

    const lineup = Array.isArray(event.lineup) ? event.lineup : [];
    lineup.slice(0, limitArtists).forEach(item => {
      const name = typeof item === "string" ? item : item && (item.name || item.dj || item.artist);
      socialLinksForEntity(name, registry, { relationship: "artist" }).forEach(add);
    });

    const promotionalLinks = Array.isArray(event.promotionalLinks) ? event.promotionalLinks : [];
    promotionalLinks.map(link => normalizeSocialLink(link, { relationship: "promotional" })).forEach(add);

    return rows;
  }

  return {
    createSocialRegistry,
    eventSocialLinks,
    instagramUrl,
    normalizeSocialLink,
    slugify,
    socialLinksForEntity,
    splitEntityNames,
  };
});
