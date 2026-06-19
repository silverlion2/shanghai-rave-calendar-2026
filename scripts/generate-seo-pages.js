const fs = require("fs");
const path = require("path");
const vm = require("vm");
const {
  readWebsiteStructure,
  staticSitemapRoutes,
} = require("./site-structure");
const {
  renderHtmlDocument,
  renderSeoHead,
  renderPrimaryNav,
  renderBottomDispatchFooter,
  websiteSchema,
  graph,
  compact,
  escapeHtml,
  escapeAttr,
  escapeXml,
} = require("./site-components");
const {
  createSocialRegistry,
  eventSocialLinks,
  socialLinksForEntity,
} = require("../assets/social-fusion.js");
const {
  enrichEvent,
  soundTagLabels,
} = require("./techno-taxonomy");

const ROOT = path.resolve(__dirname, "..");
const DATA_FILE = path.join(ROOT, "data", "events.json");
const SOCIAL_PROFILES_FILE = path.join(ROOT, "data", "social-profiles.js");
const EVENTS_DIR = path.join(ROOT, "events");
const SITEMAP_FILE = path.join(ROOT, "sitemap.xml");
const siteStructure = readWebsiteStructure();
const SITE_URL = siteStructure.site.baseUrl;
const SITE_NAME = siteStructure.site.name;
const STATIC_LASTMOD = siteStructure.site.staticLastmod;
const TIMEZONE_OFFSET = siteStructure.site.timezoneOffset;
const archiveCutoffHour = 6;
const statusNow = new Date();

const payload = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
const events = Array.isArray(payload) ? payload : payload.events;
const lineups = Array.isArray(payload) ? {} : payload.lineups || {};
const dataLastmod = dateOnly(payload.verified || payload.generatedAt) || STATIC_LASTMOD;
const socialRegistry = createSocialRegistry(readSocialProfiles());

if (!Array.isArray(events) || events.length === 0) {
  throw new Error("data/events.json must include events before SEO pages can be generated");
}

fs.mkdirSync(EVENTS_DIR, { recursive: true });

for (const file of fs.readdirSync(EVENTS_DIR)) {
  if (file.endsWith(".html")) {
    fs.unlinkSync(path.join(EVENTS_DIR, file));
  }
}

const normalizedEvents = events
  .filter(event => event && event.id && event.title && event.sortDate)
  .map(event => enrichEvent({ ...event, lineup: normalizedLineup(event) }))
  .sort((a, b) => String(a.sortDate).localeCompare(String(b.sortDate)) || String(a.title).localeCompare(String(b.title)));

for (const event of normalizedEvents) {
  fs.writeFileSync(path.join(EVENTS_DIR, `${event.id}.html`), cleanGeneratedText(renderEventPage(event)), "utf8");
}
fs.writeFileSync(SITEMAP_FILE, cleanGeneratedText(renderSitemap(normalizedEvents)), "utf8");

console.log(`Generated ${normalizedEvents.length} event detail pages and sitemap.xml`);

function cleanGeneratedText(value) {
  return String(value)
    .split("\n")
    .map(line => line.trimEnd())
    .join("\n");
}

function normalizedLineup(event) {
  const raw = Array.isArray(event.lineup) && event.lineup.length ? event.lineup : lineups[event.id] || [];
  return raw
    .map(item => {
      if (typeof item === "string") {
        return { name: item, note: "Lineup listed by the event source; exact set time may still need venue confirmation." };
      }
      return {
        name: String(item?.name || item?.dj || item?.artist || "").trim(),
        note: String(item?.note || item?.description || "").trim(),
      };
    })
    .filter(item => item.name);
}

function isFestival(event = {}) {
  return String(event.kind || "").toLowerCase() === "festival" || Boolean(event.festival);
}

function formatLabel(event) {
  return eventStatusLabel(event);
}

