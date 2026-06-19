// scripts/generate-event-pages.js
//
// Auto-generates events/<id>.html detail pages for every event in
// data/events.json that does not yet have one.
//
// Usage (run from project root):
//     node scripts/generate-event-pages.js                # only create missing pages
//     node scripts/generate-event-pages.js --force        # overwrite every page
//     node scripts/generate-event-pages.js --ids a,b,c    # only specific IDs
//
// Output files are written to events/<event.id>.html using the same
// basement-dispatch template that the existing event pages share.
//
// Designed to be idempotent: re-running after adding new events to
// data/events.json will only create the pages that are actually missing
// (unless --force is used).

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EVENTS_JSON = 'data/events.json';
const EVENTS_DIR = 'events';
const ALTER_PAVILLON_FILE = path.join(EVENTS_DIR, 'alter-pavillon.html');

// --- command-line flags ------------------------------------------------
const args = process.argv.slice(2);
let force = false;
let onlyIds = null;

for (const a of args) {
  if (a === '--force' || a === '-f') force = true;
  else if (a.startsWith('--ids=')) onlyIds = a.slice('--ids='.length).split(',').map((s) => s.trim()).filter(Boolean);
  else if (a === '--help' || a === '-h') {
    console.log(`Usage: node ${process.argv[1]} [--force] [--ids=a,b,c]`);
    process.exit(0);
  }
}

// --- helpers -----------------------------------------------------------
function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function encodeUrl(value) {
  return encodeURIComponent(String(value || ''));
}

function posterUrlFor(event) {
  const poster = bestDisplayPosterAsset(event);
  if (poster) return poster;
  // Fallback to the poster listed for alter-pavillon since that's the
  // one that ships with the repo as a canonical default.
  return 'assets/posters/alter-pavillon-optimized.jpg';
}

function bestDisplayPosterAsset(event) {
  const poster = normalizePosterAsset(event.posterUrl || '');
  if (!poster) return '';

  const posterFile = path.join(ROOT, poster);
  if (!fs.existsSync(posterFile)) return '';
  if (/-optimized\.jpg$/i.test(poster)) return poster;

  const optimized = optimizedPosterAsset(poster);
  const optimizedFile = path.join(ROOT, optimized);
  if (!fs.existsSync(optimizedFile)) return poster;

  return fs.statSync(optimizedFile).size <= fs.statSync(posterFile).size ? optimized : poster;
}

function normalizePosterAsset(asset) {
  const normalized = String(asset || '').trim().replace(/\\/g, '/');
  return /^assets\/posters\/[^/]+\.(?:jpe?g|png|webp)$/i.test(normalized) ? normalized : '';
}

function optimizedPosterAsset(asset) {
  const parsed = path.posix.parse(asset);
  return path.posix.join(parsed.dir, `${parsed.name}-optimized.jpg`);
}

function statusKicker(event) {
  const conf = String(event.confidence || '').toLowerCase();
  const stat = String(event.status || '').toLowerCase();
  if (stat === 'watch' || conf === 'watch') return 'watch / Watch';
  return 'upcoming / High';
}

// --- load data ---------------------------------------------------------
if (!fs.existsSync(EVENTS_JSON)) {
  console.error(`[event-pages] missing ${EVENTS_JSON}; run from repo root.`);
  process.exit(1);
}
if (!fs.existsSync(ALTER_PAVILLON_FILE)) {
  console.error(`[event-pages] missing ${ALTER_PAVILLON_FILE}; the template file is required.`);
  process.exit(1);
}

const eventsData = JSON.parse(fs.readFileSync(EVENTS_JSON, 'utf8'));
const events = Array.isArray(eventsData.events) ? eventsData.events : [];
if (!events.length) {
  console.error('[event-pages] events array is empty.');
  process.exit(1);
}

// Ensure events/ directory exists.
if (!fs.existsSync(EVENTS_DIR)) fs.mkdirSync(EVENTS_DIR, { recursive: true });

const existingFiles = new Set(
  fs.readdirSync(EVENTS_DIR)
    .filter((f) => f.endsWith('.html'))
    .map((f) => f.slice(0, -'.html'.length)),
);

// --- build target list ------------------------------------------------
const targets = events.filter((event) => {
  if (!event || !event.id) return false;
  if (onlyIds && onlyIds.length && !onlyIds.includes(event.id)) return false;
  if (!force && existingFiles.has(event.id)) return false;
  return true;
});

if (!targets.length) {
  console.log(`[event-pages] nothing to do (${force ? 'force mode but no events in data' : 'all event pages already exist'}).`);
  process.exit(0);
}

