const fs = require('fs');

// 1. Read events.json
const events = JSON.parse(fs.readFileSync('data/events.json', 'utf-8')).events;

// 2. Read DJ itinerary JS
const raw = fs.readFileSync('data/tracked-dj-itineraries.js', 'utf-8');
const match = raw.match(/window\.DJ_ITINERARY_DATA\s*=\s*(\{[\s\S]*?\});\s*$/);
const profiles = new Function('return ' + match[1])();
const profiledNames = Object.values(profiles).map(p => p.name.toLowerCase());
const profiledSlugs = new Set(Object.keys(profiles));

// 3. Collect all names mentioned in events.lineup and other DJ fields
const mentionedNames = new Map(); // name -> count of events

events.forEach(ev => {
  const lineup = ev.lineup || [];
  const highlights = (ev.djHighlights || []).slice();
  const names = [...lineup, ...highlights]
    .map(n => typeof n === 'string' ? n.trim() : (n && n.name ? String(n.name).trim() : ''))
    .filter(Boolean);
  names.forEach(name => {
    const key = name.toLowerCase();
    mentionedNames.set(key, (mentionedNames.get(key) || 0) + 1);
  });
});

// 4. Categorize: international-looking names (not CN names) vs others
// A name is "international-looking" if it's not a Chinese name (has no CJK chars) and has some pattern
// Simpler: check if any name matches against known international DJ slug-formatted entries
// And check if name contains non-ASCII CJK

function isCJK(s) { return /[\u4e00-\u9fff]/.test(s); }

const eventsWithInternationalLineup = [];
events.forEach(ev => {
  const lineup = (ev.lineup || []).map(n => typeof n === 'string' ? n : (n && n.name || '')).filter(n => n && !isCJK(n) && n.length > 1 && !/^(various artists|tba|to be announced|djs|various|special guest|resident|b2b)$/.test(n.toLowerCase()));
  if (lineup.length > 0) eventsWithInternationalLineup.push({
    id: ev.id, title: ev.title, venue: ev.venue, city: ev.city, date: ev.date, lineup
  });
});

console.log(`\nTotal events: ${events.length}`);
console.log(`Events with non-CJK names in lineup: ${eventsWithInternationalLineup.length}\n`);

console.log('===== 事件中出现的国际 DJ（按出现次数排序）=====');
const sorted = [...mentionedNames.entries()].sort((a, b) => b[1] - a[1]);
const internationalMentioned = sorted.filter(([name]) => !isCJK(name) && name.length > 1);

internationalMentioned.slice(0, 80).forEach(([name, count]) => {
  const exists = profiledNames.includes(name);
  const mark = exists ? '✅' : '❌ NEW';
  console.log(`  ${mark}  "${name}" — ${count} 次出场 ${exists ? '(已在 profiles)' : '(未收录)'}`);
});

console.log(`\n\n===== 事件中出现但 profiles 尚未收录的国际 DJ（Top 50）=====`);
const missing = internationalMentioned.filter(([name]) => !profiledNames.includes(name));
missing.slice(0, 50).forEach(([name, count]) => {
  console.log(`  ❌ "${name}" — ${count} 次出场`);
});

// Also check: events that reference international DJs — which events have the most international lineups
console.log(`\n\n===== 出现国际艺人最多的 10 个事件 =====`);
eventsWithInternationalLineup
  .sort((a, b) => b.lineup.length - a.lineup.length)
  .slice(0, 10)
  .forEach(ev => {
    console.log(`  ${ev.date} | ${ev.venue}, ${ev.city} | ${ev.title}`);
    console.log(`     Lineup: ${ev.lineup.join(', ')}`);
  });