function eventArchiveCutoff(event) {
  const sortDate = dateOnly(event?.sortDate);
  if (!sortDate) return null;
  const cutoff = new Date(`${sortDate}T${String(archiveCutoffHour).padStart(2, "0")}:00:00+08:00`);
  cutoff.setUTCDate(cutoff.getUTCDate() + 1);
  return cutoff;
}

function eventIsPastByCutoff(event, now = statusNow) {
  if (String(event?.status || "").toLowerCase() === "past") return true;
  const cutoff = eventArchiveCutoff(event);
  if (!cutoff) return String(event?.status || "").toLowerCase() === "past";
  return now.getTime() >= cutoff.getTime();
}

function eventTemporalStatus(event, now = statusNow) {
  const rawStatus = String(event?.status || "").toLowerCase();
  if (rawStatus === "past" || eventIsPastByCutoff(event, now)) return "past";
  const sortDate = dateOnly(event?.sortDate);
  const todayKey = shanghaiDateKey(now);
  if (sortDate && todayKey && sortDate <= todayKey) return "current";
  return "upcoming";
}

function eventIsWatchStatus(event) {
  return String(event?.status || "").toLowerCase() === "watch"
    || event?.confidence === "Watch"
    || String(event?.sourceStatus || "").toLowerCase() === "watchlist";
}

function eventEffectiveStatus(event) {
  const temporalStatus = eventTemporalStatus(event);
  if (temporalStatus === "past") return "past";
  if (eventIsWatchStatus(event)) return "watch";
  return temporalStatus;
}

function eventStatusLabel(event) {
  const temporalStatus = eventTemporalStatus(event);
  const status = eventEffectiveStatus(event);
  if (isFestival(event)) {
    if (status === "watch") return temporalStatus === "current" ? "current festival watch" : "festival watch";
    if (temporalStatus === "past") return "past festival";
    if (temporalStatus === "current") return "current festival";
    return "festival";
  }
  if (status === "watch" && temporalStatus === "current") return "current watch";
  return status;
}

function shanghaiDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now).reduce((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});
  return parts.year && parts.month && parts.day ? `${parts.year}-${parts.month}-${parts.day}` : "";
}

function programHighlights(event) {
  const rows = Array.isArray(event.programHighlights) ? event.programHighlights : [];
  return rows
    .map(item => {
      if (typeof item === "string") return { title: item, note: "Program highlight listed by the festival source." };
      return {
        title: String(item?.title || item?.name || item?.artist || "").trim(),
        note: String(item?.note || item?.description || "").trim(),
      };
    })
    .filter(item => item.title);
}

