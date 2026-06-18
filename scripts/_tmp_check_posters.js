// Check event details for the 9 missing events
const fs = require('fs');
const d = JSON.parse(fs.readFileSync('data/events.json', 'utf8'));
const today = '2026-06-18';

console.log('====== ALL FUTURE EVENTS - POSTER STATUS ======\n');

const sorted = d.events
  .filter(e => e.sortDate && e.sortDate >= today)
  .sort((a, b) => a.sortDate.localeCompare(b.sortDate));

for (const ev of sorted) {
  const hasLocal = ev.posterUrl && fs.existsSync(ev.posterUrl);
  const status = hasLocal ? '[HAS POSTER]' : '[MISSING]';
  console.log(status + ' [' + ev.sortDate + '] ' + ev.id);
  console.log('   Title: ' + (ev.title || '').slice(0, 70));
  console.log('   posterUrl: ' + (ev.posterUrl || '(none)'));
  console.log('   source: ' + (ev.source || '(none)').slice(0, 80));
  console.log();
}

console.log('Total future events: ' + sorted.length);
console.log('With local posters: ' + sorted.filter(e => e.posterUrl && fs.existsSync(e.posterUrl)).length);
console.log('Missing posters: ' + sorted.filter(e => !e.posterUrl || !fs.existsSync(e.posterUrl)).length);
