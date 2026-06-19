const https = require('https');
const http = require('http');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/115.0',
];

function getRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function testUrl(url, callback) {
  const urlObj = new URL(url);
  const isHttps = urlObj.protocol === 'https:';
  const lib = isHttps ? https : http;

  const options = {
    hostname: urlObj.hostname,
    path: urlObj.pathname + urlObj.search,
    method: 'GET',
    headers: {
      'User-Agent': getRandomUA(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'sec-ch-ua': '"Chromium";v="126", "Google Chrome";v="126"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
      'Referer': 'https://ra.co/',
      'Origin': 'https://ra.co',
    }
  };

  console.log(`\nTesting: ${url}`);
  console.log('UA:', options.headers['User-Agent']);

  const req = lib.request(options, (res) => {
    console.log('Status:', res.statusCode);
    console.log('Server:', res.headers['server'] || 'N/A');
    console.log('CF-Ray:', res.headers['cf-ray'] || 'N/A');

    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 403) {
        console.log('RESULT: BLOCKED (403 Forbidden)');
      } else if (res.statusCode === 429) {
        console.log('RESULT: RATE LIMITED (429 Too Many Requests)');
      } else if (data.includes('cloudflare') || data.includes('Checking your browser')) {
        console.log('RESULT: BLOCKED by Cloudflare challenge');
      } else if (data.length < 1000) {
        console.log('RESULT: SUSPICIOUS - Content too short:', data.length, 'bytes');
        console.log('Preview:', data.slice(0, 300));
      } else {
        console.log('RESULT: SUCCESS - Got', data.length, 'bytes');
        // Check for event links
        const eventLinks = data.match(/href="(https:\/\/ra\.co\/events\/\d+)"/g);
        if (eventLinks) {
          console.log('Found', eventLinks.length, 'event links');
        }
      }
      callback();
    });
  });

  req.on('error', (e) => {
    console.error('Error:', e.message);
    callback();
  });

  req.setTimeout(15000, () => {
    req.destroy();
    console.log('RESULT: TIMEOUT');
    callback();
  });

  req.end();
}

// Test RA Shanghai events page
testUrl('https://ra.co/events/cn/shanghai', () => {
  // Test again with different delay
  setTimeout(() => {
    testUrl('https://ra.co/events/cn/shanghai', () => {
      console.log('\n=== Tests complete ===');
    });
  }, 3000);
});
