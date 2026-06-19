// Test cloudscraper for RA
let cloudscraper;
try {
  cloudscraper = require('cloudscraper');
  console.log('cloudscraper loaded successfully');
} catch (e) {
  console.error('Failed to load cloudscraper:', e.message);
  process.exit(1);
}

function testCloudscraper(url, callback) {
  console.log(`\nTesting cloudscraper: ${url}`);

  cloudscraper.get(url)
    .then(response => {
      console.log('Status: SUCCESS');
      console.log('Response length:', response.length, 'bytes');

      // Check for event links
      const eventLinks = response.match(/href="(https:\/\/ra\.co\/events\/\d+)"/g);
      if (eventLinks) {
        console.log('Found', eventLinks.length, 'event links');
      } else {
        console.log('No event links found');
      }

      // Check if it's a challenge page
      if (response.includes('cloudflare') || response.includes('Checking your browser') || response.includes('challenge')) {
        console.log('WARNING: May still be a challenge page');
      }

      callback();
    })
    .catch(error => {
      console.error('Error:', error.message);
      if (error.response) {
        console.error('Status:', error.response.statusCode);
        console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
      }
      callback();
    });
}

// Test RA
testCloudscraper('https://ra.co/events/cn/shanghai', () => {
  console.log('\n=== Test complete ===');
});
