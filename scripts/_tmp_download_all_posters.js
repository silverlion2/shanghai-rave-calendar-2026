// 1) Check events.json for events missing poster URLs
// 2) Download posters from SmartShanghai for events that don't have them yet
// 3) Update events.json with poster file paths
const fs = require('fs');
const https = require('http'); // will use https.get

// --- Utility: download image ---
function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destPath)) {
      resolve(true);
      return;
    }
    const proto = url.startsWith('https://') ? require('https') : require('http');
    const req = proto.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        downloadImage(res.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error('HTTP ' + res.statusCode));
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        fs.writeFileSync(destPath, buffer);
        console.log('  DOWNLOAD OK: ' + destPath + ' (' + Math.round(buffer.length / 1024) + ' KB)');
        resolve(true);
      });
    });
    req.on('error', reject);
    req.setTimeout(45000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// Ensure poster dir exists
if (!fs.existsSync('assets/posters')) {
  fs.mkdirSync('assets/posters', { recursive: true });
}

// Load events.json
const eventsData = JSON.parse(fs.readFileSync('data/events.json', 'utf8'));
const events = eventsData.events;

// --- Map event titles to poster URLs (from SmartShanghai listings page) ---
const POSTER_MAP = {
  // June 18 events
  'ALTER Pavillon 亭': {
    url: 'https://images.smartshanghai.com.cn/uploads/repository/2026/06/03/d2ca87ea-c628-46fd-9c40-ae814b4a14cd.png',
    ext: 'png'
  },
  'Night at the Museum: Back to the 90s Disco Night': {
    url: 'https://images.smartshanghai.com.cn/uploads/repository/2026/06/05/32aa46e5-f9cf-4745-bf2c-2829de62c7c1.jpg',
    ext: 'jpg'
  },
  'Girls Night Out': {
    url: 'https://images.smartshanghai.com.cn/uploads/repository/2026/06/02/fa1a049a-5966-4918-8988-dbde250bcc8e.png',
    ext: 'png'
  },
  'Long Wave (House, Techno, Disco, Club Music)': {
    url: 'https://images.smartshanghai.com.cn/uploads/repository/2026/06/17/706568df-5675-44ad-a524-4e66e29bda96.jpg',
    ext: 'jpg'
  },
  'Illum Presents: State OFFF (Gqom, Club Music, Bass)': {
    url: 'https://images.smartshanghai.com.cn/uploads/repository/2026/06/17/ec151de2-bdde-4fe4-ab79-2e55000bfeed.jpg',
    ext: 'jpg'
  },
  // June 19 events
  'ONEFORTYASIA Pres. MUNGK (UK) & SIMBIE (AU)': {
    url: 'https://images.smartshanghai.com.cn/uploads/repository/2026/06/12/fca5db40-614b-426a-b193-50c2826d1019.jpg',
    ext: 'jpg'
  },
  'Disco Ball Fridays': {
    url: 'https://images.smartshanghai.com.cn/uploads/repository/2026/06/02/520fcfd7-57ec-4e46-af7e-a6f13ec0e587.jpg',
    ext: 'jpg'
  },
  'Hush Three-Year Anniversary w/DJ David (Trap, Rage, Hip hop)': {
    url: 'https://images.smartshanghai.com.cn/uploads/repository/2026/06/16/575bd7fd-482f-4b26-b5a2-4f528532c80f.jpg',
    ext: 'jpg'
  },
  'Vibes Up Party (Reggae, Dancehall, Hip Hop)': {
    url: 'https://images.smartshanghai.com.cn/uploads/repository/2026/06/17/b3c179e4-0540-47d6-b996-20148ab0f026.png',
    ext: 'png'
  },
  'MRD (Melodic Scando Rave Music, Post-Punk, Emotional Hardcore)': {
    url: 'https://images.smartshanghai.com.cn/uploads/repository/2026/06/17/f4e22274-c4f5-4d1c-abdf-8348961b8a5e.jpg',
    ext: 'jpg'
  },
  // June 20 events
  'Nova Events Presents: Sundown - CHAR Bar Rooftop Opening Party': {
    url: 'https://images.smartshanghai.com.cn/uploads/repository/2026/06/15/b6beffdc-6fbe-402f-af1b-b33bff601447.jpg',
    ext: 'jpg'
  },
  'Space Panda Presents: Neon Jungle ft. Tom Kynd': {
    url: 'https://images.smartshanghai.com.cn/uploads/repository/2026/06/15/13992c4b-5930-45e1-a817-fd2c7593b14a.jpg',
    ext: 'jpg'
  },
  'Liminal Dreams (Ambient and Outer Music)': {
    url: 'https://images.smartshanghai.com.cn/uploads/repository/2026/06/17/9da34813-88b6-4fff-8ba9-597a756c3720.png',
    ext: 'png'
  },
  'Steal Tapes (House Music)': {
    url: 'https://images.smartshanghai.com.cn/uploads/repository/2026/06/17/64613f27-78ae-48dd-9989-7f6d585cb09d.jpg',
    ext: 'jpg'
  },
  'A Full Afrowave Takeover': {
    url: 'https://images.smartshanghai.com.cn/uploads/repository/2026/05/25/e4f597d7-cfbd-403c-9999-f9b4ccdec070.jpg',
    ext: 'jpg'
  },
  // Weekly events
  'Sunset Sundays': {
    url: 'https://images.smartshanghai.com.cn/uploads/repository/2026/06/02/87497744-8052-4df8-a2d9-d3fcc5eb7c64.jpg',
    ext: 'jpg'
  },
  // June 26 events
  'Cyber Budha Special Vol: Twilight in the Forbidden City with The Hymmapan Electron (TH), Taiga, and MICO': {
    url: 'https://images.smartshanghai.com.cn/uploads/repository/2026/04/30/f090a500-c30b-4554-b0f9-c7d788ff57ce.jpg',
    ext: 'jpg'
  },
  // June 27 events
  'Nova Events Presents: Summer Splash Pool Party': {
    url: 'https://images.smartshanghai.com.cn/uploads/repository/2026/06/05/f08a051c-3d0d-4114-bc31-88f35a501bb1.jpg',
    ext: 'jpg'
  }
};

console.log('====== ANALYSIS: Events missing local posters ======\n');
const today = '2026-06-18';
let missingCount = 0;
let toDownload = [];

for (const ev of events) {
  // Only analyze future events
  if (!ev.sortDate || ev.sortDate < today) continue;

  const hasLocalPoster = ev.posterUrl && fs.existsSync(ev.posterUrl);
  if (!hasLocalPoster) {
    missingCount++;
    console.log('  [' + ev.sortDate + '] ' + ev.id + ' | ' + (ev.title || '').slice(0, 50));
    // Try to find a matching poster
    let match = null;
    const title = (ev.title || '').trim();
    // Exact match
    if (POSTER_MAP[title]) {
      match = POSTER_MAP[title];
    } else {
      // Partial match
      for (const key of Object.keys(POSTER_MAP)) {
        if (title.includes(key) || key.includes(title)) {
          match = POSTER_MAP[key];
          break;
        }
      }
    }
    if (match) {
      toDownload.push({ event: ev, poster: match });
    }
  }
}

console.log('\nTotal future events missing local posters: ' + missingCount);
console.log('Found ' + toDownload.length + ' events with available poster sources on SmartShanghai.\n');

// --- Download posters for events ---
async function main() {
  let downloaded = 0;
  let failed = 0;
  let skipped = 0;

  console.log('====== DOWNLOADING POSTERS ======\n');
  for (const item of toDownload) {
    const { event, poster } = item;
    const filename = 'assets/posters/' + event.id + '.' + poster.ext;
    try {
      if (fs.existsSync(filename)) {
        console.log('  [SKIP EXISTS] ' + event.id + ' -> ' + filename);
        skipped++;
      } else {
        await downloadImage(poster.url, filename);
        downloaded++;
      }
      // Update event in events.json
      event.posterUrl = filename;
      event.posterEvidence = 'SmartShanghai clubbing listings page';
    } catch (err) {
      console.log('  [FAIL] ' + event.id + ': ' + err.message);
      failed++;
    }
  }

  // Also check for minuit-mirror-concept which exists on RA
  console.log('\n====== DOWNLOADING ADDITIONAL POSTERS ======\n');

  // "minuit-mirror-concept" - RA listing
  const minuit = events.find(e => e.id === 'minuit-mirror-concept');
  if (minuit && (!minuit.posterUrl || !fs.existsSync(minuit.posterUrl))) {
    // The RA page didn't load - but we can try
    console.log('  [INFO] minuit-mirror-concept: RA page requires JS rendering - skipping for now');
  }

  // Update "verified" and "generatedAt" timestamps
  eventsData.generatedAt = new Date().toISOString();
  eventsData.verified = new Date().toISOString().split('T')[0];

  // Save updated events.json
  fs.writeFileSync('data/events.json', JSON.stringify(eventsData, null, 2) + '\n', 'utf8');

  console.log('\n====== SUMMARY ======');
  console.log('Downloaded: ' + downloaded);
  console.log('Already existed (skipped): ' + skipped);
  console.log('Failed: ' + failed);

  // Final verification
  const missingFinal = events.filter(ev => {
    if (!ev.sortDate || ev.sortDate < today) return false;
    return !ev.posterUrl || !fs.existsSync(ev.posterUrl);
  });
  console.log('\nFuture events STILL missing local posters: ' + missingFinal.length);
  missingFinal.forEach(ev => {
    console.log('  [' + ev.sortDate + '] ' + ev.id + ' | ' + (ev.title || '').slice(0, 50) + ' | Source: ' + (ev.source || ev.detailsUrl || '(none)').slice(0, 60));
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
