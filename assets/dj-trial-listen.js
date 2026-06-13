(function attachDjTrialListener(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.DJ_TRIAL_LISTENER = api;
  }
})(typeof window !== "undefined" ? window : globalThis, function createDjTrialListener() {
  function normalizeText(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function firstGenre(profile) {
    const genres = profile && Array.isArray(profile.genres) ? profile.genres : [];
    const clean = genres.map(item => String(item || "").trim()).filter(Boolean);
    if (clean.length) return clean[0];
    const families = profile && Array.isArray(profile.soundFamilies) ? profile.soundFamilies : [];
    return families[0] || "electronic";
  }

  function searchQueryFor(profile) {
    return [profile && profile.name, firstGenre(profile)]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function listenLinksFor(profile) {
    const encoded = encodeURIComponent(searchQueryFor(profile));
    return [
      { label: "SoundCloud", url: `https://soundcloud.com/search?q=${encoded}`, kind: "search" },
      { label: "YouTube", url: `https://www.youtube.com/results?search_query=${encoded}`, kind: "search" },
      { label: "Bandcamp", url: `https://bandcamp.com/search?q=${encoded}`, kind: "search" },
    ];
  }

  function explicitAudioLinks(profile) {
    const tracked = profile && profile.tracked;
    return []
      .concat(profile && Array.isArray(profile.audioLinks) ? profile.audioLinks : [])
      .concat(profile && Array.isArray(profile.listenLinks) ? profile.listenLinks : [])
      .concat(tracked && Array.isArray(tracked.audioLinks) ? tracked.audioLinks : [])
      .concat(tracked && Array.isArray(tracked.listenLinks) ? tracked.listenLinks : []);
  }

  function sourceCandidates(profile) {
    const tracked = profile && profile.tracked;
    const trackedSources = tracked && Array.isArray(tracked.sources) ? tracked.sources : [];
    const appearanceSources = profile && Array.isArray(profile.appearances)
      ? profile.appearances.map(item => ({
        label: item.sourceStatusLabel || item.sourceLabel || "Event source",
        url: item.source,
        status: item.sourceStatus,
      }))
      : [];
    return trackedSources.concat(appearanceSources);
  }

  function looksLikeAudioSource(source) {
    const text = normalizeText(`${source && source.label} ${source && source.url}`);
    return /\b(nts|byyb|youtube|soundcloud|bandcamp|mixcloud|spotify|radio|set|listen|audio|track|show)\b/.test(text)
      || /\.(mp3|m4a|aac|ogg|oga|wav|flac)(\?|#|$)/i.test(String(source && source.url || ""));
  }

  function linkFromSource(source) {
    const url = String(source && source.url || "").trim();
    if (!url) return null;
    const label = String(source && (source.label || source.title || source.name) || "Audio link").trim();
    return {
      label,
      url,
      status: source.status || source.sourceStatus || "source",
      kind: /\.(mp3|m4a|aac|ogg|oga|wav|flac)(\?|#|$)/i.test(url) ? "audio-file" : "direct",
    };
  }

  function directAudioLinksFor(profile) {
    const rows = [];
    explicitAudioLinks(profile).concat(sourceCandidates(profile)).forEach(source => {
      if (!looksLikeAudioSource(source)) return;
      const link = linkFromSource(source);
      if (link && !rows.some(row => row.url === link.url)) rows.push(link);
    });
    return rows.slice(0, 6);
  }

  return {
    directAudioLinksFor,
    listenLinksFor,
    searchQueryFor,
  };
});
