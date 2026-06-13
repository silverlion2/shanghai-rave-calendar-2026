const { assertWebsiteStructure } = require("./site-structure");

const summary = assertWebsiteStructure();

console.log(
  `website structure OK: ${summary.pages} tracked pages, ${summary.mirrors} mirrors, ${summary.sitemapPages} static sitemap routes, ${summary.generatedCollections} generated collections`
);