function renderEventPage(event) {
  const isPublic = isPublicEvent(event);
  const festival = isFestival(event);
  const canonical = eventUrl(event);
  const image = imageUrl(event);
  const liveRoomHref = `../live-room.html?room=${encodeURIComponent(event.id)}#live-room`;
  const primaryActionHref = trackedTicketUrl(event, "../");
  const sourceActionHref = eventPageHref(event.detailsUrl || event.source || "", "../");
  const showSourceAction = Boolean(event.ticketUrl && sourceActionHref && sourceActionHref !== primaryActionHref);
  const schemaNodes = [
    websiteSchema(siteStructure),
    {
      "@type": "WebPage",
      "@id": `${canonical}#webpage`,
      "url": canonical,
      "name": `${event.title} | ${SITE_NAME}`,
      "description": metaDescription(event),
      "isPartOf": { "@id": `${SITE_URL}/#website` },
      "dateModified": event.lastChecked || dataLastmod,
      "about": isPublic ? { "@id": `${canonical}#event` } : event.title,
    },
    breadcrumbSchema([
      ["Home", SITE_URL],
      ["Events", `${SITE_URL}/poster-wall`],
      [event.title, canonical],
    ]),
  ];

  if (isPublic) {
    schemaNodes.push(eventSchema(event, canonical, image));
  }

  return pageShell({
    title: titleTag(`${event.title} | ${SITE_NAME}`),
    description: metaDescription(event),
    canonical,
    ogTitle: `${event.title} | ${SITE_NAME}`,
    ogDescription: metaDescription(event),
    ogImage: image,
    ogAlt: `${event.title} event poster or Shanghai Rave Index preview`,
    robots: isPublic ? "index,follow,max-image-preview:large" : "noindex,follow",
    schema: graph(schemaNodes),
    body: `
      <main class="shell dispatch-shell">
        ${nav("../")}
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="../index.html">Calendar</a>
          <span>/</span>
          <a href="../poster-wall.html">Events</a>
          <span>/</span>
          <span>${escapeHtml(event.title)}</span>
        </nav>
        <article class="event-detail ${isPublic ? "" : "watch-detail"} ${festival ? "festival-detail" : ""}" data-event-detail data-event-sort-date="${escapeAttr(event.sortDate || "")}" data-event-status="${escapeAttr(event.status || "")}" data-event-confidence="${escapeAttr(event.confidence || "")}" data-event-source-status="${escapeAttr(event.sourceStatus || "")}" data-event-kind="${festival ? "festival" : "event"}">
          <header class="event-hero">
            <div>
              <p class="kicker"><span data-event-status-label>${escapeHtml(formatLabel(event))}</span> / ${escapeHtml(event.confidence || "source checked")}</p>
              <h1>${escapeHtml(event.title)}</h1>
              <p class="lede">${escapeHtml(event.description || "Public event listing; confirm final details at the source before planning.")}</p>
              <div class="action-row">
                <a class="button primary" href="${escapeAttr(primaryActionHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ticketLabel(event))}</a>
                ${showSourceAction ? `<a class="button secondary" href="${escapeAttr(sourceActionHref)}" target="_blank" rel="noopener noreferrer">Source</a>` : ""}
                ${festival ? "" : `<a class="button secondary live-room-return" href="${escapeAttr(liveRoomHref)}">Tonight room</a>`}
                <a class="button secondary" href="../index.html">Calendar</a>
                <a class="button secondary" href="../contribute.html?mode=existing&targetKind=event&targetId=${encodeURIComponent(event.id)}&targetLabel=${encodeURIComponent(event.title)}">Event not accurate?</a>
              </div>
            </div>
            <figure>
              <img src="${escapeAttr(relativeImagePath(event))}" alt="${escapeAttr(`${event.title} event poster or Shanghai Rave Index preview`)}" loading="eager" decoding="async" fetchpriority="high" data-poster-protected="true" draggable="false">
              <figcaption>${escapeHtml(event.sourceLabel || "Source")} / checked ${escapeHtml(event.lastChecked || dataLastmod)}</figcaption>
            </figure>
          </header>
          <section class="facts" aria-label="Event facts">
            ${festival ? festivalFacts(event) : eventFacts(event)}
          </section>
          ${tagHtml(event)}
          ${renderRecommendationLedger(event)}
          <section class="copy-block">
            <h2>${festival ? "Festival Program" : "Lineup and Notes"}</h2>
            ${festival ? festivalProgramHtml(event) : event.lineup.length ? `
              <ul class="lineup-list">
                ${event.lineup.map(item => `<li><b>${escapeHtml(item.name)}</b><span>${escapeHtml(item.note || "Listed by the event source; confirm set time before planning.")}</span></li>`).join("")}
              </ul>
            ` : `<p>Lineup details are limited in public sources. Use the source link before planning around a specific DJ.</p>`}
          </section>
          <section class="copy-block">
            <h2>Source Trail</h2>
            <ul class="source-list">
              ${sourceRows(event)}
            </ul>
            ${isPublic ? "" : `<p class="watch-note">${festival ? "This festival lead is intentionally noindexed until exact dates, tickets, lineup, or a direct official source confirms the details." : "This lead is intentionally noindexed until a direct venue, promoter, ticketing, RA, SmartShanghai detail, or official artist source confirms the details."}</p>`}
          </section>
          ${renderTrustLedger(event)}
        </article>
        ${sharedFooter("../")}
        ${eventStatusScript()}
      </main>
    `,
  });
}

