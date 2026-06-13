const fs = require("fs");
const path = require("path");
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

const ROOT = path.resolve(__dirname, "..");
const DATA_FILE = path.join(ROOT, "data", "events.json");
const EVENTS_DIR = path.join(ROOT, "events");
const SITEMAP_FILE = path.join(ROOT, "sitemap.xml");
const siteStructure = readWebsiteStructure();
const SITE_URL = siteStructure.site.baseUrl;
const SITE_NAME = siteStructure.site.name;
const STATIC_LASTMOD = siteStructure.site.staticLastmod;
const TIMEZONE_OFFSET = siteStructure.site.timezoneOffset;

const payload = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
const events = Array.isArray(payload) ? payload : payload.events;
const lineups = Array.isArray(payload) ? {} : payload.lineups || {};
const dataLastmod = dateOnly(payload.verified || payload.generatedAt) || STATIC_LASTMOD;

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
  .map(event => ({ ...event, lineup: normalizedLineup(event) }))
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

function renderEventPage(event) {
  const isPublic = isPublicEvent(event);
  const canonical = eventUrl(event);
  const image = imageUrl(event);
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
      ["Wall", `${SITE_URL}/poster-wall`],
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
          <a href="../poster-wall.html">Wall</a>
          <span>/</span>
          <span>${escapeHtml(event.title)}</span>
        </nav>
        <article class="event-detail ${isPublic ? "" : "watch-detail"}">
          <header class="event-hero">
            <div>
              <p class="kicker">${escapeHtml(event.status || "event")} / ${escapeHtml(event.confidence || "source checked")}</p>
              <h1>${escapeHtml(event.title)}</h1>
              <p class="lede">${escapeHtml(event.description || "Public event listing; confirm final details at the source before planning.")}</p>
              <div class="action-row">
                <a class="button primary" href="${escapeAttr(event.ticketUrl || event.detailsUrl || event.source || "#")}" target="_blank" rel="noopener noreferrer">${escapeHtml(ticketLabel(event))}</a>
                <a class="button secondary" href="${escapeAttr(event.detailsUrl || event.source || "#")}" target="_blank" rel="noopener noreferrer">Source</a>
                <a class="button secondary" href="../index.html">Calendar</a>
              </div>
            </div>
            <figure>
              <img src="${escapeAttr(relativeImagePath(event))}" alt="${escapeAttr(`${event.title} event poster or Shanghai Rave Index preview`)}" loading="eager" decoding="async" fetchpriority="high">
              <figcaption>${escapeHtml(event.sourceLabel || "Source")} / checked ${escapeHtml(event.lastChecked || dataLastmod)}</figcaption>
            </figure>
          </header>
          <section class="facts" aria-label="Event facts">
            ${fact("Date", event.date || event.sortDate)}
            ${fact("Time", event.time || "Check source")}
            ${fact("Venue", event.venue || "Shanghai")}
            ${fact("District", event.district || "Shanghai")}
            ${fact("Sound", event.genre || "electronic")}
            ${fact("Price", event.price || "Check source")}
            ${fact("Age / ID", event.age || "Check venue")}
            ${fact("Source layer", event.sourceStatus || event.confidence || "source checked")}
          </section>
          <section class="copy-block">
            <h2>Lineup and Notes</h2>
            ${event.lineup.length ? `
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
            ${isPublic ? "" : `<p class="watch-note">This lead is intentionally noindexed until a direct venue, promoter, ticketing, RA, SmartShanghai detail, or official artist source confirms the details.</p>`}
          </section>
        </article>
        ${sharedFooter("../")}
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

function fact(label, value) {
  return `<div class="fact"><span>${escapeHtml(label)}</span><b>${escapeHtml(value || "Check source")}</b></div>`;
}

function sourceRows(event) {
  const sources = Array.isArray(event.sources) && event.sources.length
    ? event.sources
    : [{ label: event.sourceLabel || "Source", url: event.source, status: event.sourceStatus || event.confidence, lastChecked: event.lastChecked }];
  return sources
    .filter(source => source && source.url)
    .map(source => `
      <li>
        <a href="${escapeAttr(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label || "Source")}</a>
        <span>${escapeHtml(source.status || "source")} / checked ${escapeHtml(source.lastChecked || event.lastChecked || dataLastmod)}</span>
      </li>
    `)
    .join("") || `<li><span>No source URL is attached yet.</span></li>`;
}

function eventSchema(event, canonical, image) {
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
    "sameAs": event.detailsUrl || event.source,
    "organizer": event.organizer ? {
      "@type": "Organization",
      "name": event.organizer,
    } : undefined,
    "performer": event.lineup.slice(0, 12).map(item => ({
      "@type": "PerformingGroup",
      "name": item.name,
    })),
    "offers": offerSchema(event),
  };
  const end = endDate(event);
  if (end) schema.endDate = end;
  return compact(schema);
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
    "url": url,
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
    event.status === "past" ? "monthly" : "daily",
    event.status === "past" ? "0.45" : "0.7",
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
  return event.status !== "watch" && event.sourceStatus !== "watchlist" && event.confidence !== "Watch";
}

function eventUrl(event) {
  return `${SITE_URL}/events/${event.id}`;
}

function imageUrl(event) {
  const poster = event.posterUrl || "";
  if (/^assets\/posters\/[^/]+\.(?:jpe?g|png|webp)$/i.test(poster)) {
    return `${SITE_URL}/${poster}`;
  }
  return `${SITE_URL}/og-image.png`;
}

function relativeImagePath(event) {
  const poster = event.posterUrl || "";
  if (/^assets\/posters\/[^/]+\.(?:jpe?g|png|webp)$/i.test(poster) && fs.existsSync(path.join(ROOT, poster))) {
    return `../${poster}`;
  }
  return "../og-image.png";
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
  if (event.status === "watch" || event.sourceStatus === "watchlist") return "Verify Source";
  if (event.ticketUrl) return "Tickets";
  return "Event Source";
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

