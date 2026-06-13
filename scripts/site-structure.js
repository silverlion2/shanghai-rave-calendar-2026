const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const STRUCTURE_FILE = path.join(ROOT, "config", "website-structure.json");

function readWebsiteStructure() {
  const structure = JSON.parse(fs.readFileSync(STRUCTURE_FILE, "utf8"));
  structure.site = structure.site || {};
  structure.site.baseUrl = normalizeBaseUrl(structure.site.baseUrl || "");
  return structure;
}

function normalizeBaseUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}

function normalizeRoute(value) {
  if (value === "/") return "/";
  const route = String(value || "").trim().replace(/^\/+|\/+$/g, "");
  return route ? `/${route}` : "/";
}

function pages(structure) {
  return Array.isArray(structure.pages) ? structure.pages : [];
}

function mirrors(structure) {
  return Array.isArray(structure.mirrors) ? structure.mirrors : [];
}

function pageById(structure, id) {
  return pages(structure).find(page => page.id === id);
}

function topLevelHtmlFiles(structure) {
  return pages(structure)
    .filter(page => page.file && page.syntaxOnly !== true)
    .map(page => page.file);
}

function syntaxOnlyHtmlFiles(structure) {
  return mirrors(structure)
    .filter(page => page.file && page.syntaxOnly === true)
    .map(page => page.file);
}

function sharedDispatchHtmlFiles(structure) {
  return [...topLevelHtmlFiles(structure), ...syntaxOnlyHtmlFiles(structure)];
}

function secondaryDispatchHtmlFiles(structure) {
  return pages(structure)
    .filter(page => page.file && page.shell === "dispatch-shell")
    .map(page => page.file);
}

function homepageCalendarHtmlFiles(structure) {
  return [...pages(structure), ...mirrors(structure)]
    .filter(page => page.file && page.homepageStats)
    .map(page => page.file);
}

function externalJsFiles(structure) {
  return Array.isArray(structure.sharedAssets?.externalJs) ? structure.sharedAssets.externalJs : [];
}

function primaryNavPages(structure) {
  const ids = Array.isArray(structure.primaryNav) ? structure.primaryNav : [];
  return ids.map(id => pageById(structure, id)).filter(Boolean);
}

function sitemapPages(structure) {
  return pages(structure).filter(page => page.includeInSitemap === true && page.route);
}

function staticSitemapRoutes(structure) {
  const fallbackLastmod = structure.site.staticLastmod || new Date().toISOString().slice(0, 10);
  return sitemapPages(structure).map(page => [
    normalizeRoute(page.route),
    page.lastmod || fallbackLastmod,
    page.changefreq || "weekly",
    String(page.priority || "0.5"),
  ]);
}

function canonicalUrl(page, structure) {
  const route = normalizeRoute(page.route);
  return `${structure.site.baseUrl}${route === "/" ? "/" : route}`;
}

function rootThemeHref(structure) {
  return structure.site.themeStylesheet || "assets/basement-dispatch.css";
}

function prefixedThemeHref(structure, prefix = "") {
  return `${prefix}${rootThemeHref(structure)}`;
}