function pageShell({ title, description, canonical, ogTitle, ogDescription, ogImage, ogAlt, robots, schema, body }) {
  return renderHtmlDocument({
    head: renderSeoHead(siteStructure, {
      title,
      description,
      canonical,
      ogTitle,
      ogDescription,
      ogImage,
      ogAlt,
      robots,
      schema,
      assetPrefix: "../",
      stylesheets: [
        siteStructure.site.eventDetailStylesheet,
        siteStructure.site.themeStylesheet,
      ],
    }),
    body,
  });
}

function nav(prefix = "") {
  return renderPrimaryNav(siteStructure, { prefix, activeId: "poster-wall" });
}

function sharedFooter(prefix = "") {
  return renderBottomDispatchFooter(siteStructure, { prefix });
}

function eventStatusScript() {
  return `<script>
    (() => {
      const root = document.querySelector("[data-event-detail]");
      if (!root) return;
      const archiveCutoffHour = 6;
      const event = {
        sortDate: root.dataset.eventSortDate || "",
        status: root.dataset.eventStatus || "",
        confidence: root.dataset.eventConfidence || "",
        sourceStatus: root.dataset.eventSourceStatus || "",
        kind: root.dataset.eventKind || "event"
      };
      const dateOnly = value => {
        const match = String(value || "").match(/\\d{4}-\\d{2}-\\d{2}/);
        return match ? match[0] : "";
      };
      const shanghaiDateKey = now => {
        const parts = new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Shanghai",
          year: "numeric",
          month: "2-digit",
          day: "2-digit"
        }).formatToParts(now).reduce((acc, part) => {
          if (part.type !== "literal") acc[part.type] = part.value;
          return acc;
        }, {});
        return parts.year && parts.month && parts.day ? parts.year + "-" + parts.month + "-" + parts.day : "";
      };
      const eventArchiveCutoff = row => {
        const sortDate = dateOnly(row.sortDate);
        if (!sortDate) return null;
        const cutoff = new Date(sortDate + "T" + String(archiveCutoffHour).padStart(2, "0") + ":00:00+08:00");
        cutoff.setUTCDate(cutoff.getUTCDate() + 1);
        return cutoff;
      };
      const eventIsPastByCutoff = (row, now) => {
        if (String(row.status || "").toLowerCase() === "past") return true;
        const cutoff = eventArchiveCutoff(row);
        return cutoff ? now.getTime() >= cutoff.getTime() : false;
      };
      const eventTemporalStatus = (row, now) => {
        const rawStatus = String(row.status || "").toLowerCase();
        if (rawStatus === "past" || eventIsPastByCutoff(row, now)) return "past";
        const sortDate = dateOnly(row.sortDate);
        const todayKey = shanghaiDateKey(now);
        if (sortDate && todayKey && sortDate <= todayKey) return "current";
        return "upcoming";
      };
      const eventIsWatchStatus = row => (
        String(row.status || "").toLowerCase() === "watch"
        || row.confidence === "Watch"
        || String(row.sourceStatus || "").toLowerCase() === "watchlist"
      );
      const eventEffectiveStatus = (row, now) => {
        const temporalStatus = eventTemporalStatus(row, now);
        if (temporalStatus === "past") return "past";
        if (eventIsWatchStatus(row)) return "watch";
        return temporalStatus;
      };
      const eventStatusLabel = (row, now) => {
        const temporalStatus = eventTemporalStatus(row, now);
        const status = eventEffectiveStatus(row, now);
        if (String(row.kind || "").toLowerCase() === "festival") {
          if (status === "watch") return temporalStatus === "current" ? "current festival watch" : "festival watch";
          if (temporalStatus === "past") return "past festival";
          if (temporalStatus === "current") return "current festival";
          return "festival";
        }
        if (status === "watch" && temporalStatus === "current") return "current watch";
        return status;
      };
      const label = eventStatusLabel(event, new Date());
      document.querySelectorAll("[data-event-status-label]").forEach(node => {
        node.textContent = label;
      });
    })();
  </script>`;
}