// --- page renderer -----------------------------------------------------
function renderPage(event) {
  const id = event.id;
  const title = event.title;
  const date = event.date || event.sortDate;
  const time = event.time || '';
  const venue = event.venue || '';
  const district = event.district || '';
  const genre = event.genre || '';
  const price = event.price || 'Not listed';
  const age = event.age || 'Not listed';
  const source = event.source || event.detailsUrl || '';
  const description = event.description || '';
  const lastChecked = event.lastChecked || '2026-06-18';
  const organizer = event.organizer || '';
  const address = event.address || venue;
  const sound = genre;
  const poster = posterUrlFor(event);
  const soundTags = (event.soundTags || []).map((t) => `<span>${escapeHtml(t)}</span>`).join('');
  const decisionTags = (event.decisionTags || []).map((t) => `<span>${escapeHtml(t)}</span>`).join('');

  const lineup = Array.isArray(event.lineup) && event.lineup.length
    ? event.lineup.map((l) => `<li><b>${escapeHtml(l.name)}</b><span>${escapeHtml(l.note || '')}</span></li>`).join('')
    : `<li><b>Lineup TBA</b><span>DJ lineup was not detailed in the public source; check the event page or venue channel for the latest names.</span></li>`;

  const sources = Array.isArray(event.sources) && event.sources.length
    ? event.sources.map((s) => `<li><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.label)}</a><span>${escapeHtml(s.status || 'secondary')} / checked ${escapeHtml(s.lastChecked || lastChecked)}</span></li>`).join('')
    : `<li><a href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">${escapeHtml(event.sourceLabel || 'Source')}</a><span>secondary / checked ${escapeHtml(lastChecked)}</span></li>`;

  const ticketEncoded = `../ticket.html?event=${encodeUrl(id)}&to=${encodeUrl(source)}`;
  const metaDesc = `${escapeHtml(date)} - ${escapeHtml(time)} - ${escapeHtml(venue)} - ${escapeHtml(district)}, Shanghai - ${escapeHtml(genre)} - ${escapeHtml(description)}`.slice(0, 190);

  const recReason = event.recommendationReason || `Recommended because ${escapeHtml(venue)} provides a companion listing in this calendar; it is not positioned as a dedicated techno pick.`;
  const bestFor = event.bestFor || `Best for readers looking for a social/dancefloor-adjacent option at ${escapeHtml(venue)} rather than a pure-techno night.`;
  const verifyBefore = event.verifyBeforeGoing || `Recheck the latest event page, ticket availability, final lineup, start time, and venue address before making plans.`;
  const sourceConfidence = event.sourceConfidence || `Watch-level confidence from SmartShanghai listings; verify with the venue or a dedicated detail page before treating it as a pick.`;

  const intensity = event.decisionProfile && event.decisionProfile.intensity ? event.decisionProfile.intensity : 'soft';
  const credibility = event.decisionProfile && event.decisionProfile.credibility ? event.decisionProfile.credibility : 'unconfirmed';
  const sourceLayer = event.sourceStatus || 'secondary';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | Shanghai Rave Index</title>
  <meta name="description" content="${metaDesc}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <meta name="theme-color" content="#c6ff3b">
  <link rel="canonical" href="https://raveindexsh.top/events/${escapeHtml(id)}">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32">
  <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-HP6NQ3VZB9"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag("js", new Date());
    gtag("config", "G-HP6NQ3VZB9");
  </script>
  <!-- Vercel Web Analytics -->
  <script>
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  </script>
  <script defer src="/_vercel/insights/script.js"></script>
  <script defer src="../assets/poster-protection.js?v=poster-protection-20260620"></script>
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Shanghai Rave Index">
  <meta property="og:title" content="${escapeHtml(title)} | Shanghai Rave Index">
  <meta property="og:description" content="${metaDesc}">
  <meta property="og:url" content="https://raveindexsh.top/events/${escapeHtml(id)}">
  <meta property="og:image" content="https://raveindexsh.top/${escapeHtml(poster)}">
  <meta property="og:image:alt" content="${escapeHtml(title)} event poster or Shanghai Rave Index preview">
  <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://raveindexsh.top/#website",
      "name": "Shanghai Rave Index",
      "url": "https://raveindexsh.top/",
      "inLanguage": "en",
      "publisher": {
        "@type": "Organization",
        "name": "Basement Dispatch",
        "url": "https://raveindexsh.top/",
        "logo": { "@type": "ImageObject", "url": "https://raveindexsh.top/og-image.png" }
      }
    },
    {
      "@type": "WebPage",
      "@id": "https://raveindexsh.top/events/${escapeHtml(id)}#webpage",
      "url": "https://raveindexsh.top/events/${escapeHtml(id)}",
      "name": "${escapeHtml(title)} | Shanghai Rave Index",
      "description": "${metaDesc}",
      "isPartOf": { "@id": "https://raveindexsh.top/#website" },
      "dateModified": "${escapeHtml(lastChecked)}",
      "about": { "@id": "https://raveindexsh.top/events/${escapeHtml(id)}#event" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://raveindexsh.top" },
        { "@type": "ListItem", "position": 2, "name": "Events", "item": "https://raveindexsh.top/poster-wall" },
        { "@type": "ListItem", "position": 3, "name": "${escapeHtml(title)}", "item": "https://raveindexsh.top/events/${escapeHtml(id)}" }
      ]
    },
    {
      "@type": "MusicEvent",
      "@id": "https://raveindexsh.top/events/${escapeHtml(id)}#event",
      "name": "${escapeHtml(title)}",
      "url": "https://raveindexsh.top/events/${escapeHtml(id)}",
      "description": "${escapeHtml(description)}",
      "startDate": "${escapeHtml(event.sortDate)}T22:00:00+08:00",
      "eventStatus": "https://schema.org/EventScheduled",
      "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
      "image": [ "https://raveindexsh.top/${escapeHtml(poster)}" ],
      "location": {
        "@type": "Place",
        "name": "${escapeHtml(venue)}",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Shanghai",
          "addressRegion": "${escapeHtml(district)}",
          "addressCountry": "CN",
          "streetAddress": "${escapeHtml(address)}"
        }
      },
      "sameAs": [ "${escapeHtml(source)}" ],
      "organizer": { "@type": "Organization", "name": "${escapeHtml(organizer || venue)}" },
      "performer": [ { "@type": "PerformingGroup", "name": "DJ music" } ],
      "offers": {
        "@type": "Offer",
        "url": "${escapeHtml(source)}",
        "availability": "https://schema.org/InStock",
        "priceCurrency": "CNY",
        "price": "Check venue"
      },
      "endDate": "${escapeHtml(event.sortDate)}T04:00:00+08:00"
    }
  ]
}
  </script>
  <link rel="stylesheet" href="../assets/event-detail.css">
  <link rel="stylesheet" href="../assets/basement-dispatch.css?v=xhs-contact-20260613c">