function assertWebsiteStructure({ root = ROOT } = {}) {
  const structure = readWebsiteStructure();
  const ids = new Set();
  const files = new Set();
  const routes = new Set();

  assertFile(path.join(root, "config", "website-structure.json"), "website structure config");
  assertFile(path.join(root, rootThemeHref(structure)), "shared theme stylesheet");
  if (structure.site.eventDetailStylesheet) {
    assertFile(path.join(root, structure.site.eventDetailStylesheet), "generated event detail stylesheet");
  }
  assertFile(path.join(root, structure.site.themeDocument || ""), "website theme document");
  assertFile(path.join(root, structure.site.structureDocument || ""), "website structure document");

  for (const page of pages(structure)) {
    if (!page.id || ids.has(page.id)) {
      throw new Error(`website structure page has missing or duplicate id: ${page.id || "(empty)"}`);
    }
    ids.add(page.id);
    if (!page.file || files.has(page.file)) {
      throw new Error(`website structure page has missing or duplicate file: ${page.file || "(empty)"}`);
    }
    files.add(page.file);
    if (!page.route || routes.has(normalizeRoute(page.route))) {
      throw new Error(`website structure page has missing or duplicate route: ${page.route || "(empty)"}`);
    }
    routes.add(normalizeRoute(page.route));
    assertTrackedPage(root, structure, page);
  }

  for (const mirror of mirrors(structure)) {
    if (!mirror.id || ids.has(mirror.id)) {
      throw new Error(`website structure mirror has missing or duplicate id: ${mirror.id || "(empty)"}`);
    }
    ids.add(mirror.id);
    if (!mirror.file || files.has(mirror.file)) {
      throw new Error(`website structure mirror has missing or duplicate file: ${mirror.file || "(empty)"}`);
    }
    files.add(mirror.file);
    assertTrackedPage(root, structure, mirror, { canonical: false, primaryNav: false });
  }

  for (const id of structure.primaryNav || []) {
    if (!pageById(structure, id)) {
      throw new Error(`primaryNav references unknown page id: ${id}`);
    }
  }

  const sitemapFile = path.join(root, "sitemap.xml");
  if (fs.existsSync(sitemapFile)) {
    const sitemap = fs.readFileSync(sitemapFile, "utf8");
    for (const page of sitemapPages(structure)) {
      const url = canonicalUrl(page, structure);
      if (!sitemap.includes(`<loc>${url}</loc>`)) {
        throw new Error(`sitemap.xml missing tracked static page: ${url}`);
      }
    }
  }

  return {
    pages: pages(structure).length,
    mirrors: mirrors(structure).length,
    sitemapPages: sitemapPages(structure).length,
    generatedCollections: Array.isArray(structure.generatedCollections) ? structure.generatedCollections.length : 0,
  };
}

function assertTrackedPage(root, structure, page, options = {}) {
  const file = path.join(root, page.file);
  assertFile(file, `tracked page ${page.file}`);
  const html = fs.readFileSync(file, "utf8");
  const themeHref = rootThemeHref(structure);
  if (!html.includes(`href="${themeHref}"`)) {
    throw new Error(`${page.file} must load the tracked theme stylesheet: ${themeHref}`);
  }
  if (page.shell && !new RegExp(`<main\\s+class="[^"]*\\b${escapeRegExp(page.shell)}\\b[^"]*"`).test(html)) {
    throw new Error(`${page.file} must use tracked shell class: ${page.shell}`);
  }
  if (options.canonical !== false && page.route && !html.includes(`<link rel="canonical" href="${canonicalUrl(page, structure)}">`)) {
    throw new Error(`${page.file} missing tracked canonical URL: ${canonicalUrl(page, structure)}`);
  }
  if (page.utility !== true && !html.includes("bottom-dispatch-bar")) {
    throw new Error(`${page.file} must use the tracked Basement Dispatch footer`);
  }
  if (options.primaryNav !== false && page.utility !== true) {
    for (const navPage of primaryNavPages(structure)) {
      if (!html.includes(`href="${navPage.file}"`)) {
        throw new Error(`${page.file} missing primary navigation link: ${navPage.file}`);
      }
    }
  }
}

function assertFile(file, label) {
  if (!file || !fs.existsSync(file)) {
    throw new Error(`${label} is missing: ${file}`);
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  ROOT,
  STRUCTURE_FILE,
  readWebsiteStructure,
  normalizeRoute,
  pages,
  mirrors,
  pageById,
  topLevelHtmlFiles,
  syntaxOnlyHtmlFiles,
  sharedDispatchHtmlFiles,
  secondaryDispatchHtmlFiles,
  homepageCalendarHtmlFiles,
  externalJsFiles,
  primaryNavPages,
  sitemapPages,
  staticSitemapRoutes,
  canonicalUrl,
  rootThemeHref,
  prefixedThemeHref,
  assertWebsiteStructure,
};