function fact(label, value) {
  return `<div class="fact"><span>${escapeHtml(label)}</span><b>${escapeHtml(value || "Check source")}</b></div>`;
}

function eventFacts(event) {
  return [
    fact("Date", event.date || event.sortDate),
    fact("Time", event.time || "Check source"),
    fact("Venue", event.venue || "Shanghai"),
    fact("District", event.district || "Shanghai"),
    fact("Sound", event.genre || "electronic"),
    fact("Price", event.price || "Check source"),
    fact("Age / ID", event.age || "Check venue"),
    fact("Source layer", event.sourceStatus || event.confidence || "source checked"),
    fact("Intensity", event.decisionProfile?.intensity || "medium"),
    fact("Credibility", event.decisionProfile?.credibility || "source checked"),
  ].join("");
}

function tagHtml(event) {
  const soundTags = soundTagLabels(event.soundTags || []).slice(0, 6);
  const decisionTags = Array.isArray(event.decisionTags) ? event.decisionTags.slice(0, 6) : [];
  if (!soundTags.length && !decisionTags.length) return "";
  return `
          <section class="copy-block decision-block">
            <h2>Event Tags</h2>
            <p>Simple tags for sound, room context, ticket/source status, and details that still need a source check.</p>
            <div class="decision-tags">
              ${soundTags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}
              ${decisionTags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}
            </div>
          </section>`;
}

function festivalFacts(event) {
  const festival = event.festival || {};
  return [
    fact("Kind", "Festival / multi-event lead"),
    fact("Date window", festival.dateWindow || event.date || event.sortDate),
    fact("Program time", event.time || "TBA"),
    fact("Venue / area", event.venue || "Shanghai"),
    fact("Format", festival.format || event.genre || "Festival"),
    fact("Program status", festival.programStatus || "Program details need confirmation"),
    fact("Ticketing", festival.ticketingStatus || event.ticketStatus || event.price || "Check source"),
    fact("Source layer", event.sourceStatus || event.confidence || "source checked"),
  ].join("");
}

function festivalProgramHtml(event) {
  const highlights = programHighlights(event);
  const festival = event.festival || {};
  const summaryRows = [
    festival.dateStatus ? ["Date status", festival.dateStatus] : null,
    festival.acquisitionUse ? ["Acquisition use", festival.acquisitionUse] : null,
  ].filter(Boolean);
  return `
    ${summaryRows.length ? `<div class="program-summary">${summaryRows.map(([label, value]) => `<p><b>${escapeHtml(label)}</b><span>${escapeHtml(value)}</span></p>`).join("")}</div>` : ""}
    ${highlights.length ? `
      <ul class="lineup-list program-list">
        ${highlights.map(item => `<li><b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.note || "Program highlight listed by the festival source.")}</span></li>`).join("")}
      </ul>
    ` : `<p>Festival program details are still limited. Use the source trail before treating dates, lineups, or ticketing as final.</p>`}
  `;
}

function sourceRows(event) {
  const sources = Array.isArray(event.sources) && event.sources.length
    ? event.sources
    : [{ label: event.sourceLabel || "Source", url: event.source, status: event.sourceStatus || event.confidence, lastChecked: event.lastChecked }];
  const sourceMarkup = sources
    .filter(source => source && source.url)
    .map(source => {
      const note = sourceVerificationNote(source);
      return `
      <li>
        <a href="${escapeAttr(eventPageHref(source.url, "../"))}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label || "Source")}</a>
        <span>${escapeHtml(source.status || "source")} / checked ${escapeHtml(source.lastChecked || event.lastChecked || dataLastmod)}</span>
        ${note ? `<span class="source-note">${escapeHtml(note)}</span>` : ""}
      </li>
    `;
    })
    .join("");
  const socialMarkup = eventSocialLinksForPage(event)
    .map(link => `
      <li class="social-source">
        <a href="${escapeAttr(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label || "Instagram")}</a>
        <span>${escapeHtml(link.status || "social-profile")} / ${escapeHtml(link.sourceStatus || "social-lead")} / checked ${escapeHtml(link.checked || event.lastChecked || dataLastmod)}</span>
      </li>
    `)
    .join("");
  return sourceMarkup || socialMarkup ? `${sourceMarkup}${socialMarkup}` : `<li><span>No source URL is attached yet.</span></li>`;
}

