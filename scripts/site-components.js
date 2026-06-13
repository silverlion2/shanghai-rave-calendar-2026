const {
  primaryNavPages,
  rootThemeHref,
} = require("./site-structure");

function renderHtmlDocument({ head, body }) {
  return `<!doctype html>
<html lang="en">
<head>
${head}
</head>
<body>
${body}
</body>
</html>
`;
}

function renderSeoHead(structure, {
  title,
  description,
  canonical,
  robots = "index,follow,max-image-preview:large",
  ogTitle = title,
  ogDescription = description,
  ogImage,
  ogAlt,
  schema,
  assetPrefix = "",
  stylesheets = [],
}) {
  const resolvedStylesheets = (stylesheets.length ? stylesheets : [rootThemeHref(structure)]).filter(Boolean);
  return `  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeAttr(description)}">
  <meta name="robots" content="${escapeAttr(robots)}">
  <meta name="theme-color" content="#c6ff3b">
  <link rel="canonical" href="${escapeAttr(canonical)}">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="icon" href="/og-image.png" type="image/png">
${renderGoogleTag(structure.site.googleTagId)}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${escapeAttr(structure.site.name)}">
  <meta property="og:title" content="${escapeAttr(ogTitle)}">
  <meta property="og:description" content="${escapeAttr(ogDescription)}">
  <meta property="og:url" content="${escapeAttr(canonical)}">
  <meta property="og:image" content="${escapeAttr(ogImage)}">
  <meta property="og:image:alt" content="${escapeAttr(ogAlt)}">
  <script type="application/ld+json">
${jsonLd(schema)}
  </script>
${resolvedStylesheets.map(href => `  <link rel="stylesheet" href="${escapeAttr(assetPrefix + href)}">`).join("\n")}`;
}

function renderGoogleTag(googleTagId) {
  return `  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${escapeAttr(googleTagId)}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      dataLayer.push(arguments);
    }
    gtag("js", new Date());
    gtag("config", "${escapeJsString(googleTagId)}");
  </script>`;
}

function renderPrimaryNav(structure, { prefix = "", activeId = "", includeUtility = false, trailingHtml = "" } = {}) {
  const pages = includeUtility
    ? [...primaryNavPages(structure), ...utilityPages(structure)]
    : primaryNavPages(structure);
  const items = pages
    .map(page => {
      const active = page.id === activeId ? " active" : "";
      return `<a class="nav-link${active}" href="${escapeAttr(prefix + page.file)}">${escapeHtml(page.label)}</a>`;
    })
    .join("\n        ");
  const trailing = trailingHtml || `<span>${escapeHtml(structure.site.navTagline || "")}</span>`;
  return `
    <nav class="site-nav" aria-label="Site navigation">
      <div class="nav-group">
        ${items}
      </div>
      ${trailing}
    </nav>
  `;
}

function renderBottomDispatchFooter(structure, {
  prefix = "",
  alertLabel = "Event data<br>can move",
  lines = [
    "Generated pages mirror the public calendar format.",
    "Confirm source links before planning around details.",
  ],
  disclaimer = [
    "Information is aggregated from public sources and may change.",
    "Watchlist leads stay noindexed until stronger evidence lands.",
  ],
  actionHref = "ops.html",
  actionLabel = "Ops desk",
  actionText = "Review queue ->",
  badge = ["Source first", "Rave second"],
} = {}) {
  return `
    <footer class="footnotes bottom-dispatch-bar" aria-label="Basement Dispatch status">
      <div class="bar-cell update-cell">
        <span class="footer-alert-mark" aria-hidden="true">!</span>
        <strong>${alertLabel}</strong>
      </div>
      <div class="bar-cell">
        ${lines.map(line => `<span>${escapeHtml(line)}</span>`).join("\n        ")}
      </div>
      <address class="bar-cell">
        <span>Questions or updates?</span>
        <a href="mailto:${escapeAttr(structure.site.contactEmail)}">${escapeHtml(structure.site.contactEmail)}</a>
        <span>${escapeHtml(structure.site.socialLabel)}</span>
      </address>
      <div class="bar-cell">
        ${disclaimer.map(line => `<span>${escapeHtml(line)}</span>`).join("\n        ")}
      </div>
      <a class="bar-cell ops-cell" href="${escapeAttr(prefix + actionHref)}" aria-label="Open Ops desk">
        <span>${escapeHtml(actionLabel)}</span>
        <b>${escapeHtml(actionText)}</b>
      </a>
      <div class="bar-cell source-cell">
        ${badge.map(line => `<span>${escapeHtml(line)}</span>`).join("\n        ")}
      </div>
    </footer>
  `;
}

function utilityPages(structure) {
  return Array.isArray(structure.pages) ? structure.pages.filter(page => page.utility && page.file) : [];
}

function websiteSchema(structure) {
  return {
    "@type": "WebSite",
    "@id": `${structure.site.baseUrl}/#website`,
    "name": structure.site.name,
    "url": `${structure.site.baseUrl}/`,
    "inLanguage": "en",
    "publisher": {
      "@type": "Organization",
      "name": structure.site.publisher,
      "url": `${structure.site.baseUrl}/`,
      "logo": {
        "@type": "ImageObject",
        "url": `${structure.site.baseUrl}/og-image.png`,
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

function escapeJsString(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

module.exports = {
  renderHtmlDocument,
  renderSeoHead,
  renderGoogleTag,
  renderPrimaryNav,
  renderBottomDispatchFooter,
  websiteSchema,
  graph,
  compact,
  jsonLd,
  escapeHtml,
  escapeAttr,
  escapeXml,
};
