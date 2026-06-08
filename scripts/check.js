const fs = require("fs");

const html = fs.readFileSync("index.html", "utf8");
const scriptPattern = new RegExp("<script>([\\s\\S]*?)</script>", "g");
const scripts = Array.from(html.matchAll(scriptPattern), match => match[1]);

for (const script of scripts) {
  new Function(script);
}

for (const required of [
  '<meta name="description"',
  '<meta property="og:title"',
  '<link rel="canonical"',
  'type="application/ld+json"',
]) {
  if (!html.includes(required)) {
    throw new Error(`Missing required SEO marker: ${required}`);
  }
}

console.log(`inline scripts syntax OK: ${scripts.length}`);