function sourceVerificationNote(source = {}) {
  return source.browserCheck || source.verificationNote || source.accessNote || "";
}

function renderRecommendationLedger(event) {
  const rows = [
    ["Recommendation", event.recommendationReason || selectionBasis(event)],
    ["Best for", event.bestFor || bestForFallback(event)],
    ["Verify before going", event.verifyBeforeGoing || event.ticketStatus || "Recheck the source link for same-day ticket availability, final set times, and venue door policy."],
    ["Source confidence", event.sourceConfidence || event.sourceStatus || event.confidence || "source checked"],
  ];
  return `
          <section class="copy-block recommendation-ledger" aria-label="How we recommend this event">
            <h2>How We Recommend This</h2>
            <ul class="lineup-list">
              ${rows.map(([label, value]) => `<li><b>${escapeHtml(label)}</b><span>${escapeHtml(value)}</span></li>`).join("")}
            </ul>
          </section>`;
}

function renderTrustLedger(event) {
  const rows = [
    ["Last checked", event.lastChecked || dataLastmod],
    ["Selection basis", selectionBasis(event)],
    ["Commercial relationship", commercialRelationship(event)],
    ["Correction route", `Send source fixes through RED ${siteStructure.site.contactHandle || siteStructure.site.socialLabel || "updates"} or the corrections policy.`],
  ];
  return `
          <section class="copy-block trust-ledger" aria-label="Trust ledger">
            <h2>Trust Ledger</h2>
            <ul class="lineup-list">
              ${rows.map(([label, value]) => `<li><b>${escapeHtml(label)}</b><span>${escapeHtml(value)}</span></li>`).join("")}
              <li><b>Policy</b><span><a href="../trust.html">How We Recommend</a> / <a href="../trust.html#corrections">Corrections</a></span></li>
            </ul>
          </section>`;
}

function selectionBasis(event) {
  if (eventIsWatchStatus(event)) {
    return "Watchlist lead kept visible for source monitoring; do not treat date, lineup, or ticketing as final until stronger evidence lands.";
  }
  const tags = Array.isArray(event.decisionTags) && event.decisionTags.length ? event.decisionTags.slice(0, 3).join(", ") : "";
  return tags
    ? `Included for source visibility, room fit, and these editorial signals: ${tags}.`
    : "Included for source visibility, room fit, rave relevance, and calendar usefulness.";
}

function bestForFallback(event) {
  const tags = Array.isArray(event.decisionTags) ? event.decisionTags.join(" ").toLowerCase() : "";
  const sounds = Array.isArray(event.soundTags) ? event.soundTags.join(" ").toLowerCase() : "";
  const text = `${tags} ${sounds} ${event.genre || ""}`.toLowerCase();
  if (eventIsWatchStatus(event)) return "Readers tracking leads who are comfortable verifying details before making plans.";
  if (/hard|industrial|trance/.test(text)) return "Hard-rave and late-room listeners who want higher-pressure club programming.";
  if (/rooftop|date route|groovy|melodic/.test(text)) return "Date-night planners and readers who want a social route with lighter club pressure.";
  if (/live|listening|experimental|ambient/.test(text)) return "Listening-first readers and live-electronic crossover audiences.";
  return "Readers comparing source-backed Shanghai electronic and club options.";
}

function commercialRelationship(event) {
  return event.commercialRelationship || event.commercialLabel || event.sponsorship || "No paid placement recorded.";
}

