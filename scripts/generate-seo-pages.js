const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_FILE = path.join(ROOT, "data", "events.json");
const EVENTS_DIR = path.join(ROOT, "events");
const SITEMAP_FILE = path.join(ROOT, "sitemap.xml");
const SITE_URL = "https://raveindexsh.top";
const SITE_NAME = "Shanghai Rave Index";
const STATIC_LASTMOD = "2026-06-12";
const TIMEZONE_OFFSET = "+08:00";
const GOOGLE_TAG_ID = "G-HP6NQ3VZB9";

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
    websiteSchema(),
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
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeAttr(description)}">
  <meta name="robots" content="${escapeAttr(robots)}">
  <meta name="theme-color" content="#c6ff3b">
  <link rel="canonical" href="${escapeAttr(canonical)}">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="icon" href="/og-image.png" type="image/png">
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      dataLayer.push(arguments);
    }
    gtag("js", new Date());
    gtag("config", "${GOOGLE_TAG_ID}");
  </script>
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:title" content="${escapeAttr(ogTitle)}">
  <meta property="og:description" content="${escapeAttr(ogDescription)}">
  <meta property="og:url" content="${escapeAttr(canonical)}">
  <meta property="og:image" content="${escapeAttr(ogImage)}">
  <meta property="og:image:alt" content="${escapeAttr(ogAlt)}">
  <script type="application/ld+json">
${jsonLd(schema)}
  </script>
  <style>
    :root {
      color-scheme: dark;
      --ink: #f2f0e8;
      --muted: #aaa59a;
      --void: #080806;
      --panel: #11110e;
      --panel-2: #181814;
      --line: #302f28;
      --acid: #c6ff3b;
      --ember: #ff6a2a;
      --cyan: #41d7ff;
      --radius: 8px;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      min-height: 100vh;
      background:
        linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px) 0 0 / 36px 36px,
        linear-gradient(0deg, rgba(255,255,255,.018) 1px, transparent 1px) 0 0 / 36px 36px,
        radial-gradient(circle at 50% -10%, rgba(255,106,42,.16), transparent 38%),
        #080806;
      color: var(--ink);
      font-family: "Aptos", "Segoe UI", sans-serif;
      letter-spacing: 0;
    }
    a { color: inherit; }
    .shell { width: min(1220px, calc(100% - 32px)); margin: 0 auto; padding: 24px 0 56px; }
    .site-nav, .nav-group, .action-row, .stat-grid { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .site-nav { justify-content: space-between; margin-bottom: 20px; color: var(--muted); }
    .nav-link, .button {
      min-height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: rgba(17,17,14,.78);
      padding: 7px 11px;
      color: var(--muted);
      text-decoration: none;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      line-height: 1.1;
    }
    .nav-link:hover, .nav-link.active, .button.primary { color: var(--void); background: var(--acid); border-color: var(--acid); }
    .button.secondary:hover { color: var(--ink); border-color: var(--ink); }
    .hero, .event-detail { border-top: 1px solid var(--line); padding-top: 28px; }
    .kicker { margin: 0 0 12px; color: var(--acid); font-size: 13px; font-weight: 900; text-transform: uppercase; }
    h1, h2 { margin: 0; font-family: "Georgia", "Times New Roman", serif; }
    h1 { max-width: 900px; font-size: clamp(42px, 7vw, 86px); line-height: .95; }
    h2 { margin-bottom: 14px; font-size: 28px; }
    .lede { max-width: 850px; color: var(--muted); font-size: 18px; line-height: 1.55; }
    .stat-grid { margin-top: 22px; }
    .stat, .fact, .event-card, .copy-block {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: rgba(17,17,14,.78);
      padding: 14px;
    }
    .stat b { display: block; color: var(--acid); font-size: 28px; }
    .stat span, .fact span, .event-meta, .source-list, .lineup-list span, figcaption, .watch-note { color: var(--muted); }
    .event-section { margin-top: 34px; }
    .event-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: 12px; }
    .event-card { display: grid; gap: 10px; text-decoration: none; }
    .event-card:hover { border-color: var(--acid); }
    .event-card h3 { margin: 0; font-size: 20px; line-height: 1.15; }
    .event-meta { font-size: 13px; line-height: 1.4; }
    .event-hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 360px); gap: 24px; align-items: start; }
    figure { margin: 0; }
    img { width: 100%; border: 1px solid var(--line); border-radius: var(--radius); background: var(--panel-2); object-fit: cover; }
    figcaption { margin-top: 8px; font-size: 12px; }
    .facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-top: 24px; }
    .fact b { display: block; margin-top: 5px; font-size: 15px; }
    .copy-block { margin-top: 18px; }
    .lineup-list, .source-list { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
    .lineup-list li { display: grid; gap: 4px; }
    .crumbs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; color: var(--muted); font-size: 13px; }
    .watch-detail { border-color: rgba(255, 209, 102, .35); }
    @media (max-width: 780px) {
      .event-hero { grid-template-columns: 1fr; }
      .site-nav { align-items: flex-start; }
    }
  </style>
  <link rel="stylesheet" href="../assets/basement-dispatch.css">