</head>
<body>

  <main class="shell dispatch-shell">

    <nav class="site-nav" aria-label="Site navigation">
      <div class="nav-group">
        <a class="nav-link active" href="../poster-wall.html">Events</a>
        <a class="nav-link" href="../index.html">Calendar</a>
        <a class="nav-link" href="../planner.html">Planner <small class="nav-beta">beta</small></a>
        <a class="nav-link" href="../live-room.html">Tonight <small class="nav-beta">beta</small></a>
        <a class="nav-link" href="../rave-everywhere.html">Everywhere <small class="nav-beta">beta</small></a>
        <a class="nav-link" href="../love-wall.html">Love</a>
        <a class="nav-link" href="../venues.html">Venues</a>
        <a class="nav-link" href="../djs.html">DJs</a>
        <a class="nav-link" href="../new-to-techno.html">New?</a>
        <a class="nav-link" href="../contribute.html">Contribute</a>
        <a class="nav-link" href="../account.html">Account</a>
      </div>
      <span>Basement Dispatch / source-first calendar</span>
    </nav>

    <nav class="crumbs" aria-label="Breadcrumb">
      <a href="../index.html">Calendar</a>
      <span>/</span>
      <a href="../poster-wall.html">Events</a>
      <span>/</span>
      <span>${escapeHtml(title)}</span>
    </nav>

    <article class="event-detail">
      <header class="event-hero">
        <div>
          <p class="kicker">${escapeHtml(statusKicker(event))}</p>
          <h1>${escapeHtml(title)}</h1>
          <p class="lede">${escapeHtml(description)}</p>
          <div class="action-row">
            <a class="button primary" href="${ticketEncoded}" target="_blank" rel="noopener noreferrer">Tickets</a>
            <a class="button secondary" href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">Source</a>
            <a class="button secondary live-room-return" href="../live-room.html?room=${encodeUrl(id)}#live-room">Tonight room</a>
            <a class="button secondary" href="../index.html">Calendar</a>
          </div>
        </div>
        <figure>
          <img src="../${escapeHtml(poster)}" alt="${escapeHtml(title)} event poster or Shanghai Rave Index preview" loading="eager" decoding="async" fetchpriority="high" data-poster-protected="true" draggable="false">
          <figcaption>${escapeHtml(event.sourceLabel || 'Source')} / checked ${escapeHtml(lastChecked)}</figcaption>
        </figure>
      </header>

      <section class="facts" aria-label="Event facts">
        <div class="fact"><span>Date</span><b>${escapeHtml(date)}</b></div>
        <div class="fact"><span>Time</span><b>${escapeHtml(time)}</b></div>
        <div class="fact"><span>Venue</span><b>${escapeHtml(venue)}</b></div>
        <div class="fact"><span>District</span><b>${escapeHtml(district)}</b></div>
        <div class="fact"><span>Sound</span><b>${escapeHtml(sound)}</b></div>
        <div class="fact"><span>Price</span><b>${escapeHtml(price)}</b></div>
        <div class="fact"><span>Age / ID</span><b>${escapeHtml(age)}</b></div>
        <div class="fact"><span>Source layer</span><b>${escapeHtml(sourceLayer)}</b></div>
        <div class="fact"><span>Intensity</span><b>${escapeHtml(intensity)}</b></div>
        <div class="fact"><span>Credibility</span><b>${escapeHtml(credibility)}</b></div>
      </section>

      <section class="copy-block decision-block">
        <h2>Event Tags</h2>
        <p>Simple tags for sound, room context, ticket/source status, and details that still need a source check.</p>
        <div class="decision-tags">
          ${soundTags}${decisionTags}
        </div>
      </section>

      <section class="copy-block recommendation-ledger" aria-label="How we recommend this event">
        <h2>How We Recommend This</h2>
        <ul class="lineup-list">
          <li><b>Recommendation</b><span>${escapeHtml(recReason)}</span></li>
          <li><b>Best for</b><span>${escapeHtml(bestFor)}</span></li>
          <li><b>Verify before going</b><span>${escapeHtml(verifyBefore)}</span></li>
          <li><b>Source confidence</b><span>${escapeHtml(sourceConfidence)}</span></li>
        </ul>
      </section>

      <section class="copy-block">
        <h2>Lineup and Notes</h2>
        <ul class="lineup-list">
          ${lineup}
        </ul>
      </section>

      <section class="copy-block">
        <h2>Source Trail</h2>
        <ul class="source-list">
          ${sources}
        </ul>
      </section>

      <section class="copy-block trust-ledger" aria-label="Trust ledger">
        <h2>Trust Ledger</h2>
        <ul class="lineup-list">
          <li><b>Last checked</b><span>${escapeHtml(lastChecked)}</span></li>
          <li><b>Selection basis</b><span>Included for source visibility, room fit, and these editorial signals: ${escapeHtml((event.decisionTags || []).join(', '))}.</span></li>
          <li><b>Commercial relationship</b><span>No paid placement recorded.</span></li>
          <li><b>Correction route</b><span>Send source fixes through RED 980793145 or the corrections policy.</span></li>
          <li><b>Policy</b><span><a href="../trust.html">How We Recommend</a> / <a href="../trust.html#corrections">Corrections</a></span></li>
        </ul>
      </section>
    </article>

    <footer class="footnotes bottom-dispatch-bar" aria-label="Basement Dispatch status">
      <div class="bar-cell update-cell">
        <span class="footer-alert-mark" aria-hidden="true">!</span>
        <strong>Event data<br>can move</strong>
      </div>
      <div class="bar-cell">
        <span>Generated pages mirror the public calendar format.</span>
        <span>Confirm source links before planning around details.</span>
      </div>
      <address class="bar-cell contact-cell">
        <a class="contact-card-link" href="../assets/social/xhs-contact-card.jpg" aria-label="Open RED Xiaohongshu contact QR card">
          <span class="contact-copy">
            <span>Contact / updates</span>
            <b>RED</b>
            <em>ID 980793145</em>
          </span>
          <img src="../assets/social/xhs-contact-card.jpg" alt="" loading="lazy" decoding="async">
        </a>
      </address>
      <div class="bar-cell">
        <span>Information is aggregated from public sources and may change.</span>
        <span>Watchlist leads stay noindexed until stronger evidence lands.</span>
      </div>
      <div class="bar-cell source-cell">
        <span>Source first</span>
        <span>Rave second</span>
        <a href="../trust.html">How we recommend</a>
        <a href="../trust.html#corrections">Corrections</a>
      </div>
    </footer>

    <a class="admin-corner" data-admin-corner href="../ops.html" aria-label="Admin sign in">admin</a>

  </main>

</body>
</html>
`;
}

// --- write -------------------------------------------------------------
let created = 0;
for (const event of targets) {
  const page = renderPage(event);
  const outPath = path.join(EVENTS_DIR, `${event.id}.html`);
  const existed = fs.existsSync(outPath);
  fs.writeFileSync(outPath, page, 'utf8');
  created++;
  console.log(`[event-pages] ${existed ? 'updated' : 'created'} ${outPath}`);
}

console.log(`\n[event-pages] done. ${created} page${created === 1 ? '' : 's'} written.`);
