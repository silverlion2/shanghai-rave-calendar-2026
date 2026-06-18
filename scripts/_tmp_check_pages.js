// Check what the Shanghai.gov.cn pages actually return
const https = require('https');
const fs = require('fs');

const urls = [
  { name: 'shenwave', url: 'https://english.shanghai.gov.cn/en-EditorsPick-travelinshanghai/20260424/8cefc9d8-682d-416d-8532-236f9d78.html' },
  { name: 'westbund', url: 'https://english.shanghai.gov.cn/en-PlanANightOut/20260608/6a9a6187e3f54378b534ec1e19a4d62.html' },
];

function check(u) {
  return new Promise((resolve) => {
    const url = new URL(u.url);
    https.get({ hostname: url.hostname, path: url.pathname + url.search, headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 }, (res) => {
      let d = '';
      res.on('data', (c) => d += c);
      res.on('end', () => {
        const titleMatch = d.match(/<title[^>]*>([^<]+)<\/title>/i);
        const imgTags = d.match(/<img[^>]+>/gi) || [];
        const h1 = d.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        console.log('[' + u.name + '] Status: ' + res.statusCode);
        console.log('  Title: ' + (titleMatch ? titleMatch[1] : '(none)'));
        console.log('  H1: ' + (h1 ? h1[1].trim() : '(none)'));
        console.log('  Images found: ' + imgTags.length);
        imgTags.slice(0, 5).forEach((t, i) => console.log('    ' + i + ': ' + t.slice(0, 120)));
        console.log('  Body preview: ' + d.slice(200, 500).replace(/\s+/g, ' '));
        console.log('');
        resolve();
      });
    }).on('error', (e) => { console.log('[' + u.name + '] Error: ' + e.message); resolve(); });
  });
}

// Also try to find event images from RA.co (without JS rendering, look at raw HTML)
async function checkRA() {
  console.log('====== RA.CO EVENT PAGE ======\n');
  return new Promise((resolve) => {
    const url = new URL('https://ra.co/events/2468150');
    https.get({ hostname: url.hostname, path: url.pathname, headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 }, (res) => {
      let d = '';
      res.on('data', (c) => d += c);
      res.on('end', () => {
        console.log('Status: ' + res.statusCode);
        // Look for og:image or any image URLs
        const og = d.match(/og:image["']\s+content=["']([^"']+)["']/i);
        console.log('og:image: ' + (og ? og[1] : '(none)'));
        const allImgs = d.match(/https?:\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp)/gi) || [];
        console.log('Image URLs found: ' + allImgs.length);
        allImgs.slice(0, 10).forEach((u, i) => console.log('  [' + i + '] ' + u.slice(0, 120)));
        console.log('First 500 chars: ' + d.slice(0, 500).replace(/\s+/g, ' '));
        resolve();
      });
    }).on('error', (e) => { console.log('Error: ' + e.message); resolve(); });
  });
}

async function main() {
  for (const u of urls) { await check(u); }
  await checkRA();
}
main();
