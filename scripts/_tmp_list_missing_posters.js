// Find events still missing posters (future events only)
const fs = require('fs');
const d = JSON.parse(fs.readFileSync('data/events.json', 'utf8'));
const today = '2026-06-18';

console.log('=== FUTURE EVENTS STILL MISSING LOCAL POSTER ===');
console.log('');

const missing = [];
for (const ev of d.events) {
  if (!ev.sortDate || ev.sortDate < today) continue;
  const hasLocal = ev.posterUrl && fs.existsSync(ev.posterUrl);
  if (!hasLocal) {
    missing.push({
      id: ev.id,
      sortDate: ev.sortDate,
      title: (ev.title || '').slice(0, 60),
      venue: ev.venue || '',
      posterUrl: ev.posterUrl || '(none)',
      source: ev.source || ev.detailsUrl || '(none)',
      lineup: ev.lineup ? JSON.stringify(ev.lineup).slice(0, 80) : '(none)'
    });
  }
}

missing.sort((a, b) => a.sortDate.localeCompare(b.sortDate));

missing.forEach((m, i) => {
  console.log((i+1) + '. [' + m.sortDate + '] ' + m.id);
  console.log('   Title: ' + m.title);
  console.log('   Venue: ' + m.venue);
  console.log('   Source: ' + m.source);
  if (m.posterUrl !== '(none)') console.log('   Has remote posterUrl: ' + m.posterUrl);
  console.log('   Lineup: ' + m.lineup);
  console.log('');
});

console.log('Total still missing:', missing.length);
