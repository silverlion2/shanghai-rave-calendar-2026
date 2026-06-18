const fs = require('fs');

// Read JS file — it's window.DJ_ITINERARY_DATA = { ... };
const raw = fs.readFileSync('data/tracked-dj-itineraries.js', 'utf-8');
const match = raw.match(/window\.DJ_ITINERARY_DATA\s*=\s*(\{[\s\S]*?\});\s*$/);
if (!match) { console.error('Parse failed'); process.exit(1); }

const data = new Function('return ' + match[1])();
const entries = Object.entries(data);

// Filter international DJs: scope says "International" or summary mentions non-China origins
const international = entries.filter(([slug, d]) => {
  const scope = d.scope || '';
  const summary = d.summary || '';
  const isInternational = /International|international|Worldwide|worldwide|Global|global/.test(scope)
    || (/Germany|Berlin|Detroit|Belgium|Italy|Netherlands|Spain|France|UK|Denmark|Bosnia|Romania|Amsterdam|Naples|Hamburg|Copenhagen|Frankfurt|Rotterdam|Milan|Barcelona|London|Ibiza/.test(summary)
        && !/Shanghai|Beijing|Hong Kong|Taipei|Chinese|China-based|Shenzhen|Chengdu/.test(summary));
  return isInternational;
});

const withChina = [];
const noChina = [];

international.forEach(([slug, d]) => {
  const itin = d.itinerary || [];
  const hasChina = itin.some(entry => {
    const txt = JSON.stringify(entry).toLowerCase();
    return /china|shanghai|beijing|hong kong|taipei|shenzhen|chengdu/.test(txt);
  });
  if (hasChina) withChina.push({ name: d.name, slug, count: itin.length, scope: d.scope });
  else noChina.push({ name: d.name, slug, count: itin.length, scope: d.scope });
});

console.log(`\nTotal: ${entries.length} | International: ${international.length}\n`);

console.log(`===== ✅ 已有中国行程 (${withChina.length}) =====`);
withChina.sort((a, b) => b.count - a.count).forEach(d => {
  console.log(`  - ${d.name} — ${d.count} itinerary`);
});

console.log(`\n===== ⏳ 尚无中国行程 (${noChina.length}) =====`);
noChina.forEach(d => {
  console.log(`  - ${d.name} — ${d.count} itinerary`);
});
