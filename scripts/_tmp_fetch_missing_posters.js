// Try to fetch posters for the 9 missing events
const https = require('https');
const http = require('http');
const fs = require('fs');
const URL = require('url');

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const u = URL.parse(url);
    const proto = u.protocol === 'https:' ? https : http;
    const req = proto.get({
      hostname: u.hostname,
      path: u.path,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        fetchPage(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) { resolve(true); return; }
    const u = URL.parse(url);
    const proto = u.protocol === 'https:' ? https : http;
    const req = proto.get({
      hostname: u.hostname,
      path: u.pathname + (u.search || ''),
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 30000
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        downloadImage(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return; }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        fs.writeFileSync(dest, buf);
        console.log('  Downloaded: ' + dest + ' (' + Math.round(buf.length/1024) + 'KB)');
        resolve(true);
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function extractImages(html, baseHost) {
  const results = [];
  // Extract all img src
  const imgRegex = /<img[^>]+(?:src|data-src)=["']([^"']+)["']/gi;
  let m;
  while ((m = imgRegex.exec(html)) !== null) {
    let src = m[1];
    if (src.startsWith('//')) src = 'https:' + src;
    else if (src.startsWith('/')) src = 'https://' + baseHost + src;
    if (src.endsWith('.jpg') || src.endsWith('.jpeg') || src.endsWith('.png') ||
        src.endsWith('.webp') || src.includes('.jpg') || src.includes('.png')) {
      if (!results.includes(src) && src.length < 400) results.push(src);
    }
  }
  // Extract og:image
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                  html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogMatch) {
    let src = ogMatch[1];
    if (src.startsWith('//')) src = 'https:' + src;
    else if (src.startsWith('/')) src = 'https://' + baseHost + src;
    results.unshift(src);
  }
  return results;
}

const events = [
  { id: 'minuit-mirror-concept', url: 'https://ra.co/events/2468150', host: 'ra.co' },
  { id: 'shenwave-music-festival-2026', url: 'https://english.shanghai.gov.cn/en-EditorsPick-travelinshanghai/20260424/8cefc9d8-682d-416d-8532-236f3c9f9d78.html', host: 'english.shanghai.gov.cn' },
  { id: 'west-bund-dream-center-waterfront-music-festival-2026', url: 'https://english.shanghai.gov.cn/en-PlanANightOut/20260608/6a9a6187e3f54378b534ec1e19a4d62.html', host: 'english.shanghai.gov.cn' },
  { id: 'the-magic-of-tomorrowland-shanghai-2026-watch', url: 'https://english.shanghai.gov.cn/en-PlanANightOut/20260608/6a9a6187e3f54378b534ec1e19a4d62.html', host: 'english.shanghai.gov.cn' },
];

if (!fs.existsSync('assets/posters')) fs.mkdirSync('assets/posters', { recursive: true });

async function main() {
  console.log('====== TRYING TO FETCH POSTERS FOR MISSING EVENTS ======\n');

  for (const ev of events) {
    console.log('Event: ' + ev.id);
    try {
      const html = await fetchPage(ev.url);
      const imgs = extractImages(html, ev.host);
      console.log('  Found ' + imgs.length + ' image URLs');
      if (imgs.length > 0) {
        // Show top 5
        imgs.slice(0, 5).forEach((img, i) => console.log('    [' + i + '] ' + img.slice(0, 120)));
        // Try to download the first one
        const first = imgs[0];
        const ext = first.endsWith('.png') ? 'png' : 'jpg';
        const dest = 'assets/posters/' + ev.id + '.' + ext;
        try {
          await downloadImage(first, dest);
          console.log('  SUCCESS - Poster saved to ' + dest);
        } catch (e) {
          console.log('  Download failed: ' + e.message);
        }
      } else {
        console.log('  No images found');
      }
    } catch (e) {
      console.log('  Error: ' + e.message);
    }
    console.log('');
  }

  console.log('Done.');
}

main();