function eventSchema(event, canonical, image) {
  const socialLinks = eventSocialLinksForPage(event);
  const sameAs = unique([
    schemaUrl(event.detailsUrl || event.source),
    ...socialLinks.map(link => link.url),
  ].filter(Boolean));
  const schema = {
    "@type": "MusicEvent",
    "@id": `${canonical}#event`,
    "name": event.title,
    "url": canonical,
    "description": event.description || `${event.title} at ${event.venue || "Shanghai"}.`,
    "startDate": startDate(event),
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "image": [image],
    "location": locationSchema(event),
    "sameAs": sameAs.length === 1 ? sameAs[0] : sameAs,
    "organizer": event.organizer ? {
      "@type": "Organization",
      "name": event.organizer,
      "sameAs": socialLinksForEntity(event.organizer, socialRegistry).map(link => link.url),
    } : undefined,
    "performer": event.lineup.slice(0, 12).map(item => compact({
      "@type": "PerformingGroup",
      "name": item.name,
      "sameAs": socialLinksForEntity(item.name, socialRegistry).map(link => link.url),
    })),
    "offers": offerSchema(event),
  };
  const end = endDate(event);
  if (end) schema.endDate = end;
  return compact(schema);
}

function readSocialProfiles() {
  if (!fs.existsSync(SOCIAL_PROFILES_FILE)) return {};
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(SOCIAL_PROFILES_FILE, "utf8"), sandbox, { filename: SOCIAL_PROFILES_FILE });
  return sandbox.window.SOCIAL_PROFILE_DATA || {};
}

function eventSocialLinksForPage(event) {
  return eventSocialLinks(event, socialRegistry, { limitArtists: 6 });
}

function unique(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function locationSchema(event) {
  const address = {
    "@type": "PostalAddress",
    "addressLocality": "Shanghai",
    "addressRegion": event.district || "Shanghai",
    "addressCountry": "CN",
  };
  if (event.address) {
    address.streetAddress = event.address;
  } else {
    address.name = `${event.venue || "Venue TBA"}, ${event.district || "Shanghai"}, Shanghai, China`;
  }
  return {
    "@type": "Place",
    "name": event.venue || "Shanghai venue",
    "address": address,
  };
}

function offerSchema(event) {
  const url = event.ticketUrl || event.detailsUrl || event.source;
  if (!url) return undefined;
  const price = parsePrice(event.price);
  const offer = {
    "@type": "Offer",
    "url": schemaUrl(url),
    "availability": /sold\s*out/i.test(event.price || "") ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
    "priceCurrency": "CNY",
  };
  if (price !== null) offer.price = price;
  else offer.name = event.price || "Check source";
  return offer;
}

function breadcrumbSchema(items) {
  return {
    "@type": "BreadcrumbList",
    "itemListElement": items.map(([name, item], index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": name,
      "item": item,
    })),
  };
}

function renderSitemap(list) {
  const staticRoutes = staticSitemapRoutes(siteStructure);
  const eventRoutes = list.filter(isPublicEvent).map(event => [
    `/events/${event.id}`,
    dateOnly(event.lastChecked || event.sortDate) || dataLastmod,
    eventEffectiveStatus(event) === "past" ? "monthly" : "daily",
    eventEffectiveStatus(event) === "past" ? "0.45" : "0.7",
  ]);
  const urls = [...staticRoutes, ...eventRoutes];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([loc, lastmod, changefreq, priority]) => `  <url>
    <loc>${escapeXml(`${SITE_URL}${loc}`)}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
    <changefreq>${escapeXml(changefreq)}</changefreq>
    <priority>${escapeXml(priority)}</priority>
  </url>`).join("\n")}
