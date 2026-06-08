const fs = require("fs");

const scriptPattern = new RegExp("<script>([\\s\\S]*?)</script>", "g");
const htmlFiles = ["index.html", "venues.html"];
const syntaxOnlyHtmlFiles = ["shanghai-rave-calendar-2026.html"];
let scriptCount = 0;

for (const file of [...htmlFiles, ...syntaxOnlyHtmlFiles]) {
  const html = fs.readFileSync(file, "utf8");
  const scripts = Array.from(html.matchAll(scriptPattern), match => match[1]);
  scriptCount += scripts.length;

  for (const script of scripts) {
    new Function(script);
  }

  if (syntaxOnlyHtmlFiles.includes(file)) {
    continue;
  }

  for (const required of [
    '<meta name="description"',
    '<meta property="og:title"',
    '<link rel="canonical"',
    'type="application/ld+json"',
  ]) {
    if (!html.includes(required)) {
      throw new Error(`${file} missing required SEO marker: ${required}`);
    }
  }
}

const mainScript = fs.readFileSync("index.html", "utf8").match(scriptPattern)[1];
const archiveScript = fs.readFileSync("shanghai-rave-calendar-2026.html", "utf8").match(scriptPattern)[1];
if (mainScript !== archiveScript) {
  throw new Error("calendar scripts differ between index.html and shanghai-rave-calendar-2026.html");
}

console.log(`inline scripts syntax OK: ${scriptCount} scripts across ${htmlFiles.length + syntaxOnlyHtmlFiles.length} HTML files`);