</head>
<body>
${body}
</body>
</html>
`;
}

function nav(prefix = "") {
  return `
    <nav class="site-nav" aria-label="Site navigation">
      <div class="nav-group">
        <a class="nav-link" href="${prefix}index.html">Calendar</a>
        <a class="nav-link active" href="${prefix}poster-wall.html">Wall</a>
        <a class="nav-link" href="${prefix}love-wall.html">Love</a>
        <a class="nav-link" href="${prefix}poster-archive.html">Archive</a>
        <a class="nav-link" href="${prefix}planner.html">Planner</a>
        <a class="nav-link" href="${prefix}rave-everywhere.html">Everywhere</a>
        <a class="nav-link" href="${prefix}venues.html">Venues</a>
        <a class="nav-link" href="${prefix}djs.html">DJs</a>
      </div>
      <span>Basement Dispatch / source-first calendar</span>
    </nav>
  `;
}

function sharedFooter(prefix = "") {
  return `
    <footer class="footnotes bottom-dispatch-bar" aria-label="Basement Dispatch status">
      <div class="bar-cell update-cell">
        <span class="footer-alert-mark" aria-hidden="true">!</span>
        <strong>Event data<br>can move</strong>
      </div>
      <div class="bar-cell">
        <span>Generated pages mirror the public calendar format.</span>
        <span>Confirm source links before planning around details.</span>
      </div>
      <address class="bar-cell">
        <span>Questions or updates?</span>
        <a href="mailto:info@shanghairaveindex.com">info@shanghairaveindex.com</a>
        <span>IG @shanghairaveindex</span>
      </address>
      <div class="bar-cell">
        <span>Information is aggregated from public sources and may change.</span>
        <span>Watchlist leads stay noindexed until stronger evidence lands.</span>
      </div>
      <a class="bar-cell ops-cell" href="${prefix}ops.html" aria-label="Open Ops desk">
        <span>Ops desk</span>
        <b>Review queue -></b>
      </a>
      <div class="bar-cell source-cell">
        <span>Source first</span>
        <span>Rave second</span>
      </div>
    </footer>
  `;
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

function websiteSchema() {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    "name": SITE_NAME,
    "url": `${SITE_URL}/`,
    "inLanguage": "en",
    "publisher": {
      "@type": "Organization",
      "name": "Basement Dispatch",
      "url": `${SITE_URL}/`,
      "logo": {
        "@type": "ImageObject",
        "url": `${SITE_URL}/og-image.png`,
      },
    },
  };
}

function graph(nodes) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.map(compact),
  };
}

function renderSitemap(list) {
  const staticRoutes = [
    ["/", STATIC_LASTMOD, "daily", "1.0"],
    ["/poster-wall", STATIC_LASTMOD, "daily", "0.95"],
    ["/love-wall", STATIC_LASTMOD, "weekly", "0.93"],
    ["/poster-archive", STATIC_LASTMOD, "weekly", "0.92"],
    ["/planner", STATIC_LASTMOD, "weekly", "0.9"],
    ["/rave-everywhere", STATIC_LASTMOD, "weekly", "0.88"],
    ["/djs", STATIC_LASTMOD, "weekly", "0.85"],
    ["/venues", STATIC_LASTMOD, "weekly", "0.8"],
  ];
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

function compact(value) {
  if (Array.isArray(value)) return value.map(compact).filter(item => item !== undefined);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined && item !== "" && !(Array.isArray(item) && item.length === 0))
      .map(([key, item]) => [key, compact(item)])
  );
}

function jsonLd(value) {
  return JSON.stringify(value, null, 2).replace(/</g, "\\u003c");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function escapeXml(value) {
  return escapeHtml(value);
}