</urlset>
`;
}

function isPublicEvent(event) {
  return !eventIsWatchStatus(event);
}

function eventUrl(event) {
  return `${SITE_URL}/events/${event.id}`;
}

function imageUrl(event) {
  const poster = bestDisplayPosterAsset(event);
  if (poster) {
    return `${SITE_URL}/${poster}`;
  }
  return `${SITE_URL}/og-image.png`;
}

function trackedTicketUrl(event, prefix = "") {
  const destination = event.ticketUrl || event.ticket || event.source || "";
  if (!destination) return "#";
  if (!/^https?:\/\//i.test(destination)) return eventPageHref(destination, prefix);
  return `${prefix}ticket.html?event=${encodeURIComponent(event.id)}&to=${encodeURIComponent(destination)}`;
}

function eventPageHref(url, prefix = "") {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^(?:https?:|mailto:|tel:|#)/i.test(value) || value.startsWith("../") || value.startsWith("/")) return value;
  if (/^assets\//i.test(value)) return `${prefix}${value}`;
  return value;
}

function schemaUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (/^\//.test(value)) return `${SITE_URL}${value}`;
  if (/^assets\//i.test(value)) return `${SITE_URL}/${value}`;
  return value;
}

function relativeImagePath(event) {
  const poster = bestDisplayPosterAsset(event);
  if (poster) {
    return `../${poster}`;
  }
  return "../og-image.png";
}

function bestDisplayPosterAsset(event) {
  const poster = normalizePosterAsset(event.posterUrl || "");
  if (!poster) return "";

  const posterFile = path.join(ROOT, poster);
  if (!fs.existsSync(posterFile)) return "";

  const optimized = optimizedPosterAsset(poster);
  const optimizedFile = path.join(ROOT, optimized);
  if (!fs.existsSync(optimizedFile)) return poster;

  const sourceBytes = fs.statSync(posterFile).size;
  const optimizedBytes = fs.statSync(optimizedFile).size;
  return optimizedBytes <= sourceBytes ? optimized : poster;
}

function normalizePosterAsset(asset) {
  const normalized = String(asset || "").trim().replace(/\\/g, "/");
  return /^assets\/posters\/[^/]+\.(?:jpe?g|png|webp)$/i.test(normalized) ? normalized : "";
}

function optimizedPosterAsset(asset) {
  const parsed = path.posix.parse(asset);
  return path.posix.join(parsed.dir, `${parsed.name}-optimized.jpg`);
}

function startDate(event) {
  const date = dateOnly(event.sortDate);
  const firstTime = firstTimeParts(event.time);
  if (!date || !firstTime) return date;
  return `${date}T${firstTime.hour}:${firstTime.minute}:00${TIMEZONE_OFFSET}`;
}

function endDate(event) {
  const date = dateOnly(event.sortDate);
  const times = allTimeParts(event.time);
  if (!date || times.length < 2) return "";
  const startMinutes = Number(times[0].hour) * 60 + Number(times[0].minute);
  const endMinutes = Number(times[1].hour) * 60 + Number(times[1].minute);
  const endDay = endMinutes <= startMinutes ? addDays(date, 1) : date;
  return `${endDay}T${times[1].hour}:${times[1].minute}:00${TIMEZONE_OFFSET}`;
}

function firstTimeParts(value) {
  return allTimeParts(value)[0] || null;
}

function allTimeParts(value) {
  return [...String(value || "").matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g)]
    .map(match => ({ hour: match[1].padStart(2, "0"), minute: match[2] }));
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function parsePrice(value) {
  const text = String(value || "").trim();
  if (/^free\b|free entry/i.test(text)) return 0;
  const match = text.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function ticketLabel(event) {
  if (eventIsWatchStatus(event)) return "Verify source";
  if (event.ticketUrl) return "Tickets";
  return "Source page";
}

function metaDescription(event) {
  const parts = [
    event.date || event.sortDate,
    event.time,
    event.venue,
    event.district ? `${event.district}, Shanghai` : "Shanghai",
    event.genre,
    event.description,
  ].filter(Boolean).join(" - ");
  return truncate(parts, 158);
}

function titleTag(value) {
  return truncate(value, 62);
}

function truncate(value, max) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}...`;
}

function dateOnly(value) {
  const match = String(value || "").match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

